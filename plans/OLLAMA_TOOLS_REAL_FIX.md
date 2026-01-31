# Ollama 工具调用真正的问题和修复

## 🔍 发现的问题

### 问题 1: 跳过了 tool_calls 消息

在 `_formatMessages()` 中：
```javascript
// 跳过包含 tool_calls 的消息（Ollama 不支持）❌ 错误！
if (message.tool_calls && message.tool_calls.length > 0) {
  console.error(`[Ollama Debug] Skipping message with tool_calls (not supported)`);
  continue;
}
```

**官方示例证明 Ollama 支持 tool_calls**：
```typescript
// calculator.ts
messages.push(response.message);  // ✅ 包含 tool_calls！
messages.push({
  role: 'tool',
  content: output.toString(),
});
```

### 问题 2: 消息格式不对

我们使用 Anthropic 的数组格式：
```javascript
content: [
  { type: 'tool_use', id: '...', name: 'bash', input: {...} },
  { type: 'text', text: '...' }
]
```

但 Ollama 期望：
```javascript
{
  role: 'assistant',
  content: 'text content',
  tool_calls: [...]  // 单独的字段
}
```

### 问题 3: tool_result 格式

我们使用：
```javascript
{ type: 'tool_result', tool_use_id: '...', content: '...' }
```

但 Ollama 期望：
```javascript
{ role: 'tool', content: '...' }
```

## ✅ 正确的修复方案

### 1. 保留 tool_calls 消息

```javascript
// ❌ 错误：跳过 tool_calls
if (message.tool_calls && message.tool_calls.length > 0) {
  continue;
}

// ✅ 正确：保留并格式化
if (message.tool_calls && message.tool_calls.length > 0) {
  // 提取文本内容
  const textBlocks = message.content.filter(block => block.type === 'text');
  const textContent = textBlocks.map(block => block.text).join('\n');

  // 构建 Ollama 格式的消息
  formatted.push({
    role: message.role,
    content: textContent,
    tool_calls: message.tool_calls.map(tc => ({
      id: tc.id,
      type: 'function',
      function: {
        name: tc.name,
        arguments: JSON.stringify(tc.input)
      }
    }))
  });
  continue;
}
```

### 2. 正确处理 tool_result

```javascript
// 处理 tool_result 块
if (toolResultBlocks.length > 0) {
  for (const block of toolResultBlocks) {
    const resultText = typeof block.content === 'string'
      ? block.content
      : JSON.stringify(block.content);

    // ✅ Ollama 格式：role: 'tool'
    formatted.push({
      role: 'tool',
      content: resultText,
      tool_name: block.tool_use_id  // 可选，但推荐
    });
  }
}
```

## 📋 完整修复计划

1. **修改 `_formatMessages()` 方法**
   - 移除跳过 tool_calls 的逻辑
   - 正确处理 assistant 的 tool_calls
   - 正确处理 tool_result

2. **测试验证**
   - 运行 test-ollama-calculator.js 确保基础功能正常
   - 测试 conversation 模块的工具调用

3. **参考官方格式**
   - calculator.ts: 基础工具调用
   - flight-tracker.ts: 简单流程
   - multi-tool.ts: 多工具和流式

## 🎯 关键差异对比

### Anthropic 格式
```javascript
{
  role: 'assistant',
  content: [
    { type: 'tool_use', id: '...', name: 'bash', input: {...} },
    { type: 'text', text: '...' }
  ]
}

{
  role: 'user',
  content: [
    { type: 'tool_result', tool_use_id: '...', content: '...' }
  ]
}
```

### Ollama 格式
```javascript
{
  role: 'assistant',
  content: 'text content',
  tool_calls: [
    {
      id: '...',
      type: 'function',
      function: {
        name: 'bash',
        arguments: '{...}'
      }
    }
  ]
}

{
  role: 'tool',
  content: 'result content',
  tool_name: 'bash'  // 可选
}
```

## ⚠️ 重要发现

Ollama **完全支持** tool_calls，只是格式不同！
- 我们之前的假设是错的
- 需要正确转换格式
- 不能跳过 tool_calls 消息
