# 调试方式对比 - 快速指南

## ✅ 两种方式都支持

### 方式 1: Chrome DevTools（推荐）

```bash
# 1. 构建
npm run build

# 2. 启动调试
node --inspect-brk dist/index.js

# 3. 打开 Chrome
chrome://inspect

# 4. 点击 "inspect"

# 5. 在 Sources 面板
# 展开 webpack:// → src/
# 设置断点
```

**优势**：
- ✅ 无需配置文件
- ✅ UI 更强大
- ✅ 性能分析工具
- ✅ 跨平台

### 方式 2: VS Code

需要 `.vscode/launch.json` 配置。

**优势**：
- ✅ 集成在编辑器中
- ✅ 习惯的开发环境

## 🎯 推荐

**Chrome DevTools** 更强大，无需 VS Code！

**Commit**: 7b79a4f
