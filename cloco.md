# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📁 文档组织规范

**重要**：所有计划、进度报告、测试报告等临时性质的文档都应该放在 `plans/` 目录中，而不是根目录。

### 应该放在 `plans/` 的文档类型：
- **计划文档**：包含 "PLAN"、"计划" 的文档
- **进度报告**：包含 "PROGRESS"、"SUMMARY"、"进度"、"总结" 的文档
- **测试报告**：包含 "TEST"、"测试"、"REPORT"、"报告" 的文档
- **验证报告**：包含 "VERIFICATION"、"VALIDATION"、"验证" 的文档
- **实现方案**：包含 "IMPLEMENTATION"、"实现" 的文档
- **完成报告**：包含 "COMPLETE"、"COMPLETION"、"完成" 的文档
- **阶段总结**：包含 "PHASE"、"阶段" 的文档
- **其他临时文档**：实验记录、优化建议、TODO 清理等

### 应该保留在根目录的文档：
- **用户指南**：GUIDE、QUICK_START、README 等
- **API 文档**：API_GUIDE 等
- **配置文档**：cloco.md、CLAUDE.md、winfix.md 等
- **项目文档**：CHANGELOG、QUICK_REFERENCE 等

**示例**：
- ✅ `plans/DISPATCH_AGENT_PLAN.md` （计划）
- ✅ `plans/PHASE6_COMPLETION_SUMMARY.md` （完成总结）
- ✅ `plans/AGENT_TEST_REPORT.md` （测试报告）
- ❌ `AGENT_SYSTEM_GUIDE.md` （用户指南，应在根目录）
- ❌ `README.md` （项目文档，应在根目录）

**注意**：当创建新的计划、进度或报告文档时，请直接将其创建在 `plans/` 目录中。

---

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

# **当出现连续重试3次也无法修正的编译或者变更失败的错误时，停下来，让用户协助决策**
# **优先考虑用工具regionConstrainedEdit再考虑工具editFile**

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
