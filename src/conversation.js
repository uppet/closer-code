/**
 * 对话管理器 - 处理与 AI 的交互
 */

import { createAIClient, checkConfig } from './ai-client.js';
import { ToolExecutor, getToolDefinitions } from './tools.js';
import { TaskPlanner, ProblemDiagnoser } from './planner.js';
import { loadHistory, saveHistory, loadMemory } from './config.js';
import {
  initLogger,
  logConfig,
  logUserMessage,
  logAIRequest,
  logStreamStart,
  logStreamChunk,
  logStreamEnd,
  logToolCall,
  logAIError,
  logAIResponse,
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

/**
 * 对话会话
 */
export class Conversation {
  constructor(config) {
    this.config = config;
    this.messages = [];
    this.toolExecutor = new ToolExecutor(config);
    this.planner = new TaskPlanner(config);
    this.diagnoser = new ProblemDiagnoser(config);
    this.currentPlan = null;
    this.isProcessing = false;
  }

  /**
   * 初始化对话
   */
  async initialize() {
    // 初始化日志
    await initLogger();
    await logConfig(this.config);

    // 检查配置
    checkConfig(this.config);

    // 加载历史
    const history = loadHistory();
    this.messages = history.map(msg => ({
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

    this.systemPrompt = `You are Closer, an AI programming assistant designed to help developers with coding tasks, debugging, and project management.

## Your Capabilities

You have access to various tools that allow you to:
- Execute bash commands and run tests
- Read, write, and edit files
- Search through codebases
- Plan and execute complex tasks
- Diagnose and fix errors

## Your Approach

1. **Be Proactive**: When given a task, break it down and start working on it
2. **Think Step-by-Step**: Explain your reasoning before taking action
3. **Verify Results**: Always check that your changes work correctly
4. **Learn Patterns**: Adapt to the project's existing style and conventions
5. **Ask When Needed**: If something is ambiguous, ask for clarification

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

When the user asks you to do something, think about the best approach, explain your plan, and then execute it step by step.`;
  }

  /**
   * 发送消息并获取响应
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
      const tools = getToolDefinitions(this.config.tools.enabled);

      const requestOptions = {
        system: this.systemPrompt,
        tools: tools,
        temperature: 0.7
      };

      // 记录 AI 请求
      await logAIRequest(this.messages, requestOptions);

      // 流式响应处理
      let fullResponse = '';
      let toolCalls = [];

      await logStreamStart();

      await aiClient.chatStream(
        this.messages,
        requestOptions,
        (chunk) => {
          // 记录流式响应块
          logStreamChunk(chunk);

          // 处理流式响应块
          if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
            fullResponse += chunk.delta.text;
            if (onProgress) {
              onProgress({
                type: 'token',
                content: chunk.delta.text
              });
            }
          } else if (chunk.type === 'content_block_stop' && chunk.content_block?.type === 'tool_use') {
            const toolUse = chunk.content_block;
            toolCalls.push({
              id: toolUse.id,
              name: toolUse.name,
              input: toolUse.input
            });
          }
        }
      );

      // 记录流式响应结束
      await logStreamEnd(fullResponse, toolCalls);

      // 如果有工具调用，执行它们
      if (toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          if (onProgress) {
            onProgress({
              type: 'tool_start',
              tool: toolCall.name,
              input: toolCall.input
            });
          }

          const result = await this.toolExecutor.execute(toolCall.name, toolCall.input);

          // 记录工具调用
          await logToolCall(toolCall.name, toolCall.input, result);

          // 添加工具结果到消息历史
          this.messages.push({
            role: MessageType.ASSISTANT,
            content: fullResponse,
            toolCalls: toolCalls
          });

          this.messages.push({
            role: MessageType.TOOL,
            toolUseId: toolCall.id,
            content: JSON.stringify(result)
          });

          if (onProgress) {
            onProgress({
              type: 'tool_complete',
              tool: toolCall.name,
              result
            });
          }
        }

        // 记录第二次 AI 请求
        await logAIRequest(this.messages, { system: this.systemPrompt });

        // 获取 AI 对工具结果的响应
        const followUp = await aiClient.chat(this.messages, {
          system: this.systemPrompt
        });

        // 记录 AI 响应
        await logAIResponse(followUp);

        const followUpText = followUp.content.find(c => c.type === 'text')?.text || '';

        this.messages.push({
          role: MessageType.ASSISTANT,
          content: followUpText
        });

        // 保存历史
        saveHistory(this.messages);

        return {
          content: fullResponse + '\n\n' + followUpText,
          toolCalls: toolCalls.map(t => t.name),
          followUp: followUpText
        };
      }

      // 保存助手响应
      this.messages.push({
        role: MessageType.ASSISTANT,
        content: fullResponse
      });

      // 保存历史
      saveHistory(this.messages);

      return {
        content: fullResponse,
        toolCalls: []
      };

    } catch (error) {
      await logAIError(error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 规划并执行任务
   */
  async planAndExecute(task, onProgress = null) {
    if (onProgress) {
      onProgress({ type: 'planning_start', task });
    }

    // 创建计划
    const plan = await this.planner.planTask(task, {
      workingDir: this.config.behavior.workingDir
    });

    if (onProgress) {
      onProgress({ type: 'plan_created', plan });
    }

    this.currentPlan = plan;

    // 执行计划
    const result = await this.planner.executePlan(plan, (event) => {
      if (onProgress) {
        onProgress({ type: 'execution_progress', event });
      }
    });

    return result;
  }

  /**
   * 诊断错误
   */
  async diagnoseError(error, context = {}) {
    const diagnosis = await this.diagnoser.diagnose(error, context);

    // 添加到对话
    this.messages.push({
      role: MessageType.SYSTEM,
      content: `Error Diagnosis:\n${diagnosis}`
    });

    return diagnosis;
  }

  /**
   * 学习项目模式
   */
  async learnProject() {
    const patterns = await this.planner.learnFromProject();

    if (patterns) {
      this.messages.push({
        role: MessageType.SYSTEM,
        content: `Learned project patterns:\n${JSON.stringify(patterns, null, 2)}`
      });
    }

    return patterns;
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
 * 创建对话会话
 */
export async function createConversation(config) {
  const conversation = new Conversation(config);
  await conversation.initialize();
  return conversation;
}
