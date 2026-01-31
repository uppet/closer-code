# VS Code 调试配置说明

## ⚠️ 重要提示

`.vscode/` 目录已被 `.gitignore` 忽略，这是**正确的设计**。

## 🔧 配置步骤

### 方式 1: 本地创建（推荐）

文件已创建在：`.vscode/launch.json`

**效果**：
- ✅ 你可以在本地使用 F5 调试
- ✅ 不会被提交到 git（个人配置）
- ✅ 不会影响其他开发者

### 方式 2: 提交到仓库（不推荐）

如果确实需要提交给团队使用：

```bash
# 移除 .gitignore 中的 .vscode
git rm -r --cached .vscode
git commit -m "Remove .vscode from gitignore"

# 然后添加配置文件
git add .vscode/launch.json
git commit -m "Add VS Code debug configuration"
```

## 📝 已创建的配置

`.vscode/launch.json` 包含 6 个调试配置：

1. **Launch Main Program** - 调试主程序
2. **Launch CLI** - 调试 CLI 界面
3. **Launch Batch** - 调试批处理程序
4. **Attach to Process** - 附加到正在运行的进程
5. **Debug Tests** - 调试测试
6. **Debug Setup** - 调试配置向导

## 🎯 使用方法

### 1. 在源代码中设置断点

```
src/conversation/core.js:120  ← 点击这里
src/tools.js:345            ← 点击这里
```

### 2. 按 F5 启动调试

选择配置：
- **Launch Main Program** - 调试主程序
- **Launch CLI** - 调试 CLI
- **Launch Batch** - 调试批处理

### 3. 开始调试

- F10 - 单步跳过
- F11 - 单步进入
- Shift+F11 - 单步跳出
- Shift+F5 - 停止调试

## ✅ 验证

文件已创建在：
```
.vscode/launch.json
```

按 F5，选择配置即可开始调试！
