/**
 * AI 客户端模块 - 支持多个 LLM 提供商
 */

// 工具函数：创建流式请求
async function streamFetch(url, options, onChunk) {
  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim().startsWith('data: ')) {
        const data = line.trim().slice(6);
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          onChunk(parsed);
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
  }
}

// Anthropic 客户端
export class AnthropicClient {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://api.anthropic.com';
    this.model = config.model || 'claude-sonnet-4-5-20250929';
    this.maxTokens = config.maxTokens || 8192;
  }

  async chat(messages, options = {}) {
    const system = options.system || 'You are a helpful AI programming assistant.';
    const tools = options.tools || [];
    const temperature = options.temperature ?? 0.7;

    // 转换消息格式
    const formattedMessages = messages.map(m => {
      if (m.role === 'tool') {
        return {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: m.toolUseId,
              content: m.content
            }
          ]
        };
      }
      return {
        role: m.role,
        content: m.content
      };
    });

    const requestBody = {
      model: this.model,
      max_tokens: this.maxTokens,
      system,
      messages: formattedMessages,
      temperature
    };

    if (tools.length > 0) {
      requestBody.tools = tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema
      }));
    }

    const response = await fetch(`${this.baseURL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return this.parseResponse(data);
  }

  async chatStream(messages, options = {}, onChunk) {
    const system = options.system || 'You are a helpful AI programming assistant.';
    const tools = options.tools || [];
    const temperature = options.temperature ?? 0.7;

    const formattedMessages = messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    const requestBody = {
      model: this.model,
      max_tokens: this.maxTokens,
      system,
      messages: formattedMessages,
      temperature,
      stream: true
    };

    if (tools.length > 0) {
      requestBody.tools = tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema
      }));
    }

    await streamFetch(
      `${this.baseURL}/v1/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      },
      onChunk
    );
  }

  parseResponse(data) {
    const message = {
      role: 'assistant',
      content: [],
      model: data.model,
      stopReason: data.stop_reason
    };

    for (const block of data.content) {
      if (block.type === 'text') {
        message.content.push({ type: 'text', text: block.text });
      } else if (block.type === 'tool_use') {
        message.content.push({
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: block.input
        });
      }
    }

    return message;
  }
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
        message.content.push({
          type: 'tool_use',
          id: toolCall.id,
          name: toolCall.function.name,
          input: JSON.parse(toolCall.function.arguments)
        });
      }
    }

    return message;
  }
}

// Ollama 客户端（本地运行）
export class OllamaClient {
  constructor(config) {
    this.baseURL = config.baseURL || 'http://localhost:11434';
    this.model = config.model || 'llama3.1';
    this.maxTokens = config.maxTokens || 4096;
  }

  async chat(messages, options = {}) {
    const system = options.system || 'You are a helpful AI programming assistant.';
    const temperature = options.temperature ?? 0.7;

    const formattedMessages = [
      { role: 'system', content: system },
      ...messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    ];

    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: formattedMessages,
        stream: false,
        options: { temperature }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      role: 'assistant',
      content: [{ type: 'text', text: data.message.content }],
      model: this.model
    };
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
        throw new Error('Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable.');
      }
      break;
    case 'openai':
      if (!openai.apiKey) {
        throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable.');
      }
      break;
    case 'ollama':
      // Ollama 不需要密钥，但需要本地运行
      break;
  }
}
