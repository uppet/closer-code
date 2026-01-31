# Ollama 工具调用完整修复 - 最终总结

## 🎯 真正的问题

之前所有的修复都是正确的方向，但遗漏了最关键的一点：

### ❌ 错误假设
"Ollama 不支持 tool_calls 消息"

### ✅ 真相
Ollama **完全支持** tool_calls，只是格式与 Anthropic 不同！

## 🔍 根本原因

在 `_formatMessages()` 方法中：
```javascript
// ❌ 错误代码
if (message.tool_calls && message.tool_calls.length > 0) {
  console.error(`Skipping message with tool_calls (not supported)`);
  continue;  // 跳过了！
}
```

这导致所有包含 tool_calls 的 assistant 消息都被丢弃，模型无法看到工具调用历史！

## 📚 官方示例证明

参考 `../ollama-js/examples/tools/calculator.ts`：
```typescript
// ✅ 官方示例：保留 tool_calls
messages.push(response.message);  // 包含 tool_calls！

messages.push({
  role: 'tool',
  content: output.toString(),
});
```

## ✅ 完整修复

### 1. 保留并格式化 tool_calls

```javascript
if (message.tool_calls && message.tool_calls.length > 0) {
  // 提取文本内容
  let textContent = '';
  if (Array.isArray(message.content)) {
    const textBlocks = message.content.filter(block => block.type === 'text');
    textContent = textBlocks.map(block => block.text).join('\n');
  }

  // 转换为 Ollama 格式
  const ollamaToolCalls = message.tool_calls.map(tc => ({
    id: tc.id,
    type: 'function',
    function: {
      name: tc.name,
      arguments: JSON.stringify(tc.input || {})
    }
  }));

  // ✅ 添加 assistant 消息（包含 tool_calls）
  formatted.push({
    role: message.role,
    content: textContent,
    tool_calls: ollamaToolCalls
  });
  continue;
}
```

### 2. 正确处理 tool_result

```javascript
// ✅ Ollama 格式：role: 'tool'
if (toolResultBlocks.length > 0) {
  for (const block of toolResultBlocks) {
    const resultText = typeof block.content === 'string'
      ? block.content
      : JSON.stringify(block.content);

    formatted.push({
      role: 'tool',
      content: resultText,
      tool_name: block.tool_use_id
    });
  }
}
```

## 📊 格式对比

### Anthropic 格式
```javascript
// Assistant 消息
{
  role: 'assistant',
  content: [
    { type: 'tool_use', id: '...', name: 'bash', input: {...} }
  ]
}

// 工具结果
{
  role: 'user',
  content: [
    { type: 'tool_result', tool_use_id: '...', content: '...' }
  ]
}
```

### Ollama 格式
```javascript
// Assistant 消息
{
  role: 'assistant',
  content: '',
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

// 工具结果
{
  role: 'tool',
  content: '...',
  tool_name: 'bash'
}
```

## 🎉 修复历史

1. ✅ Commit 1: 修复工具响应格式 (role: 'tool')
2. ✅ Commit 2: chat() 添加工具支持
3. ✅ Commit 3: chatStream() 工具支持
4. ✅ Commit 4: **修复消息格式转换（关键！）**

## ✅ 验证

- 编译通过
- 消息格式符合 Ollama 官方示例
- 保留 tool_calls 消息
- tool_result 使用正确格式

## 🎯 关键学习

1. **不要假设 API 不支持某个功能**
2. **参考官方示例，不要猜测**
3. **格式转换很重要，但不要丢失信息**
4. **调试日志很有价值**

修复应该现在真正生效了！
