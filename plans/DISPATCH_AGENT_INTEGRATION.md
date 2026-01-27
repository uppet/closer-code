# Dispatch Agent 集成设计 - 自然语言触发

> 创建日期: 2026-01-25
> 目标: 让 AI 能够通过自然语言主动调用 dispatch_agent

## ✅ 当前系统分析

### 现有工具调用机制

我们的系统**已经支持** AI 通过自然语言主动调用工具！

#### 工作流程

```
用户输入（自然语言）
  ↓
AI 模型分析请求
  ↓
AI 判断需要哪个工具
  ↓
AI 自动调用工具（通过 Tool Use API）
  ↓
工具执行并返回结果
  ↓
AI 处理结果并回复用户
```

#### 关键点

1. **配置驱动** - `config.tools.enabled` 决定哪些工具可用
2. **自动选择** - AI 根据请求自动选择最合适的工具
3. **无需显式** - 用户不需要说"使用 dispatch_agent"，只需描述任务

### 示例对比

**❌ 错误理解**（用户以为需要显式调用）：
```
用户: 请使用 dispatch_agent 搜索配置文件
```

**✅ 正确方式**（AI 自动判断）：
```
用户: 搜索项目中的所有配置文件
  ↓
AI: [自动调用 dispatchAgent({ prompt: "搜索项目中的所有配置文件" })]
  ↓
AI: 找到了 15 个配置文件...
```

## 🔧 集成步骤

### Step 1: 配置工具（必须）

在 `src/config.js` 的 `tools.enabled` 中添加：

```javascript
tools: {
  enabled: [
    // ... 现有工具
    'dispatch_agent',    // 启动子代理搜索
    'agentResult'        // 查询代理结果
  ]
}
```

### Step 2: 实现工具（必须）

在 `src/tools.js` 中实现两个工具：

#### 2.1 dispatch_agent 工具

```javascript
export const dispatchAgentTool = betaZodTool({
  name: 'dispatch_agent',
  description: `Launch a specialized search agent to perform complex file searches.

**When to use:**
- Searching for keywords or files where you're unsure of the exact match
- Exploratory searches that may require multiple rounds
- Examples: "config", "logger", "API endpoint", "test files"

**When NOT to use:**
- You know the exact file path → Use readFile/searchFiles directly
- Simple single-pattern search → Use searchCode/searchFiles directly

**Agent capabilities:**
- Can only use read-only tools: GlobTool, GrepTool, LS, View
- Cannot modify files (no Bash, Edit, Replace)
- Returns a summary of findings

**Concurrent execution:**
- You can launch multiple agents in a single message
- Each agent works independently
- Results are returned when all agents complete

**Example:**
\`\`\`javascript
// Launch agent to search for configuration files
dispatch_agent({
  prompt: "Find all configuration files in the project. Look for .json, .yaml, .toml, .config files."
})

// Returns: {
//   agent_id: "agent_1706179200_abc123",
//   summary: "Found 15 configuration files",
//   findings: [...]
// }
\`\`\``,

  inputSchema: z.object({
    prompt: z.string().describe('The search task for the agent to perform'),
    timeout: z.number().optional().describe('Timeout in milliseconds (default: 60000)')
  }),

  run: async (input) => {
    // 调用 agent 执行器
    // 返回 agent 结果
  }
});
```

#### 2.2 agentResult 工具

```javascript
export const agentResultTool = betaZodTool({
  name: 'agentResult',
  description: `Retrieve detailed results from a previously executed agent.

**When to use:**
- Agent returned a summary but you need more details
- Need to search within agent results
- Need to access specific findings

**Actions:**
- full: Get complete agent result
- summary: Get result summary only
- search: Search within agent findings
- files: List all files found by agent

**Example:**
\`\`\`javascript
agentResult({
  agent_id: "agent_1706179200_abc123",
  action: "search",
  pattern: "config"
})
\`\`\``,

  inputSchema: z.object({
    agent_id: z.string().describe('The agent ID'),
    action: z.enum(['full', 'summary', 'search', 'files']),
    pattern: z.string().optional(),
    maxResults: z.number().optional()
  }),

  run: async (input) => {
    // 从存储中获取 agent 结果
  }
});
```

### Step 3: 添加使用指南（推荐）

在 `src/prompt-builder.js` 的系统提示词中添加：

```javascript
// 在 "Tool Usage" 部分添加

