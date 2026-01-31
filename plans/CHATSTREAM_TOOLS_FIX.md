# chatStream() 工具调用支持修复

## 🐛 问题根源

`OllamaClient.chatStream()` 方法没有传递 `tools` 参数给 Ollama，导致工具调用无法触发。

### 调用链

```
conversation.sendMessage()
  → toolExecutor.executeToolLoop()
    → aiClient.chatStream()  ❌ 缺少 tools 参数
      → ollama.chat({ stream: true })  ❌ 没有 tools
```

### 对比：test-ollama-calculator.js（可以工作）

```javascript
await ollama.chat({
  model: model,
  messages: messages,
  tools: [addTwoNumbersTool, subtractTwoNumbersTool]  ✅
});
```

## 🔧 解决方案

修改 `chatStream()` 方法，添加工具调用支持。

### 修改点

1. 从 `options` 中提取 `tools`
2. 转换为 Ollama 格式
3. 传递给 `client.chat()`
4. 处理流式响应中的 `tool_calls`

## ⚠️ 复杂度分析

流式工具调用比较复杂：

1. **工具调用可能在流中间出现**
2. **需要收集完整的 tool_calls**
3. **需要暂停流，执行工具，然后继续**

参考 `multi-tool.ts` 的实现：
```typescript
for await (const chunk of stream) {
  if (chunk.message.tool_calls) {
    // 处理工具调用
    // 添加到消息
    // 继续流
  }
}
```

## 📋 实施计划

### 方案 A：简单修复（推荐）

将 `chatStream()` 改为在有工具时使用非流式调用：

```javascript
async chatStream(messages, options = {}, onChunk) {
  const tools = options.tools || [];

  // 如果有工具，使用非流式（通过 chat()）
  if (tools.length > 0) {
    return this.chat(messages, options);
  }

  // 没有工具，使用流式
  // ... 现有流式代码
}
```

**优点**：
- 简单快速
- 复用已有的 `chat()` 工具循环
- 立即可用

**缺点**：
- 有工具时无流式输出

### 方案 B：完整流式工具支持

实现完整的流式工具调用处理。

**优点**：
- 完全流式
- 更好的用户体验

**缺点**：
- 复杂度高
- 需要更多测试
- 开发时间长

## 🎯 建议

**立即实施方案 A**，让工具调用先工作起来。
方案 B 可以作为后续优化。

## ✅ 验证

修复后，运行：
```bash
node test-ollama-tools-client.js
```

应该能看到工具被正确调用。
