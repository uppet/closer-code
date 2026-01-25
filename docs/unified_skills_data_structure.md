# Skills 统一数据结构设计

## 设计理念

**Commands 和 Skills 本质上都是"能力"（Capabilities）**：
- **Commands**：执行属性强，确定性操作（如：git-commit, backup）
- **Skills**：推理属性强，领域知识（如：code-review, data-analysis）

统一为 **Skills**，通过 `type` 和 `executionMode` 区分不同特性。

## 核心概念

```
┌─────────────────────────────────────────────────────────┐
│                    Skill (统一能力)                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐         ┌─────────────┐              │
│  │  Command    │         │   Skill     │              │
│  │  (命令型)   │         │  (技能型)   │              │
│  └─────────────┘         └─────────────┘              │
│         ↓                       ↓                       │
│  确定性执行               AI 推理执行                   │
│  脚本化操作               领域知识应用                 │
└─────────────────────────────────────────────────────────┘
```

## 统一数据结构

### 完整 Skill 定义

```json
{
  "id": "skill-unique-id",
  "name": "skill-name",
  "version": "1.0.0",
  "type": "command | skill | workflow",
  "executionMode": "deterministic | reasoning | hybrid",
  "description": "简短描述",
  "longDescription": "详细说明（可选，支持 Markdown）",
  "category": "git | code | files | analysis | ...",
  "enabled": true,
  
  "parameters": {
    // JSON Schema 格式
    "type": "object",
    "properties": {},
    "required": []
  },
  
  "execution": {
    // 根据 executionMode 不同而不同
  },
  
  "capabilities": {
    // 声明这个技能的能力
    "canReadFiles": true,
    "canWriteFiles": false,
    "canExecuteCommands": true,
    "requiresAI": true
  },
  
  "permissions": {
    "requireConfirmation": true,
    "destructive": false,
    "timeout": 30000
  },
  
  "metadata": {
    "author": "作者",
    "tags": ["tag1", "tag2"],
    "icon": "🔧",
    "examples": []
  }
}
```

## Type 和 ExecutionMode 组合

### Type: Command（命令型）

**特点**：确定性执行，脚本化操作

```json
{
  "name": "git-commit",
  "type": "command",
  "executionMode": "deterministic",
  "description": "Git 提交更改",
  
  "execution": {
    "script": [
      "git add .",
      "git commit -m \"{message}\""
    ],
    "shell": "bash"
  },
  
  "capabilities": {
    "canExecuteCommands": true,
    "requiresAI": false
  }
}
```

**使用场景**：
- Git 操作
- 文件管理
- 系统操作
- 批量任务

### Type: Skill（技能型）

**特点**：AI 推理，领域知识

```json
{
  "name": "code-review",
  "type": "skill",
  "executionMode": "reasoning",
  "description": "代码审查专家",
  
  "parameters": {
    "properties": {
      "file": { "type": "string" },
      "focus": {
        "type": "string",
        "enum": ["security", "performance", "style"]
      }
    }
  },
  
  "execution": {
    "systemPrompt": "你是一个经验丰富的代码审查专家...",
    "promptTemplate": "请审查 {file}，重点关注 {focus}",
    "tools": ["readFile", "searchCode"],
    "temperature": 0.7
  },
  
  "capabilities": {
    "canReadFiles": true,
    "requiresAI": true
  }
}
```

**使用场景**：
- 代码审查
- 数据分析
- 文档生成
- 问题诊断

### Type: Workflow（工作流型）

**特点**：多步骤组合

```json
{
  "name": "deploy-app",
  "type": "workflow",
  "executionMode": "hybrid",
  "description": "完整部署流程",
  
  "execution": {
    "steps": [
      {
        "name": "run-tests",
        "type": "command",
        "skill": "test-runner"
      },
      {
        "name": "build",
        "type": "command",
        "skill": "build-project"
      },
      {
        "name": "review",
        "type": "skill",
        "skill": "code-review",
        "condition": "changedFiles.length > 0"
      },
      {
        "name": "deploy",
        "type": "command",
        "skill": "deploy-to-production"
      }
    ],
    "stopOnError": true
  },
  
  "capabilities": {
    "canExecuteCommands": true,
    "canReadFiles": true,
    "requiresAI": true
  }
}
```

