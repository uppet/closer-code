# 斜杠命令系统 - 快速开始

## 概述

现在批处理模式（batch mode）和交互式模式都支持斜杠命令了！

## 支持的命令

### `/keys` - 显示键盘快捷键参考
```bash
# 批处理模式
node dist/batch-cli.js "/keys"

# 交互式模式
/keys
```

### `/config` - 显示当前配置
```bash
# 批处理模式
node dist/batch-cli.js "/config"

# 交互式模式
/config
```

### `/help` - 显示帮助信息
```bash
# 批处理模式
node dist/batch-cli.js "/help"

# 交互式模式
/help
```

## 批处理模式特性

### 1. 纯文本输出
默认使用纯文本格式（适合脚本处理）
```bash
node dist/batch-cli.js "/keys"
```

### 2. JSON 格式输出
```bash
node dist/batch-cli.js --json "/keys"
```

### 3. 详细输出
```bash
node dist/batch-cli.js --verbose "/config"
```

## 示例

### 在脚本中使用
```bash
#!/bin/bash
# 获取配置信息
CONFIG=$(node dist/batch-cli.js "/config")
echo "$CONFIG"

# 检查 API Key 是否设置
if echo "$CONFIG" | grep -q "API Key: 未设置"; then
  echo "警告：API Key 未设置"
fi
```

### 管道操作
```bash
# 将命令输出传递给其他工具
node dist/batch-cli.js "/config" | grep "模型"
```

### JSON 处理
```bash
# 使用 jq 处理 JSON 输出
node dist/batch-cli.js --json "/config" | jq '.content'
```

## 代码架构

### 核心模块
```
src/commands/slash-commands.js
```
- 包含所有命令的实现
- 提供统一的命令执行接口
- 支持多种输出格式

### 使用方式
```javascript
import { executeSlashCommand } from './commands/slash-commands.js';

// 执行命令
const result = executeSlashCommand('/keys', { markdown: true });

if (result.success) {
  console.log(result.content);
} else {
  console.error(result.error);
}
```

## 添加新命令

### 1. 实现命令函数
```javascript
export function myCommand(options = {}) {
  const { markdown = true } = options;
  
  return {
    success: true,
    content: '我的命令输出'
  };
}
```

### 2. 注册命令
```javascript
export const COMMAND_REGISTRY = {
  '/mycommand': {
    handler: myCommand,
    description: '我的命令',
    descriptionEn: 'My command'
  }
};
```

### 3. 自动生效
- ✅ 批处理模式自动支持
- ✅ 交互式模式自动支持
- ✅ 无需修改其他代码

## 测试

### 快速测试
```bash
# 测试所有命令
node dist/batch-cli.js "/keys"
node dist/batch-cli.js "/config"
node dist/batch-cli.js "/help"

# 测试错误处理
node dist/batch-cli.js "/unknown"
```

### 运行测试脚本
```bash
bash test-batch-commands.sh
```

## 优势

1. **代码复用** - 命令逻辑只实现一次
2. **一致性** - 两个模式行为完全一致
3. **可维护** - 集中管理，易于修改
4. **可扩展** - 添加新命令很简单
5. **可测试** - 纯函数，易于单元测试

## 文件清单

### 新增文件
- `src/commands/slash-commands.js` - 命令处理模块
- `test-batch-commands.sh` - 测试脚本
- `BATCH_COMMANDS_REFACTOR.md` - 详细文档
- `SLASH_COMMANDS_GUIDE.md` - 本文档

### 修改文件
- `src/batch-cli.js` - 添加命令检测和处理
- `src/closer-cli.jsx` - 使用共享命令模块

## 常见问题

### Q: 为什么批处理模式的输出格式不同？
A: 批处理模式默认使用纯文本格式，更适合脚本处理。可以使用 `--json` 选项获取 JSON 格式。

### Q: 如何在批处理模式中使用 Markdown 格式？
A: 目前批处理模式不支持 Markdown，因为它是为非交互式场景设计的。如需 Markdown，请使用交互式模式。

### Q: 未知命令会怎样？
A: 未知命令会返回错误信息并退出（退出码 1）。

### Q: 可以在命令后添加参数吗？
A: 当前版本不支持命令参数，但这是计划中的功能。

## 下一步

- [ ] 添加更多命令（/status、/history、/export）
- [ ] 支持命令参数
- [ ] 实现命令别名
- [ ] 添加命令自动补全
- [ ] 完善单元测试

## 总结

这次重构实现了批处理模式和交互式模式的命令统一，使得：
- ✅ 批处理模式支持所有斜杠命令
- ✅ 避免代码重复
- ✅ 提高可维护性
- ✅ 保持行为一致性
