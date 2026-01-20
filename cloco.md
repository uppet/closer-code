# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 项目概述

这是一个通过编程试验 Node.js 对进程调度 bash 行为的实验项目。

## 项目目标

探索和研究 Node.js 如何创建和管理子进程来执行 bash/shell 命令，包括：
- 使用 `child_process` 模块（`spawn`, `exec`, `fork` 等）创建 bash 进程
- 研究进程间的通信机制（stdin, stdout, stderr）
- 测试不同平台（Windows/Linux/Mac）下的 bash 行为差异
- 分析进程生命周期和信号处理

## 技术栈

- **运行时**: Node.js
- **核心模块**: `child_process`, `events`, `stream`
- **目标**: bash/shell 进程

## 开发指南

### 运行测试脚本
read [PATH hints](./winfix.md) to set bash exprot PATH
```bash
# 运行某个测试脚本（具体取决于项目中的文件）
node <script-name>.js

# 使用 npm 运行（如果有 package.json）
npm test
npm start
```

# **AI助理的修改后可以不运行，但至少检查一下编译情况**
# **AI助理的修改代码后不要自动commit，需要用户查阅同意再commit**

### 关键 API

- `child_process.spawn()` - 启动新进程
- `child_process.exec()` - 执行 shell 命令
- `child_process.fork()` - 创建 Node.js 子进程
- `stdio` 流配置 - 进程间通信
- 进程信号处理 - SIGTERM, SIGKILL 等

### 平台注意事项

在 Windows (MINGW64) 环境下，bash 可通过 Git Bash 或 WSL 提供，需要注意：
- 路径分隔符差异（`\` vs `/`）
- 可执行文件查找机制
- shell 环境变量的继承
