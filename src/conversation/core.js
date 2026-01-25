/**
 * Core Conversation - 核心对话管理
 *
 * 负责：
 * - 对话状态管理
 * - 消息历史管理
 * - 系统提示词构建
 * - 整合所有子模块
 */

import Anthropic from '@anthropic-ai/sdk';
import { createAIClient } from '../ai-client.js';
import { setToolExecutorContext, getToolDefinitions, getAllToolDefinitions } from '../tools.js';
import { loadHistory, saveHistory } from '../config.js';
import {
  initLogger,
  logConfig,
  logUserMessage,
  logAIRequest,
  logAIResponse,
  logAIError,
  logSessionSummary
} from '../logger.js';
import { AbortFenceManager } from './abort-fence.js';
import { StreamHandler } from './stream-handler.js';
import { MCPIntegration } from './mcp-integration.js';
import { PlanManager } from './plan-manager.js';
import { ToolExecutor } from './tool-executor.js';

// 消息类型
export const MessageType = {
  USER: 'user',
  ASSISTANT: 'assistant',
  TOOL: 'tool',
  SYSTEM: 'system',
  ERROR: 'error'
};

// Workflow 测试模式的前置提示词
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
 * 对话会话（重构版）
 */
export class Conversation {
  constructor(config, workflowTest = false) {
    this.config = config;
    this.workflowTest = workflowTest;
    this.messages = [];
    this.isProcessing = false;

    // 初始化子模块
    this.abortFence = new AbortFenceManager();
    this.streamHandler = new StreamHandler(config?.ui?.streamUpdate);
    this.mcpIntegration = new MCPIntegration(config);
    this.planManager = new PlanManager(this);
    this.toolExecutor = new ToolExecutor(this, this.planManager);

    // 初始化工具执行器上下文
    setToolExecutorContext(config);

    // 初始化技能系统（如果启用）
    this.skillRegistry = null;
    this.conversationState = null;
    this.skillsEnabled = config.skills?.enabled ?? false;
  }

