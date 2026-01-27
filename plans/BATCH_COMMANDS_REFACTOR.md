# 斜杠命令系统重构

## 概述

将斜杠命令（如 `/keys`、`/config`、`/help`）的处理逻辑提取到独立的共享模块中，使得交互式模式和批处理模式都能使用相同的命令实现，避免代码重复。

## 架构设计

### 1. 核心模块

**`src/commands/slash-commands.js`**
- 命令注册表（`COMMAND_REGISTRY`）
- 命令处理函数（`keysCommand`、`configCommand`、`helpCommand`）
- 命令执行接口（`executeSlashCommand`）
- 命令检测和解析工具

### 2. 使用方式

#### 交互式模式（`src/closer-cli.jsx`）

```javascript
import { executeSlashCommand } from './commands/slash-commands.js';

// 在命令处理中
case '/keys': {
  const result = executeSlashCommand(input, { markdown: true });
  if (result && result.success) {
    setMessages(prev => [...prev, {
      role: 'system',
      content: result.content
    }]);
  }
  break;
}
```

#### 批处理模式（`src/batch-cli.js`）

```javascript
// 检测斜杠命令
if (prompt.trim().startsWith('/')) {
  const { executeSlashCommand } = await import('./commands/slash-commands.js');
  const result = executeSlashCommand(prompt, { markdown: false });
  
  if (result) {
    if (result.success) {
      console.log(result.content);
      process.exit(0);
    } else {
      console.error(formatter.error(result.error));
      process.exit(1);
    }
  }
}
```

## 优势

### 1. 代码复用
- 命令逻辑只实现一次
- 两个模式共享相同的实现
- 减少维护成本

### 2. 一致性
- 两个模式的命令行为完全一致
- 输出格式可以通过参数控制（`markdown` 选项）
- 用户体验统一

### 3. 可扩展性
- 添加新命令只需在 `COMMAND_REGISTRY` 中注册
- 自动在两个模式中可用
- 命令处理函数独立，易于测试

### 4. 可测试性
- 命令函数是纯函数，易于单元测试
- 可以独立测试而不依赖 UI 或批处理框架

## 命令接口

### 命令处理函数签名

```javascript
/**
 * @param {Object} options - 命令选项
 * @param {boolean} options.markdown - 是否使用 Markdown 格式
 * @returns {CommandResult}
 * 
 * @typedef {Object} CommandResult
 * @property {boolean} success - 是否成功
 * @property {string} content - 命令输出内容
 * @property {string} [error] - 错误信息（如果失败）
 */
```

### 注册新命令

```javascript
// 1. 实现命令处理函数
export function myCommand(options = {}) {
  const { markdown = true } = options;
  
  // 命令逻辑...
  
  return {
    success: true,
    content: '命令输出'
  };
}

// 2. 注册到 COMMAND_REGISTRY
export const COMMAND_REGISTRY = {
  // ... 现有命令
  '/mycommand': {
    handler: myCommand,
    description: '我的新命令',
    descriptionEn: 'My new command'
  }
};
```

## 测试

### 批处理模式测试

```bash
# 测试 /keys 命令
node dist/batch-cli.js "/keys"

# 测试 /config 命令
node dist/batch-cli.js "/config"

# 测试 JSON 格式输出
node dist/batch-cli.js --json "/keys"

# 测试未知命令
node dist/batch-cli.js "/unknown"
```

### 交互式模式测试

启动交互式模式后输入：
```
/keys
/config
/help
```

## 未来改进

### 1. 更多命令
- `/status` - 显示对话状态
- `/history` - 显示历史统计
- `/export` - 导出对话
- `/plan` - 任务计划

### 2. 命令参数支持
```javascript
// 例如：/config --json
export function parseSlashCommand(input) {
  const parts = input.trim().split(/\s+/);
  const command = parts[0];
  const args = parts.slice(1);
  return { command, args };
}
```

### 3. 命令别名
```javascript
export const COMMAND_ALIASES = {
  '/h': '/help',
  '/k': '/keys',
  '/c': '/config'
};
```

### 4. 命令自动补全
在交互式模式中实现 Tab 键自动补全命令

## 文件变更

### 新增文件
- `src/commands/slash-commands.js` - 斜杠命令处理模块

### 修改文件
- `src/batch-cli.js` - 添加斜杠命令检测和处理
- `src/closer-cli.jsx` - 使用共享的命令处理模块

### 测试文件
- `test-batch-commands.sh` - 批处理模式命令测试脚本

## 总结

这次重构实现了：
1. ✅ 批处理模式支持斜杠命令
2. ✅ 避免代码重复
3. ✅ 提高可维护性和可扩展性
4. ✅ 保持两个模式的一致性
