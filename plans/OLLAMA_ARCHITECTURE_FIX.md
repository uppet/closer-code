# OllamaClient 架构问题修复

## 🐛 问题分析

### OpenAIClient（正确）✅
```javascript
async chat(messages, options = {}) {
  const response = await fetch(...);  // 一次 API 调用
  return this.parseResponse(data);     // 返回包含 tool_calls 的响应
}
```

**结果**：
- 上层对话系统可以看到 tool_calls
- 对话系统控制工具调用循环
- 每个工具调用都被记录

### OllamaClient（错误）❌
```javascript
async chat(messages, options = {}) {
  if (tools.length > 0) {
    return this._executeToolLoop(...);  // 内部循环！
  }
}
```

**结果**：
- 上层对话系统看不到工具调用过程
- 所有工具调用在 OllamaClient 内部完成
- 只返回最终文本结果
- **破坏了对话系统的消息记录**

## ✅ 正确架构

所有 AI 客户端应该：
1. **只调用一次 API**
2. **返回包含 tool_calls 的响应**
3. **让上层对话系统处理工具调用循环**

### 对话系统的职责
```
conversation.sendMessage()
  → toolExecutor.executeToolLoop()
    → aiClient.chat()  ← 只调用一次，返回 tool_calls
    → 执行工具
    → aiClient.chat()  ← 再次调用，传入工具结果
    → ...
```

## 🔧 修复方案

### 1. 修改 chat() 方法

```javascript
async chat(messages, options = {}) {
  const system = options.system || 'You are a helpful AI programming assistant.';
  const temperature = options.temperature ?? 0.7;
  const tools = options.tools || [];

  // 格式化工具
  const ollamaTools = tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema
    }
  }));

  const formattedMessages = this._formatMessages(messages, system);

  // ✅ 只调用一次 API
  const client = await this._getClient();
  const response = await client.chat({
    model: this.model,
    messages: formattedMessages,
    tools: ollamaTools,
    stream: false
  });

  // ✅ 解析响应，返回统一格式（包含 tool_calls）
  return this._parseResponse(response);
}
```

### 2. 添加 _parseResponse() 方法

```javascript
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

  // 添加 tool_calls
  if (response.message.tool_calls) {
    for (const toolCall of response.message.tool_calls) {
      const input = JSON.parse(toolCall.function.arguments);
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
```

### 3. 删除 _executeToolLoop() 调用

从 `chat()` 和 `chatStream()` 中移除对 `_executeToolLoop()` 的调用。

### 4. 保留 _executeToolLoop() 方法（但不使用）

可以保留这个方法作为参考，或者完全删除。

## 📊 对比

### 修复前（错误）
```
OllamaClient.chat()
  → _executeToolLoop()  ← 内部循环
    → ollama.chat() → 工具调用 → ollama.chat() → ...
  → 返回最终文本
```
上层对话系统看不到工具调用！

### 修复后（正确）
```
toolExecutor.executeToolLoop()
  → OllamaClient.chat()  ← 一次调用
    → 返回 { content: [{ type: 'tool_use', ... }] }
  → 执行工具
  → OllamaClient.chat()  ← 再次调用
  → ...
```
上层对话系统完全控制流程！

## 🎯 关键点

1. **AI 客户端只负责调用 API 和解析响应**
2. **工具调用循环是对话系统的职责**
3. **所有客户端应该有一致的接口**
4. **不要在客户端内部隐藏工具调用过程**
