# Closer Code - Anthropic SDK 使用指南

> 本指南帮助 Closer Code 项目的工程师更好地使用 `@anthropic-ai/sdk` 简化 AI API 调用，降低封装成本。

---

## 目录

1. [快速入门](#1-快速入门)
2. [核心功能对比](#2-核心功能对比)
3. [迁移指南](#3-迁移指南)
4. [API 使用说明](#4-api-使用说明)
5. [最佳实践](#5-最佳实践)
6. [常见问题](#6-常见问题)
7. [示例代码](#7-示例代码)

---

## 1. 快速入门

### 1.1 安装

```bash
npm install @anthropic-ai/sdk
```

### 1.2 基本使用（5分钟上手）

#### 当前方式（closer_code 原生实现）

```javascript
// 手动实现 fetch、流式处理、错误处理...
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify(requestBody)
});
// 手动解析响应...
```

#### 使用 SDK 后（简化版本）

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const message = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 8192,
  messages: [{ role: 'user', content: 'Hello, Claude!' }]
});

console.log(message.content);
```

**优势**：
- ✅ 无需手动处理 HTTP 请求
- ✅ 自动类型检查
- ✅ 内置错误处理和重试
- ✅ 代码量减少 80%

---

## 2. 核心功能对比

### 2.1 流式响应

| 功能 | 原生实现 | SDK 实现 |
|------|---------|---------|
| **代码行数** | ~40 行 | ~5 行 |
| **SSE 解析** | 手动实现 | 自动处理 |
| **错误处理** | 手动处理 | 内置支持 |
| **类型安全** | 无 | 完整类型 |

#### 原生实现（当前 closer_code）

```javascript
// ai-client.js: streamFetch 函数
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
```

#### SDK 实现

```typescript
const stream = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 8192,
  messages: [{ role: 'user', content: 'Hello!' }],
  stream: true
});

for await (const event of stream) {
  console.log(event.type);
}
```

**代码减少：87.5%**

### 2.2 工具执行（Tool Use）

| 功能 | 原生实现 | SDK 实现 |
|------|---------|---------|
| **工具定义** | 手动构建 schema | 支持多种 schema 格式 |
| **工具调用循环** | 手动实现 | 自动处理 |
| **结果传递** | 手动管理 | 自动传递 |
| **代码量** | ~100 行 | ~20 行 |

#### 原生实现（当前 closer_code）

```javascript
// 手动处理工具调用
async function executeTools(aiClient, messages, tools) {
  let currentMessages = [...messages];

  while (true) {
    const response = await aiClient.chat(currentMessages, { tools });

    const toolResults = [];
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        const result = await executeTool(block.name, block.input);
        toolResults.push({
          role: 'tool',
          toolUseId: block.id,
          content: result
        });
      }
    }

    if (toolResults.length === 0) {
      return response;
    }

    currentMessages.push({
      role: 'assistant',
      content: response.content
    });
    currentMessages.push(...toolResults);
  }
}
```

#### SDK 实现（使用 toolRunner）

```typescript
import { z } from 'zod';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';

const weatherTool = betaZodTool({
  name: 'get_weather',
  description: '获取指定地点的天气',
  inputSchema: z.object({
    location: z.string().describe('城市名称')
  }),
  run: async (input) => {
    // 执行工具逻辑
    return `${input.location} 的天气是晴天，温度 20°C`;
  }
});

const finalMessage = await client.beta.messages.toolRunner({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 8192,
  messages: [{ role: 'user', content: '北京天气怎么样？' }],
  tools: [weatherTool]
});
```

**代码减少：80%**

### 2.3 消息格式化

| 功能 | 原生实现 | SDK 实现 |
|------|---------|---------|
| **格式转换** | 手动映射 | 类型安全 |
| **工具结果** | 特殊处理 | 标准格式 |
| **验证** | 运行时错误 | 编译时检查 |

#### 原生实现（当前 closer_code）

```javascript
// ai-client.js: 格式化消息
const formattedMessages = messages.map(m => {
  if (m.role === 'tool') {
    return {
      role: 'user',
      content: [{
        type: 'tool_result',
        tool_use_id: m.toolUseId,
        content: m.content
      }]
    };
  }
  return {
    role: m.role,
    content: m.content
  };
});
```

#### SDK 实现

```typescript
import Anthropic from '@anthropic-ai/sdk';

// 完全类型安全，IDE 自动补全
const message: Anthropic.MessageParam = {
  role: 'user',
  content: 'Hello'
};

// 工具结果也是标准格式
const toolResult: Anthropic.ToolResultBlockParam = {
  type: 'tool_result',
  tool_use_id: 'toolu_xxx',
  content: '执行结果'
};
```

---

## 3. 迁移指南

### 3.1 替换 AnthropicClient 类

#### 步骤 1：安装 SDK

```bash
npm install @anthropic-ai/sdk
```

#### 步骤 2：创建新的客户端实例

**之前（src/ai-client.js）**：

```javascript
export class AnthropicClient {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://api.anthropic.com';
    this.model = config.model || 'claude-sonnet-4-5-20250929';
    this.maxTokens = config.maxTokens || 8192;
  }

  async chat(messages, options = {}) {
    // ... 大量实现代码
  }
}
```

**之后（src/ai-client-sdk.js）**：

```typescript
import Anthropic from '@anthropic-ai/sdk';

