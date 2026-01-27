# Dispatch Agent System - 用户指南

## 概述

Dispatch Agent 是一个强大的子代理系统，允许 AI 启动专门的搜索 agents 来执行复杂的查找任务。

## 核心特性

1. **受限工具集** - Agent 只能使用只读工具（searchFiles, searchCode, listFiles, readFile 等）
2. **无状态执行** - 每次 agent 调用独立，不能修改文件
3. **并发执行** - 可以同时启动多个 agents
4. **结果缓存** - 避免重复执行相同任务
5. **智能重试** - 自动重试失败的 agent

## 配置

在 `config.js` 中配置 agent 行为：

```javascript
agents: {
  enabled: true,              // 是否启用 agent 系统
  maxConcurrent: 3,           // 最大并发数
  timeout: 60000,             // 超时时间（毫秒）
  cacheEnabled: true,         // 是否启用缓存
  cacheTTL: 300000,           // 缓存存活时间（5分钟）
  maxTokens: 4096,            // Agent 最大 token 数
  temperature: 0,             // Agent 温度设置（确定性输出）
  retryAttempts: 2,           // 失败重试次数
  retryDelay: 1000,           // 重试延迟（毫秒）
  tools: [                    // Agent 可用工具白名单
    'searchFiles',
    'searchCode',
    'listFiles',
    'readFile',
    'readFileLines',
    'readFileChunk'
  ]
}
```

## 使用场景

### ✅ 适合使用 dispatch_agent 的场景

1. **搜索常见关键词** - 如 "config", "logger", "helper", "utils" 等模糊术语
2. **多轮探索任务** - 需要多次搜索和探索的任务
3. **跨目录搜索** - 需要搜索多个目录或文件
4. **不确定搜索策略** - 不确定最佳搜索方法时

### ❌ 不适合使用 dispatch_agent 的场景

1. **简单单次搜索** - 直接使用 searchCode/searchFiles
2. **需要修改文件** - Agent 是只读的
3. **时间关键操作** - Agent 有启动开销
4. **已知文件位置** - 直接读取文件即可

## 使用方法

### 单个 Agent

```javascript
dispatchAgent({ 
  prompt: "搜索所有配置文件，识别主要配置结构" 
})
```

### 多个并发 Agents

```javascript
// 在不同的 tool_use 块中并发执行
dispatchAgent({ 
  prompt: "查找所有日志使用模式",
  batch: true 
})

dispatchAgent({ 
  prompt: "搜索所有错误处理代码",
  batch: true 
})
```

## 编写有效的 Agent 任务描述

### ✅ 好的任务描述

- **具体明确**: "查找所有定义 API 端点的文件并列出它们的路由"
- **有上下文**: "搜索认证相关的文件、中间件和配置，识别认证策略"
- **有目标**: "找到所有测试文件并识别测试模式"

### ❌ 差的任务描述

- **太模糊**: "搜索端点"
- **无上下文**: "找配置"
- **无目标**: "看代码"

## Agent 工具

Agent 只能使用以下只读工具：

- `searchFiles` - 按模式查找文件
- `searchCode` - 搜索文件内容
- `listFiles` - 列出目录内容
- `readFile` - 读取文件内容
- `readFileLines` - 读取特定行范围
- `readFileChunk` - 按字节范围读取

## 监控和调试

### 查询 Agent 状态

```javascript
agentResult({ action: "status" })
```

### 查询池统计

```javascript
agentResult({ action: "stats" })
```

### 交互式命令

使用 `/agents` 命令：
- 列出运行中的 agents
- 查看 agent 状态
- 手动终止 agent
- 查看性能统计
- 管理缓存

## 示例工作流

### 示例 1: 理解认证机制

```javascript
// 用户问: "这个项目如何处理认证？"

// 步骤 1: 使用 dispatch_agent 探索
dispatchAgent({ 
  prompt: "搜索认证相关的文件、中间件和配置。识别认证策略和实现位置。"
})

// Agent 返回: 在 src/middleware/auth.js 找到认证中间件，在 config/jwt.js 找到 JWT 配置等

// 步骤 2: 向用户总结发现
"认证使用 JWT 令牌。主要实现在 src/middleware/auth.js。配置在 config/jwt.js。"
```

### 示例 2: 查找测试模式

```javascript
dispatchAgent({ 
  prompt: "查找所有测试文件并识别测试框架和测试模式。列出常用的测试工具和设置。"
})
```

### 示例 3: 搜索错误处理

```javascript
dispatchAgent({ 
  prompt: "搜索所有错误处理代码。识别错误处理中间件、错误类和错误报告机制。"
})
```

## 最佳实践

1. **编写清晰具体的提示词** - 详细描述你在找什么
2. **让 agent 探索** - 不要微调搜索过程，信任 agent 使用合适的工具
3. **总结结果** - 始终审查并总结 agent 的发现
4. **用于探索** - Agent 擅长探索性任务
5. **利用并发** - 对于独立任务使用多个 agents

## 性能考虑

- **启动开销** - Agent 有启动成本，避免频繁创建
- **并发限制** - 默认最多 3 个并发 agents
- **缓存** - 相同任务会缓存结果（5分钟 TTL）
- **超时** - 默认 60 秒超时

## 故障排除

### Agent 执行缓慢

- 检查是否启用了缓存
- 考虑增加 `maxConcurrent` 并发数
- 检查网络连接到 AI 提供商

### Agent 返回不相关结果

- 改进提示词，更具体地描述任务
- 增加 `maxTokens` 允许更多探索
- 检查 agent 工具白名单是否包含所需工具

### Agent 超时

- 增加 `timeout` 配置
- 检查 AI 提供商 API 状态
- 简化任务描述

## API 参考

### dispatchAgent

```javascript
dispatchAgent({
  prompt: string,      // 任务描述（必需）
  batch?: boolean,     // 是否批量执行（可选）
  maxTokens?: number,  // 最大 token 数（可选）
  temperature?: number // 温度设置（可选）
})
```

### agentResult

```javascript
agentResult({
  action: "status" | "stats" | "cache" | "clear"
})
```

## 相关文件

- `src/agents/agent-executor.js` - Agent 执行器
- `src/agents/agent-client.js` - Agent AI 客户端
- `src/agents/agent-pool.js` - Agent 池管理
- `src/agents/agent-cache.js` - Agent 结果缓存
- `src/agents/agent-tools.js` - Agent 工具子集
- `src/tools.js` - dispatchAgentTool 实现