  /**
   * 初始化对话
   */
  async initialize() {
    // 初始化日志
    await initLogger();
    await logConfig(this.config);

    // 初始化 MCP Servers
    await this.mcpIntegration.initialize();

    // 初始化技能系统（如果启用）
    if (this.skillsEnabled) {
      await this.initializeSkills();
    }

    // 加载历史
    const history = loadHistory(this.config.behavior.workingDir);
    // SDK 不接受 role: 'tool' 的消息
    this.messages = history
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));

    // 构建系统提示
    await this.buildSystemPrompt();
    return this;
  }

  /**
   * 初始化技能系统
   */
  async initializeSkills() {
    try {
      const { createSkillRegistry } = await import('../skills/index.js');
      const { createConversationState } = await import('../skills/index.js');
      const { createSkillTools } = await import('../skills/index.js');
      const { setSkillTools } = await import('../tools.js');
      const path = await import('path');
      const os = await import('os');

      // 创建技能注册表
      this.skillRegistry = createSkillRegistry({
        globalDir: path.join(os.homedir(), '.closer-code', 'skills'),
        projectDir: path.join(this.config.behavior.workingDir, '.closer-code', 'skills'),
        residentSkills: this.config.skills?.resident || []
      });

      // 初始化注册表
      await this.skillRegistry.initialize();

      // 创建会话状态
      this.conversationState = createConversationState();

      // 创建并注册技能工具
      const skillTools = createSkillTools(this.skillRegistry, this.conversationState);
      setSkillTools(skillTools);

      console.log('[Skills] System initialized');
    } catch (error) {
      console.error('[Skills] Failed to initialize:', error.message);
      // 不抛出错误，继续运行（只是不启用技能系统）
      this.skillsEnabled = false;
    }
  }

  /**
   * 构建系统提示
   */
  async buildSystemPrompt() {
    const { getSystemPrompt } = await import('../prompt-builder.js');

    // 获取已加载的技能
    const activeSkills = this.skillsEnabled && this.conversationState
      ? this.conversationState.getActiveSkills()
      : [];

    this.systemPrompt = await getSystemPrompt(this.config, this.workflowTest, activeSkills);

    // 添加 workflow 测试提示词（如果需要）
    if (this.workflowTest) {
      this.systemPrompt += WORKFLOW_SYSTEM_PROMPT;
    }
  }

  /**
   * 获取所有工具（包括内置工具和 MCP 工具）
   */
  async getAllTools() {
    if (this.mcpIntegration.isEnabled()) {
      return await getAllToolDefinitions(
        this.config.tools.enabled,
        true // include MCP tools
      );
    } else {
      return getToolDefinitions(this.config.tools.enabled);
    }
  }

  /**
   * 发送消息
   */
  async sendMessage(userMessage, onProgress = null, options = {}) {
    if (this.isProcessing) {
      throw new Error('Already processing a message');
    }
    this.isProcessing = true;

    // 开始新的对话阶段
    const phaseId = this.abortFence.beginPhase();

    // 创建 AbortController
    const abortController = new AbortController();
    this.abortFence.registerAbortHandler('network', () => {
      abortController.abort();
    });

    try {
      // 检查初始 abort
      if (this.abortFence.isAborted(phaseId)) {
        console.log(`[AbortFence] Phase ${phaseId} aborted before processing`);
        return this.abortFence.createAbortResult('aborted_before_processing');
      }

      // 记录用户消息
      await logUserMessage(userMessage);

      // 添加用户消息
      this.messages.push({
        role: MessageType.USER,
        content: userMessage
      });

      // 获取 AI 客户端
      const aiClient = await createAIClient(this.config);

      // 获取工具定义
      const tools = await this.getAllTools();

      // 手动处理工具调用循环
      let currentMessages = [...this.messages];

      // DeepSeek-R1: 清除历史中的 reasoning_content
      if (aiClient.clearReasoningContent) {
        currentMessages = aiClient.clearReasoningContent(currentMessages);
      }

      await logAIRequest(currentMessages, { system: this.systemPrompt, tools: tools.map(t => t.name) });

      // 重置流式更新状态
      this.streamHandler.reset();

      // 执行工具调用循环
      const loopResult = await this.toolExecutor.executeToolLoop(
        currentMessages,
        tools,
        aiClient,
        {
          systemPrompt: this.systemPrompt,
          onProgress,
          phaseId,
          isAborted: (id) => this.abortFence.isAborted(id),
          abortController
        }
      );

      // 提取最终文本内容
      const lastMessage = this.messages[this.messages.length - 1];
      let textContent = loopResult.fullTextContent;

      if (!textContent && lastMessage?.content) {
        // 检查 content 是否为数组（AI 消息）还是字符串（用户消息）
        if (Array.isArray(lastMessage.content)) {
          // 提取 thinking 相关内容
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

          // 提取文本内容
          textContent = lastMessage.content
            .filter(block => block.type === 'text')
            .map(block => block.text)
            .join('\n') || '';
        } else {
          // content 是字符串（用户消息），直接使用
          textContent = lastMessage.content;
        }
      }

      // 记录 AI 响应
      await logAIResponse({ content: [{ type: 'text', text: textContent }] });

      // 保存历史
      saveHistory(this.messages);

      return {
        content: textContent,
        toolCalls: loopResult.hasToolCalls ? ['executed'] : [],
        usage: {
          input_tokens: loopResult.totalInputTokens,
          output_tokens: loopResult.totalOutputTokens,
          total_tokens: loopResult.totalInputTokens + loopResult.totalOutputTokens
        }
      };
    } catch (error) {
      // 检查是否是 abort 导致的错误
      if (error.name === 'AbortError' || error.message === 'Stream aborted' || this.abortFence.isAborted(phaseId)) {
        console.log(`[AbortFence] Phase ${phaseId} aborted with error: ${error.message}`);
        await logAIError(new Error('User aborted the conversation'));
        return this.abortFence.createAbortResult('aborted_by_user');
      }

      // 其他错误正常抛出
      await logAIError(error);
      throw error;
    } finally {
      this.isProcessing = false;
      this.abortFence.unregisterAbortHandler('network');
    }
  }

  /**
   * 清除对话历史
   */
  clearHistory() {
    this.messages = [];
    saveHistory([]);
    this.abortFence.reset();
  }

  /**
   * 获取对话摘要
   */
  getSummary() {
    return {
      messageCount: this.messages.length,
      hasPlan: !!this.planManager.getCurrentPlan(),
      planStatus: this.planManager.getCurrentPlan()?.status,
      lastMessage: this.messages[this.messages.length - 1]
    };
  }

  /**
   * 导出对话
   */
  export() {
    return {
      messages: this.messages,
      plan: this.planManager.getCurrentPlan(),
      summary: this.getSummary()
    };
  }

  /**
   * 导入对话
   */
  import(data) {
    this.messages = data.messages || [];
    if (data.plan) {
      this.planManager.currentPlan = data.plan;
    }
    saveHistory(this.messages);
  }

  /**
   * 获取当前计划
   */
  get currentPlan() {
    return this.planManager.getCurrentPlan();
  }

  /**
   * 创建计划
   */
  createPlan(description, type) {
    return this.planManager.createPlan(description, type);
  }

  /**
   * 执行计划
   */
  async planAndExecute(taskDescription, onProgress) {
    return this.planManager.planAndExecute(taskDescription, onProgress);
  }

  /**
   * 学习项目
   */
  async learnProject() {
    return this.planManager.learnProject();
  }

  /**
   * 中止当前对话
   */
  async abortCurrentPhase() {
    await this.abortFence.abortCurrentPhase();
    this.isProcessing = false;
  }
}

/**
 * 创建对话会话
 */
export async function createConversation(config, workflowTest = false) {
  const conversation = new Conversation(config, workflowTest);
  await conversation.initialize();
  return conversation;
}
