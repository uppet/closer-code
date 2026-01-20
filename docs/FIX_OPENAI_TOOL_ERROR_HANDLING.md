# OpenAI 工具调用异常处理修复

## 错误描述

### 错误信息
```
Error: 400 An assistant message with 'tool_calls' must be followed by tool messages 
responding to each 'tool_call_id'. (insufficient tool messages following tool_calls message)
```

### 错误场景

1. AI 调用了多个工具（例如：`listFiles` 和 `bash`）
2. 第一个工具（`listFiles`）执行成功
3. 第二个工具（`bash`）执行失败（抛出异常）
4. **工具执行循环中断**，只有第一个工具的结果被发送
5. OpenAI API 检测到缺少第二个工具的响应，返回 400 错误

---

## 根本原因

### 问题代码（修复前）

**位置**: `src/conversation.js` 第 359-393 行

```javascript
// 处理工具调用
for (const block of toolUseBlocks) {
  // ...

  // ❌ 如果这里抛出异常，整个循环中断！
  const result = await tool.run(block.input);

  // 添加工具结果
  currentMessages.push({
    role: 'user',
    content: [{
      type: 'tool_result',
      tool_use_id: block.id,
      content: result
    }]
  });
}
```

### 问题分析

| 问题 | 影响 |
|------|------|
| **缺少异常处理** | 工具执行失败时，循环中断 |
| **缺少工具存在性检查** | 工具不存在时直接抛出异常 |
| **缺少 JSON 解析保护** | JSON 格式错误会导致崩溃 |
| **缺少流式异常处理** | 网络中断会导致未捕获异常 |

---

## 修复方案

### 1. 工具执行异常处理

**位置**: `src/conversation.js`

```javascript
// 处理工具调用
for (const block of toolUseBlocks) {
  // ... 进度回调 ...

  // 查找对应的 betaZodTool
  const tool = tools.find(t => t.name === block.name);
  if (!tool) {
    // ✅ 工具不存在，也要返回错误结果
    const errorResult = JSON.stringify({
      success: false,
      error: `Tool ${block.name} not found`,
      content: null
    });

    currentMessages.push({
      role: 'user',
      content: [{
        type: 'tool_result',
        tool_use_id: block.id,
        content: errorResult,
        isError: true
      }]
    });

    await logToolCall(block.name, block.input, errorResult);
    continue; // 继续处理下一个工具
  }

  // ✅ 使用 try-catch 包裹工具执行
  let result;
  let executionSuccess = true;

  try {
    result = await tool.run(block.input);
  } catch (error) {
    // 工具执行失败，返回错误信息
    executionSuccess = false;
    result = JSON.stringify({
      success: false,
      error: error.message,
      errorType: error.constructor.name,
      content: null
    });

    console.error(`[Tool Execution Error] ${block.name}:`, error.message);
  }

  // 记录工具调用
  await logToolCall(block.name, block.input, result);

  // ... 进度回调 ...

  // ✅ 关键：无论成功失败，都必须添加结果
  currentMessages.push({
    role: 'user',
    content: [{
      type: 'tool_result',
      tool_use_id: block.id,
      content: result,
      isError: !executionSuccess
    }]
  });

  // 同时添加到 this.messages（用于保存历史）
  this.messages.push({
    role: 'user',
    content: [{
      type: 'tool_result',
      tool_use_id: block.id,
      content: result,
      isError: !executionSuccess
    }]
  });
}
```

### 2. JSON 解析异常处理

**位置**: `src/ai-client-openai.js`

```javascript
// 流式响应中的工具调用解析
if (currentToolCalls.length > 0) {
  for (const toolCall of currentToolCalls) {
    try {
      fullResponse.content.push({
        type: 'tool_use',
        id: toolCall.id,
        name: toolCall.function.name,
        input: JSON.parse(toolCall.function.arguments)
      });
    } catch (parseError) {
      // ✅ JSON 解析失败，返回空对象作为降级处理
      console.error('[OpenAI Tool Parse Error]:', parseError.message);
      fullResponse.content.push({
        type: 'tool_use',
        id: toolCall.id,
        name: toolCall.function.name,
        input: {},
        parseError: true
      });
    }
  }
}
```

### 3. 流式网络异常处理

**位置**: `src/ai-client-openai.js`

