# OpenAI 工具结果消息格式修复

## 问题描述

当使用 OpenAI API 进行工具调用时，会遇到以下错误：

```
Error: 400 Failed to deserialize the JSON body into the target type: messages[3]: unknown variant `tool`, expected `text` at line 1 column 6374
```

## 根本原因

OpenAI API 和 Anthropic API 在处理工具调用结果（tool_result）时使用不同的消息格式：

### Anthropic 格式（错误用于 OpenAI）

```javascript
{
  role: 'user',
  content: [
    {
      type: 'tool_result',  // ❌ OpenAI 不支持这个 type
      tool_use_id: 'call_xxx',
      content: 'result'
    }
  ]
}
```

### OpenAI 格式（正确）

```javascript
{
  role: 'tool',  // ✅ role 是 'tool'
  tool_call_id: 'call_xxx',
  content: 'result'
}
```

## 修复方案

### 1. 修改 `_convertMessageFormat` 方法

**位置**: `src/ai-client-openai.js` 第 254-348 行

**修改内容**:
- 将 `tool_result` 类型的消息转换为 OpenAI 的 `role: 'tool'` 格式
- 确保每个工具结果作为独立的消息

**关键代码**:

```javascript
if (toolResultBlocks.length > 0) {
  // OpenAI 格式：每个 tool_result 应该是一个独立的 role: 'tool' 消息
  if (toolResultBlocks.length === 1 && !textBlocks.length) {
    const block = toolResultBlocks[0];
    return {
      role: 'tool',  // ✅ 正确的 role
      tool_call_id: block.tool_use_id,
      content: typeof block.content === 'string' ? block.content : JSON.stringify(block.content)
    };
  }
}
```

### 2. 修改 `chatStream` 和 `chat` 方法

**位置**: `src/ai-client-openai.js` 第 82-157 行（chatStream）和第 34-77 行（chat）

**修改内容**:
- 在发送消息给 OpenAI API 之前，检查是否包含 `tool_result`
- 如果包含，将它们拆分为多个独立的 `role: 'tool'` 消息

**关键代码**:

```javascript
// 遍历消息并转换
for (const message of messages) {
  const converted = this._convertMessageFormat(message);

  // 检查是否包含 tool_result（需要拆分为多个 role: 'tool' 消息）
  if (Array.isArray(message.content)) {
    const toolResultBlocks = message.content.filter(block => block.type === 'tool_result');

    if (toolResultBlocks.length > 0) {
      // 每个工具结果作为独立的 role: 'tool' 消息
      for (const block of toolResultBlocks) {
        formattedMessages.push({
          role: 'tool',
          tool_call_id: block.tool_use_id,
          content: typeof block.content === 'string' ? block.content : JSON.stringify(block.content)
        });
      }
    }
  }
}
```

### 3. 修改 `_messagesToInput` 方法

**位置**: `src/ai-client-openai.js` 第 350-375 行

**修改内容**:
- 在将消息转换为输入字符串时，正确处理 `tool_result` 类型的消息

## API 格式对比

### Anthropic API 格式

```javascript
// 助手调用工具
{
  role: 'assistant',
  content: [
    {
      type: 'tool_use',
      id: 'call_123',
      name: 'bash',
      input: { command: 'ls' }
    }
  ]
}

// 工具结果
{
  role: 'user',
  content: [
    {
      type: 'tool_result',
      tool_use_id: 'call_123',
      content: 'file1.txt\nfile2.txt'
    }
  ]
}
```

### OpenAI API 格式

```javascript
// 助手调用工具
{
  role: 'assistant',
  tool_calls: [
    {
      id: 'call_123',
      type: 'function',
      function: {
        name: 'bash',
        arguments: '{"command":"ls"}'
      }
    }
  ]
}

// 工具结果（每个工具调用一条消息）
{
  role: 'tool',
  tool_call_id: 'call_123',
  content: 'file1.txt\nfile2.txt'
}
```

## 测试验证

运行测试以验证修复：

```bash
node test/test-openai-tool-result.js
```

预期输出：
```
✅ 所有测试通过！工具结果消息格式修复成功。
```

## 影响范围

此修复影响以下功能：
- ✅ OpenAI 工具调用（Tool Calling）
- ✅ 多轮对话中的工具结果返回
- ✅ MCP 工具集成

## 兼容性

- ✅ Anthropic API - 不受影响（使用不同的代码路径）
- ✅ OpenAI API - 修复后正常工作
- ✅ Ollama API - 不受影响

## 相关文件

- `src/ai-client-openai.js` - OpenAI 客户端实现
- `src/conversation.js` - 对话管理器
- `test/test-openai-tool-result.js` - 测试脚本

## 参考资料

- [OpenAI API - Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Anthropic API - Tool Use](https://docs.anthropic.com/claude/docs/tool-use)
