/**
 * 对话管理器（使用 SDK）
 *
 * 使用 @anthropic-ai/sdk 的 toolRunner 自动处理工具调用循环
 * 优势：
 * - 无需手工解析工具调用
 * - 无需清理工具调用标记
 * - 无需复杂的正则表达式
 * - 代码量减少 80%
 */

import Anthropic from '@anthropic-ai/sdk';
import { createAIClient } from './ai-client.js';
import { setToolExecutorContext, getToolDefinitions, getAllToolDefinitions } from './tools.js';
import { loadHistory, saveHistory, loadMemory } from './config.js';
import { Plan, PlanType, PlanStatus, StepStatus } from './plan.js';
import {
  initLogger,
  logConfig,
  logUserMessage,
  logAIRequest,
  logAIResponse,
  logAIError,
  logToolCall,
  logSessionSummary
} from './logger.js';
import { getMCPClientManager } from './mcp/client.js';

// 消息类型
export const MessageType = {
  USER: 'user',
  ASSISTANT: 'assistant',
  TOOL: 'tool',
  SYSTEM: 'system',
  ERROR: 'error'
};

// Workflow 测试模式的前置提示词（添加到每轮对话开头）
// SDK 版本无需特殊格式说明，工具调用自动处理
export const WORKFLOW_PROMPT_PREFIX = `
【Workflow 测试模式】
你现在处于 workflow 测试模式。这个测试分为两轮：
**第1轮（执行任务）**：
- 你会收到一个任务描述
- 你必须使用工具完成任务（如 readFile、writeFile、bash 等）
- 不能只说"我会做"，而要立即调用工具
- 必须实际创建/修改文件，而不仅仅是输出代码
**第2轮（验证结果）**：
- 你会收到验收标准
- 使用工具验证结果是否符合预期
- 验证完成后，如果结果完全符合预期，你必须回复：WORKFLOW TEST AS EXPECTED
- 如果结果不符合预期，请详细说明哪些方面不符合
重要：你必须使用工具来实际操作文件和系统，而不是仅仅输出代码或描述。
`;

// Workflow 测试模式的系统提示词
const WORKFLOW_SYSTEM_PROMPT = `
## Workflow 测试模式
你当前处于 workflow 测试模式。这是一个两轮对话测试：
1. **执行任务阶段（第1轮）**：
   - 你会收到一个任务描述
   - 必须使用工具完成该任务（readFile、writeFile、bash 等）
   - 必须实际创建/修改文件，不能只输出代码
   - 任务完成后对话会中止
2. **验证阶段（第2轮）**：
   - 你会收到验收标准
   - 使用工具验证结果是否符合预期
   - 验证完成后对话会中止
**验证结果回复格式**：
- 如果结果完全符合预期：必须回复 "WORKFLOW TEST AS EXPECTED"
- 如果结果不符合预期：详细说明哪些方面不符合
**关键规则**：
- 第1轮必须使用工具实际操作文件
- 第2轮验证完成后必须给出明确的验收结论
`;

/**
 * 对话会话（使用 SDK）
 */
export class Conversation {
  constructor(config, workflowTest = false) {
    this.config = config;
    this.workflowTest = workflowTest;
    this.messages = [];
    this.currentPlan = null;
    this.isProcessing = false;
    this.mcpEnabled = false;
    this.mcpTools = [];

    // 初始化工具执行器上下文
    setToolExecutorContext(config);

    // 流式更新节流配置（Buffer + Throttle）
    this.streamUpdate = {
      lastUpdateTime: 0,
      queuedTokens: [],
      interval: config?.ui?.streamUpdate?.interval || 1000, // 默认1秒
      bufferSize: config?.ui?.streamUpdate?.bufferSize || 50, // 缓冲区大小
      updateOnPunctuation: config?.ui?.streamUpdate?.updateOnPunctuation !== false // 默认启用标点更新
    };
  }