export class AnthropicClientSDK {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(config: { apiKey: string; model?: string; maxTokens?: number }) {
    this.client = new Anthropic({
      apiKey: config.apiKey
    });
    this.model = config.model || 'claude-sonnet-4-5-20250929';
    this.maxTokens = config.maxTokens || 8192;
  }

  async chat(messages: Anthropic.MessageParam[], options?: {
    system?: string;
    tools?: Anthropic.Tool[];
    temperature?: number;
  }) {
    return await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: options?.system,
      messages,
      tools: options?.tools,
      temperature: options?.temperature
    });
  }

  async chatStream(
    messages: Anthropic.MessageParam[],
    options?: { system?: string; tools?: Anthropic.Tool[] },
    onChunk: (event: Anthropic.RawMessageStreamEvent) => void
  ) {
    const stream = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: options?.system,
      messages,
      tools: options?.tools,
      stream: true
    });

    for await (const event of stream) {
      onChunk(event);
    }
  }
}
```

**代码减少：70%**

### 3.2 逐步迁移策略

#### 阶段 1：并存期（1-2周）

- 保留原有的 `AnthropicClient` 类
- 新增 `AnthropicClientSDK` 类
- 新功能使用 SDK，旧功能保持不变

#### 阶段 2：适配期（2-4周）

- 创建适配器模式，统一接口
- 逐步将功能迁移到 SDK
- 充分测试兼容性

#### 阶段 3：完全迁移（1-2周）

- 移除旧的实现代码
- 更新所有引用
- 清理依赖

---

## 4. API 使用说明

### 4.1 初始化客户端

```typescript
import Anthropic from '@anthropic-ai/sdk';

// 基础配置
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: 'https://api.anthropic.com', // 可选
  timeout: 60000 // 可选，默认 10 分钟
});

// 获取模型信息
const models = await client.models.list();
console.log(models.data);
```

### 4.2 发送消息

#### 简单文本消息

```typescript
const message = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: '你好，请介绍一下你自己'
  }]
});

console.log(message.content[0].type); // 'text'
console.log(message.content[0].text); // 响应内容
```

#### 多媒体消息（图片/PDF）

```typescript
const message = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: [
      {
        type: 'text',
        text: '请描述这张图片'
      },
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: 'iVBORw0KGgoAAAANSUhEUg...' // base64 编码的图片
        }
      }
    ]
  }]
});
```

### 4.3 流式响应

#### 基础流式

```typescript
const stream = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages: [{ role: 'user', content: '讲个故事' }],
  stream: true
});

for await (const event of stream) {
  switch (event.type) {
    case 'text_block':
      console.log('收到文本块');
      break;
    case 'content_block_delta':
      console.log('内容增量:', event.delta.text);
      break;
    case 'message_stop':
      console.log('消息结束');
      break;
  }
}
```

#### 使用 Stream Helper

```typescript
const stream = client.messages.stream({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages: [{ role: 'user', content: '写一首诗' }]
})
  .on('text', (text) => {
    console.log('实时文本:', text);
  })
  .on('error', (error) => {
    console.error('流式错误:', error);
  })
  .on('finalMessage', (message) => {
    console.log('完整消息:', message);
  });

await stream.finalMessage();
```

### 4.4 工具使用（Tool Use）

#### 定义工具

```typescript
import { z } from 'zod';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';

// 方式 1：使用 Zod（推荐）
const searchTool = betaZodTool({
  name: 'search_code',
  description: '在代码库中搜索',
  inputSchema: z.object({
    query: z.string().describe('搜索关键词'),
    file_type: z.string().optional().describe('文件类型')
  }),
  run: async (input) => {
    // 执行搜索逻辑
    const results = await searchInCodebase(input.query, input.file_type);
    return JSON.stringify(results);
  }
});

// 方式 2：使用 JSON Schema
const searchTool2: Anthropic.Tool = {
  name: 'search_code',
  description: '在代码库中搜索',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '搜索关键词'
      },
      file_type: {
        type: 'string',
        description: '文件类型'
      }
    },
    required: ['query']
  }
};
```

#### 使用工具

```typescript
// 方式 1：自动工具循环（推荐）
const finalMessage = await client.beta.messages.toolRunner({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 8192,
  messages: [{ role: 'user', content: '搜索所有 TypeScript 文件中的 "API" 关键词' }],
  tools: [searchTool]
});