```javascript
try {
  for await (const chunk of stream) {
    try {
      // 处理每个 chunk
      const delta = chunk.choices[0]?.delta;
      // ...
    } catch (chunkError) {
      // ✅ 单个 chunk 错误，继续处理下一个
      console.error('[OpenAI Stream Chunk Error]:', chunkError.message);
      continue;
    }
  }
} catch (streamError) {
  // ✅ 流式读取错误，返回已累积的内容
  console.error('[OpenAI Stream Error]:', streamError.message);

  // 不抛出异常，继续处理已累积的内容
  if (accumulatedText) {
    fullResponse.content.push({
      type: 'text',
      text: accumulatedText
    });
  }
}
```

### 4. OpenAI 工具执行异常处理

**位置**: `src/ai-client-openai.js`

```javascript
export function createOpenAITool(anthropicTool) {
  return tool({
    name: anthropicTool.name,
    description: anthropicTool.description,
    parameters: anthropicTool.input_schema,
    execute: async (input) => {
      try {
        // 调用原始工具的 run 方法
        const result = await anthropicTool.run(input);

        // 尝试解析 JSON
        try {
          return JSON.parse(result);
        } catch (parseError) {
          // ✅ JSON 解析失败，返回原始结果
          if (typeof result === 'object') {
            return result;
          }
          return { result: result };
        }
      } catch (error) {
        // ✅ 工具执行失败，返回错误信息
        console.error(`[OpenAI Tool Execution Error] ${anthropicTool.name}:`, error.message);
        return {
          success: false,
          error: error.message,
          errorType: error.constructor.name
        };
      }
    }
  });
}
```

---

## 修复效果

### 修复前

| 场景 | 行为 | 结果 |
|------|------|------|
| 工具 A 成功，工具 B 失败 | 循环中断 | ❌ 400 错误 |
| 工具不存在 | 抛出异常 | ❌ 400 错误 |
| JSON 解析失败 | 崩溃 | ❌ 请求失败 |
| 网络中断 | 未捕获异常 | ❌ 进程崩溃 |

### 修复后

| 场景 | 行为 | 结果 |
|------|------|------|
| 工具 A 成功，工具 B 失败 | 返回错误结果 | ✅ 继续执行 |
| 工具不存在 | 返回错误信息 | ✅ 继续执行 |
| JSON 解析失败 | 降级处理 | ✅ 继续执行 |
| 网络中断 | 返回已累积内容 | ✅ 优雅降级 |

---

## 测试验证

### 测试文件

- `test/test-tool-error-handling.js` - 工具异常处理测试

### 运行测试

```bash
node test/test-tool-error-handling.js
```

### 预期输出

```
✅ 预期行为:
   - successTool 返回成功结果
   - failingTool 返回错误结果（而不是中断循环）
   - OpenAI API 收到所有 tool_call_id 的响应
```

---

## 关键原则

### 1. **永不中断工具调用循环**

即使工具执行失败，也必须为每个 `tool_call_id` 返回响应。

### 2. **异常转换为错误消息**

```javascript
catch (error) {
  result = JSON.stringify({
    success: false,
    error: error.message,
    errorType: error.constructor.name
  });
}
```

### 3. **标记错误状态**

```javascript
content: [{
  type: 'tool_result',
  tool_use_id: block.id,
  content: result,
  isError: !executionSuccess  // ✅ 标记错误
}]
```

### 4. **记录所有错误**

```javascript
console.error(`[Tool Execution Error] ${block.name}:`, error.message);
await logToolCall(block.name, block.input, result);
```

---

## OpenAI API 要求

### 必须满足的条件

OpenAI API 要求：

1. **每个 `tool_call_id` 都必须有对应的 `tool` 消息**
2. **工具消息必须在 assistant 消息之后立即发送**
3. **所有工具结果必须发送完成后才能发送下一个用户消息**

### 消息顺序示例

```javascript
// 1. Assistant 消息（包含工具调用）
{
  role: 'assistant',
  tool_calls: [
    { id: 'call_1', function: { name: 'toolA', ... } },
    { id: 'call_2', function: { name: 'toolB', ... } }
  ]
}

// 2. 工具结果消息（每个 tool_call_id 一个）
{ role: 'tool', tool_call_id: 'call_1', content: '...' }
{ role: 'tool', tool_call_id: 'call_2', content: '...' }

// 3. 下一个用户消息
{ role: 'user', content: '...' }
```

---

## 相关文件

- `src/conversation.js` - 对话管理器（核心修复）
- `src/ai-client-openai.js` - OpenAI 客户端（异常处理）
- `test/test-tool-error-handling.js` - 测试脚本

---

## 总结

通过这次修复：

- ✅ **解决了工具调用中断问题**
- ✅ **确保所有 tool_call_id 都有响应**
- ✅ **添加了完整的异常处理**
- ✅ **提高了系统稳定性**

这是一个**关键的修复**，确保了 OpenAI 适配的健壮性。
