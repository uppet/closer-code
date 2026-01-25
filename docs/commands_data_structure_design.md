# Commands 数据结构设计

## 概述

本文档定义了 Cloco 系统中 Commands 功能的数据结构和加载机制。

## 设计目标

1. **灵活性**：支持多种类型的命令（脚本、工具调用、提示词模板）
2. **可扩展性**：易于添加新命令，支持命令分类
3. **安全性**：权限控制，防止危险操作
4. **易用性**：简单的 JSON 格式，便于用户创建和修改

## 存储位置

### 目录结构

```
~/.closer-code/                    # 全局配置目录
├── config.json                     # 全局配置
├── commands/                       # 全局命令目录
│   ├── git/                        # Git 相关命令
│   │   ├── commit.json
│   │   └── push.json
│   ├── files/                      # 文件操作命令
│   │   ├── backup.json
│   │   └── cleanup.json
│   └── system/                     # 系统命令
│       └── update.json
│
└── ...

.closer-code/                       # 项目本地配置目录
├── config.json                     # 项目配置
└── commands/                       # 项目本地命令目录
    ├── test.json                   # 项目测试命令
    └── deploy.json                 # 项目部署命令
```

### 优先级

项目本地命令 > 全局命令（同名命令时，项目本地优先）

## Command 数据结构

### 基本结构

```json
{
  "name": "command-name",
  "version": "1.0.0",
  "type": "script | tool | prompt",
  "description": "命令描述",
  "longDescription": "详细描述（可选）",
  "category": "分类（可选）",
  "enabled": true,
  "parameters": {
    // JSON Schema 格式的参数定义
  },
  "execution": {
    // 执行配置（根据 type 不同而不同）
  },
  "permissions": {
    // 权限配置
  },
  "metadata": {
    // 元数据
  }
}
```

### 完整示例

#### 1. 脚本类型命令

```json
{
  "name": "git-commit-push",
  "version": "1.0.0",
  "type": "script",
  "description": "提交并推送 Git 更改",
  "longDescription": "添加所有更改，创建提交并推送到远程仓库",
  "category": "git",
  "enabled": true,
  "parameters": {
    "type": "object",
    "properties": {
      "message": {
        "type": "string",
        "description": "提交消息"
      },
      "branch": {
        "type": "string",
        "description": "目标分支",
        "default": "main"
      }
    },
    "required": ["message"]
  },
  "execution": {
    "script": [
      "git add .",
      "git commit -m \"{message}\"",
      "git push origin {branch}"
    ],
    "shell": "bash",
    "timeout": 30000,
    "workingDir": "{projectPath}"
  },
  "permissions": {
    "requireConfirmation": true,
    "destructive": false,
    "allowedEnvironments": ["all"]
  },
  "metadata": {
    "author": "Cloco Team",
    "tags": ["git", "commit", "push"],
    "aliases": ["gcp", "commit-push"]
  }
}
```

#### 2. 工具调用类型命令

```json
{
  "name": "backup-project",
  "version": "1.0.0",
  "type": "tool",
  "description": "备份项目文件",
  "longDescription": "创建项目文件的压缩备份",
  "category": "files",
  "enabled": true,
  "parameters": {
    "type": "object",
    "properties": {
      "include": {
        "type": "array",
        "description": "要包含的文件模式",
        "default": ["**/*"]
      },
      "exclude": {
        "type": "array",
        "description": "要排除的文件模式",
        "default": ["node_modules/**", ".git/**"]
      },
      "output": {
        "type": "string",
        "description": "输出文件名",
        "default": "backup-{timestamp}.tar.gz"
      }
    }
  },
  "execution": {
    "tools": [
      {
        "name": "bash",
        "parameters": {
          "command": "tar -czf {output} {include} --exclude={exclude}"
        }
      }
    ]
  },
  "permissions": {
    "requireConfirmation": false,
    "destructive": false
  },
  "metadata": {
    "tags": ["backup", "archive"]
  }
}
```

#### 3. 提示词模板类型命令

