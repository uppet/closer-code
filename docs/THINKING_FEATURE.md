# AI Thinking 功能说明

## 概述

Closer Code 现在支持显示 Claude AI 的思考过程（Extended Thinking）。这个功能让你可以看到 AI 在生成最终答案之前的内部推理过程。

## 功能特性

### 1. 自动启用
- Thinking 功能默认启用
- 预算设置为 1600 tokens
- 从你的 `max_tokens` 限制中扣除

### 2. 实时显示
- AI 的思考过程会实时显示在 "AI Thinking Process" 区域
- 显示最后 10 条思考记录
- 每条记录都带有时间戳

### 3. UI 优化
- Thinking 区域占屏幕 17.5% 的高度
- 内容自动滚动，只显示最新的思考
- 不会影响其他区域的显示

## 工作原理

### API 配置
```javascript
{
  thinking: {
    type: 'enabled',
    budget_tokens: 1600
  }
}
```

### 事件处理
当 AI 进行思考时，会触发 `thinking` 事件：
```javascript
stream.on('thinking', (thinking) => {
  // 更新 UI 显示
});
```

### UI 显示
Thinking 内容会显示在专门的区域：
```
┌─────────────────────────────────────────┐
│ 🧠 AI Thinking Process                  │
├─────────────────────────────────────────┤
│ 🤔 [14:30:45] 分析用户请求...            │
│ 🤔 [14:30:46] 考虑使用工具...            │
│ ⚡ [14:30:47] 调用工具: readFile         │
│ 📊 [14:30:48] 工具执行结果: ✓ 成功       │
│ ✍️ [14:30:49] 生成响应中...              │
└─────────────────────────────────────────┘
```

## 使用场景

### 1. 复杂任务
当 AI 需要处理复杂的多步骤任务时，thinking 过程会显示：
- 任务分析
- 步骤规划
- 工具选择
- 结果验证

### 2. 调试
如果 AI 的响应不符合预期，你可以通过 thinking 过程了解：
- AI 为什么选择某个工具
- AI 如何理解你的请求
- AI 遇到了什么问题

### 3. 学习
通过观察 AI 的思考过程，你可以学习：
- 问题分解方法
- 工具使用策略
- 代码分析技巧

## 技术细节

### Thinking 块类型
Claude API 返回的 thinking 内容包含：
- `type: 'thinking'` - 思考块类型
- `thinking: string` - 思考内容
- `signature: string` - 签名（用于验证）

### 流式处理
Thinking 内容通过流式响应实时传输：
```javascript
if (chunk.type === 'content_block_delta' && chunk.delta?.thinking) {
  onProgress({
    type: 'thinking',
    content: chunk.delta.thinking
  });
}
```

### 内容限制
- 最多显示 10 条 thinking 记录
- 自动滚动显示最新内容
- 超出限制的内容会被丢弃

## 配置选项

### 调整 Thinking 预算
你可以在配置文件中调整 thinking 预算：
```json
{
  "ai": {
    "anthropic": {
      "thinking": {
        "type": "enabled",
        "budget_tokens": 3200
      }
    }
  }
}
```

### 禁用 Thinking
如果不需要 thinking 功能，可以禁用：
```json
{
  "ai": {
    "anthropic": {
      "thinking": {
        "type": "disabled"
      }
    }
  }
}
```

## 注意事项

1. **Token 消耗**: Thinking tokens 会从你的 `max_tokens` 限制中扣除
2. **响应时间**: 启用 thinking 可能会增加响应时间
3. **成本**: Thinking tokens 会计入 API 使用成本
4. **内容长度**: Thinking 内容可能很长，UI 只显示最后 10 条

## 示例

### 示例 1: 简单查询
```
用户: 列出当前目录的文件

AI Thinking:
🤔 [14:30:45] 用户想查看目录内容
🤔 [14:30:45] 应该使用 bash 工具执行 ls 命令
⚡ [14:30:46] 调用工具: bash
📊 [14:30:47] 工具执行结果: ✓ 成功
✍️ [14:30:48] 生成响应中...
```

### 示例 2: 复杂任务
```
用户: 分析这个项目的架构

AI Thinking:
🤔 [14:35:10] 用户需要项目架构分析
🤔 [14:35:11] 这是一个复杂任务，需要多个步骤
🤔 [14:35:12] 步骤 1: 读取项目配置
⚡ [14:35:13] 调用工具: readFile
📊 [14:35:14] 工具执行结果: ✓ 成功
🤔 [14:35:15] 步骤 2: 列出源代码文件
⚡ [14:35:16] 调用工具: bash
📊 [14:35:17] 工具执行结果: ✓ 成功
🤔 [14:35:18] 步骤 3: 分析主要模块
⚡ [14:35:19] 调用工具: searchCode
📊 [14:35:20] 工具执行结果: ✓ 成功
✍️ [14:35:21] 生成响应中...
```

## 相关文档

- [Anthropic Extended Thinking 文档](https://docs.claude.com/en/docs/build-with-claude/extended-thinking)
- [API 参考](../ref_repo/anthropic-sdk-typescript/examples/thinking-stream.ts)
- [UI 优化计划](.closer_plan/ui-optimization-plan.md)

## 更新日志

### 2025-01-18
- ✅ 添加 AI Thinking 功能
- ✅ 在 UI 中显示思考过程
- ✅ 实时更新 thinking 内容
- ✅ 优化 UI 布局
- ✅ 添加自动化验证测试