### 🤖 dispatch_agent - 启动搜索子代理

**When to use:**
- 不确定能否找到正确匹配的搜索任务
- 需要多轮探索的复杂搜索
- 例如：搜索 "config"、"logger"、"API endpoint" 等常见关键词

**When NOT to use:**
- 知道确切文件路径 → 直接使用 readFile/searchFiles
- 简单单模式搜索 → 直接使用 searchCode/searchFiles

**Agent 能力:**
- 只能使用只读工具：GlobTool, GrepTool, LS, View
- 不能修改文件（无 Bash, Edit, Replace）
- 返回搜索结果摘要

**并发执行:**
- 可以在一个消息中启动多个 agents
- 每个 agent 独立工作
- 所有 agent 完成后返回结果

**示例:**
\`\`\`javascript
// 启动 agent 搜索配置文件
dispatch_agent({
  prompt: "Find all configuration files in the project"
})

// 返回: {
//   agent_id: "agent_1706179200_abc123",
//   summary: "Found 15 configuration files"
// }
\`\`\`

### 📦 agentResult - 查询 Agent 结果

**When to use:**
- Agent 返回了摘要，但你需要更多细节
- 需要在 agent 结果中搜索
- 需要访问 agent 发现的特定文件

**Actions:**
- full: 获取完整 agent 结果
- summary: 仅获取摘要
- search: 在 findings 中搜索
- files: 列出所有找到的文件

**示例:**
\`\`\`javascript
agentResult({
  agent_id: "agent_1706179200_abc123",
  action: "files"
})
\`\`\`
```

## 🎯 自然语言触发示例

### 场景 1: 搜索配置文件

```
用户: 帮我找找项目里所有的配置文件

AI 分析:
- 需要搜索多种配置文件格式
- 不确定具体有哪些
- 适合使用 agent

AI 动作:
dispatch_agent({
  prompt: "Find all configuration files in the project. Look for package.json, tsconfig.json, .eslintrc, config files, etc."
})

Agent 执行:
- 使用 searchFiles 搜索 **/*.{json,yaml,yml,toml}
- 使用 listFiles 浏览目录
- 返回找到的文件列表

AI 回复:
找到了 15 个配置文件：
- package.json
- tsconfig.json
- .eslintrc.json
- config.json
- ...
```

### 场景 2: 搜索 API 端点

```
用户: 这个项目的 API 端点在哪里定义的？

AI 分析:
- 需要搜索路由定义
- 可能在多个文件中
- 适合使用 agent

AI 动作:
dispatch_agent({
  prompt: "Find where API endpoints are defined in this project. Look for route definitions, controller files, API handlers."
})

Agent 执行:
- 使用 searchCode 搜索 "router", "endpoint", "route"
- 使用 searchFiles 查找 **/routes/**, **/api/**
- 返回找到的文件和代码片段

AI 回复:
API 端点主要定义在以下文件：
- src/api/routes.ts (主要路由)
- src/controllers/*.ts (控制器)
- ...
```

### 场景 3: 并发搜索

```
用户: 帮我找找测试文件和文档

AI 分析:
- 两个独立的搜索任务
- 可以并发执行

AI 动作:
{
  "tool_1": dispatch_agent({ prompt: "Find all test files" }),
  "tool_2": dispatch_agent({ prompt: "Find all documentation files" })
}

Agent 执行:
- 两个 agents 并发运行
- 各自独立搜索

AI 回复:
测试文件：找到 23 个测试文件...
文档文件：找到 8 个文档文件...
```

### 场景 4: 查询 Agent 结果

