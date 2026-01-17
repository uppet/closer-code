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
