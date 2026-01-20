# DeepSeek-R1 Reasoning 特性集成

## 概述

本项目已成功集成 DeepSeek-R1 模型的扩展 reasoning 特性，支持流式输出推理过程（Chain-of-Thought）和工具调用。

## 核心功能

### 1. 自动检测 DeepSeek-R1

- 通过模型名称检测：`deepseek-reasoner`
- 通过配置选项检测：`enableReasoning: true`
- 环境变量支持：`CLOSER_DEEPSEEK_REASONING=true`

### 2. 流式推理输出

- 实时输出 `reasoning_content`（推理过程）
- 推理完成后输出最终答案
- 通过事件流式传递：`type: 'reasoning'`

### 3. 自动管理 reasoning_content

**关键规则**：
- **同一轮工具调用**：保留 `reasoning_content`
- **新一轮对话**：清除 `reasoning_content`（节省带宽）

### 4. 工具调用支持

- DeepSeek-R1 工具调用时必须传递 `reasoning_content`
- 项目自动处理，无需手动管理

## 配置方式

### 方式 1：模型名称（推荐）

```json
{
  "ai": {
    "provider": "openai",
    "openai": {
      "model": "deepseek-reasoner",
      "apiKey": "your-deepseek-api-key",
      "baseURL": "https://api.deepseek.com"
    }
  }
}
```

### 方式 2：配置选项

```json
{
  "ai": {
    "provider": "openai",
    "openai": {
      "model": "deepseek-chat",
      "enableReasoning": true
    }
  }
}
```

### 方式 3：环境变量

```bash
export CLOSER_DEEPSEEK_REASONING=true
```

## API 响应结构

### 标准 OpenAI 响应

```javascript
{
  "content": "最终答案",
  "tool_calls": [...]
}
```

### DeepSeek-R1 响应（扩展）

```javascript
{
  "reasoning_content": "推理过程...",
  "content": "最终答案",
  "tool_calls": [...]
}
```

## 实现细节

### 1. 自动检测

**位置**: `src/ai-client-openai.js`

```javascript
constructor(config) {
  this.model = config.model || 'gpt-4o';

  // 自动检测 DeepSeek-R1 模型
  this.isDeepSeekReasoner = this.model.includes('deepseek-reasoner') ||
                             config.enableReasoning === true;
  this.reasoningContent = '';
}
```

### 2. 流式处理

```javascript
async chatStream(messages, options = {}, onChunk) {
  // DeepSeek-R1: 添加 thinking 参数
  if (this.isDeepSeekReasoner && options.thinking?.type === 'enabled') {
    apiParams.extra_body = {
      thinking: { type: 'enabled' }
    };
  }

  // 流式处理
  for await (const chunk of stream) {
    // 处理推理内容
    if (delta.reasoning_content) {
      accumulatedReasoning += delta.reasoning_content;

      if (typeof onChunk === 'function') {
        onChunk({
          type: 'reasoning',
          delta: delta.reasoning_content,
          snapshot: accumulatedReasoning
        });
      }
    }

    // 处理最终答案
    if (delta.content) {
      accumulatedText += delta.content;
    }
  }

  // DeepSeek-R1: 保存完整的响应消息
  if (this.isDeepSeekReasoner) {
    fullResponse.reasoning_content = accumulatedReasoning || '';
    fullResponse.raw_content = accumulatedText || '';
  }
}
```

### 3. 清除历史 reasoning_content

```javascript
/**
 * 清除历史消息中的 reasoning_content（DeepSeek-R1 特性）
 */
clearReasoningContent(messages) {
  if (!this.isDeepSeekReasoner) {
    return messages; // 非 DeepSeek-R1，无需处理
  }

  return messages.map(message => {
    if (message.reasoning_content !== undefined) {
      const { reasoning_content, ...messageWithoutReasoning } = message;
      return messageWithoutReasoning;
    }
    return message;
  });
}
```

### 4. 保存 reasoning_content（工具调用）

**关键修复**：工具调用时必须保留 `reasoning_content`，否则返回 400 错误。

**位置**: `src/ai-client-openai.js`

```javascript
// 转换消息时保留 reasoning_content
if (toolUseBlocks.length > 0) {
  const result = {
    role: message.role,
    tool_calls: toolUseBlocks.map(block => ({...}))
  };

  // DeepSeek-R1: 保留 reasoning_content 字段
  if (this.isDeepSeekReasoner && message.reasoning_content !== undefined) {
    result.reasoning_content = message.reasoning_content;
  }

  return result;
}
```

**位置**: `src/conversation.js`

```javascript
// 添加助手响应（包含工具调用）
const assistantMessage = {
  role: MessageType.ASSISTANT,
  content: response.content
};

// DeepSeek-R1: 保留 reasoning_content 字段
if (response.reasoning_content !== undefined) {
  assistantMessage.reasoning_content = response.reasoning_content;
}

currentMessages.push(assistantMessage);
```

## 完整的工具调用流程

### Turn 1: 工具调用

```
1. 用户: "杭州明天天气怎么样？"
   ↓
2. AI: { reasoning_content: "需要先获取日期...", tool_calls: [get_date] }
   ✅ 保存: { reasoning_content, tool_calls, content }
   ↓
3. 执行 get_date 工具
   ↓
4. AI: { reasoning_content: "明天是12月2日...", tool_calls: [get_weather] }
   ✅ 保存: { reasoning_content, tool_calls, content }
   ↓
5. 执行 get_weather 工具
   ↓
6. AI: { reasoning_content: "已获取天气...", content: "明天多云..." }
   ✅ 保存: { reasoning_content, content }
```

