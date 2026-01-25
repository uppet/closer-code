# Skills 统一方案 - 对比和迁移指南

## 为什么统一？

### 问题：Commands 和 Skills 的本质相同

| 特性 | Commands | Skills | 本质 |
|------|----------|--------|------|
| 名称 | 命令 | 技能 | 都是"能力" |
| 参数 | JSON Schema | JSON Schema | 相同 |
| 执行 | 脚本/工具 | AI 推理 | 都是"执行" |
| 加载 | 从文件 | 从文件 | 相同机制 |
| 目的 | 完成任务 | 完成任务 | 相同目标 |

**结论**：它们是同一个概念的不同表现形式，统一更合理。

### 统一后的优势

```
┌────────────────────────────────────────────────────┐
│  统一前：分离架构                                   │
├────────────────────────────────────────────────────┤
│  Commands → CommandLoader → CommandExecutor        │
│  Skills    → SkillLoader    → SkillExecutor       │
│                                                     │
│  问题：                                             │
│  - 重复的加载逻辑                                   │
│  - 重复的验证逻辑                                   │
│  - 重复的注册表                                     │
│  - 用户需要理解两套系统                             │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  统一后：合并架构                                   │
├────────────────────────────────────────────────────┤
│  Skills → SkillLoader → SkillExecutor              │
│           ↓                                         │
│     (根据 type/executionMode 分发)                  │
│           ↓                                         │
│  ┌──────────┬──────────┬──────────┐               │
│  │ Command  │  Skill   │ Workflow │               │
│  │(determin)│(reasoning)│ (hybrid) │               │
│  └──────────┴──────────┴──────────┘               │
│                                                     │
│  优势：                                             │
│  - 一套加载逻辑                                     │
│  - 一套验证逻辑                                     │
│  - 一套注册表                                       │
│  - 用户只需理解一个系统                             │
└────────────────────────────────────────────────────┘
```

## 数据结构对比

### 旧方案：分离定义

#### Command 定义
```json
{
  "name": "git-commit",
  "version": "1.0.0",
  "type": "script",
  "description": "Git 提交",
  "parameters": { ... },
  "execution": {
    "script": ["git commit -m \"{message}\""]
  },
  "permissions": { ... }
}
```

#### Skill 定义
```json
{
  "name": "code-review",
  "version": "1.0.0",
  "description": "代码审查",
  "parameters": { ... },
  "execution": {
    "promptTemplate": "请审查代码...",
    "tools": ["readFile"]
  },
  "metadata": { ... }
}
```

**问题**：
- 字段不完全一致
- type 语义不同（script vs undefined）
- 缺少执行模式标识

### 新方案：统一定义

```json
{
  "id": "unique-id",              // 新增：全局唯一标识
  "name": "skill-name",
  "version": "1.0.0",
  "type": "command | skill | workflow",  // 统一：功能类型
  "executionMode": "deterministic | reasoning | hybrid",  // 新增：执行模式
  "description": "描述",
  "parameters": { ... },
  "execution": { ... },
  "capabilities": { ... },         // 新增：能力声明
  "permissions": { ... },
  "metadata": { ... }
}
```

**优势**：
- 统一的字段结构
- 清晰的类型和模式区分
- 更好的扩展性

## 类型映射

### Type 映射表

| 旧 type | 新 type | 新 executionMode | 说明 |
|---------|---------|------------------|------|
| `script` | `command` | `deterministic` | 脚本命令 |
| `tool` | `command` | `deterministic` | 工具调用 |
| `prompt` | `skill` | `reasoning` | AI 推理 |
| (无) | `workflow` | `hybrid` | 工作流 |

### 执行模式对比

| executionMode | 执行方式 | 示例 | 特点 |
|---------------|----------|------|------|
| `deterministic` | 脚本/工具 | git-commit, backup | 确定性、快速、可缓存 |
| `reasoning` | AI 推理 | code-review, analysis | 智能、灵活、上下文相关 |
| `hybrid` | 混合 | deploy-app | 多步骤、条件分支 |

## 实际示例对比

### 示例 1：Git 提交

#### 旧 Command 定义
```json
{
  "name": "git-commit",
  "type": "script",
  "description": "Git 提交",
  "parameters": {
    "properties": {
      "message": { "type": "string" }
    }
  },
  "execution": {
    "script": ["git add .", "git commit -m \"{message}\""]
  }
}
```

