# Agent 结果持久化方案

> 创建日期: 2026-01-25
> 目标: Agent 工作成果持久化存储，按需调用，自动过期清理

## 📋 设计目标

1. **Token 优化** - Agent 执行过程不计入主对话 token
2. **可复用性** - 工作成果可跨对话访问
3. **自动清理** - 一周未访问自动删除
4. **按需调用** - 主对话可按需读取详细结果

## 🏗️ 架构设计

### 目录结构

```
{projectRoot}/
└── .agents_works/              # Agent 工作成果目录（加入 .gitignore）
    ├── {conversationId1}/      # 主对话 ID
    │   ├── agent_{timestamp1}_{hash1}.json
    │   ├── agent_{timestamp2}_{hash2}.json
    │   └── .metadata           # 元数据（访问时间等）
    ├── {conversationId2}/
    │   └── agent_{timestamp3}_{hash3}.json
    └── .index                  # 全局索引（conversationId -> agents）
```

### 文件命名规则

```javascript
// agent 文件名格式
agent_{timestamp}_{hash}.json

// 示例
agent_1706179200_abc123.json
```

- `timestamp`: 执行时间戳（毫秒）
- `hash`: 任务描述的 MD5 hash（避免重复执行相同任务）

## 📄 数据结构

### Agent 结果文件

```javascript
{
  // === 元数据 ===
  "agentId": "agent_1706179200_abc123",
  "conversationId": "conv_xyz789",
  "taskId": "search_config_files",
  "timestamp": 1706179200000,
  "createdAt": "2026-01-25T10:00:00.000Z",

  // === 任务信息 ===
  "task": {
    "prompt": "Find all configuration files in the project",
    "tools": ["searchFiles", "readFile", "listFiles"],
    "parameters": {
      "pattern": "**/*.{json,yaml,yml,toml}",
      "maxResults": 50
    }
  },

  // === 执行统计 ===
  "stats": {
    "duration": 3500,              // 执行时长（毫秒）
    "totalTokens": 4500,           // Agent 使用的总 token
    "toolCalls": 12,               // 工具调用次数
    "filesAccessed": 8             // 访问的文件数
  },

  // === 执行结果 ===
  "result": {
    "status": "success",           // success | partial | failed
    "summary": "Found 15 configuration files",
    "findings": [
      {
        "type": "file",
        "path": "package.json",
        "relevance": 0.95,
        "snippet": "{\n  \"name\": \"my-project\"..."
      },
      {
        "type": "file",
        "path": "tsconfig.json",
        "relevance": 0.90,
        "snippet": "{\n  \"compilerOptions\": {...}"
      }
    ],
    "files": [
      "package.json",
      "tsconfig.json",
      ".eslintrc.json",
      "config.json",
      // ...
    ]
  },

  // === 缓存控制 ===
  "cache": {
    "lastAccessed": 1706179200000,
    "accessCount": 3,
    "expiresAt": 1706784000000     // createdAt + 7 days
  }
}
```

### 全局索引文件

```javascript
{
  "version": 1,
  "lastCleanup": 1706179200000,
  "conversations": {
    "conv_xyz789": {
      "agentCount": 2,
      "lastAccessed": 1706179200000,
      "agents": [
        "agent_1706179200_abc123",
        "agent_1706179300_def456"
      ]
    },
    "conv_abc123": {
      "agentCount": 1,
      "lastAccessed": 1706179100000,
      "agents": [
        "agent_1706179100_ghi789"
      ]
    }
  }
}
```

## 🔧 核心组件

### 1. Agent 存储管理器

```javascript
// src/agents/agent-storage.js

class AgentStorage {
  /**
   * 保存 agent 执行结果
   */
  async saveAgentResult(conversationId, agentResult) {
    // 1. 创建对话目录
    // 2. 生成 agent ID
    // 3. 写入结果文件
    // 4. 更新索引
    // 5. 更新元数据
  }

  /**
   * 获取 agent 结果
   */
  async getAgentResult(agentId) {
    // 1. 读取结果文件
    // 2. 更新访问时间
    // 3. 更新访问计数
    // 4. 返回结果
  }

  /**
   * 列出对话的所有 agents
   */
  async listAgents(conversationId) {
    // 1. 查询索引
    // 2. 返回 agent 列表
  }

  /**
   * 清理过期 agents
   */
  async cleanupExpiredAgents() {
    // 1. 扫描所有 agent 文件
    // 2. 检查过期时间
    // 3. 删除过期文件
    // 4. 更新索引
  }

  /**
   * 检查是否有相似任务的结果（缓存）
   */
  async findSimilarTask(conversationId, taskPrompt) {
    // 1. 计算 taskPrompt 的 hash
    // 2. 查找是否有相同 hash 的 agent
    // 3. 返回缓存的 agent ID
  }
}
```

