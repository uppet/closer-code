/**
 * Tool Executor - 工具执行器
 *
 * 负责：
 * - 工具调用循环
 * - 工具结果处理
 * - AI Planning 集成
 * - 错误处理和重试
 */

import { MessageType } from './core.js';
import { logToolCall } from '../logger.js';
import { safeJSONParse } from '../utils/json-repair.js';

export class ToolExecutor {
  constructor(conversation, planManager) {
    this.conversation = conversation;
    this.planManager = planManager;
  }

  /**
   * 执行工具调用循环
   * @param {Array} currentMessages - 当前消息列表
   * @param {Array} tools - 工具列表
   * @param {Object} aiClient - AI 客户端
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 执行结果
   */
  async executeToolLoop(currentMessages, tools, aiClient, options = {}) {
    const {
      systemPrompt,
      onProgress,
      phaseId,
      isAborted,
      abortController
    } = options;

    let hasToolCalls = false;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    while (true) {
      // 检查 abort（每次循环前）
      if (isAborted && isAborted(phaseId)) {
        console.log(`[AbortFence] Phase ${phaseId} aborted in tool loop`);
        return this.conversation.abortFence.createAbortResult('aborted_in_loop');
      }

      // 使用流式 API 发送消息
      const response = await aiClient.chatStream(
        currentMessages,
        {
          system: systemPrompt,
          tools: tools,
          temperature: 0.7,
          thinking: process.env.CLOSER_THINKING_ENABLED !== '0' ? { type: 'enabled', budget_tokens: 20000 } : { type: 'disabled' },
          signal: abortController?.signal
        },
        (chunk) => {
          // 使用 stream handler 处理事件
          this.conversation.streamHandler.handleStreamEvent(
            chunk,
            onProgress,
            phaseId,
            isAborted ? (id) => isAborted(id) : null
          );
        }
      );

      // 累加 token 使用量
      if (response.usage) {
        totalInputTokens += response.usage.input_tokens || 0;
        totalOutputTokens += response.usage.output_tokens || 0;
      }

      // 检查是否有工具调用
      const toolUseBlocks = response.content.filter(block => block.type === 'tool_use');

      if (toolUseBlocks.length === 0) {
        // 没有工具调用，发送剩余的 tokens
        this.conversation.streamHandler.flush(onProgress);

        // 提取最终文本内容
        const fullTextContent = response.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('\n');

        return {
          hasToolCalls,
          fullTextContent,
          response,
          totalInputTokens,
          totalOutputTokens
        };
      }

      hasToolCalls = true;

      // 添加助手响应（包含工具调用）到 currentMessages
      const assistantMessage = {
        role: MessageType.ASSISTANT,
        content: response.content
      };

      // DeepSeek-R1: 保留 reasoning_content 字段
      if (response.reasoning_content !== undefined) {
        assistantMessage.reasoning_content = response.reasoning_content;
      }

      currentMessages.push(assistantMessage);
      this.conversation.messages.push(assistantMessage);

      // 处理工具调用
      await this.executeToolCalls(toolUseBlocks, tools, currentMessages, onProgress, phaseId, isAborted);
    }
  }

  /**
   * 执行工具调用
   * @param {Array} toolUseBlocks - 工具调用块
   * @param {Array} tools - 工具列表
   * @param {Array} currentMessages - 当前消息列表
   * @param {Function} onProgress - 进度回调
   * @param {number} phaseId - 阶段 ID
   * @param {Function} isAborted - abort 检查函数
   */
  async executeToolCalls(toolUseBlocks, tools, currentMessages, onProgress, phaseId, isAborted) {
    for (const block of toolUseBlocks) {
      if (typeof onProgress === 'function') {
        onProgress({
          type: 'tool_start',
          tool: block.name,
          input: block.input
        });
      }

      // 检测 AI Planning
      const detectedPlan = this.planManager.detectAIPlanning(block.name, block.input);
      if (detectedPlan && typeof onProgress === 'function') {
        onProgress({
          type: 'plan_created',
          plan: detectedPlan
        });
      }

      // 查找对应的工具
      const tool = tools.find(t => t.name === block.name);
      const result = await this.executeTool(block, tool, phaseId, isAborted);

      // 记录工具调用
      await logToolCall(block.name, block.input, result);

      // 更新 AI Planning 步骤
      const planUpdated = this.planManager.updateAIPlanningStep(block.name, result);
      if (planUpdated && typeof onProgress === 'function') {
        onProgress({
          type: 'plan_progress',
          plan: this.planManager.getCurrentPlan()
        });
      }

      // 通知工具完成
      if (typeof onProgress === 'function') {
        const parsedResult = safeJSONParse(result, {
          fallback: { result }
        });
        onProgress({
          type: 'tool_complete',
          tool: block.name,
          result: parsedResult,
          success: !parsedResult.error
        });
      }

      // 添加工具结果到消息
      const parsedResult = safeJSONParse(result, {
        fallback: { result }
      });
      const toolResultMessage = {
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
          isError: !parsedResult.success
        }]
      };

      currentMessages.push(toolResultMessage);
      this.conversation.messages.push(toolResultMessage);
    }
  }

  /**
   * 执行单个工具
   * @param {Object} block - 工具调用块
   * @param {Object} tool - 工具对象
   * @param {number} phaseId - 阶段 ID
   * @param {Function} isAborted - abort 检查函数
   * @returns {Promise<string>} 工具执行结果（JSON 字符串）
   */
  async executeTool(block, tool, phaseId, isAborted) {
    // 工具不存在
    if (!tool) {
      return JSON.stringify({
        success: false,
        error: `Tool ${block.name} not found`,
        content: null
      });
    }

    // 检查参数解析错误
    if (block.parseError) {
      console.warn(`[Tool Executor] Tool ${block.name} has parse error, skipping execution`);
      return JSON.stringify({
        success: false,
        error: `Failed to parse tool arguments for ${block.name}`,
        parseError: true,
        originalInput: block.input,
        content: null
      });
    }

    // 在工具执行前检查 abort
    if (isAborted && isAborted(phaseId)) {
      console.log(`[AbortFence] Phase ${phaseId} aborted before tool execution: ${block.name}`);
      return JSON.stringify({
        success: false,
        aborted: true,
        error: 'Tool execution aborted by user',
        content: null
      });
    }

    // 执行工具
    try {
      const result = await tool.run(block.input);

      // 工具执行后再次检查 abort（防止长时间操作）
      if (isAborted && isAborted(phaseId)) {
        console.log(`[AbortFence] Phase ${phaseId} aborted after tool execution: ${block.name}`);
        return JSON.stringify({
          success: false,
          aborted: true,
          error: 'Tool execution aborted by user',
          content: null
        });
      }

      return result;
    } catch (error) {
      // 工具执行失败
      console.error(`[Tool Execution Error] ${block.name}:`, error.message);
      return JSON.stringify({
        success: false,
        aborted: false,
        error: error.message,
        errorType: error.constructor.name,
        content: null
      });
    }
  }
}
