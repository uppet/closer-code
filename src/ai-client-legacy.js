import { safeJSONParse } from './utils/json-repair.js';

// 临时测试模式：直接回声，不进行 Ollama 通讯
const OLLAMA_ECHO_MODE = false;  // 设置为 false 恢复正常 Ollama 通讯

// 延迟导入 Ollama SDK，避免在模块加载时就导入 whatwg-fetch
let OllamaSDK = null;

async function getOllamaSDK() {
  if (!OllamaSDK) {
    const module = await import('ollama');
    OllamaSDK = module.Ollama;
  }
  return OllamaSDK;
}

// OpenAI 客户端
export class OpenAIClient {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
    this.model = config.model || 'gpt-4o';
    this.maxTokens = config.maxTokens || 4096;
  }

  async chat(messages, options = {}) {
    const system = options.system || 'You are a helpful AI programming assistant.';
    const tools = options.tools || [];
    const temperature = options.temperature ?? 0.7;

    // 添加系统消息
    const formattedMessages = [
      { role: 'system', content: system },
      ...messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    ];

    const requestBody = {
      model: this.model,
      messages: formattedMessages,
      temperature,
      max_tokens: this.maxTokens
    };

    if (tools.length > 0) {
      requestBody.tools = tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema
        }
      }));
    }

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return this.parseResponse(data);
  }

  parseResponse(data) {
    const choice = data.choices[0];
    const message = {
      role: 'assistant',
      content: [],
      model: data.model,
      finishReason: choice.finish_reason
    };

    if (choice.message.content) {
      message.content.push({
        type: 'text',
        text: choice.message.content
      });
    }

    if (choice.message.tool_calls) {
      for (const toolCall of choice.message.tool_calls) {
        const input = safeJSONParse(toolCall.function.arguments, {
          fallback: {}
        });
        message.content.push({
          type: 'tool_use',
          id: toolCall.id,
          name: toolCall.function.name,
          input
        });
      }
    }

    return message;
  }
}

// Ollama 客户端（使用官方 Ollama SDK）
export class OllamaClient {
  constructor(config) {
    this.baseURL = config.baseURL || 'http://localhost:11434';
    this.model = config.model || 'llama3.1';
    this.maxTokens = config.maxTokens || 4096;
    this.client = null;
    this._clientInitPromise = null;
    this.echoMode = OLLAMA_ECHO_MODE;  // 使用回声模式进行测试
  }

  /**
   * 延迟初始化 Ollama 客户端
   */
  async _getClient() {
    // 回声模式下不需要初始化客户端
    if (this.echoMode) {
      return null;
    }

    if (!this.client) {
      if (!this._clientInitPromise) {
        this._clientInitPromise = (async () => {
          console.error(`[Ollama Debug] Initializing Ollama SDK...`);
          const Ollama = await getOllamaSDK();
          console.error(`[Ollama Debug] Ollama SDK loaded`);
          this.client = new Ollama({
            host: this.baseURL
          });
          console.error(`[Ollama Debug] Ollama client created`);
          return this.client;
        })();
      }
      await this._clientInitPromise;
    }
    return this.client;
  }

  /**
   * 从消息中提取文本内容
   */
  _extractTextFromMessages(messages) {
    const texts = [];
    
    for (const message of messages) {
      if (typeof message.content === 'string') {
        texts.push(message.content);
      } else if (Array.isArray(message.content)) {
        for (const block of message.content) {
          if (block.type === 'text') {
            texts.push(block.text);
          }
        }
      }
    }
    
    return texts.join('\n\n');
  }

