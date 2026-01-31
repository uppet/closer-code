# 自定义 System Prompt 功能

## 🎯 功能说明

添加了 `customSystemPrompt` 配置参数，允许用户自定义系统提示词。

**适用场景**：
- 小模型：太长的 system prompt 会影响性能
- 特殊需求：想要完全控制 AI 的行为
- 简化提示：不需要复杂的工具使用指南

## 📝 配置方法

### 方式 1: 项目配置文件

在项目目录创建 `.closer-code.json`：

```json
{
  "behavior": {
    "customSystemPrompt": "You are a helpful coding assistant. Keep responses concise."
  }
}
```

### 方式 2: 全局配置文件

编辑 `~/.closer-code/config.json`：

```json
{
  "behavior": {
    "customSystemPrompt": "You are an expert in Node.js development. Focus on performance and best practices."
  }
}
```

### 方式 3: 极简版本（适合小模型）

```json
{
  "behavior": {
    "customSystemPrompt": "You are Closer, an AI coding assistant. Use tools when needed."
  }
}
```

## 📊 对比

### 默认 System Prompt（很长）

```
- 核心身份和工具使用指南（~100 行）
- 极致简洁原则（~20 行）
- 错误处理和任务执行流程（~80 行）
- Git Commit 创建流程（~40 行）
- Dispatch Agent 系统（~30 行）
- Skills 系统（~20 行）
- 项目上下文（~10 行）
- 行为指南（~20 行）

总计：~320 行
```

### 自定义 System Prompt（很短）

```
You are Closer, an AI coding assistant. Use tools when needed.

Keep responses concise and helpful.
```

## ✅ 优势

1. **小模型友好**：减少 token 消耗，提升响应速度
2. **灵活控制**：完全自定义 AI 的行为
3. **简单高效**：只保留必要的指令
4. **易于测试**：快速切换不同的提示词

## 🔧 配置优先级

```
customSystemPrompt > 默认分段式提示词
```

一旦设置了 `customSystemPrompt`，就会完全替代默认的长提示词。

## 📝 示例

### 示例 1: 为 7B 模型优化

```json
{
  "behavior": {
    "customSystemPrompt": "You are a coding assistant. Think step by step, but keep responses under 5 sentences."
  }
}
```

### 示例 2: 专注特定语言

```json
{
  "behavior": {
    "customSystemPrompt": "You are a Python expert. Help with Python coding, debugging, and best practices."
  }
}
```

### 示例 3: 最小化提示词

```json
{
  "behavior": {
    "customSystemPrompt": "AI assistant. Use available tools to help with coding tasks."
  }
}
```

## 🎯 建议

对于小模型（< 7B）：
- ✅ 使用 `customSystemPrompt`
- ✅ 保持简单，5-10 行
- ✅ 专注于核心功能
- ❌ 不要包含太多示例

对于大模型（> 30B）：
- ✅ 可以使用默认提示词
- ✅ 或自定义简化版本
- ✅ 根据需要调整详细程度

## 🚀 立即生效

修改配置文件后，下次对话立即生效，无需重启。