```json
{
  "name": "code-review",
  "version": "1.0.0",
  "type": "prompt",
  "description": "代码审查助手",
  "longDescription": "对指定的代码进行审查，提供改进建议",
  "category": "code",
  "enabled": true,
  "parameters": {
    "type": "object",
    "properties": {
      "file": {
        "type": "string",
        "description": "要审查的文件路径"
      },
      "focus": {
        "type": "string",
        "description": "审查重点",
        "enum": ["security", "performance", "style", "all"],
        "default": "all"
      }
    },
    "required": ["file"]
  },
  "execution": {
    "promptTemplate": "请对文件 {file} 进行代码审查，重点关注：{focus}。\n\n请检查：\n1. 潜在的安全问题\n2. 性能优化机会\n3. 代码风格一致性\n4. 最佳实践建议\n\n请使用 readFile 工具读取文件内容，然后提供详细的审查报告。",
    "systemPrompt": "你是一个经验丰富的代码审查专家，擅长发现代码中的问题和改进机会。",
    "temperature": 0.7,
    "maxTokens": 2000
  },
  "permissions": {
    "requireConfirmation": false,
    "destructive": false
  },
  "metadata": {
    "tags": ["review", "code-quality"]
  }
}
```

## 字段详细说明

### 基本字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 命令唯一标识符（kebab-case） |
| `version` | string | ✅ | 语义化版本号 |
| `type` | enum | ✅ | 命令类型：`script` \| `tool` \| `prompt` |
| `description` | string | ✅ | 简短描述（1-2 句话） |
| `longDescription` | string | ❌ | 详细说明（支持 Markdown） |
| `category` | string | ❌ | 分类标签（如：git, files, code） |
| `enabled` | boolean | ❌ | 是否启用（默认：true） |

### 参数定义（parameters）

使用 JSON Schema 格式定义参数：

```json
{
  "parameters": {
    "type": "object",
    "properties": {
      "paramName": {
        "type": "string | number | boolean | array | object",
        "description": "参数说明",
        "default": "默认值",
        "enum": ["可选值列表"],
        "pattern": "正则表达式（字符串类型）"
      }
    },
    "required": ["必填参数列表"],
    "additionalProperties": false
  }
}
```

### 执行配置（execution）

#### Script 类型

```json
{
  "execution": {
    "script": ["命令1", "命令2", "..."],
    "shell": "bash | sh | powershell | cmd",
    "timeout": 30000,
    "workingDir": "{projectPath} | {cwd} | /absolute/path",
    "env": {
      "VAR_NAME": "value"
    },
    "stopOnError": true,
    "runInProjectRoot": false
  }
}
```

**变量替换**：
- `{paramName}`: 用户提供的参数值
- `{projectPath}`: 项目根目录
- `{cwd}`: 当前工作目录
- `{timestamp}`: 当前时间戳
- `{uuid}`: 唯一标识符

#### Tool 类型

```json
{
  "execution": {
    "tools": [
      {
        "name": "bash | readFile | writeFile | ...",
        "parameters": {
          "toolParam": "value"
        }
      }
    ],
    "sequential": true,
    "stopOnError": true
  }
}
```

#### Prompt 类型

```json
{
  "execution": {
    "promptTemplate": "用户提示词模板，支持 {variable} 替换",
    "systemPrompt": "系统提示词（可选）",
    "temperature": 0.7,
    "maxTokens": 2000,
    "model": "claude-sonnet-4-5-20250929",
    "tools": ["bash", "readFile", "writeFile"],
    "appendHistory": true
  }
}
```

### 权限配置（permissions）

```json
{
  "permissions": {
    "requireConfirmation": boolean,  // 执行前需要用户确认
    "destructive": boolean,          // 是否是破坏性操作
    "allowedEnvironments": ["all" | "development" | "production" | ...],
    "maxExecutionsPerSession": 10,   // 每会话最大执行次数
    "timeout": 30000,                // 超时时间（毫秒）
    "allowedUsers": ["user1", "user2"], // 允许的用户列表（可选）
    "blockedUsers": []               // 禁止的用户列表（可选）
  }
}
```

### 元数据（metadata）

```json
{
  "metadata": {
    "author": "作者",
    "tags": ["tag1", "tag2"],
    "aliases": ["alias1", "alias2"],  // 命令别名
    "icon": "emoji",                  // 图标（如：🔥, 📦）
    "color": "#FF5722",               // 显示颜色
    "createdAt": "2024-01-01",
    "updatedAt": "2024-01-02",
    "examples": [                     // 使用示例
      {
        "description": "示例描述",
        "parameters": {
          "param1": "value1"
        }
      }
    ]
  }
}
```