  /**
   * 初始化对话
   */
  async initialize() {
    // 初始化日志
    await initLogger();
    await logConfig(this.config);

    // 初始化 MCP Servers（如果启用）
    await this.initializeMCP();

    // 加载历史（使用项目路径）
    const history = loadHistory(this.config.behavior.workingDir);
    // SDK 不接受 role: 'tool' 的消息，只保留 user 和 assistant 消息
    this.messages = history
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));

    // 构建系统提示（现在是异步的）
    await this.buildSystemPrompt();
    return this;
  }

  /**
   * 初始化 MCP Servers
   */
  async initializeMCP() {
    // 检查是否启用 MCP
    if (!this.config.mcp?.enabled) {
      console.log('[MCP] MCP Client is disabled in config');
      return;
    }

    if (!this.config.mcp?.servers || Object.keys(this.config.mcp.servers).length === 0) {
      console.log('[MCP] No MCP Servers configured');
      return;
    }

    try {
      console.log('[MCP] Initializing MCP Client...');

      const manager = getMCPClientManager();

      // 显示配置来源
      const { loadProjectConfig } = await import('./config.js');
      const projectConfig = loadProjectConfig(this.config.behavior.workingDir);
      if (Object.keys(projectConfig).length > 0) {
        console.log('[MCP] Using project-local MCP configuration');
      }

      // 连接到所有配置的 MCP Servers
      await manager.connectServers(this.config.mcp.servers);

      // 获取所有 MCP 工具
      this.mcpTools = manager.getAllTools();
      this.mcpEnabled = true;

      console.log(`[MCP] ✓ Loaded ${this.mcpTools.length} tools from MCP Servers`);

      // 显示工具列表
      if (this.mcpTools.length > 0) {
        console.log('[MCP] Available MCP tools:');
        for (const tool of this.mcpTools) {
          console.log(`  - ${tool.name} [from ${tool.serverName}]`);
        }
      }
    } catch (error) {
      console.error(`[MCP] Failed to initialize: ${error.message}`);
      console.error('[MCP] MCP features will be disabled');
      this.mcpEnabled = false;
    }
  }

  /**
   * 获取所有工具（包括内置工具和 MCP 工具）
   */
  async getAllTools() {
    if (this.mcpEnabled) {
      return await getAllToolDefinitions(
        this.config.tools.enabled,
        true // include MCP tools
      );
    } else {
      return getToolDefinitions(this.config.tools.enabled);
    }
  }

  /**
   * 构建系统提示（使用 prompt-builder 模块）
   */
  async buildSystemPrompt() {
    const { getSystemPrompt } = await import('./prompt-builder.js');
    this.systemPrompt = await getSystemPrompt(this.config, this.workflowTest);

    // 添加 workflow 测试提示词（如果需要）
    if (this.workflowTest) {
      this.systemPrompt += WORKFLOW_SYSTEM_PROMPT;
    }
  }

  /**
   * 发送消息
   * 工具调用循环：
   * 1. 发送消息给 AI
   * 2. 如果 AI 调用工具，执行工具并发送结果回 AI
   * 3. 重复直到 AI 完成响应
   */
  async sendMessage(userMessage, onProgress = null, options = {}) {
    if (this.isProcessing) {
      throw new Error('Already processing a message');
    }
    this.isProcessing = true;

    try {
      // 记录用户消息
      await logUserMessage(userMessage);

      // 添加用户消息
      this.messages.push({
        role: MessageType.USER,
        content: userMessage
      });

      // 获取 AI 客户端
      const aiClient = await createAIClient(this.config);

      // 获取工具定义（包括内置工具和 MCP 工具）
      const tools = await this.getAllTools();

      // 手动处理工具调用循环 - 全部使用流式 API
      let currentMessages = [...this.messages];
      let fullTextContent = '';
      let hasToolCalls = false;

      await logAIRequest(currentMessages, { system: this.systemPrompt, tools: tools.map(t => t.name) });

      // 工具调用循环
      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      // 重置流式更新状态
      this.streamUpdate.lastUpdateTime = 0;
      this.streamUpdate.queuedTokens = [];

      while (true) {
        // 使用流式 API 发送消息
        const response = await aiClient.chatStream(
          currentMessages,
          {
            system: this.systemPrompt,
            tools: tools,
            temperature: 0.7,
            thinking: process.env.CLOSER_THINKING_ENABLED !== '0' ? { type: 'enabled', budget_tokens: 20000 } : { type: 'disabled' }
          },
          (chunk) => {
            // 处理流式事件
            if (chunk.type === 'thinking') {
              if (typeof onProgress === 'function') {
                onProgress({
                  type: 'thinking',
                  delta: chunk.delta,      // 增量内容
                  snapshot: chunk.snapshot  // 完整快照
                });
              }
            } else if (chunk.type === 'signature') {
              if (typeof onProgress === 'function') {
                onProgress({
                  type: 'thinking_signature',
                  signature: chunk.signature
                });
              }
            } else if (chunk.type === 'text') {
              // 流式文本 - 使用 Buffer + Throttle 策略
              if (typeof onProgress === 'function') {
                const now = Date.now();
                const timeSinceLastUpdate = now - this.streamUpdate.lastUpdateTime;

                // 累积 token
                this.streamUpdate.queuedTokens.push(chunk.delta);
                const combinedContent = this.streamUpdate.queuedTokens.join('');

                // 检查是否应该更新（满足任一条件）
                const shouldUpdate =
                  timeSinceLastUpdate >= this.streamUpdate.interval || // 条件1: 时间间隔（1秒）
                  this.streamUpdate.queuedTokens.length >= this.streamUpdate.bufferSize || // 条件2: 缓冲区满
                  (this.streamUpdate.updateOnPunctuation && /[.!?。！？]\s*$/.test(combinedContent)); // 条件3: 句子结束

                if (shouldUpdate) {
                  onProgress({
                    type: 'token',
                    content: combinedContent
                  });

                  this.streamUpdate.queuedTokens = [];
                  this.streamUpdate.lastUpdateTime = now;
                }
              }
            } else if (chunk.type === 'content_block_start') {
              // 检测到工具调用块开始
              if (chunk.blockType === 'tool_use') {
                if (typeof onProgress === 'function') {
                  onProgress({
                    type: 'tool_use_start',
                    toolName: chunk.block.name,
                    toolId: chunk.block.id
                  });
                }
              }
            }
          }
        );

        // 累加token使用量
        if (response.usage) {
          totalInputTokens += response.usage.input_tokens || 0;
          totalOutputTokens += response.usage.output_tokens || 0;
        }

        // 检查是否有工具调用
        const toolUseBlocks = response.content.filter(block => block.type === 'tool_use');

        if (toolUseBlocks.length === 0) {
          // 没有工具调用，先发送剩余的 tokens
          if (this.streamUpdate.queuedTokens.length > 0 && typeof onProgress === 'function') {
            const remainingContent = this.streamUpdate.queuedTokens.join('');
            onProgress({
              type: 'token',
              content: remainingContent
            });
            this.streamUpdate.queuedTokens = [];
          }

          // 提取最终文本内容（用于保存历史）
          fullTextContent = response.content
            .filter(block => block.type === 'text')
            .map(block => block.text)
            .join('\n');

          // 更新消息历史
          this.messages.push({
            role: MessageType.ASSISTANT,
            content: response.content
          });
          break;
        }

        hasToolCalls = true;

        // 添加助手响应（包含工具调用）到 currentMessages（用于下一轮 AI 请求）
        currentMessages.push({
          role: MessageType.ASSISTANT,
          content: response.content
        });

        // 同时添加到 this.messages（用于保存历史）
        this.messages.push({
          role: MessageType.ASSISTANT,
          content: response.content
        });

        // 处理工具调用
        for (const block of toolUseBlocks) {
          if (typeof onProgress === 'function') {
            onProgress({
              type: 'tool_start',
              tool: block.name,
              input: block.input
            });
          }

          // 检测 AI Planning
          const detectedPlan = this.detectAIPlanning(block.name, block.input);
          if (detectedPlan && typeof onProgress === 'function') {
            onProgress({
              type: 'plan_created',
              plan: detectedPlan
            });
          }

          // 查找对应的 betaZodTool
          const tool = tools.find(t => t.name === block.name);
          if (!tool) {
            throw new Error(`Tool ${block.name} not found`);
          }

          // 执行工具
          const result = await tool.run(block.input);

          // 记录工具调用
          await logToolCall(block.name, block.input, result);

          // 更新 AI Planning 步骤
          const planUpdated = this.updateAIPlanningStep(block.name, result);
          if (planUpdated && typeof onProgress === 'function') {
            onProgress({
              type: 'plan_progress',
              plan: this.currentPlan
            });
          }

          if (typeof onProgress === 'function') {
            onProgress({
              type: 'tool_complete',
              tool: block.name,
              result: JSON.parse(result)
            });
          }

          // 添加工具结果到 currentMessages（用于下一次 AI 请求）
          currentMessages.push({
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: block.id,
              content: result
            }]
          });

          // 同时添加到 this.messages（用于保存历史）
          this.messages.push({
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: block.id,
              content: result
            }]
          });
        }
      }

      // 提取最终文本内容
      const lastMessage = this.messages[this.messages.length - 1];
      let textContent = fullTextContent;

      if (!textContent && lastMessage?.content) {
        // 先提取 thinking 相关内容（包括 thinking 和 redacted_thinking）
        const thinkingBlocks = lastMessage.content.filter(block =>
          block.type === 'thinking' || block.type === 'redacted_thinking'
        );

        if (thinkingBlocks.length > 0 && typeof onProgress === 'function') {
          for (const block of thinkingBlocks) {
            if (block.type === 'thinking') {
              onProgress({
                type: 'thinking',
                content: block.thinking,
                signature: block.signature
              });
            } else if (block.type === 'redacted_thinking') {
              onProgress({
                type: 'thinking_redacted',
                content: block.data
              });
            }
          }
        }

        // 再提取文本内容
        textContent = lastMessage.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('\n') || '';
      }

      // 记录 AI 响应
      await logAIResponse({ content: [{ type: 'text', text: textContent }] });

      // 保存历史
      saveHistory(this.messages);

      return {
        content: textContent,
        toolCalls: hasToolCalls ? ['executed'] : [],
        usage: {
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
          total_tokens: totalInputTokens + totalOutputTokens
        }
      };
    } catch (error) {
      await logAIError(error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 发送消息（流式响应）
   * 注意：toolRunner 不支持流式，所以这里使用普通的 chatStream
   */
  async sendMessageStream(userMessage, onProgress = null) {
    if (this.isProcessing) {
      throw new Error('Already processing a message');
    }
    this.isProcessing = true;

    try {
      // 记录用户消息
      await logUserMessage(userMessage);

      // 添加用户消息
      this.messages.push({
        role: MessageType.USER,
        content: userMessage
      });

      // 获取 AI 客户端
      const aiClient = await createAIClient(this.config);

      // 获取工具定义（包括内置工具和 MCP 工具）
      const tools = await this.getAllTools();

      // 流式响应处理
      let fullResponse = {
        role: 'assistant',
        content: []
      };

      // 重置流式更新状态
      this.streamUpdate.lastUpdateTime = 0;
      this.streamUpdate.queuedTokens = [];

      await logAIRequest(this.messages, { system: this.systemPrompt });

      await aiClient.chatStream(
        this.messages,
        {
          system: this.systemPrompt,
          tools: tools,
          thinking: options.thinking || (process.env.CLOSER_THINKING_ENABLED !== '0' ? { type: 'enabled', budget_tokens: 20000 } : { type: 'disabled' })
        },
        (chunk) => {
          // 处理 thinking 事件（使用 SDK 事件监听器 API）
          if (chunk.type === 'thinking') {
            if (typeof onProgress === 'function') {
              onProgress({
                type: 'thinking',
                content: chunk.delta,      // 增量内容
                snapshot: chunk.snapshot   // 完整快照
              });
            }
          }
          // 处理 signature 事件（thinking 签名）
          else if (chunk.type === 'signature') {
            if (typeof onProgress === 'function') {
              onProgress({
                type: 'thinking_signature',
                signature: chunk.signature
              });
            }
          }
          // 处理文本事件 - 使用 Buffer + Throttle 策略
          else if (chunk.type === 'text') {
            if (typeof onProgress === 'function') {
              const now = Date.now();
              const timeSinceLastUpdate = now - this.streamUpdate.lastUpdateTime;

              // 累积 token
              this.streamUpdate.queuedTokens.push(chunk.delta);
              const combinedContent = this.streamUpdate.queuedTokens.join('');

              // 检查是否应该更新（满足任一条件）
              const shouldUpdate =
                timeSinceLastUpdate >= this.streamUpdate.interval || // 条件1: 时间间隔（1秒）
                this.streamUpdate.queuedTokens.length >= this.streamUpdate.bufferSize || // 条件2: 缓冲区满
                (this.streamUpdate.updateOnPunctuation && /[.!?。！？]\s*$/.test(combinedContent)); // 条件3: 句子结束

              if (shouldUpdate) {
                onProgress({
                  type: 'token',
                  content: combinedContent
                });

                this.streamUpdate.queuedTokens = [];
                this.streamUpdate.lastUpdateTime = now;
              }
            }
          }
        }
      );

      // 发送剩余的 tokens
      if (this.streamUpdate.queuedTokens.length > 0 && typeof onProgress === 'function') {
        const remainingContent = this.streamUpdate.queuedTokens.join('');
        onProgress({
          type: 'token',
          content: remainingContent
        });
        this.streamUpdate.queuedTokens = [];
      }

      return fullResponse;
    } catch (error) {
      await logAIError(error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 清除对话历史
   */
  clearHistory() {
    this.messages = [];
    saveHistory([]);
  }

  /**
   * 获取对话摘要
   */
  getSummary() {
    return {
      messageCount: this.messages.length,
      hasPlan: !!this.currentPlan,
      planStatus: this.currentPlan?.status,
      lastMessage: this.messages[this.messages.length - 1]
    };
  }

  /**
   * 导出对话
   */
  export() {
    return {
      messages: this.messages,
      plan: this.currentPlan,
      summary: this.getSummary()
    };
  }

  /**
   * 导入对话
   */
  import(data) {
    this.messages = data.messages || [];
    this.currentPlan = data.plan || null;
    saveHistory(this.messages);
  }

  /**
   * 创建计划
   */
  createPlan(description, type = PlanType.AUTO) {
    const plan = new Plan(description, type);
    this.currentPlan = plan;
    return plan;
  }

  /**
   * 执行计划（/plan 命令）
   */
  async planAndExecute(taskDescription, onProgress) {
    try {
      // 创建计划
      const plan = this.createPlan(taskDescription, PlanType.COMMAND);

      if (typeof onProgress === 'function') {
        onProgress({
          type: 'plan_created',
          plan
        });
      }

      // 让 AI 分析任务并生成步骤
      plan.start();

      // 添加分析步骤
      const analysisStep = plan.addStep('分析任务需求');
      plan.updateStep(analysisStep.id, StepStatus.IN_PROGRESS);

      // 发送任务给 AI，让它生成执行步骤
      const prompt = `请分析以下任务，并生成详细的执行步骤列表。每个步骤应该是一个具体的、可执行的操作。

任务：${taskDescription}

请以 JSON 格式返回步骤列表，格式如下：
[
  {"description": "步骤1描述"},
  {"description": "步骤2描述"},
  ...
]

只返回 JSON，不要其他内容。`;

      const analysis = await this.sendMessage(prompt);

      // 解析 AI 返回的步骤
      let steps = [];
      try {
        // 尝试从响应中提取 JSON
        const jsonMatch = analysis.content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          steps = JSON.parse(jsonMatch[0]);
        }
      } catch (error) {
        console.error('Failed to parse steps:', error);
        // 如果解析失败，使用默认步骤
        steps = [{ description: taskDescription }];
      }

      plan.updateStep(analysisStep.id, StepStatus.COMPLETED);

      // 添加解析出的步骤
      steps.forEach(step => {
        plan.addStep(step.description);
      });

      if (typeof onProgress === 'function') {
        onProgress({
          type: 'plan_ready',
          plan
        });
      }

      // 逐步执行
      for (const step of plan.steps) {
        if (step.status === StepStatus.PENDING) {
          plan.updateStep(step.id, StepStatus.IN_PROGRESS);

          if (typeof onProgress === 'function') {
            onProgress({
              type: 'step_start',
              plan,
              step
            });
          }

          // 让 AI 执行这个步骤
          try {
            const result = await this.sendMessage(`执行步骤：${step.description}`);
            plan.updateStep(step.id, StepStatus.COMPLETED, result);

            if (typeof onProgress === 'function') {
              onProgress({
                type: 'step_complete',
                plan,
                step
              });
            }
          } catch (error) {
            plan.updateStep(step.id, StepStatus.FAILED, error.message);

            if (typeof onProgress === 'function') {
              onProgress({
                type: 'step_failed',
                plan,
                step,
                error
              });
            }

            // 失败后停止执行
            plan.fail(error.message);
            break;
          }
        }
      }

      return {
        success: plan.status !== PlanStatus.FAILED,
        plan
      };
    } catch (error) {
      console.error('planAndExecute error:', error);
      if (this.currentPlan) {
        this.currentPlan.fail(error.message);
      }
      throw error;
    }
  }

  /**
   * 学习项目模式（/learn 命令）
   */
  async learnProject() {
    const plan = this.createPlan('学习项目模式和代码结构', PlanType.COMMAND);
    plan.start();

    // 添加学习步骤
    const steps = [
      '读取项目配置文件 (package.json, README.md)',
      '分析源代码目录结构',
      '识别主要模块和依赖关系',
      '总结项目模式和最佳实践'
    ];

    steps.forEach(desc => plan.addStep(desc));

    // 执行学习
    for (const step of plan.steps) {
      step.status = StepStatus.IN_PROGRESS;

      try {
        // 根据步骤描述执行相应的操作
        if (step.description.includes('package.json')) {
          await this.sendMessage('读取并分析 package.json 文件');
        } else if (step.description.includes('README')) {
          await this.sendMessage('读取并分析 README.md 文件');
        } else if (step.description.includes('目录结构')) {
          await this.sendMessage('列出并分析项目的目录结构');
        } else if (step.description.includes('模块')) {
          await this.sendMessage('分析项目的主要模块和依赖关系');
        } else if (step.description.includes('总结')) {
          await this.sendMessage('总结这个项目的模式和最佳实践');
        }

        step.status = StepStatus.COMPLETED;
      } catch (error) {
        step.status = StepStatus.FAILED;
        step.result = error.message;
      }
    }

    plan.complete();

    return {
      success: true,
      plan
    };
  }

  /**
   * 检测并创建 AI Planning（自动检测）
   */
  detectAIPlanning(toolName, toolInput) {
    // 检测是否在写入 .closer_plan/ 目录
    if (toolName === 'writeFile' && toolInput.filePath) {
      const filePath = toolInput.filePath;
      if (filePath.includes('.closer_plan/') || filePath.includes('.closer_plan\\')) {
        // 提取文件名作为任务描述
        const fileName = filePath.split('/').pop().split('\\').pop();
        const description = `AI Planning: ${fileName.replace('.md', '')}`;

        // 如果当前没有 plan，或者 plan 类型不匹配，创建新的
        if (!this.currentPlan || this.currentPlan.type !== PlanType.AUTO) {
          const plan = this.createPlan(description, PlanType.AUTO);
          plan.start();

          // 添加步骤
          plan.addStep('分析任务需求');
          plan.addStep('执行操作');
          plan.addStep('生成规划文档');

          // 标记第一个步骤为进行中
          const firstStep = plan.steps[0];
          plan.updateStep(firstStep.id, StepStatus.IN_PROGRESS);

          return plan;
        }
      }
    }

    return null;
  }

  /**
   * 更新 AI Planning 步骤
   */
  updateAIPlanningStep(toolName, result) {
    if (this.currentPlan && this.currentPlan.type === PlanType.AUTO) {
      const currentStep = this.currentPlan.getCurrentStep();
      if (currentStep) {
        // 标记当前步骤完成
        this.currentPlan.updateStep(currentStep.id, StepStatus.COMPLETED, result);

        // 开始下一个步骤
        const nextStep = this.currentPlan.getNextStep();
        if (nextStep) {
          this.currentPlan.updateStep(nextStep.id, StepStatus.IN_PROGRESS);
        } else {
          // 所有步骤完成
          this.currentPlan.complete();
        }

        return true;
      }
    }
    return false;
  }
}

/**
 * 创建对话会话（使用 SDK）
 * @param {Object} config - 配置对象
 * @param {boolean} workflowTest - 是否为 workflow 测试模式
 */
export async function createConversation(config, workflowTest = false) {
  const conversation = new Conversation(config, workflowTest);
  await conversation.initialize();
  return conversation;
}
