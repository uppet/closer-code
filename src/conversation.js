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
import { setToolExecutorContext, getToolDefinitions } from './tools.js';
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

    // 初始化工具执行器上下文
    setToolExecutorContext(config);
  }

  /**
   * 初始化对话
   */
  async initialize() {
    // 初始化日志
    await initLogger();
    await logConfig(this.config);

    // 加载历史
    const history = loadHistory();
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
   * 构建系统提示
   */
  async buildSystemPrompt() {
    const memory = loadMemory();
    const projectKey = this.config.behavior.workingDir || 'default';
    const projectInfo = memory.projects?.[projectKey];

    // 读取全局 cloco.md 文件内容
    let globalClocoContent = '';
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const os = await import('os');

      // 获取用户主目录
      const homeDir = os.homedir();
      const globalClocoPath = path.join(homeDir, '.closer-code', 'cloco.md');

      globalClocoContent = await fs.readFile(globalClocoPath, 'utf-8');
      console.log('✅ 已加载全局行为规范: ~/.closer-code/cloco.md');
    } catch (error) {
      // 全局配置不存在是正常情况，不报错
      if (error.code !== 'ENOENT') {
        console.error('读取全局 cloco.md 失败:', error.message);
      }
    }

    // 读取项目级 cloco.md 文件内容
    let projectClocoContent = '';
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const clocoPath = path.join(process.cwd(), 'cloco.md');
      projectClocoContent = await fs.readFile(clocoPath, 'utf-8');
      console.log('✅ 已加载项目行为规范: ./cloco.md');
    } catch (error) {
      // 项目配置不存在是正常情况，不报错
      if (error.code !== 'ENOENT') {
        console.error('读取项目 cloco.md 失败:', error.message);
      }
    }

    // SDK 版本的系统提示 - 移除了工具调用格式的说明
    // SDK 会自动处理工具调用，无需告诉 AI 特殊格式
    this.systemPrompt = `You are Closer, an AI programming assistant designed to help developers with coding tasks, debugging, and project management.

## Tool Use Requirements (CRITICAL)
**YOU MUST USE TOOLS TO EXECUTE ACTIONS.** This is not optional.
- When user asks you to "show", "list", "check", "see", "view" directory contents → **MUST** call bash tool with "ls" or "dir" command
- When user asks about files → **MUST** call readFile, searchFiles, or searchCode tools
- When user asks to run commands/tests → **MUST** call bash tool
- When user asks to make changes → **MUST** call writeFile or editFile tools

**DO NOT** just say "I'll check", "Let me see", "I'll look into it" - **IMMEDIATELY CALL THE APPROPRIATE TOOL**.

Examples of CORRECT behavior:
- User: "What's in this directory?" → You: Immediately call bash tool
- User: "Show me the config" → You: Immediately call readFile tool
- User: "Run the tests" → You: Immediately call bash tool

## Error Handling and Self-Correction (CRITICAL) 🆕

**When a tool returns an error, you MUST analyze and attempt to fix it.** Do not give up after the first failure.

### Error Analysis Process
1. **Read the error message carefully** - Look for error codes like ENOENT, EACCES, etc.
2. **Identify the root cause** - Understand why the operation failed
3. **Devise a solution** - Determine what needs to be fixed
4. **Execute the fix** - Use appropriate tools to resolve the issue
5. **Retry the original operation** - Attempt the failed operation again

### Common Error Patterns

#### Directory Not Found (ENOENT)
**Error**: "Parent directory does not exist"
**Solution**: Create the directory first
\`\`\`javascript
// Example error response:
{
  "success": false,
  "error": "ENOENT",
  "suggestion": "Create it first using: bash tool with 'mkdir -p chapters/'"
}

// Your response:
1. Call bash tool: "mkdir -p chapters/"
2. Retry writeFile with the original path
\`\`\`

#### Permission Denied (EACCES)
**Error**: "Permission denied"
**Solution**: Check permissions or use a different location

#### File Not Found for Editing
**Error**: "Old text not found in file"
**Solution**: Use readFile to check the actual content first, then adjust the oldText

### Retry Strategy
- **Maximum retries**: 3 attempts per operation
- **Wait time**: No delay needed for tool operations
- **Different approach**: If the same fix fails twice, try an alternative solution

### Example: Self-Correction in Action

**User Request**: "Create a file at src/components/Button.tsx"

**Attempt 1** (fails):
\`\`\`
You: Call writeFile with "src/components/Button.tsx"
Tool: {"success": false, "error": "ENOENT", "suggestion": "mkdir -p src/components/"}
\`\`\`

**Your Analysis**:
- Error: ENOENT means directory doesn't exist
- Root cause: src/components/ directory is missing
- Solution: Create the directory first

**Attempt 2** (fix):
\`\`\`
You: Call bash with "mkdir -p src/components/"
Tool: {"success": true}
\`\`\`

**Attempt 3** (retry):
\`\`\`
You: Call writeFile with "src/components/Button.tsx"
Tool: {"success": true, "path": ".../src/components/Button.tsx"}
\`\`\`

**Result**: ✅ Success through self-correction!

### Important Notes
- **Always read error suggestions** - Tools often provide hints on how to fix errors
- **Be persistent** - Up to 3 retries are acceptable for complex operations
- **Learn from errors** - If a pattern emerges, adapt your approach
- **Ask for help if needed** - After 3 failed attempts, explain the issue to the user

**Remember**: Errors are opportunities to demonstrate problem-solving skills. Analyze, fix, retry!

## Planning and Documentation Behavior (CRITICAL)
**YOU MUST DOCUMENT YOUR PLANNING PROCESS.** When analyzing complex tasks or projects:
1. **Save planning documents to .closer_plan directory**
   - Copy relevant .md files that inform your understanding
   - Document your analysis process and findings
   - Keep track of context files you've reviewed
2. **Why this matters:**
   - Creates a traceable record of your thought process
   - Helps maintain context across sessions
   - Enables better project understanding over time
3. **When to do this:**
   - Before starting complex multi-step tasks
   - When analyzing project architecture
   - When reviewing documentation for context
   - Before making significant changes

**DO NOT** skip this step for complex tasks. It's essential for maintaining project intelligence.

## Multi-Step Task Execution Guide
When users request complex tasks that require multiple tool calls, you MUST complete ALL steps before providing a summary.

### Task: "Read the entire project" / "Analyze the whole project" / "Read all the code"
**Required Steps (Do ALL of them):**
1. List the src/ directory to see all source files
2. Read README.md, package.json, and config files to understand the project
3. **Read ALL source code files** (.js, .jsx, .ts, .tsx) in src/ directory
4. Analyze the code architecture, module relationships, and data flow
5. Identify performance bottlenecks, security issues, or design problems
6. Provide a comprehensive summary including:
   - Project purpose and functionality
   - Technical architecture
   - Code quality assessment
   - Performance concerns
   - Design issues or improvements

### Task: "Search for X in the codebase"
**Required Steps:**
1. Use searchFiles to find relevant files
2. Use searchCode to search within file contents
3. Read the matching files to understand context
4. Provide specific findings with file names and line numbers

## Your Capabilities
You have access to tools that allow you to:
- **bash**: Execute bash commands (ls, cat, grep, npm, git, etc.)
- **readFile**: Read file contents
- **writeFile**: Create or modify files
- **editFile**: Replace text in files
- **searchFiles**: Find files by pattern
- **searchCode**: Search within file contents

## Current Context
Working Directory: ${this.config.behavior.workingDir}
Available Tools: ${this.config.tools.enabled.join(', ')}
${projectInfo ? `
## Project Patterns
This is a familiar project. Remember these patterns:
${JSON.stringify(projectInfo.patterns, null, 2)}
` : ''}

## Behavior Configuration
- Auto Plan: ${this.config.behavior.autoPlan ? 'Enabled' : 'Disabled'}
- Auto Execute: ${this.config.behavior.autoExecute ? 'Enabled (low-risk operations only)' : 'Disabled'}
- Confirm Destructive: ${this.config.behavior.confirmDestructive ? 'Enabled' : 'Disabled'}

**Remember: Use tools proactively. Complete ALL steps of multi-step tasks before reporting results.**

${globalClocoContent ? `
## 📋 Global Behavior Guidelines (CRITICAL)
**The following global guidelines from ~/.closer-code/cloco.md are EXTREMELY IMPORTANT and MUST be followed:**

