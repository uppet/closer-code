# 实现批处理模式的 /clear 命令

## 问题描述

在批处理模式（`cloco -b`）下运行 `/clear` 命令时，会显示"命令执行失败"的错误。该命令在交互式 CLI 模式下工作正常，但在批处理模式下没有实现。

## 根本原因

1. **缺少命令实现**：`/clear` 命令只在 `src/closer-cli.jsx`（交互式 CLI）中实现，但在 `src/commands/slash-commands.js`（共享的斜杠命令模块）中没有实现。

2. **异步调用问题**：在 `src/batch-cli.js` 中调用 `executeSlashCommand` 时缺少 `await` 关键字，导致异步函数没有正确等待结果。

## 解决方案

### 1. 添加 `/clear` 命令实现

在 `src/commands/slash-commands.js` 中添加了 `clearCommand` 函数：

```javascript
export function clearCommand(options = {}) {
  const { markdown = true } = options;

  try {
    // 清除当前项目的历史
    clearHistory();

    const content = markdown ? `
✅ 对话历史已清除
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
当前项目的对话历史已被成功清除。

下次对话将从头开始。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : `
Conversation history cleared
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The conversation history for the current project has been successfully cleared.

Next conversation will start from scratch.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    return {
      success: true,
      content: content.trim()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      content: `Failed to clear history: ${error.message}`
    };
  }
}
```

### 2. 注册命令

在 `COMMAND_REGISTRY` 中注册 `/clear` 命令：

```javascript
export const COMMAND_REGISTRY = {
  '/clear': {
    handler: clearCommand,
    description: '清除对话历史',
    descriptionEn: 'Clear conversation history'
  },
  // ... 其他命令
};
```

### 3. 更新帮助信息

在 `/help` 命令的输出中添加了 `/clear` 命令的说明：

```
📝 对话命令
  /clear         清除对话历史
  /plan <task>   创建并执行任务计划
  ...
```

### 4. 修复异步调用

在 `src/batch-cli.js` 中添加了缺失的 `await` 关键字：

```javascript
const result = await executeSlashCommand(prompt, { markdown: false });
```

### 5. 导入依赖

在 `src/commands/slash-commands.js` 中添加了 `clearHistory` 函数的导入：

```javascript
import { getConfig, getConfigPaths, clearHistory } from '../config.js';
```

## 测试结果

### 测试 1：基本功能
```bash
$ node dist/index.js -b "/clear"
[History] Cleared history for project: /mnt/s/bld/closer-code
Conversation history cleared
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The conversation history for the current project has been successfully cleared.

Next conversation will start from scratch.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

✅ 命令成功执行，历史文件被删除

### 测试 2：帮助信息
```bash
$ node dist/index.js -b "/help"
Available Commands:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Conversation Commands:
  /clear         Clear conversation history
  /plan <task>   Create and execute task plan
  ...
```

✅ `/clear` 命令已添加到帮助列表

### 测试 3：其他命令
```bash
$ node dist/index.js -b "/keys"
$ node dist/index.js -b "/config"
```

✅ 其他斜杠命令仍然正常工作

## 文件变更

1. **src/commands/slash-commands.js**
   - 添加了 `clearCommand` 函数
   - 在 `COMMAND_REGISTRY` 中注册 `/clear` 命令
   - 更新了 `/help` 命令的内容
   - 导入了 `clearHistory` 函数

2. **src/batch-cli.js**
   - 修复了异步调用：添加了 `await` 关键字

## 使用方法

### 批处理模式
```bash
# 清除当前项目的对话历史
cloco -b "/clear"

# 或使用完整命令
cloco --batch "/clear"
```

### 交互式模式
```bash
# 在交互式界面中输入
/clear
```

## 功能说明

`/clear` 命令会：
1. 删除当前项目的对话历史文件（`~/.closer-code/history/<hash>-<project>.json`）
2. 删除对应的元数据文件（`~/.closer-code/history/<hash>-<project>.meta.json`）
3. 显示成功消息
4. 下次对话将从头开始，不会加载之前的历史记录

## 注意事项

- 历史清除是**基于项目隔离**的，只会清除当前项目的历史
- 清除操作**不可撤销**，请谨慎使用
- 历史文件默认保留最近 100 条消息，清除后会重新开始计数

## 总结

通过这次实现，`/clear` 命令现在可以在批处理模式和交互式模式下正常工作，为用户提供了清除对话历史的便捷方式。修复的关键是：
1. 在共享的斜杠命令模块中实现命令逻辑
2. 正确处理异步函数调用
3. 提供清晰的用户反馈