## ExecutionMode 详细说明

### Deterministic（确定性）

```json
{
  "executionMode": "deterministic",
  "execution": {
    "script": ["命令1", "命令2"],
    "tools": [
      { "name": "bash", "parameters": {} }
    ]
  }
}
```

**特点**：
- 相同输入 → 相同输出
- 不需要 AI 推理
- 快速执行
- 可缓存结果

### Reasoning（推理型）

```json
{
  "executionMode": "reasoning",
  "execution": {
    "systemPrompt": "系统提示词",
    "promptTemplate": "用户提示词模板 {param}",
    "tools": ["readFile", "bash"],
    "temperature": 0.7,
    "maxTokens": 2000
  }
}
```

**特点**：
- 需要 AI 推理
- 结果可能不同
- 可以使用工具
- 上下文相关

### Hybrid（混合型）

```json
{
  "executionMode": "hybrid",
  "execution": {
    "steps": [
      { "type": "deterministic", "action": "..." },
      { "type": "reasoning", "action": "..." }
    ]
  }
}
```

**特点**：
- 结合确定性和推理
- 工作流程
- 条件分支
- 复杂场景

## 存储结构

```
~/.closer-code/
├── skills/                          # 全局技能目录
│   ├── git/                         # Git 相关技能
│   │   ├── commit.json              # command
│   │   └── analyze-repo.json        # skill
│   ├── code/                        # 代码相关技能
│   │   ├── review.json              # skill
│   │   ├── refactor.json            # skill
│   │   └── format.json              # command
│   └── workflows/                   # 工作流
│       └── deploy.json
│
└── config.json                      # 包含 skills 配置

.closer-code/                        # 项目本地
└── skills/                          # 项目技能
    ├── test.json                    # 项目测试技能
    └── deploy.json                  # 项目部署技能
```

## 配置示例

### config.json

```json
{
  "skills": {
    "enabled": true,
    "directories": {
      "global": "~/.closer-code/skills",
      "project": ".closer-code/skills"
    },
    "autoLoad": true,
    "maxSkills": 100,
    "categories": {
      "git": { "icon": "🔀", "color": "#F05032" },
      "code": { "icon": "💻", "color": "#2196F3" },
      "files": { "icon": "📁", "color": "#4CAF50" },
      "analysis": { "icon": "📊", "color": "#FF9800" }
    }
  }
}
```

## 使用示例

### 用户调用

```bash
# 调用 command（确定性）
/deploy-app --env=production

# 调用 skill（推理型）
/review --file=src/app.js --focus=security

# 调用 workflow（混合型）
/deploy-and-test
```

### AI 对话集成

```
用户: 帮我提交代码
AI: 我可以使用 git-commit 技能来帮你。请提供提交消息。

用户: 修复登录bug
AI: 执行 git-commit 技能...
     ✓ git add .
     ✓ git commit -m "修复登录bug"

用户: 帮我审查这段代码
AI: 我将使用 code-review 技能来分析代码质量...
     (调用 AI 推理 + readFile 工具)
```

## 动态加载策略

### 按需加载

```javascript
class SkillLoader {
  async loadSkills(context) {
    const skills = new Map();
    
    // 1. 加载核心技能（始终加载）
    const coreSkills = await this.loadCoreSkills();
    skills.setAll(coreSkills);
    
    // 2. 根据项目类型加载相关技能
    const projectType = detectProjectType(context);
    const projectSkills = await this.loadSkillsByCategory(projectType);
    skills.setAll(projectSkills);
    
    // 3. 根据对话历史动态加载
    const detectedNeeds = analyzeConversation(context.history);
    for (const need of detectedNeeds) {
      const skill = await this.loadSkill(need);
      skills.set(skill.id, skill);
    }
    
    return skills;
  }
}
```

### 优先级

```
项目本地技能 > 全局技能 > 内置技能
```

## 统一接口

### Skill 基类