// 方式 2：手动工具循环
const response = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 8192,
  messages: [{ role: 'user', content: '搜索代码' }],
  tools: [searchTool]
});

// 处理工具调用
let currentMessages = [{ role: 'user', content: '搜索代码' }];

for (const block of response.content) {
  if (block.type === 'tool_use') {
    // 执行工具
    const result = await executeTool(block.name, block.input);

    // 返回结果
    const toolResponse = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,
      messages: [
        ...currentMessages,
        { role: 'assistant', content: response.content },
        {
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: block.id,
            content: result
          }]
        }
      ]
    });
  }
}
```

### 4.5 Token 计数

```typescript
// 在发送消息前计算 token 数量
const tokenCount = await client.messages.countTokens({
  model: 'claude-sonnet-4-5-20250929',
  messages: [
    { role: 'user', content: '这是一段很长的文本...' }
  ]
});

console.log('输入 tokens:', tokenCount.input_tokens);

// 从响应中获取使用信息
const message = await client.messages.create({...});
console.log('输入 tokens:', message.usage.input_tokens);
console.log('输出 tokens:', message.usage.output_tokens);
```

---

## 5. 最佳实践

### 5.1 错误处理

```typescript
import {
  APIError,
  APIConnectionError,
  RateLimitError,
  AuthenticationError
} from '@anthropic-ai/sdk';

try {
  const message = await client.messages.create({...});
} catch (error) {
  if (error instanceof APIConnectionError) {
    console.error('网络连接错误:', error.message);
  } else if (error instanceof RateLimitError) {
    console.error('速率限制，请稍后重试');
  } else if (error instanceof AuthenticationError) {
    console.error('API 密钥无效');
  } else if (error instanceof APIError) {
    console.error('API 错误:', error.message);
    console.error('状态码:', error.status);
    console.error('错误详情:', error.error);
  }
}
```

### 5.2 重试策略

SDK 内置自动重试，但可以自定义：

```typescript
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 3, // 默认 2
  timeout: 60000
});
```

### 5.3 性能优化

#### 1. 使用缓存

```typescript
const message = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 8192,
  system: '你是一个编程助手',
  messages: [
    {
      role: 'user',
      content: '分析这段代码'
    }
  ],
  // 启用提示缓存
  cache_control: {
    type: 'ephemeral',
    ttl: '5m'
  }
});
```

#### 2. 批量请求

```typescript
// 使用 Message Batches API
const batch = await client.messages.batches.create({
  requests: [
    {
      custom_id: 'request-1',
      params: {
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: [{ role: 'user', content: '任务 1' }]
      }
    },
    {
      custom_id: 'request-2',
      params: {
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: [{ role: 'user', content: '任务 2' }]
      }
    }
  ]
});

// 获取结果
const results = await client.messages.batches.results(batch.id);
for await (const result of results) {
  console.log(result);
}
```

### 5.4 安全性

#### 1. API 密钥管理

```typescript
// ✅ 好的做法：使用环境变量
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// ❌ 不好的做法：硬编码密钥
const client = new Anthropic({
  apiKey: 'sk-ant-xxx...' // 不要这样做！
});
```

#### 2. 输入验证

```typescript
// 验证用户输入
function sanitizeUserInput(input: string): string {
  // 移除潜在的恶意内容
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .slice(0, 10000); // 限制长度
}

const message = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: sanitizeUserInput(userInput)
  }]
});
```

---

## 6. 常见问题

### 6.1 如何处理超长对话？

**问题**：对话历史很长，导致 token 超限。

**解决方案**：

```typescript
// 方案 1：使用 token 计数检查
async function checkTokenCount(messages: Anthropic.MessageParam[]) {
  const count = await client.messages.countTokens({
    model: 'claude-sonnet-4-5-20250929',
    messages
  });

  if (count.input_tokens > 100000) {
    // 截断或总结早期消息
    return summarizeMessages(messages);
  }
  return messages;
}

// 方案 2：滑动窗口
function slidingWindow(messages: Anthropic.MessageParam[], maxMessages = 10) {
  return messages.slice(-maxMessages);
}
```

### 6.2 如何实现多轮对话？

```typescript
class Conversation {
  private messages: Anthropic.MessageParam[] = [];
  private system: string;

  constructor(system: string) {
    this.system = system;
  }

  async say(userMessage: string) {
    this.messages.push({
      role: 'user',
      content: userMessage
    });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,
      system: this.system,
      messages: this.messages
    });

    this.messages.push({
      role: 'assistant',
      content: response.content
    });

    return response;
  }
}