### 2. Agent 结果查询工具

```javascript
// src/tools.js - agentResultTool

export const agentResultTool = betaZodTool({
  name: 'agentResult',
  description: `Retrieve detailed results from a previously executed agent WITHOUT re-executing the task.

**⚡ When to use:**
- Agent returned a summary but you need more details
- Need to search within agent results
- Need to access specific findings from agent execution

**❌ DO NOT:** Re-run dispatch_agent for the same task
**✅ DO:** Use agentResult with the agent_id to retrieve cached results

**Actions:**
- full: Get complete agent result
- summary: Get result summary only
- search: Search within agent findings
- files: List all files found by agent

**Examples:**
\`\`\`javascript
// Get complete result
agentResult({ agent_id: "agent_1706179200_abc123", action: "full" })

// Get summary only
agentResult({ agent_id: "agent_1706179200_abc123", action: "summary" })

// Search findings
agentResult({ agent_id: "agent_1706179200_abc123", action: "search", pattern: "config" })

// List files
agentResult({ agent_id: "agent_1706179200_abc123", action: "files" })
\`\`\`

**Note:** Agent results expire after 7 days of no access.`,

  inputSchema: z.object({
    agent_id: z.string().describe('The agent ID from previous dispatch_agent (e.g., "agent_1706179200_abc123")'),
    action: z.enum(['full', 'summary', 'search', 'files']).describe('Action to perform'),
    pattern: z.string().optional().describe('Search pattern (required for search action)'),
    maxResults: z.number().optional().describe('Maximum results to return (default: 50)')
  }),

  run: async (input) => {
    // 1. 从存储中获取 agent 结果
    // 2. 根据 action 返回相应数据
    // 3. 如果 agent_id 不存在或已过期，返回错误
  }
});
```

### 3. 自动清理机制

```javascript
// src/agents/agent-cleanup.js

class AgentCleanupScheduler {
  constructor() {
    this.cleanupInterval = 24 * 60 * 60 * 1000; // 每天清理一次
    this.maxAge = 7 * 24 * 60 * 60 * 1000;      // 7天过期
  }

  /**
   * 启动定期清理任务
   */
  start() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);

    // 启动时立即执行一次清理
    this.cleanup();
  }

  /**
   * 执行清理
   */
  async cleanup() {
    const storage = new AgentStorage();
    const deleted = await storage.cleanupExpiredAgents();

    if (deleted > 0) {
      console.log(`[AgentCleanup] Deleted ${deleted} expired agent results`);
    }
  }

  /**
   * 手动触发清理（用于测试）
   */
  async forceCleanup() {
    return await this.cleanup();
  }
}
```

## 📊 Token 节省效果

### 传统方式（Agent 结果计入主对话）

```
主对话: 1000 tokens
  ↓
启动 Agent: +500 tokens (任务描述)
  ↓
Agent 执行: +3000 tokens (工具调用循环)
  ↓
Agent 返回: +2000 tokens (详细结果)
  ↓
主对话总结: +1000 tokens
----------------------------------------
总计: 7500 tokens
```

### 持久化方式（Agent 结果独立存储）

```
主对话: 1000 tokens
  ↓
启动 Agent: +500 tokens (任务描述)
  ↓
Agent 执行: 0 tokens (独立上下文，不计入主对话)
  ↓
Agent 返回: +200 tokens (仅摘要)
  ↓
主对话总结: +500 tokens
  ↓