### Turn 2: 新问题

```
1. 用户: "明天穿什么？"
   ↓
2. 清除历史 reasoning_content（节省带宽）
   ✅ 保留: { content }
   ❌ 清除: { reasoning_content }
   ↓
3. AI: { reasoning_content: "根据天气...", content: "建议穿..." }
```

## 使用示例

### 基础使用

```javascript
const conversation = await createConversation({
  ai: {
    provider: 'openai',
    openai: {
      model: 'deepseek-reasoner'
    }
  }
});

// 自动处理 reasoning_content
await conversation.sendMessage("9.11 和 9.8 哪个大？");
```

### 监听推理过程

```javascript
conversation.sendMessage("复杂问题", (progress) => {
  if (progress.type === 'reasoning') {
    console.log('🤔 推理:', progress.delta);
  } else if (progress.type === 'token') {
    console.log('💬 答案:', progress.content);
  }
});
```

## 关键规则

### 同一轮工具调用

**必须保留 `reasoning_content`**：
```javascript
messages.append({
  role: 'assistant',
  reasoning_content: '...',  // ✅ 必须包含
  tool_calls: [...]
});
```

**自动处理**：
```javascript
if (aiClient.appendCurrentReasoning) {
  currentMessages = aiClient.appendCurrentReasoning(
    currentMessages,
    aiClient.reasoningContent
  );
}
```

### 新一轮对话

**必须清除 `reasoning_content`**：
```javascript
// 自动清除
if (aiClient.clearReasoningContent) {
  currentMessages = aiClient.clearReasoningContent(currentMessages);
}
```

## 不支持的参数

DeepSeek-R1 不支持以下参数：

- ❌ `temperature`
- ❌ `top_p`
- ❌ `presence_penalty`
- ❌ `frequency_penalty`
- ❌ `logprobs`
- ❌ `top_logprobs`（会触发错误）

### max_tokens

- **包含** `reasoning_content` 部分
- **默认**: 32K
- **最大**: 64K

## 兼容性

### 与其他 OpenAI 模型的兼容性

| 特性 | DeepSeek-R1 | 其他 OpenAI 模型 |
|------|-------------|------------------|
| **reasoning_content** | ✅ 支持 | ❌ 不支持（忽略） |
| **thinking 参数** | ✅ 支持 | ❌ 不支持（忽略） |
| **自动检测** | ✅ 是 | ✅ 是 |
| **历史清除** | ✅ 自动 | ✅ 跳过 |

### 向后兼容

- ✅ 不影响现有 OpenAI 模型的使用
- ✅ 自动检测模型类型
- ✅ 只对 DeepSeek-R1 启用特殊处理
- ✅ 其他模型正常工作

## 测试验证

### 运行测试

```bash
node test/test-deepseek-reasoning.js
```

### 测试内容

1. ✅ DeepSeek-R1 模型自动检测
2. ✅ reasoning_content 流式输出
3. ✅ 历史消息中 reasoning_content 的清除
4. ✅ 工具调用时 reasoning_content 的保留
5. ✅ 与普通 OpenAI 模型的兼容性

## 文件清单

### 新增文件

```
docs/
└── DEEPSEEK_R1_INTEGRATION.md   # 本文档

src/
├── ai-client-openai.js          # OpenAI 客户端（核心实现）
├── config.js                    # 配置文件（添加 enableReasoning）
└── conversation.js              # 对话管理器（集成 reasoning）

test/
└── test-deepseek-reasoning.js   # 测试脚本
```

### 修改内容

**ai-client-openai.js**:
- 添加 `isDeepSeekReasoner` 检测
- 实现 `clearReasoningContent()` 方法
- 实现 `appendCurrentReasoning()` 方法
- 流式处理 `reasoning_content`
- 保存 `reasoning_content` 到响应对象

**conversation.js**:
- 新一轮对话自动清除 `reasoning_content`
- 添加 `reasoning` 类型的事件处理
- 保存助手响应时保留 `reasoning_content`

**config.js**:
- 添加 `enableReasoning` 配置项
- 支持 `CLOSER_DEEPSEEK_REASONING` 环境变量

## 总结

### ✅ 已实现的功能

1. **自动检测** DeepSeek-R1 模型
2. **流式输出** `reasoning_content`
3. **自动清除** 历史 `reasoning_content`
4. **工具调用** 支持 reasoning 模式
5. **完全兼容** 其他 OpenAI 模型
6. **自动管理** `reasoning_content` 的保留和清除

### 🎯 关键优势

- **无缝集成**：无需修改现有代码
- **自动适配**：根据模型类型自动调整
- **带宽优化**：自动清理历史推理内容
- **向后兼容**：不影响其他模型
- **错误修复**：解决了工具调用的 400 错误

### 📝 配置简单

只需设置模型名称：
```json
{ "model": "deepseek-reasoner" }
```

或启用配置：
```json
{ "enableReasoning": true }
```

项目会自动处理其余部分！🎉

---

**实现日期**: 2025年1月20日
**状态**: ✅ 完成并可用
**Co-Authored-By**: GLM-4.7 & cloco(Closer)
