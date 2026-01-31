# Ollama 工具调用修复计划

## 🐛 问题分析

当前 `OllamaClient.chatWithTools()` 方法存在以下问题：

### 1. 工具响应格式错误
```javascript
// ❌ 错误：当前代码
currentMessages.push({
  role: 'user',  // 错误的角色
  content: `Tool ${toolCall.function.name} result: ${JSON.stringify(result)}`
});

// ✅ 正确：应该使用 'tool' 角色
currentMessages.push({
  role: 'tool',
  content: JSON.stringify(result),
  tool_name: toolCall.function.name  // 可选，但推荐
});
```

### 2. 缺少 assistant 消息的添加
在执行工具调用之前，需要先将 assistant 的响应（包含 tool_calls）添加到消息历史中。

### 3. 工具定义格式
当前代码使用 `input_schema`，但应该使用 `parameters`。

## 📋 修复步骤

### 步骤 1: 修复工具响应格式
将工具结果从 `role: 'user'` 改为 `role: 'tool'`，符合 Ollama 官方示例。

### 步骤 2: 正确添加 assistant 消息
在处理工具调用之前，先将 assistant 的响应添加到消息历史。

### 步骤 3: 修复工具定义格式
将 `input_schema` 改为 `parameters`。

### 步骤 4: 改进错误处理
添加更详细的错误日志和异常处理。

### 步骤 5: 测试验证
- 编译验证
- 运行测试
- 手动测试工具调用

## 🔧 具体修改

### 文件: `src/ai-client-legacy.js`

#### 修改 1: chatWithTools 方法

```javascript
async chatWithTools(messages, tools, options = {}) {
  const system = options.system || 'You are a helpful AI programming assistant.';
  const temperature = options.temperature ?? 0.7;

  // 回声模式：不调用工具，直接返回
  if (this.echoMode) {
    // ... 保持不变
  }

  // 转换工具格式为 Ollama 格式
  const ollamaTools = tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema  // 使用 input_schema 作为 parameters
    }
  }));

  const formattedMessages = this._formatMessages(messages, system);

  console.error(`[Ollama Debug] Starting tool call with ${ollamaTools.length} tools`);

  // 执行工具调用循环（最多 10 轮）
  let currentMessages = [...formattedMessages];
  let maxTurns = 10;
  let turnCount = 0;

  const client = await this._getClient();

  while (turnCount < maxTurns) {
    turnCount++;

    try {
      console.error(`[Ollama Debug] Tool call turn ${turnCount}/${maxTurns}`);

      const response = await client.chat({
        model: this.model,
        messages: currentMessages,
        tools: ollamaTools,
        stream: false,
        options: {
          temperature: temperature,
          num_predict: this.maxTokens
        }
      });

      const assistantMessage = response.message;

      // ✅ 修复：先添加 assistant 消息（包含 tool_calls）
      currentMessages.push(assistantMessage);

      console.error(`[Ollama Debug] Assistant response: ${assistantMessage.content ? 'has content' : 'no content'}`);
      console.error(`[Ollama Debug] Tool calls: ${assistantMessage.tool_calls?.length || 0}`);

      // 检查是否有工具调用
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        // 执行所有工具调用
        for (const toolCall of assistantMessage.tool_calls) {
          console.error(`[Ollama Debug] Executing tool: ${toolCall.function.name}`);

          const tool = tools.find(t => t.name === toolCall.function.name);

          if (tool) {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              const result = await tool.run(args);

              // ✅ 修复：使用 'tool' 角色添加工具结果
              currentMessages.push({
                role: 'tool',
                content: JSON.stringify(result),
                tool_name: toolCall.function.name  // 可选，但推荐
              });

              console.error(`[Ollama Debug] Tool result:`, JSON.stringify(result).substring(0, 100));
            } catch (error) {
              console.error(`[Ollama Tool Error] ${toolCall.function.name}:`, error.message);

              // ✅ 修复：使用 'tool' 角色添加错误结果
              currentMessages.push({
                role: 'tool',
                content: JSON.stringify({ error: error.message }),
                tool_name: toolCall.function.name
              });
            }
          } else {
            console.error(`[Ollama Tool Error] Tool not found: ${toolCall.function.name}`);
          }
        }
      } else {
        // 没有工具调用，返回最终响应
        console.error(`[Ollama Debug] No tool calls, returning final response`);

        // 转换为标准格式
        return {
          role: 'assistant',
          content: [{ type: 'text', text: assistantMessage.content || '' }],
          model: this.model
        };
      }
    } catch (error) {
      console.error(`[Ollama Tool Call Error] Turn ${turnCount}`);
      console.error(`[Ollama Tool Call Error] Message: ${error.message}`);

      // 检查是否是连接错误
      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
        throw new Error(`Ollama connection failed. Is Ollama running at ${this.baseURL}? Start Ollama with: ollama serve`);
      }

      throw new Error(`Ollama tool call error (turn ${turnCount}): ${error.message}`);
    }
  }

  throw new Error('Ollama: Maximum tool call turns exceeded');
}
```

## ✅ 验证清单

- [ ] 代码修改完成
- [ ] 编译通过 (`npm run build`)
- [ ] 测试通过 (`npm test`)
- [ ] 手动测试工具调用功能
- [ ] 提交 git

## 📝 参考资料

- Ollama 官方示例: `../ollama-js/examples/tools/`
- calculator.ts: 单工具示例
- flight-tracker.ts: 简单工具调用流程
- multi-tool.ts: 多工具和流式响应

## 🎯 预期结果

修复后，Ollama 客户端应该能够：
1. 正确处理工具调用
2. 按照官方格式添加工具响应
3. 支持多轮工具调用对话
4. 正确处理工具执行错误