// 使用
const chat = new Conversation('你是一个编程助手');
await chat.say('什么是 TypeScript？');
await chat.say('能给我一个例子吗？');
```

### 6.3 如何处理并发请求？

```typescript
// 使用 Promise.all 并行处理
const tasks = [
  '分析文件 A',
  '分析文件 B',
  '分析文件 C'
];

const results = await Promise.all(
  tasks.map(task =>
    client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{ role: 'user', content: task }]
    })
  )
);

// 或者使用 Message Batches API（更适合大量请求）
```

### 6.4 如何调试 API 调用？

```typescript
// 启用详细日志
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  // 添加日志中间件
  baseURL: 'https://api.anthropic.com'
});

// 检查请求详情
const message = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages: [{ role: 'user', content: '测试' }]
}).withResponse();

console.log('响应头:', message.response.headers);
console.log('请求 ID:', message.response.headers.get('request-id'));
```

---

## 7. 示例代码

### 7.1 代码助手（完整示例）

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

// 初始化客户端
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// 定义工具
const readFileTool = betaZodTool({
  name: 'read_file',
  description: '读取文件内容',
  inputSchema: z.object({
    filePath: z.string().describe('文件路径')
  }),
  run: async (input) => {
    const fs = await import('fs/promises');
    const content = await fs.readFile(input.filePath, 'utf-8');
    return content;
  }
});

const writeFileTool = betaZodTool({
  name: 'write_file',
  description: '写入文件内容',
  inputSchema: z.object({
    filePath: z.string().describe('文件路径'),
    content: z.string().describe('文件内容')
  }),
  run: async (input) => {
    const fs = await import('fs/promises');
    await fs.writeFile(input.filePath, input.content, 'utf-8');
    return '文件已保存';
  }
});

// 主函数
async function codeAssistant(userRequest: string) {
  const finalMessage = await client.beta.messages.toolRunner({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8192,
    system: '你是一个专业的代码助手，可以帮助用户读写文件和分析代码。',
    messages: [{ role: 'user', content: userRequest }],
    tools: [readFileTool, writeFileTool]
  });

  return finalMessage;
}

// 使用示例
const result = await codeAssistant('请读取 src/index.js 文件并分析它的功能');
console.log(result.content);
```

### 7.2 流式代码助手

```typescript
async function streamingCodeAssistant(userRequest: string) {
  const stream = client.messages.stream({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8192,
    system: '你是一个专业的代码助手',
    messages: [{ role: 'user', content: userRequest }],
    tools: [readFileTool, writeFileTool]
  })
    .on('text', (text) => {
      process.stdout.write(text);
    })
    .on('toolUse', (toolUse) => {
      console.log('\n[执行工具]', toolUse.name, toolUse.input);
    })
    .on('error', (error) => {
      console.error('\n[错误]', error);
    });

  const finalMessage = await stream.finalMessage();
  return finalMessage;
}
```

### 7.3 交互式对话

```typescript
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function askQuestion(query: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
}

async function interactiveChat() {
  const messages: Anthropic.MessageParam[] = [];

  console.log('=== Closer Code 交互式对话 ===');
  console.log('输入 "quit" 退出\n');

  while (true) {
    const userInput = await askQuestion('你: ');

    if (userInput.toLowerCase() === 'quit') {
      break;
    }

    messages.push({
      role: 'user',
      content: userInput
    });

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,
      messages
    })
      .on('text', (text) => {
        process.stdout.write(text);
      })
      .on('finalMessage', (msg) => {
        messages.push({
          role: 'assistant',
          content: msg.content
        });
      });

    await stream.finalMessage();
    console.log('\n');
  }

  rl.close();
}

interactiveChat();
```

---

## 总结

使用 `@anthropic-ai/sdk` 的核心优势：

1. **代码量减少 70-80%**
2. **类型安全**：完整的 TypeScript 支持
3. **自动重试**：内置错误处理和重试逻辑
4. **流式响应简化**：无需手动解析 SSE
5. **工具执行自动化**：toolRunner 自动处理工具调用
6. **更好的性能**：优化的网络请求和缓存支持

开始迁移建议：
- ✅ 从新功能开始使用 SDK
- ✅ 保留旧代码以确保稳定性
- ✅ 逐步迁移核心功能
- ✅ 充分测试后完全切换

---

**文档版本**: 1.0.0
**最后更新**: 2025-01-17
**维护者**: Closer Code 团队

**参考资源**:
- [Anthropic TypeScript SDK 完整文档](../ref_repo/anthropic-sdk-typescript/api.md)
- [Messages API 官方文档](https://docs.anthropic.com/claude/reference/messages-post)
- [Closer Code 项目 README](./README.md)