按需读取: +300 tokens (可选，仅在需要时)
----------------------------------------
总计: 2500 tokens (节省 66%)
```

## 🎯 实现步骤

### Phase 1: 基础存储（1-2 天）

- [x] 创建 `src/agents/agent-storage.js`
- [x] 实现基础 CRUD 操作
- [x] 实现目录结构和文件命名
- [x] 编写单元测试
- **完成日期**: 2026-01-27
- **实际工作量**: 0.5 天
- **文件**: `src/agents/agent-storage.js` (11,491 字节), `test-agent-storage.js` (10,301 字节)

### Phase 2: 查询工具（1 天）

- [x] 更新 `agentResultTool`
- [x] 实现多种查询模式（full, summary, search, files）
- [x] 创建 `agent-result-handler.js` 辅助模块
- [x] 集成到工具系统
- **完成日期**: 2026-01-27
- **实际工作量**: 0.5 天
- **文件**: `src/agents/agent-result-handler.js` (5,686 字节), 更新 `src/tools.js`

### Phase 3: 自动清理（1 天）

- [x] 创建 `src/agents/agent-cleanup.js`
- [x] 实现定期清理任务
- [x] 实现启动时清理
- [x] 添加手动清理命令
- **完成日期**: 2026-01-27
- **实际工作量**: 0.5 天
- **文件**: `src/agents/agent-cleanup.js` (3,644 字节), `test-agent-cleanup.js` (5,832 字节)

### Phase 4: 缓存优化（1 天）

- [x] 实现任务相似度检测（已在 Phase 1 的 `agent-storage.js` 中实现 `findSimilarTask`）
- [x] 创建 `agent-cache-handler.js` 辅助模块
- [x] 实现自动复用机制
- [x] 添加缓存统计（`getCacheStats`）
- **完成日期**: 2026-01-27
- **实际工作量**: 0.5 天
- **文件**: `src/agents/agent-cache-handler.js` (2,956 字节)
- **注意**: `dispatchAgentTool` 集成待完成（需要修改 tools.js）

### Phase 5: 集成测试（1 天）

- [x] 端到端测试
  - **文件**: `test-agent-e2e.js` (8,689 字节)
  - **覆盖**: 完整工作流程、缓存复用、批量执行、状态查询、错误处理、文件列表、缓存统计
- [x] 性能测试
  - **文件**: `test-agent-performance.js` (10,598 字节)
  - **覆盖**: 执行速度、缓存加速、并发性能、Token 效率、查询性能、缓存命中率、内存使用
- [x] 压力测试
  - **文件**: `test-agent-stress.js` (10,379 字节)
  - **覆盖**: 大量并发、长时间运行、大结果集、资源限制、快速连续请求、错误恢复、缓存压力
- [x] 文档编写
  - **文件**: `AGENT_TESTING_GUIDE.md` (6,034 字节)
  - **内容**: 测试概览、测试用例、运行方法、结果解读、故障排除、最佳实践
- **完成日期**: 2026-01-27
- **实际工作量**: 0.5 天
- **状态**: ✅ 完成

**总计**: 5-6 天
**实际总工作量**: 2.5 天（比计划快 50%）

## ⚠️ 注意事项

### 安全性

1. **路径遍历防护**
   - 验证 conversationId 和 agentId 格式
   - 限制在 `.agents_works` 目录内

2. **文件大小限制**
   - 单个 agent 结果最大 10MB
   - 超过限制截断或拒绝保存

3. **并发控制**
   - 文件写入加锁
   - 避免竞态条件

### 性能

1. **索引优化**
   - 使用内存索引加速查询
   - 定期持久化索引到磁盘

2. **懒加载**
   - 只在需要时读取完整结果
   - 元数据快速访问

3. **清理优化**
   - 增量清理（只检查可能过期的文件）
   - 后台异步执行

### 兼容性

1. **跨平台**
   - Windows/Linux/Mac 路径兼容
   - 文件权限处理

2. **版本迁移**
   - 支持旧版本数据迁移
   - 版本号机制

## 📝 使用示例

### 场景 1: 搜索配置文件

```javascript
// Step 1: 主对话启动 agent
dispatchAgent({
  prompt: "Find all configuration files in the project"
})

// Agent 执行（不计入主对话 token）
// 返回: { agent_id: "agent_1706179200_abc123", summary: "Found 15 config files" }

// Step 2: 主对话显示摘要
// "Found 15 configuration files including package.json, tsconfig.json, etc."

// Step 3: 用户想看详情
agentResult({
  agent_id: "agent_1706179200_abc123",
  action: "files"
})

// 返回: ["package.json", "tsconfig.json", ...]

// Step 4: 用户想搜索特定内容
agentResult({
  agent_id: "agent_1706179200_abc123",
  action: "search",
  pattern: "typescript"
})

// 返回: 匹配的文件和片段
```

### 场景 2: 复用缓存结果

```javascript
// 第一次执行
dispatchAgent({ prompt: "Search for API endpoints" })
// 执行耗时: 5 秒

// 一小时后，相同任务
dispatchAgent({ prompt: "Search for API endpoints" })
// 立即返回缓存结果: { agent_id: "agent_1706179200_abc123", cached: true }
// 执行耗时: 0.1 秒
```

## 🚀 后续优化

1. **压缩存储** - 使用 gzip 压缩大结果
2. **分布式存储** - 支持多机器共享 agent 结果
3. **智能过期** - 根据访问频率调整过期时间
4. **可视化工具** - Web UI 查看 agent 历史记录

---

**最后更新**: 2026-01-27
**状态**: ✅ Phase 1-4 完成，Phase 5 待完成
**优先级**: 高（核心功能）
**进度**: 80% (4/5 phases)