  /**
   * 发送消息（非流式）
   */
  async chat(messages, options = {}) {
    const system = options.system || 'You are a helpful AI programming assistant.';
    const temperature = options.temperature ?? 0.7;
    const tools = options.tools || [];

    // 回声模式：直接返回用户输入
    if (this.echoMode) {
      console.error(`[Ollama Echo Mode] Echoing user input without server communication`);
      
      const userText = this._extractTextFromMessages(messages);
      
      const result = {
        role: 'assistant',
        content: [{ type: 'text', text: `[Echo Mode] You said: ${userText}` }],
        model: this.model,
        usage: {
          input_tokens: 0,
          output_tokens: userText.length
        }
      };

      console.error(`[Ollama Echo Mode] Returning echo response`);
      
      // 模拟一点延迟，让 UI 有时间更新
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return result;
    }

    // 转换工具格式为 Ollama 格式
    const ollamaTools = tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema
      }
    }));

    // 正常模式：连接 Ollama 服务器
    const formattedMessages = this._formatMessages(messages, system);

    // ✅ 只调用一次 API，让上层对话系统处理工具调用循环
    try {
      console.error(`[Ollama Debug] Connecting to ${this.baseURL} with model ${this.model}...`);
      console.error(`[Ollama Debug] Messages count: ${formattedMessages.length}`);
      console.error(`[Ollama Debug] Tools: ${ollamaTools.length}`);

      const client = await this._getClient();

      const response = await client.chat({
        model: this.model,
        messages: formattedMessages,
        tools: ollamaTools.length > 0 ? ollamaTools : undefined,
        stream: false,
        options: {
          temperature: temperature,
          num_predict: this.maxTokens
        }
      });

      console.error(`[Ollama Debug] Response received`);
      console.error(`[Ollama Debug] Has content: ${!!response.message.content}`);
      console.error(`[Ollama Debug] Has tool_calls: ${!!response.message.tool_calls}`);

      // ✅ 解析响应为统一格式（与 OpenAI/Anthropic 兼容）
      return this._parseResponse(response);
    } catch (error) {
      console.error(`[Ollama Error] Type: ${error.name || 'Unknown'}`);
      console.error(`[Ollama Error] Message: ${error.message}`);
      console.error(`[Ollama Error] Stack: ${error.stack}`);
      
      // 检查是否是连接错误
      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
        throw new Error(`Ollama connection failed. Is Ollama running at ${this.baseURL}? Start Ollama with: ollama serve`);
      }
      
      // 检查是否是模型不存在
      if (error.message.includes('model') && error.message.includes('not found')) {
        throw new Error(`Ollama model '${this.model}' not found. Pull it with: ollama pull ${this.model}`);
      }
      
      throw new Error(`Ollama error: ${error.message}`);
    }
  }

  /**
   * 解析 Ollama 响应为统一格式
   * 与 OpenAI/Anthropic 客户端保持一致的接口
   */
  _parseResponse(response) {
    const message = {
      role: 'assistant',
      content: [],
      model: this.model
    };

    // 添加文本内容
    if (response.message.content) {
      message.content.push({
        type: 'text',
        text: response.message.content
      });
    }

    // 添加 tool_calls（如果有）
    if (response.message.tool_calls && response.message.tool_calls.length > 0) {
      for (const toolCall of response.message.tool_calls) {
        const input = safeJSONParse(toolCall.function.arguments, {
          fallback: {}
        });
        message.content.push({
          type: 'tool_use',
          id: toolCall.id,
          name: toolCall.function.name,
          input
        });
      }
    }

    return message;
  }

  /**
   * 发送消息（流式）
   */
  async chatStream(messages, options = {}, onChunk) {
    const system = options.system || 'You are a helpful AI programming assistant.';
    const temperature = options.temperature ?? 0.7;
    const tools = options.tools || [];

    // 如果有工具定义，使用非流式调用（通过 chat() 方法）
    // chat() 方法已经支持工具调用循环
    if (tools.length > 0 && !this.echoMode) {
      console.error(`[Ollama Debug] chatStream: Using non-streaming mode for tool support (${tools.length} tools)`);
      return this.chat(messages, options);
    }

    // 回声模式：模拟流式返回
    if (this.echoMode) {
      console.error(`[Ollama Echo Mode] Streaming echo response`);
      
      const userText = this._extractTextFromMessages(messages);
      const responseText = `[Echo Mode] You said: ${userText}`;
      
      // 模拟流式输出
      const chunks = responseText.split(' ');
      let accumulatedText = '';
      
      for (const chunk of chunks) {
        accumulatedText += chunk + ' ';
        
        if (typeof onChunk === 'function') {
          onChunk({
            type: 'text',
            delta: chunk + ' ',
            snapshot: accumulatedText
          });
        }
        
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const result = {
        role: 'assistant',
        content: [{ type: 'text', text: accumulatedText.trim() }],
        model: this.model,
        usage: {
          input_tokens: 0,
          output_tokens: accumulatedText.length
        }
      };

      console.error(`[Ollama Echo Mode] Stream completed`);
      
      return result;
    }

    // 正常模式：连接 Ollama 服务器
    const formattedMessages = this._formatMessages(messages, system);

    // 转换工具格式
    const ollamaTools = tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema
      }
    }));

    try {
      console.error(`[Ollama Debug] Starting stream to ${this.baseURL} with model ${this.model}...`);
      console.error(`[Ollama Debug] Stream messages count: ${formattedMessages.length}`);
      console.error(`[Ollama Debug] Tools: ${ollamaTools.length}`);

      const client = await this._getClient();

      const stream = await client.chat({
        model: this.model,
        messages: formattedMessages,
        tools: ollamaTools.length > 0 ? ollamaTools : undefined,
        stream: true,
        options: {
          temperature: temperature,
          num_predict: this.maxTokens
        }
      });

      console.error(`[Ollama Debug] Stream established`);

      let accumulatedText = '';
      let chunkCount = 0;

      for await (const part of stream) {
        if (part.message?.content) {
          const content = part.message.content;
          accumulatedText += content;
          chunkCount++;

          if (typeof onChunk === 'function') {
            onChunk({
              type: 'text',
              delta: content,
              snapshot: accumulatedText
            });
          }
        }

        if (part.done) {
          console.error(`[Ollama Debug] Stream completed, total chunks: ${chunkCount}`);
          console.error(`[Ollama Debug] Total text length: ${accumulatedText.length}`);
          break;
        }
      }

      const result = {
        role: 'assistant',
        content: [{ type: 'text', text: accumulatedText }],
        model: this.model
      };

      console.error(`[Ollama Debug] Stream returning result with content length: ${accumulatedText.length}`);

      return result;
    } catch (error) {
      console.error(`[Ollama Stream Error] Type: ${error.name || 'Unknown'}`);
      console.error(`[Ollama Stream Error] Message: ${error.message}`);
      
      // 检查是否是连接错误
      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
        throw new Error(`Ollama connection failed. Is Ollama running at ${this.baseURL}? Start Ollama with: ollama serve`);
      }
      
      throw new Error(`Ollama stream error: ${error.message}`);
    }
  }

  /**
   * 使用工具调用
   *
   * 注意：Ollama 0.3.0+ 支持工具调用
   */
  async chatWithTools(messages, tools, options = {}) {
    const system = options.system || 'You are a helpful AI programming assistant.';
    const temperature = options.temperature ?? 0.7;

    // 回声模式：不调用工具，直接返回
    if (this.echoMode) {
      console.error(`[Ollama Echo Mode] Tool call in echo mode - skipping tools`);
      
      const userText = this._extractTextFromMessages(messages);
      
      const result = {
        role: 'assistant',
        content: [{ 
          type: 'text', 
          text: `[Echo Mode] You said: ${userText}\n\n(Echo mode does not support tool calls)` 
        }],
        model: this.model
      };

      await new Promise(resolve => setTimeout(resolve, 100));
      
      return result;
    }

    // 正常模式：连接 Ollama 服务器并使用工具
    // 转换工具格式为 Ollama 格式
    const ollamaTools = tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema
      }
    }));

    const formattedMessages = this._formatMessages(messages, system);

    console.error(`[Ollama Debug] Starting tool call with ${ollamaTools.length} tools`);

    // 执行工具调用循环（最多 10 轮）
    let currentMessages = [...formattedMessages];
    let maxTurns = 10;
    let turnCount = 0;

    const client = await this._getClient();

    while (turnCount < maxTurns) {
      turnCount++;

      try {
        console.error(`[Ollama Debug] Tool call turn ${turnCount}/${maxTurns}`);

        const response = await client.chat({
          model: this.model,
          messages: currentMessages,
          tools: ollamaTools,
          stream: false,
          options: {
            temperature: temperature,
            num_predict: this.maxTokens
          }
        });

        const assistantMessage = response.message;
        currentMessages.push(assistantMessage);

        console.error(`[Ollama Debug] Assistant response: ${assistantMessage.content ? 'has content' : 'no content'}`);
        console.error(`[Ollama Debug] Tool calls: ${assistantMessage.tool_calls?.length || 0}`);

        // 检查是否有工具调用
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
          // 执行所有工具调用
          for (const toolCall of assistantMessage.tool_calls) {
            console.error(`[Ollama Debug] Executing tool: ${toolCall.function.name}`);
            
            const tool = tools.find(t => t.name === toolCall.function.name);

            if (tool) {
              try {
                const args = toolCall.function.arguments;// JSON.parse(toolCall.function.arguments);
                const result = await tool.run(args);

                // 使用 'tool' 角色添加工具结果（Ollama 官方格式）
                currentMessages.push({
                  role: 'tool',
                  content: JSON.stringify(result),
                  tool_name: toolCall.function.name
                });

                console.error(`[Ollama Debug] Tool ${toolCall.function.name} result:`, JSON.stringify(result).substring(0, 100));
              } catch (error) {
                console.error(`[Ollama Tool Error] ${toolCall.function.name}:`, error.message);

                // 使用 'tool' 角色添加错误结果
                currentMessages.push({
                  role: 'tool',
                  content: JSON.stringify({ error: error.message }),
                  tool_name: toolCall.function.name
                });
              }
            } else {
              console.error(`[Ollama Tool Error] Tool not found: ${toolCall.function.name}`);
            }
          }
        } else {
          // 没有工具调用，返回最终响应
          console.error(`[Ollama Debug] No tool calls, returning final response`);
          return {
            role: 'assistant',
            content: [{ type: 'text', text: assistantMessage.content }],
            model: this.model
          };
        }
      } catch (error) {
        console.error(`[Ollama Tool Call Error] Turn ${turnCount}`);
        console.error(`[Ollama Tool Call Error] Message: ${error.message}`);
        
        // 检查是否是连接错误
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
          throw new Error(`Ollama connection failed. Is Ollama running at ${this.baseURL}? Start Ollama with: ollama serve`);
        }
        
        throw new Error(`Ollama tool call error (turn ${turnCount}): ${error.message}`);
      }
    }

    throw new Error('Ollama: Maximum tool call turns exceeded');
  }

  /**
   * 估算 token 计数
   */
  async countTokens(messages) {
    const text = JSON.stringify(messages);
    return Math.ceil(text.length / 3);
  }

  /**
   * 格式化消息为 Ollama 格式
   * 
   * 注意：Ollama 只支持简单的字符串 content，不支持数组格式
   */
  _formatMessages(messages, system) {
    const formatted = [];

    // 处理 system prompt（可能是字符串或数组）
    if (system) {
      const systemContent = Array.isArray(system)
        ? system.map(block => block.type === 'text' ? block.text : '').join('\n')
        : system;
      
      // "you can use tools call to perform action. if tool fail and you have idea to recover yourself. do it without asking" 
      formatted.push({ role: 'system', content: systemContent}); // 
    }

    for (const message of messages) {
      // 处理包含 tool_calls 的 assistant 消息
      if (message.tool_calls && message.tool_calls.length > 0) {
        console.error(`[Ollama Debug] Processing message with tool_calls`);

        // 提取文本内容
        let textContent = '';
        if (Array.isArray(message.content)) {
          const textBlocks = message.content.filter(block => block.type === 'text');
          textContent = textBlocks.map(block => block.text).join('\n');
        } else if (typeof message.content === 'string') {
          textContent = message.content;
        }

        // 转换 tool_calls 为 Ollama 格式
        const ollamaToolCalls = message.tool_calls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.input || {})
          }
        }));

        // 添加 assistant 消息（包含 tool_calls）
        formatted.push({
          role: message.role,
          content: textContent,
          tool_calls: ollamaToolCalls
        });
        continue;
      }

      if (Array.isArray(message.content)) {
        // 处理数组格式的 content（Anthropic 格式）
        const textBlocks = message.content.filter(block => block.type === 'text');
        const toolResultBlocks = message.content.filter(block => block.type === 'tool_result');
        const toolUseBlocks = message.content.filter(block => block.type === 'tool_use');

        // 处理工具结果（Ollama 格式：role: 'tool'）
        if (toolResultBlocks.length > 0) {
          for (const block of toolResultBlocks) {
            const resultText = typeof block.content === 'string'
              ? block.content
              : JSON.stringify(block.content);

            formatted.push({
              role: 'tool',
              content: resultText,
              tool_name: block.tool_use_id  // 可选，但推荐
            });
          }
        }

        // 处理文本内容
        if (textBlocks.length > 0) {
          const textContent = textBlocks.map(block => block.text).join('\n');
          formatted.push({
            role: message.role,
            content: textContent
          });
        }

        // tool_use 块已经被上面的 tool_calls 逻辑处理
        // 这里忽略，避免重复
      } else {
        // 简单字符串格式
        formatted.push({
          role: message.role,
          content: message.content
        });
      }
    }

    console.error(`[Ollama Debug] Formatted ${formatted.length} messages for Ollama`);

    return formatted;
  }
}

// 客户端工厂
export function createAIClient(config) {
  const { provider, anthropic, openai, ollama } = config.ai;

  switch (provider) {
    case 'anthropic':
      return new AnthropicClient(anthropic);
    case 'openai':
      return new OpenAIClient(openai);
    case 'ollama':
      return new OllamaClient(ollama);
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

// 检查 API 配置
export function checkConfig(config) {
  const { provider, anthropic, openai, ollama } = config.ai;

  switch (provider) {
    case 'anthropic':
      if (!anthropic.apiKey) {
        throw new Error('Anthropic API key not configured. Set CLOSER_ANTHROPIC_API_KEY environment variable.');
      }
      break;
    case 'openai':
      if (!openai.apiKey) {
        throw new Error('OpenAI API key not configured. Set CLOSER_OPENAI_API_KEY environment variable.');
      }
      break;
    case 'ollama':
      // Ollama 不需要密钥，但需要本地运行
      break;
  }
}
