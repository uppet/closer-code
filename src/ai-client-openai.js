/**
 * OpenAI AI 客户端模块 - 使用 @openai/agents
 *
 * 与 Anthropic SDK 的对应关系：
 * - Anthropic: betaZodTool -> OpenAI: tool
 * - Anthropic: toolRunner -> OpenAI: run
 * - Anthropic: stream.on -> OpenAI: (暂无流式事件 API)
 * - Anthropic: client.messages.create -> OpenAI: Agent + run
 *
 * 注意：@openai/agents 包提供了更高级的抽象，
 * 但为了保持与现有代码的兼容性，我们需要适配到统一的接口。
 */

import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';
import OpenAI from 'openai';

/**
 * OpenAI 客户端（使用 @openai/agents SDK）
 */
export class OpenAIClient {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
    this.model = config.model || 'gpt-4o';
    this.maxTokens = config.maxTokens || 8192;

    // 创建 OpenAI 客户端实例
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseURL
    });

    // 存储当前 agent
    this.currentAgent = null;

    // DeepSeek-R1 Reasoning 支持
    this.isDeepSeekReasoner = this.model.includes('deepseek-reasoner') ||
                               config.enableReasoning === true;
    this.reasoningContent = ''; // 累积的推理内容
  }

  /**
   * 发送消息（非流式）
   * 使用 @openai/agents 的 Agent 和 run
   *
   * @param {Array} messages - 消息数组
   * @param {Object} options - 选项（system, tools, temperature）
   * @returns {Promise} API 响应
   */
  async chat(messages, options = {}) {
    const system = options.system || 'You are a helpful AI programming assistant.';
    const tools = options.tools || [];
    const temperature = options.temperature ?? 0.7;

    // 转换消息格式（Anthropic -> OpenAI），需要特殊处理 tool_result
    const formattedMessages = [];

    // 遍历消息并转换
    for (const message of messages) {
      const converted = this._convertMessageFormat(message);

      // 检查是否包含 tool_result（需要拆分为多个 role: 'tool' 消息）
      if (Array.isArray(message.content)) {
        const toolResultBlocks = message.content.filter(block => block.type === 'tool_result');
        const textBlocks = message.content.filter(block => block.type === 'text');

        if (toolResultBlocks.length > 0) {
          // 每个工具结果作为独立的 role: 'tool' 消息
          for (const block of toolResultBlocks) {
            formattedMessages.push({
              role: 'tool',
              tool_call_id: block.tool_use_id,
              content: typeof block.content === 'string' ? block.content : JSON.stringify(block.content)
            });
          }

          // 如果有文本内容，添加为 user 消息
          if (textBlocks.length > 0) {
            const textContent = textBlocks.map(block => block.text).join('\n');
            formattedMessages.push({
              role: message.role,
              content: textContent
            });
          }
        } else {
          // 没有 tool_result，直接添加转换后的消息
          formattedMessages.push(converted);
        }
      } else {
        // 不是数组，直接添加
        formattedMessages.push(converted);
      }
    }

    // 如果有工具，需要转换为 OpenAI agents 的 tool 格式
    const openaiTools = this._convertTools(tools);

    // 创建 Agent
    const agent = new Agent({
      name: 'Assistant',
      instructions: system,
      tools: openaiTools,
      temperature: temperature
    });

    // 将消息转换为输入（简单拼接）
    const input = this._messagesToInput(messages);

    // 使用 run 函数执行
    const result = await run(agent, input, {
      maxTurns: 10 // 限制最大轮次
    });

    // 转换响应格式（OpenAI -> Anthropic）
    return this._convertResponseToAnthropic(result);
  }

  /**
   * 发送消息（流式）
   * 注意：@openai/agents 目前不提供与 Anthropic SDK 相同的流式事件 API
   * 这里使用 OpenAI SDK 的原生流式 API
   *
   * @param {Array} messages - 消息数组
   * @param {Object} options - 选项
   * @param {Function} onChunk - 流式回调函数
   * @returns {Promise} 最终消息
   */
  async chatStream(messages, options = {}, onChunk) {
    const system = options.system || 'You are a helpful AI programming assistant.';
    const tools = options.tools || [];
    const temperature = options.temperature ?? 0.7;

    // 转换消息格式，需要特殊处理 tool_result
    const formattedMessages = [
      { role: 'system', content: system }
    ];

    // 遍历消息并转换
    for (const message of messages) {
      const converted = this._convertMessageFormat(message);

      // 检查是否包含 tool_result（需要拆分为多个 role: 'tool' 消息）
      if (Array.isArray(message.content)) {
        const toolResultBlocks = message.content.filter(block => block.type === 'tool_result');
        const textBlocks = message.content.filter(block => block.type === 'text');

        if (toolResultBlocks.length > 0) {
          // 每个工具结果作为独立的 role: 'tool' 消息
          for (const block of toolResultBlocks) {
            formattedMessages.push({
              role: 'tool',
              tool_call_id: block.tool_use_id,
              content: typeof block.content === 'string' ? block.content : JSON.stringify(block.content)
            });
          }

          // 如果有文本内容，添加为 user 消息
          if (textBlocks.length > 0) {
            const textContent = textBlocks.map(block => block.text).join('\n');
            formattedMessages.push({
              role: message.role,
              content: textContent
            });
          }
        } else {
          // 没有 tool_result，直接添加转换后的消息
          formattedMessages.push(converted);
        }
      } else {
        // 不是数组，直接添加
        formattedMessages.push(converted);
      }
    }

    // 转换工具格式
    const openaiTools = this._convertTools(tools);

    // 构建 API 请求参数
    const apiParams = {
      model: this.model,
      messages: formattedMessages,
      tools: openaiTools.length > 0 ? openaiTools : undefined,
      temperature: temperature,
      max_tokens: this.maxTokens,
      stream: true
    };

    // DeepSeek-R1 Reasoning: 添加 thinking 参数
    if (this.isDeepSeekReasoner && options.thinking?.type === 'enabled') {
      apiParams.extra_body = {
        thinking: { type: 'enabled' }
      };
    }

    // 使用 OpenAI SDK 的原生流式 API
    const stream = await this.client.chat.completions.create(apiParams);

    let fullResponse = {
      role: 'assistant',
      content: [],
      model: this.model
    };

    let currentToolCalls = [];
    let accumulatedText = '';
    let accumulatedReasoning = '';

    try {
      for await (const chunk of stream) {
        try {
          const delta = chunk.choices[0]?.delta;

          if (!delta) continue;

          // 处理 DeepSeek-R1 的 reasoning_content
          if (delta.reasoning_content) {
            accumulatedReasoning += delta.reasoning_content;

            if (typeof onChunk === 'function') {
              onChunk({
                type: 'reasoning',
                delta: delta.reasoning_content,
                snapshot: accumulatedReasoning
              });
            }
          }

          // 处理文本内容
          if (delta.content) {
            accumulatedText += delta.content;

            if (typeof onChunk === 'function') {
              onChunk({
                type: 'text',
                delta: delta.content,
                snapshot: accumulatedText
              });
            }
          }

          // 处理工具调用
          if (delta.tool_calls) {
            for (const toolCall of delta.tool_calls) {
              if (toolCall.index !== undefined) {
                if (!currentToolCalls[toolCall.index]) {
                  currentToolCalls[toolCall.index] = {
                    id: toolCall.id,
                    type: 'function',
                    function: {
                      name: toolCall.function?.name || '',
                      arguments: toolCall.function?.arguments || ''
                    }
                  };
                } else {
                  // 累积参数
                  if (toolCall.function?.arguments) {
                    currentToolCalls[toolCall.index].function.arguments +=
                      toolCall.function.arguments;
                  }
                }
              }
            }
          }

          // 检查是否完成
          if (chunk.choices[0]?.finish_reason === 'stop' ||
              chunk.choices[0]?.finish_reason === 'tool_calls') {
            break;
          }
        } catch (chunkError) {
          console.error('[OpenAI Stream Chunk Error]:', chunkError.message);
          // 继续处理下一个 chunk，不中断整个流
          continue;
        }
      }
    } catch (streamError) {
      console.error('[OpenAI Stream Error]:', streamError.message);
      console.error('[OpenAI Stream Error Type]:', streamError.constructor.name);

      // 如果是网络错误或流中断，仍然返回已累积的内容
      if (streamError.name === 'AbortError' || streamError.name === 'NetworkError') {
        console.warn('[OpenAI Stream] Stream interrupted, returning accumulated content');
      } else {
        // 其他错误也尝试返回已累积的内容
        console.warn('[OpenAI Stream] Error occurred, returning accumulated content');
      }
      // 不抛出异常，继续处理已累积的内容
    }

    // 构建响应内容
    if (accumulatedReasoning) {
      // DeepSeek-R1 的 reasoning_content
      fullResponse.content.push({
        type: 'reasoning',
        text: accumulatedReasoning
      });
      
      // 保存推理内容用于后续工具调用
      this.reasoningContent = accumulatedReasoning;
    }

    if (accumulatedText) {
      fullResponse.content.push({
        type: 'text',
        text: accumulatedText
      });
    }

    if (currentToolCalls.length > 0) {
      for (const toolCall of currentToolCalls) {
        try {
          fullResponse.content.push({
            type: 'tool_use',
            id: toolCall.id,
            name: toolCall.function.name,
            input: JSON.parse(toolCall.function.arguments)
          });
        } catch (parseError) {
          console.error('[OpenAI Tool Parse Error]:', parseError.message);
          console.error('[OpenAI Tool Arguments]:', toolCall.function.arguments);
          // 返回空对象作为降级处理
          fullResponse.content.push({
            type: 'tool_use',
            id: toolCall.id,
            name: toolCall.function.name,
            input: {},
            parseError: true
          });
        }
      }
    }

    // DeepSeek-R1: 保存完整的响应消息（包含 reasoning_content）
    // 用于下一轮工具调用
    if (this.isDeepSeekReasoner) {
      fullResponse.reasoning_content = accumulatedReasoning || '';
      fullResponse.raw_content = accumulatedText || '';
    }

    return fullResponse;
  }

  /**
   * 使用 tools 自动处理工具调用循环
   * 对应 Anthropic 的 toolRunner
   *
   * @param {Array} messages - 消息数组
   * @param {Array} tools - 工具数组（使用 Zod 定义的 tool）
   * @param {Object} options - 选项
   * @returns {Promise} 最终消息（所有工具调用完成后）
   */
  async chatWithTools(messages, tools, options = {}) {
    const system = options.system || 'You are a helpful AI programming assistant.';
    const temperature = options.temperature ?? 0.7;

    // 转换工具格式（Anthropic betaZodTool -> OpenAI tool）
    const openaiTools = tools.map(tool => {
      // betaZodTool 有 name, description, input_schema, run
      // OpenAI tool 需要：name, description, parameters (Zod schema), execute
      return {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema, // Zod schema
        execute: tool.run
      };
    });

    // 创建 Agent
    const agent = new Agent({
      name: 'Assistant',
      instructions: system,
      tools: openaiTools,
      temperature: temperature
    });

    // 将消息转换为输入
    const input = this._messagesToInput(messages);

    // 使用 run 函数执行（自动处理工具调用循环）
    const result = await run(agent, input, {
      maxTurns: 10
    });

    // 转换响应格式
    return this._convertResponseToAnthropic(result);
  }

  /**
   * 获取消息的 token 计数（使用 OpenAI SDK 的 tokenizer）
   * @param {Array} messages - 消息数组
   * @returns {Promise} Token 计数
   */
  async countTokens(messages) {
    // OpenAI SDK 没有内置的 countTokens 方法
    // 使用简单的估算：1 token ≈ 4 characters
    const text = JSON.stringify(messages);
    return Math.ceil(text.length / 4);
  }

  /**
   * 清除历史消息中的 reasoning_content（DeepSeek-R1 特性）
   * 
   * DeepSeek-R1 要求：
   * - 同一轮的工具调用中：保留 reasoning_content
   * - 新一轮对话开始时：清除 reasoning_content 以节省带宽
   * 
   * @param {Array} messages - 消息数组
   * @returns {Array} 清除后的消息数组
   */
  clearReasoningContent(messages) {
    if (!this.isDeepSeekReasoner) {
      return messages; // 非 DeepSeek-R1 模型，无需处理
    }

    // 清除每条消息中的 reasoning_content
    return messages.map(message => {
      if (message.reasoning_content !== undefined) {
        // 创建新消息对象，不包含 reasoning_content
        const { reasoning_content, ...messageWithoutReasoning } = message;
        return messageWithoutReasoning;
      }
      return message;
    });
  }

  /**
   * 保留当前轮的 reasoning_content（DeepSeek-R1 特性）
   * 
   * 用于在同一轮的工具调用中继续传递 reasoning_content
   * 
   * @param {Array} messages - 消息数组
   * @param {string} reasoningContent - 当前轮的推理内容
   * @returns {Array} 添加了 reasoning_content 的消息数组
   */
  appendCurrentReasoning(messages, reasoningContent) {
    if (!this.isDeepSeekReasoner || !reasoningContent) {
      return messages; // 非 DeepSeek-R1 或无推理内容，无需处理
    }

    // 在最后一条 assistant 消息中添加 reasoning_content
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      lastMessage.reasoning_content = reasoningContent;
    }

    return messages;
  }

  /**
   * 转换消息格式（Anthropic -> OpenAI）
   * @private
   */
  _convertMessageFormat(message) {
    // Anthropic: { role, content } where content can be string or array
    // OpenAI: { role, content } or { role, tool_calls } or { role: 'tool', tool_call_id, content }

    if (typeof message.content === 'string') {
      return {
        role: message.role,
        content: message.content
      };
    }

    // 处理 content 为数组的情况
    if (Array.isArray(message.content)) {
      // 检查是否包含 tool_use（assistant 的工具调用）
      const toolUseBlocks = message.content.filter(block => block.type === 'tool_use');
      const textBlocks = message.content.filter(block => block.type === 'text');

      if (toolUseBlocks.length > 0) {
        // OpenAI 格式：assistant 消息使用 tool_calls 字段
        // 同时保留文本内容（如果有）
        const result = {
          role: message.role,
          tool_calls: toolUseBlocks.map(block => ({
            id: block.id,
            type: 'function',
            function: {
              name: block.name,
              arguments: JSON.stringify(block.input)
            }
          }))
        };

        // 如果有文本内容，添加 content 字段
        if (textBlocks.length > 0) {
          result.content = textBlocks.map(block => block.text).join('\n');
        }

        // DeepSeek-R1: 保留 reasoning_content 字段
        if (this.isDeepSeekReasoner && message.reasoning_content !== undefined) {
          result.reasoning_content = message.reasoning_content;
        }

        return result;
      }

      // 检查是否包含 tool_result（user 的工具结果）
      const toolResultBlocks = message.content.filter(block => block.type === 'tool_result');

      if (toolResultBlocks.length > 0) {
        // OpenAI 格式：每个 tool_result 应该是一个独立的 role: 'tool' 消息
        // 但由于这个函数返回单个消息，我们需要特殊处理
        // 如果只有一个 tool_result，返回标准格式
        if (toolResultBlocks.length === 1 && !textBlocks.length) {
          const block = toolResultBlocks[0];
          return {
            role: 'tool',
            tool_call_id: block.tool_use_id,
            content: typeof block.content === 'string' ? block.content : JSON.stringify(block.content)
          };
        }

        // 如果有多个 tool_result 或同时有文本，返回 user 消息格式
        // 注意：这种情况下，调用方需要将这个消息拆分为多个消息
        return {
          role: message.role,
          content: toolResultBlocks.map(block => ({
            type: 'text',
            text: `[Tool Result for ${block.tool_use_id}]: ${typeof block.content === 'string' ? block.content : JSON.stringify(block.content)}`
          }))
        };
      }

      // 普通 text 内容
      const textParts = message.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      return {
        role: message.role,
        content: textParts
      };
    }

    return {
      role: message.role,
      content: ''
    };
  }

  /**
   * 转换工具格式（Anthropic betaZodTool -> OpenAI tool/function）
   * @private
   */
  _convertTools(anthropicTools) {
    return anthropicTools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema // Zod schema
      }
    }));
  }

  /**
   * 将消息数组转换为输入字符串
   * @private
   */
  _messagesToInput(messages) {
    // 简单实现：提取所有文本内容
    return messages
      .map(m => {
        if (typeof m.content === 'string') {
          return `${m.role}: ${m.content}`;
        }
        if (Array.isArray(m.content)) {
          // 提取文本内容
          const textBlocks = m.content.filter(block => block.type === 'text');
          const text = textBlocks.map(block => block.text).join('\n');

          // 提取工具结果
          const toolResultBlocks = m.content.filter(block => block.type === 'tool_result');
          const toolResults = toolResultBlocks.map(block => {
            const content = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
            return `[Tool Result: ${content}]`;
          }).join('\n');

          // 组合文本和工具结果
          const combined = [text, toolResults].filter(s => s).join('\n');
          return `${m.role}: ${combined}`;
        }
        return '';
      })
      .join('\n\n');
  }

  /**
   * 转换响应格式（OpenAI -> Anthropic）
   * @private
   */
  _convertResponseToAnthropic(result) {
    // OpenAI agents 返回: { finalOutput, ... }
    // 我们需要转换为 Anthropic 格式: { role, content, ... }

    const textContent = result.finalOutput || '';

    return {
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: textContent
        }
      ],
      model: this.model,
      finishReason: 'stop'
    };
  }
}

/**
 * 创建兼容的工具定义
 * 将现有的 betaZodTool 转换为 OpenAI agents 的 tool 格式
 */
export function createOpenAITool(anthropicTool) {
  return tool({
    name: anthropicTool.name,
    description: anthropicTool.description,
    parameters: anthropicTool.input_schema,
    execute: async (input) => {
      try {
        // 调用原始工具的 run 方法
        const result = await anthropicTool.run(input);

        // 尝试解析 JSON
        try {
          return JSON.parse(result);
        } catch (parseError) {
          // 如果解析失败，检查结果是否已经是对象
          if (typeof result === 'object') {
            return result;
          }
          // 返回原始字符串
          return { result: result };
        }
      } catch (error) {
        // 工具执行失败，返回错误信息
        console.error(`[OpenAI Tool Execution Error] ${anthropicTool.name}:`, error.message);
        return {
          success: false,
          error: error.message,
          errorType: error.constructor.name
        };
      }
    }
  });
}

/**
 * 批量转换工具
 */
export function convertToolsToOpenAI(anthropicTools) {
  return anthropicTools.map(createOpenAITool);
}