#### 新 Skill 定义
```json
{
  "id": "git-commit-v1",
  "name": "git-commit",
  "type": "command",
  "executionMode": "deterministic",
  "description": "Git 提交",
  "parameters": {
    "properties": {
      "message": { "type": "string" }
    }
  },
  "execution": {
    "script": ["git add .", "git commit -m \"{message}\""]
  },
  "capabilities": {
    "canExecuteCommands": true,
    "requiresAI": false
  }
}
```

**变化**：
- ✅ 添加 `id` 和 `executionMode`
- ✅ 明确 `type` 为 `command`
- ✅ 添加 `capabilities` 声明

### 示例 2：代码审查

#### 旧 Skill 定义（假设）
```json
{
  "name": "code-review",
  "description": "代码审查",
  "parameters": {
    "properties": {
      "file": { "type": "string" }
    }
  },
  "execution": {
    "promptTemplate": "请审查 {file}",
    "tools": ["readFile"]
  }
}
```

#### 新 Skill 定义
```json
{
  "id": "code-review-v1",
  "name": "code-review",
  "type": "skill",
  "executionMode": "reasoning",
  "description": "代码审查",
  "parameters": {
    "properties": {
      "file": { "type": "string" }
    }
  },
  "execution": {
    "systemPrompt": "你是代码审查专家...",
    "promptTemplate": "请审查 {file}",
    "tools": ["readFile"],
    "temperature": 0.7
  },
  "capabilities": {
    "canReadFiles": true,
    "requiresAI": true
  }
}
```

**变化**：
- ✅ 添加 `id`, `type`, `executionMode`
- ✅ 明确为 `skill` 类型和 `reasoning` 模式
- ✅ 添加 `capabilities` 声明
- ✅ 补充 `systemPrompt` 和 `temperature`

### 示例 3：部署工作流（新增）

#### 新 Workflow 定义
```json
{
  "id": "deploy-app-v1",
  "name": "deploy-app",
  "type": "workflow",
  "executionMode": "hybrid",
  "description": "完整部署流程",
  "parameters": {
    "properties": {
      "env": { "type": "string", "enum": ["dev", "staging", "prod"] }
    }
  },
  "execution": {
    "steps": [
      {
        "name": "test",
        "skill": "run-tests",
        "type": "command"
      },
      {
        "name": "review",
        "skill": "code-review",
        "type": "skill",
        "condition": "changes.length > 0"
      },
      {
        "name": "deploy",
        "skill": "deploy-to-env",
        "type": "command",
        "params": { "env": "{env}" }
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

**优势**：
- ✅ 支持复杂的多步骤流程
- ✅ 结合确定性和推理型技能
- ✅ 支持条件分支

## 迁移步骤

### Step 1: 更新数据结构

**自动化脚本**：
```javascript
// migrate-command-to-skill.js
function migrateCommandToSkill(oldCommand) {
  return {
    id: `${oldCommand.name}-v1`,
    name: oldCommand.name,
    version: oldCommand.version || "1.0.0",
    type: oldCommand.type === 'prompt' ? 'skill' : 'command',
    executionMode: mapExecutionMode(oldCommand.type),
    description: oldCommand.description,
    parameters: oldCommand.parameters,
    execution: oldCommand.execution,
    capabilities: inferCapabilities(oldCommand),
    permissions: oldCommand.permissions || {},
    metadata: oldCommand.metadata || {}
  };
}

function mapExecutionMode(oldType) {
  const mapping = {
    'script': 'deterministic',
    'tool': 'deterministic',
    'prompt': 'reasoning'
  };
  return mapping[oldType] || 'deterministic';
}

