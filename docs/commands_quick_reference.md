# Commands 快速参考

## 最小化 Command 定义

```json
{
  "name": "my-command",
  "version": "1.0.0",
  "type": "script",
  "description": "简短描述",
  "parameters": {
    "type": "object",
    "properties": {},
    "required": []
  },
  "execution": {
    "script": ["echo 'Hello'"]
  }
}
```

## 三种命令类型对比

| 类型 | 用途 | 执行方式 | 示例 |
|------|------|----------|------|
| `script` | 执行 shell 脚本 | 顺序执行命令列表 | git 提交、文件备份 |
| `tool` | 调用内置工具 | 调用 Cloco 工具 | 批量文件操作 |
| `prompt` | AI 助手任务 | 发送提示词到 AI | 代码审查、文档生成 |

## 变量替换

在 `execution.script` 或 `execution.promptTemplate` 中可用：

| 变量 | 说明 | 示例值 |
|------|------|--------|
| `{paramName}` | 用户参数 | 用户提供的值 |
| `{projectPath}` | 项目根目录 | `/Users/user/my-project` |
| `{cwd}` | 当前工作目录 | `/Users/user/my-project/src` |
| `{timestamp}` | 时间戳 | `1704067200000` |
| `{uuid}` | 唯一 ID | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |

## 存储位置

```
~/.closer-code/commands/           # 全局命令
├── git/*.json
├── files/*.json
└── system/*.json

.closer-code/commands/             # 项目本地命令
├── test.json
└── deploy.json
```

**优先级**：项目本地 > 全局

## 权限级别

```json
{
  "permissions": {
    "requireConfirmation": true,   // 需要用户确认
    "destructive": false,           // 非破坏性操作
    "timeout": 30000                // 30秒超时
  }
}
```

## 常见命令示例

### Git 提交（script）

```json
{
  "name": "gc",
  "type": "script",
  "description": "Git 快速提交",
  "parameters": {
    "properties": {
      "msg": { "type": "string" }
    },
    "required": ["msg"]
  },
  "execution": {
    "script": [
      "git add .",
      "git commit -m \"{msg}\""
    ]
  },
  "metadata": {
    "aliases": ["git-commit"]
  }
}
```

### 代码审查（prompt）

```json
{
  "name": "review",
  "type": "prompt",
  "description": "审查代码",
  "parameters": {
    "properties": {
      "file": { "type": "string" }
    }
  },
  "execution": {
    "promptTemplate": "请审查 {file} 的代码质量",
    "tools": ["readFile"]
  }
}
```

### 文件备份（tool）

```json
{
  "name": "backup",
  "type": "tool",
  "description": "备份文件",
  "execution": {
    "tools": [
      {
        "name": "bash",
        "parameters": {
          "command": "cp -r {src} {dst}"
        }
      }
    ]
  }
}
```

## 实现检查清单

### 核心功能
- [ ] `Command` 类：封装命令定义和执行逻辑
- [ ] `CommandRegistry` 类：管理所有命令
- [ ] `CommandLoader` 类：从文件系统加载命令
- [ ] `CommandValidator` 类：验证命令定义

### 执行器
- [ ] `ScriptCommandExecutor`：执行脚本命令
- [ ] `ToolCommandExecutor`：执行工具命令
- [ ] `PromptCommandExecutor`：执行提示词命令

### 集成点
- [ ] 配置系统：添加 `commands` 配置节
- [ ] CLI：添加 `/command-name` 语法支持
- [ ] AI 对话：AI 可以调用命令
- [ ] 权限系统：执行前检查权限

## 文件路径

```
src/
├── commands/
│   ├── command.js           # Command 基类
│   ├── command-registry.js  # 命令注册表
│   ├── command-loader.js    # 命令加载器
│   ├── command-validator.js # 命令验证器
│   └── executors/
│       ├── script-executor.js
│       ├── tool-executor.js
│       └── prompt-executor.js
├── config.js                # 添加 commands 配置
└── cli.jsx                  # 集成命令调用
```

## 测试用例

```javascript
// 测试命令加载
const loader = new CommandLoader();
const commands = await loader.load();
assert(commands.has('git-commit'));

// 测试命令执行
const cmd = commands.get('git-commit');
const result = await cmd.execute({ message: 'test' });
assert(result.success === true);

// 测试参数验证
assert.throws(
  () => cmd.execute({}),  // 缺少必填参数
  /Required parameter 'message' is missing/
);
```

## 下一步

1. 创建 `src/commands/command.js` - Command 基类
2. 创建 `src/commands/command-loader.js` - 命令加载器
3. 实现基本的 Script 类型执行
4. 添加单元测试
5. 集成到 CLI

---

**相关文档**：
- [详细设计](./commands_data_structure_design.md)
- [技术方案研究](./commands_and_skills_study.md)