```javascript
class Skill {
  constructor(def) {
    this.id = def.id;
    this.name = def.name;
    this.type = def.type;              // command | skill | workflow
    this.executionMode = def.executionMode;  // deterministic | reasoning | hybrid
    this.capabilities = def.capabilities;
  }
  
  async execute(params, context) {
    // 统一执行接口
    switch (this.executionMode) {
      case 'deterministic':
        return await this.executeDeterministic(params, context);
      case 'reasoning':
        return await this.executeReasoning(params, context);
      case 'hybrid':
        return await this.executeHybrid(params, context);
    }
  }
  
  async executeDeterministic(params, context) {
    // 脚本/工具执行
  }
  
  async executeReasoning(params, context) {
    // AI 推理执行
  }
  
  async executeHybrid(params, context) {
    // 工作流执行
  }
}
```

## 优势对比

### 统一前（分离）

```
Commands: 
  - 独立的数据结构
  - 独立的加载机制
  - 独立的执行器

Skills:
  - 独立的数据结构
  - 独立的加载机制
  - 独立的执行器

问题：重复代码，管理复杂
```

### 统一后（合并）

```
Skills (统一):
  - 统一的数据结构
  - 统一的加载机制
  - 统一的执行器（通过 type/executionMode 分发）

优势：
  - 代码复用
  - 简化管理
  - 更好的扩展性
  - 一致的用户体验
```

## 迁移策略

### 从 Commands 到 Skills

```javascript
// 旧的 Command 定义
{
  "name": "git-commit",
  "type": "script",
  "execution": { "script": ["git commit"] }
}

// 新的 Skill 定义（向后兼容）
{
  "id": "git-commit",
  "name": "git-commit",
  "type": "command",           // 新增
  "executionMode": "deterministic",  // 新增
  "execution": {
    "script": ["git commit"]
  }
}
```

**兼容性处理**：
- 旧的 `type: "script"` → 映射为 `type: "command"`, `executionMode: "deterministic"`
- 旧的 `type: "tool"` → 映射为 `type: "command"`, `executionMode: "deterministic"`
- 旧的 `type: "prompt"` → 映射为 `type: "skill"`, `executionMode: "reasoning"`

## 实现优先级

### Phase 1: 核心
- [ ] 统一的 Skill 数据结构
- [ ] Skill 类和执行器
- [ ] Command 类型支持（deterministic）
- [ ] 基本加载机制

### Phase 2: 扩展
- [ ] Skill 类型支持（reasoning）
- [ ] Workflow 类型支持（hybrid）
- [ ] 动态加载策略
- [ ] 技能发现和推荐

### Phase 3: 高级
- [ ] 技能组合和依赖
- [ ] 技能市场和分享
- [ ] 技能版本管理
- [ ] 性能优化

## 文件结构

```
src/
├── skills/
│   ├── skill.js                  # Skill 基类
│   ├── skill-registry.js         # 技能注册表
│   ├── skill-loader.js           # 技能加载器
│   ├── skill-validator.js        # 技能验证器
│   ├── skill-discovery.js        # 技能发现
│   ├── executors/
│   │   ├── deterministic-executor.js
│   │   ├── reasoning-executor.js
│   │   └── hybrid-executor.js
│   └── commands/                 # 兼容旧 commands
│       └── command-adapter.js    # Command → Skill 适配器
│
├── config.js                     # 添加 skills 配置
└── ai-client.js                  # 集成 skills 到 API 调用
```

## 总结

**统一为 Skills 的优势**：
1. ✅ 简化架构：一个数据结构，一套加载机制
2. ✅ 更灵活：通过 type 和 executionMode 区分特性
3. ✅ 易扩展：新增类型只需添加新的 executionMode
4. ✅ 向后兼容：旧的 commands 可以自动映射
5. ✅ 统一体验：用户不需要区分 command 和 skill

**关键设计点**：
- `type`: command | skill | workflow（功能类型）
- `executionMode`: deterministic | reasoning | hybrid（执行模式）
- `capabilities`: 声明式能力描述
- 统一的 `execute()` 接口

---

**相关文档**：
- [Commands 原始设计](./commands_data_structure_design.md)
- [Commands 快速参考](./commands_quick_reference.md)
- [技术方案研究](./commands_and_skills_study.md)