## 加载机制

### 1. 命令发现

```javascript
// 伪代码
async function discoverCommands() {
  const commands = new Map();
  
  // 1. 扫描全局命令目录
  const globalCommands = await scanDirectory('~/.closer-code/commands');
  
  // 2. 扫描项目本地命令目录
  const projectCommands = await scanDirectory('.closer-code/commands');
  
  // 3. 合并（项目本地优先）
  commands.setAll(globalCommands);
  commands.setAll(projectCommands); // 覆盖同名命令
  
  return commands;
}
```

### 2. 命令验证

加载时验证命令定义：

```javascript
function validateCommand(commandDef) {
  // 1. 必填字段检查
  // 2. 参数 schema 验证
  // 3. 执行配置验证
  // 4. 权限配置验证
  return { valid: boolean, errors: [] };
}
```

### 3. 命令注册

```javascript
class CommandRegistry {
  constructor() {
    this.commands = new Map();
    this.aliases = new Map();
  }
  
  register(commandDef) {
    const command = new Command(commandDef);
    this.commands.set(command.name, command);
    
    // 注册别名
    command.aliases.forEach(alias => {
      this.aliases.set(alias, command.name);
    });
  }
  
  get(name) {
    const commandName = this.aliases.get(name) || name;
    return this.commands.get(commandName);
  }
  
  list(category = null) {
    const commands = Array.from(this.commands.values());
    if (category) {
      return commands.filter(cmd => cmd.category === category);
    }
    return commands;
  }
}
```

## 使用示例

### 用户调用命令

```javascript
// 用户输入
// /git-commit-push message="fix bug" branch=develop

// 系统处理
const command = registry.get('git-commit-push');
const result = await command.execute({
  message: "fix bug",
  branch: "develop"
});
```

### 集成到对话

```javascript
// 在对话中，用户可以引用命令
user: "帮我提交代码"
ai: "我可以使用 git-commit-push 命令来帮你提交代码。请提供提交消息。"
user: "修复登录bug"
ai: "好的，执行命令：git-commit-push(message='修复登录bug', branch='main')"
```

## 配置示例

### config.json 中的命令配置

```json
{
  "commands": {
    "enabled": true,
    "directories": {
      "global": "~/.closer-code/commands",
      "project": ".closer-code/commands"
    },
    "autoReload": true,
    "maxCommands": 100,
    "categories": {
      "git": {
        "icon": "🔀",
        "color": "#F05032"
      },
      "files": {
        "icon": "📁",
        "color": "#4CAF50"
      },
      "code": {
        "icon": "💻",
        "color": "#2196F3"
      }
    }
  }
}
```

## 安全考虑

1. **沙箱执行**：脚本命令在受限环境中执行
2. **参数验证**：严格验证所有输入参数
3. **权限检查**：执行前检查权限配置
4. **审计日志**：记录所有命令执行
5. **超时保护**：防止命令无限期运行

## 扩展性

### 支持自定义命令类型

可以通过插件系统添加新的命令类型：

```javascript
class CustomCommandType extends Command {
  async execute(params) {
    // 自定义执行逻辑
  }
}
```

### 命令组合

支持将多个命令组合成工作流：

```json
{
  "name": "deploy-app",
  "type": "workflow",
  "execution": {
    "steps": [
      { "command": "run-tests" },
      { "command": "build" },
      { "command": "git-tag", "params": { "tag": "v{version}" } },
      { "command": "deploy", "params": { "env": "production" } }
    ]
  }
}
```

## 实现计划

### Phase 1: 基础功能
- [ ] 定义数据结构
- [ ] 实现命令加载器
- [ ] 实现 Script 类型命令
- [ ] 基本的权限控制

### Phase 2: 扩展功能
- [ ] 实现 Tool 类型命令
- [ ] 实现 Prompt 类型命令
- [ ] 命令别名和标签
- [ ] 命令列表和搜索

### Phase 3: 高级功能
- [ ] Workflow 类型命令
- [ ] 命令组合和依赖
- [ ] 命令模板和变量
- [ ] 命令市场/分享

---

**文档版本**: 1.0.0
**创建日期**: 2025-01-XX
**最后更新**: 2025-01-XX