```
用户: 刚才那个搜索配置文件的 agent，能详细看看 package.json 的内容吗？

AI 分析:
- 用户想查看之前 agent 的结果
- 需要使用 agentResult

AI 动作:
agentResult({
  agent_id: "agent_1706179200_abc123",
  action: "search",
  pattern: "package.json"
})

AI 回复:
在之前的搜索结果中找到了 package.json：
{
  "name": "my-project",
  ...
}
```

## 🧪 测试方法

### 手动测试场景

#### 测试 1: 基础搜索
```
输入: "搜索项目中的所有测试文件"
预期: AI 自动调用 dispatch_agent
```

#### 测试 2: 并发搜索
```
输入: "找找配置文件和环境变量文件"
预期: AI 并发调用两个 dispatch_agent
```

#### 测试 3: 结果查询
```
步骤 1: "搜索所有 API 文件"
步骤 2: "详细看看刚才找到的 routes.ts"
预期: AI 使用 agentResult 查询
```

#### 测试 4: 不使用 agent
```
输入: "读取 package.json"
预期: AI 直接使用 readFile，不使用 agent
```

### 自动化测试

创建 `test/test-dispatch-agent.js`：

```javascript
import { dispatchAgentTool } from '../src/tools.js';

async function testDispatchAgent() {
  console.log('Testing dispatch_agent...');

  // 模拟 AI 调用
  const result = await dispatchAgentTool.run({
    prompt: "Find all configuration files"
  });

  console.log('Result:', result);
  console.log('✓ Test passed');
}

testDispatchAgent();
```

## ⚠️ 注意事项

### 1. 工具选择逻辑

AI 会根据以下因素判断是否使用 agent：

| 因素 | 使用 agent | 直接使用工具 |
|------|-----------|------------|
| 搜索复杂度 | 多轮、不确定 | 单轮、确定 |
| 文件位置 | 未知范围 | 已知路径 |
| 结果数量 | 可能很多 | 少量明确 |
| 探索性 | 高 | 低 |

### 2. 提示词优化

在系统提示词中明确说明：

```javascript
**何时使用 dispatch_agent:**
- ✅ "搜索所有配置文件" → agent
- ✅ "找找 API 端点定义" → agent
- ❌ "读取 package.json" → readFile
- ❌ "搜索 function test" → searchCode
```

### 3. 性能考虑

- Agent 执行需要时间（通常 2-10 秒）
- 并发 agents 可能消耗更多资源
- 结果缓存可以避免重复执行

### 4. 错误处理

- Agent 执行失败时，AI 应该降级使用直接工具
- 超时处理（默认 60 秒）
- 结果为空时的处理

## 📊 预期效果

### Token 节省

```
传统方式（所有搜索计入主对话）:
用户: "搜索所有配置文件"
AI: 直接使用 searchCode + readFile
→ 消耗: 3000 tokens

使用 Agent（独立上下文）:
用户: "搜索所有配置文件"
AI: dispatch_agent
→ Agent 执行（不计入主对话）
→ 返回摘要: 200 tokens
→ 消耗: 500 tokens

节省: 83%
```

### 用户体验

- ✅ 更自然的交互（不需要知道工具名）
- ✅ 更快的响应（摘要模式）
- ✅ 更准确的结果（专门的搜索 agent）
- ✅ 可复用的结果（持久化存储）

## 🚀 实施优先级

1. **Phase 1** (必须): 实现基础工具
   - dispatchAgentTool
   - agentResultTool
   - 添加到 config.tools.enabled

2. **Phase 2** (推荐): 添加使用指南
   - 在 prompt-builder.js 中添加说明
   - 提供使用示例

3. **Phase 3** (优化): 持久化存储
   - 实现 agent-storage.js
   - 自动清理机制

4. **Phase 4** (增强): 缓存优化
   - 任务相似度检测
   - 自动复用

---

**最后更新**: 2026-01-25
**状态**: ✅ 设计完成
**下一步**: 开始 Phase 1 实现
