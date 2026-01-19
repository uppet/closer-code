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

    // 转换消息格式（Anthropic -> OpenAI）
    const formattedMessages = messages.map(m => this._convertMessageFormat(m));

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

    // 转换消息格式
    const formattedMessages = [
      { role: 'system', content: system },
      ...messages.map(m => this._convertMessageFormat(m))
    ];

    // 转换工具格式
    const openaiTools = this._convertTools(tools);

    // 使用 OpenAI SDK 的原生流式 API
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: formattedMessages,
      tools: openaiTools.length > 0 ? openaiTools : undefined,
      temperature: temperature,
      max_tokens: this.maxTokens,
      stream: true
    });

    let fullResponse = {
      role: 'assistant',
      content: [],
      model: this.model
    };

    let currentToolCalls = [];
    let accumulatedText = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (!delta) continue;

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
    }

    // 构建响应内容
    if (accumulatedText) {
      fullResponse.content.push({
        type: 'text',
        text: accumulatedText
      });
    }

    if (currentToolCalls.length > 0) {
      for (const toolCall of currentToolCalls) {
        fullResponse.content.push({
          type: 'tool_use',
          id: toolCall.id,
          name: toolCall.function.name,
          input: JSON.parse(toolCall.function.arguments)
        });
      }
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
   * 转换消息格式（Anthropic -> OpenAI）
   * @private
   */
  _convertMessageFormat(message) {
    // Anthropic: { role, content } where content can be string or array
    // OpenAI: { role, content } or { role, tool_calls } or { role, content: [{tool_call_id, content}] }

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

        return result;
      }

      // 检查是否包含 tool_result（user 的工具结果）
      const toolResultBlocks = message.content.filter(block => block.type === 'tool_result');

      if (toolResultBlocks.length > 0) {
        // OpenAI 格式：user 消息使用 content 数组，每个包含 tool_call_id
        return {
          role: message.role,
          content: toolResultBlocks.map(block => ({
            type: 'tool',
            tool_call_id: block.tool_use_id,
            content: block.content
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
          const text = m.content
            .filter(block => block.type === 'text')
            .map(block => block.text)
            .join('\n');
          return `${m.role}: ${text}`;
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
      // 调用原始工具的 run 方法
      const result = await anthropicTool.run(input);
      // 返回解析后的结果
      return JSON.parse(result);
    }
  });
}

/**
 * 批量转换工具
 */
export function convertToolsToOpenAI(anthropicTools) {
  return anthropicTools.map(createOpenAITool);
}