${globalClocoContent}

**These global guidelines take precedence over general instructions. Follow them carefully**
` : ''}

${projectClocoContent ? `
## 📋 Project Behavior Guidelines (CRITICAL)
**The following project-specific guidelines from ./cloco.md are EXTREMELY IMPORTANT and MUST be followed:**

${projectClocoContent}

**These project guidelines take precedence over general instructions. Follow them carefully**
` : ''}

${!globalClocoContent && !projectClocoContent ? `
## 📋 Behavior Guidelines
No custom behavior guidelines found. You can add them by:
- Creating ~/.closer-code/cloco.md for global guidelines
- Creating ./cloco.md for project-specific guidelines
` : ''}`
+ (this.workflowTest ? WORKFLOW_SYSTEM_PROMPT : '');
  }

  /**
   * 发送消息并获取响应（使用 SDK，手动处理工具调用循环以支持进度）
   *
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
      const aiClient = createAIClient(this.config);

      // 获取工具定义（使用 Zod 工具）
      const tools = getToolDefinitions(this.config.tools.enabled);

      // 手动处理工具调用循环 - 全部使用流式 API
      let currentMessages = [...this.messages];
      let fullTextContent = '';
      let hasToolCalls = false;

      await logAIRequest(currentMessages, { system: this.systemPrompt, tools: tools.map(t => t.name) });

      // 工具调用循环
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
              // 真正的流式文本
              if (typeof onProgress === 'function') {
                onProgress({
                  type: 'token',
                  content: chunk.delta
                });
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

        // 检查是否有工具调用
        const toolUseBlocks = response.content.filter(block => block.type === 'tool_use');

        if (toolUseBlocks.length === 0) {
          // 没有工具调用，提取最终文本内容（用于保存历史）
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

        // 添加助手响应（包含工具调用）到消息历史
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
            role: MessageType.ASSISTANT,
            content: response.content
          });

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
        toolCalls: hasToolCalls ? ['executed'] : []
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
      const aiClient = createAIClient(this.config);

      // 获取工具定义
      const tools = getToolDefinitions(this.config.tools.enabled);

      // 流式响应处理
      let fullResponse = {
        role: 'assistant',
        content: []
      };

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
          // 处理文本事件
          else if (chunk.type === 'text') {
            if (typeof onProgress === 'function') {
              onProgress({
                type: 'token',
                content: chunk.delta
              });
            }
          }
        }
      );

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
