# 项目历史隔离功能 - 快速使用指南

## 🚀 5分钟上手

### 1. 验证功能（可选）

```bash
# 运行完整验证
bash test/verify-history-isolation.sh
```

### 2. 基本使用

功能会自动工作，无需额外配置！

```javascript
// 在你的代码中
import { loadHistory, saveHistory } from './config.js';

// 加载当前项目的历史
const history = loadHistory();

// 保存历史
saveHistory(messages);
```

### 3. 命令行工具

```bash
# 查看所有有历史的项目
node src/commands/history.js list

# 查看当前项目的历史
node src/commands/history.js show $(pwd)

# 清除当前项目的历史
node src/commands/history.js clear $(pwd)

# 导出当前项目的历史
node src/commands/history.js export $(pwd)
```

## 📖 常见场景

### 场景1: 在不同项目中工作

```bash
# 项目A
cd ~/projects/project-a
# AI 会自动加载 project-a 的历史

# 切换到项目B
cd ~/projects/project-b
# AI 会自动加载 project-b 的历史，不会混淆
```

### 场景2: 查看项目历史

```bash
# 列出所有项目
node src/commands/history.js list

# 输出示例：
# 1. /home/user/project-alpha
#    消息数: 42
#    最后更新: 2026/1/18 10:30:15
#
# 2. /home/user/project-beta
#    消息数: 18
#    最后更新: 2026/1/17 15:20:30
```

### 场景3: 清除项目历史

```bash
# 清除当前项目
node src/commands/history.js clear $(pwd)

# 清除指定项目
node src/commands/history.js clear /path/to/project
```

### 场景4: 导出历史

```bash
# 导出当前项目历史
node src/commands/history.js export $(pwd)
# 生成文件: history-export-2026-01-18T10-30-15.json
```

### 场景5: 从旧版本迁移

```bash
# 如果你有旧的历史文件
node src/commands/history.js migrate
```

## 🔧 高级用法

### 在代码中指定项目

```javascript
import { loadHistory, saveHistory } from './config.js';

// 加载指定项目的历史
const history = loadHistory('/path/to/project');

// 保存到指定项目
saveHistory(messages, '/path/to/project');
```

### 列出所有项目

```javascript
import { listHistory } from './config.js';

const projects = listHistory();
projects.forEach(p => {
  console.log(`${p.projectPath}: ${p.messageCount} 条消息`);
});
```

### 清除项目历史

```javascript
import { clearHistory } from './config.js';

clearHistory('/path/to/project');
```

## 📂 文件位置

历史文件存储在：
```
~/.closer-code/history/
├── {md5-hash}.json       # 历史数据
└── {md5-hash}.meta.json  # 元数据
```

## ⚙️ 配置

无需额外配置！功能会自动：
- 基于当前工作目录识别项目
- 自动加载和保存正确的历史
- 每个项目最多保留 100 条消息

## 🐛 故障排查

### 问题：历史没有保存

**检查：**
```bash
# 查看历史目录是否存在
ls -la ~/.closer-code/history/

# 查看当前项目历史
node src/commands/history.js show $(pwd)
```

### 问题：项目历史混淆

**原因：** 项目路径不一致

**解决：**
```bash
# 确保使用绝对路径
pwd  # 查看当前路径

# 或者明确指定项目路径
node src/commands/history.js show /absolute/path/to/project
```

### 问题：无法加载历史

**检查：**
```bash
# 查看历史文件
ls -la ~/.closer-code/history/*.json

# 如果有旧版历史，运行迁移
node src/commands/history.js migrate
```

## 📚 更多信息

- [完整功能文档](./PROJECT_HISTORY_ISOLATION.md)
- [实现总结](../IMPLEMENTATION_SUMMARY.md)
- [验证报告](../VERIFICATION_REPORT.md)

## 💡 提示

1. **自动识别**: 功能会自动识别项目，无需手动配置
2. **独立存储**: 每个项目的历史完全独立
3. **自动限制**: 每个项目最多 100 条消息，自动清理旧消息
4. **安全导出**: 导出历史时注意文件权限，可能包含敏感信息

## ✨ 开始使用

现在就开始享受项目历史隔离带来的便利吧！

```bash
# 验证功能
bash test/verify-history-isolation.sh

# 查看你的项目历史
node src/commands/history.js list
```
