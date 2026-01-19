# OpenAI Client 实现文档

## 概述

本项目已成功实现基于 `@openai/agents` SDK 的 OpenAI AI 客户端，与现有的 Anthropic SDK 实现保持一致的接口。

## 架构设计

### 文件结构

```
src/
├── ai-client.js           # Anthropic 客户端实现（SDK）
├── ai-client-openai.js    # OpenAI 客户端实现（@openai/agents）✨ 新增
├── ai-client-legacy.js    # 旧版 OpenAI/Ollama 实现（已废弃）
├── conversation.js        # 对话管理器（支持多 provider）
└── tools.js               # 工具定义（使用 Anthropic betaZodTool）
```

### 核心类：OpenAIClient

```javascript
export class OpenAIClient {
  constructor(config)
  async chat(messages, options = {})
  async chatStream(messages, options = {}, onChunk)
  async chatWithTools(messages, tools, options = {})
  async countTokens(messages)
}
```

## SDK 对比分析

### Anthropic SDK vs OpenAI Agents SDK

| 特性 | Anthropic SDK (@anthropic-ai/sdk) | OpenAI Agents SDK (@openai/agents) |
|------|-----------------------------------|-------------------------------------|
| **工具定义** | `betaZodTool({ name, description, inputSchema: z.object(), run })` | `tool({ name, description, parameters: z.object(), execute })` |
| **自动工具调用循环** | `toolRunner()` | `run(agent, input)` |
| **流式响应** | `stream.on('thinking', ...)`, `stream.on('text', ...)` | 使用 OpenAI SDK 原生流式 API（无事件 API） |
| **Agent 创建** | 无（直接使用 client） | `new Agent({ name, instructions, tools })` |
| **消息格式** | `{ role, content }` (content 可为数组) | `{ role, content }` (content 为字符串) |
| **多 Agent 支持** | 无 | 支持 handoffs |

### 关键差异说明

1. **工具定义方式**
   - **Anthropic**: 使用 `betaZodTool` 从 `@anthropic-ai/sdk/helpers/beta/zod`
   - **OpenAI**: 使用 `tool` 函数从 `@openai/agents`

2. **工具调用循环处理**
   - **Anthropic**: `client.beta.messages.toolRunner()` - 自动处理工具调用和结果返回
   - **OpenAI**: `run(agent, input)` - 自动执行 agent 循环，包括工具调用

3. **流式响应处理**
   - **Anthropic**: 提供事件监听器 API，可监听 `thinking`、`text`、`signature` 等事件
   - **OpenAI**: 不提供流式事件 API，使用 OpenAI SDK 原生的 `stream` 方法

4. **消息格式转换**
   - **Anthropic**: content 是数组，可包含 text、tool_use、tool_result 等不同类型
   - **OpenAI**: content 是字符串（简化版本）

## 实现细节

### 1. 消息格式转换

OpenAI 客户端实现了 `_convertMessageFormat()` 方法：

```javascript
_convertMessageFormat(message) {
  // Anthropic: { role, content } where content can be string or array
  // OpenAI: { role, content } where content is string

  if (typeof message.content === 'string') {
    return { role: message.role, content: message.content };
  }

  // 提取所有文本块
  if (Array.isArray(message.content)) {
    const textParts = message.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    return { role: message.role, content: textParts };
  }
}
```

### 2. 工具格式转换

OpenAI 客户端实现了 `_convertTools()` 方法：

```javascript
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
```

### 3. 流式响应处理

OpenAI 客户端使用 OpenAI SDK 原生的流式 API：

```javascript
async chatStream(messages, options = {}, onChunk) {
  const stream = await this.client.chat.completions.create({
    model: this.model,
    messages: formattedMessages,
    tools: openaiTools,
    stream: true
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;

    // 处理文本内容
    if (delta.content) {
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
      // 累积工具调用参数
    }
  }
}
```

### 4. 工具调用循环

使用 `@openai/agents` 的 `run()` 函数：

```javascript
async chatWithTools(messages, tools, options = {}) {
  const openaiTools = tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.input_schema,
    execute: tool.run
  }));

  const agent = new Agent({
    name: 'Assistant',
    instructions: system,
    tools: openaiTools,
    temperature: temperature
  });

  const result = await run(agent, input, { maxTurns: 10 });

  return this._convertResponseToAnthropic(result);
}
```

## 兼容性设计

为了保持与现有代码的兼容性，OpenAIClient 实现了与 AnthropicClient 相同的接口：

```javascript
// 统一的工厂函数
export function createAIClient(config) {
  const { provider, anthropic, openai, ollama } = config.ai;

  switch (provider) {
    case 'anthropic':
      return new AnthropicClient(anthropic);
    case 'openai':
      return createOpenAIClient(openai);  // ✨ 使用新的 OpenAI 客户端
    case 'ollama':
      return createOllamaClient(ollama);
  }
}
```

## 配置示例

```javascript
{
  "ai": {
    "provider": "openai",
    "openai": {
      "apiKey": "sk-...",
      "baseURL": "https://api.openai.com/v1",
      "model": "gpt-4o",
      "maxTokens": 8192
    }
  }
}
```

## 依赖项

```json
{
  "dependencies": {
    "@openai/agents": "^0.4.0",
    "openai": "^4.73.0",
    "zod": "^4.3.5"
  }
}
```

**注意**: `@openai/agents` 包目前与 `zod@3.25.68+` 不兼容，需要使用 `zod@<=3.25.67` 或使用 `--legacy-peer-deps` 安装。

## 测试

构建项目以验证实现：

```bash
npm run build
node --check dist/index.js
node --check dist/closer-cli.js
```

## 限制与注意事项

1. **流式响应事件**: OpenAI Agents SDK 不提供与 Anthropic SDK 相同的流式事件 API（如 `thinking` 事件），因此使用 OpenAI SDK 原生的流式 API。

2. **Thinking 功能**: OpenAI 模型不支持 Extended Thinking 功能，因此 `thinking` 参数在 OpenAI 客户端中被忽略。

3. **工具格式差异**: Anthropic 使用 `betaZodTool`，OpenAI 使用 `tool` 函数，需要转换格式。

4. **Zod 版本**: 注意 `@openai/agents` 与 `zod@3.25.68+` 的兼容性问题。

## 参考资源

- [OpenAI Agents SDK npm 包](https://www.npmjs.com/package/@openai/agents)
- [OpenAI Agents 文档](https://platform.openai.com/docs/agents)
- [Anthropic SDK 文档](https://docs.anthropic.com/en/api/client-sdks)
- [AgentKit Walkthrough](https://developers.openai.com/cookbook/examples/agentkit/agentkit_walkthrough)

## 总结

OpenAI 客户端实现成功地将 `@openai/agents` SDK 集成到项目中，提供了与 Anthropic SDK 一致的接口，使得项目可以无缝切换不同的 AI 提供商。

**主要优势**:
- 统一的客户端接口
- 自动工具调用循环处理
- 流式响应支持
- 完整的类型安全（使用 Zod）

**未来改进方向**:
- 添加 OpenAI 特有的功能（如 structured outputs）
- 优化流式响应性能
- 添加更多错误处理和重试逻辑
