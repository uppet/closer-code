# 外部终端调试 - 快速指南

## ✅ 已配置

`.vscode/launch.json` 已改为使用外部终端。

## 🔧 使用方法

### 1. 打开外部终端

在 VS Code 外部打开终端（PowerShell、Git Bash 等）

### 2. 按 F5 启动调试

选择配置（如 "Launch Main Program"）

### 3. 在外部终端中交互

```bash
# 在外部终端输入命令
cloco "分析这个项目"
```

### 4. 断点在 VS Code 中命中

程序暂停，可以查看变量、单步执行

## 🎯 优势

- ✅ 更好兼容性（Git Bash、PowerShell）
- ✅ 更大显示区域
- ✅ ANSI 颜色支持
- ✅ 多终端并行

**Commit**: e6cf8a6