function inferCapabilities(command) {
  const capabilities = {
    canExecuteCommands: false,
    canReadFiles: false,
    canWriteFiles: false,
    requiresAI: false
  };
  
  if (command.type === 'script' || command.type === 'tool') {
    capabilities.canExecuteCommands = true;
  }
  
  if (command.type === 'prompt') {
    capabilities.requiresAI = true;
  }
  
  if (command.execution?.tools?.includes('readFile')) {
    capabilities.canReadFiles = true;
  }
  
  if (command.execution?.tools?.includes('writeFile')) {
    capabilities.canWriteFiles = true;
  }
  
  return capabilities;
}
```

### Step 2: 更新目录结构

```bash
# 旧结构
~/.closer-code/commands/
├── git/*.json
└── files/*.json

.closer-code/commands/
└── test.json

# 新结构
~/.closer-code/skills/
├── git/*.json        # 从 commands/ 迁移
├── files/*.json      # 从 commands/ 迁移
└── code/*.json       # 新增技能

.closer-code/skills/
└── test.json         # 从 commands/ 迁移
```

**迁移命令**：
```bash
# 备份旧目录
mv ~/.closer-code/commands ~/.closer-code/commands.backup

# 创建新目录
mkdir -p ~/.closer-code/skills

# 迁移文件
mv ~/.closer-code/commands.backup/* ~/.closer-code/skills/

# 项目本地同理
mv .closer-code/commands .closer-code/skills
```

### Step 3: 更新代码

**核心类重命名**：
```javascript
// 旧代码
class CommandRegistry { }
class CommandLoader { }
class CommandExecutor { }

// 新代码
class SkillRegistry { }      // 统一注册表
class SkillLoader { }        // 统一加载器
class SkillExecutor { }      // 统一执行器
```

**向后兼容**：
```javascript
// 保留旧的 API 作为别名
const CommandRegistry = SkillRegistry;
const CommandLoader = SkillLoader;
const CommandExecutor = SkillExecutor;

export {
  SkillRegistry,
  SkillLoader,
  SkillExecutor,
  // 向后兼容
  CommandRegistry,
  CommandLoader,
  CommandExecutor
};
```

### Step 4: 更新配置

**旧配置**：
```json
{
  "commands": {
    "enabled": true,
    "directories": {
      "global": "~/.closer-code/commands",
      "project": ".closer-code/commands"
    }
  }
}
```

**新配置**：
```json
{
  "skills": {
    "enabled": true,
    "directories": {
      "global": "~/.closer-code/skills",
      "project": ".closer-code/skills"
    },
    "backwardCompat": true  // 兼容旧的 commands 目录
  }
}
```

**兼容性处理**：
```javascript
function loadSkillDirectories() {
  const dirs = [];
  
  // 新目录
  if (fs.existsSync('~/.closer-code/skills')) {
    dirs.push('~/.closer-code/skills');
  }
  
  // 旧目录（兼容）
  if (config.skills.backwardCompat && fs.existsSync('~/.closer-code/commands')) {
    dirs.push('~/.closer-code/commands');
  }
  
  return dirs;
}
```

## 使用对比

### 用户层面

#### 旧方式
```bash
# 调用 command
/git-commit --message="fix bug"

# 调用 skill（假设有不同语法）
/skill:code-review --file=app.js
```

#### 新方式（统一）
```bash
# 统一语法，都是 skill
/git-commit --message="fix bug"      # type: command
/code-review --file=app.js           # type: skill
/deploy-app --env=prod               # type: workflow
```

### 代码层面

#### 旧方式
```javascript
// 分别处理
const command = commandRegistry.get('git-commit');
await command.execute(params);

const skill = skillRegistry.get('code-review');
await skill.execute(params);
```

#### 新方式（统一）
```javascript
// 统一处理
const skill = skillRegistry.get('git-commit');  // type: command
await skill.execute(params);

const skill = skillRegistry.get('code-review'); // type: skill
await skill.execute(params);

const skill = skillRegistry.get('deploy-app');  // type: workflow
await skill.execute(params);
```

## 总结

### 统一的收益

| 方面 | 统一前 | 统一后 | 改进 |
|------|--------|--------|------|
| 数据结构 | 2 套 | 1 套 | ✅ 简化 |
| 加载逻辑 | 2 套 | 1 套 | ✅ 复用 |
| 执行器 | 2 套 | 1 套（分发） | ✅ 统一 |
| 用户理解 | 需要区分 | 无需区分 | ✅ 简化 |
| 扩展性 | 受限 | 灵活 | ✅ 增强 |
| 维护成本 | 高 | 低 | ✅ 降低 |

### 关键设计

```
统一数据结构 (Skill)
    ↓
type + executionMode 区分特性
    ↓
统一执行器 (根据模式分发)
    ↓
不同的执行策略
```

### 向后兼容

```javascript
// 1. 保留旧的 API
const Command = Skill;

// 2. 自动迁移旧定义
function autoMigrate(oldDef) {
  return convertToSkill(oldDef);
}

// 3. 支持旧目录
dirs = [
  '~/.closer-code/skills',      // 新
  '~/.closer-code/commands'     // 旧（兼容）
];
```

---

**结论**：统一为 Skills 是正确的架构决策，既简化了系统，又保持了灵活性，同时向后兼容。

**相关文档**：
- [统一数据结构设计](./unified_skills_data_structure.md)
- [Commands 原始设计](./commands_data_structure_design.md)
