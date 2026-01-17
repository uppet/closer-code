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

    // 构建系统提示
    this.buildSystemPrompt();
    return this;
  }

  /**
   * 构建系统提示
   */
  buildSystemPrompt() {
    const memory = loadMemory();
    const projectKey = this.config.behavior.workingDir || 'default';
    const projectInfo = memory.projects?.[projectKey];

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

**Remember: Use tools proactively. Complete ALL steps of multi-step tasks before reporting results.**`
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
  async sendMessage(userMessage, onProgress = null) {
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

      // 手动处理工具调用循环
      let currentMessages = [...this.messages];
      let fullTextContent = '';
      let hasToolCalls = false;

      await logAIRequest(currentMessages, { system: this.systemPrompt, tools: tools.map(t => t.name) });

      // 工具调用循环
      while (true) {
        // 发送消息给 AI
        const response = await aiClient.chat(currentMessages, {
          system: this.systemPrompt,
          tools: tools,
          temperature: 0.7
        });

        // 检查是否有工具调用
        const toolUseBlocks = response.content.filter(block => block.type === 'tool_use');

        if (toolUseBlocks.length === 0) {
          // 没有工具调用，提取文本内容并结束
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

          // 查找对应的 betaZodTool
          const tool = tools.find(t => t.name === block.name);
          if (!tool) {
            throw new Error(`Tool ${block.name} not found`);
          }

          // 执行工具
          const result = await tool.run(block.input);

          // 记录工具调用
          await logToolCall(block.name, block.input, result);

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
      const textContent = fullTextContent ||
        this.messages[this.messages.length - 1]?.content
          ?.filter(block => block.type === 'text')
          ?.map(block => block.text)
          ?.join('\n') || '';

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
          tools: tools
        },
        (chunk) => {
          // 处理流式响应块
          if (typeof onProgress === 'function') {
            onProgress({
              type: 'chunk',
              chunk: chunk
            });
          }

          // 收集响应内容
          if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
            if (typeof onProgress === 'function') {
              onProgress({
                type: 'token',
                content: chunk.delta.text
              });
            }
          } else if (chunk.type === 'message_stop') {
            if (typeof onProgress === 'function') {
              onProgress({
                type: 'done',
                message: chunk.message
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
