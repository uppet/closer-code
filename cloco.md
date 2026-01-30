# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository

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

---

## 🔴 关键规范：模块导入与 UI 渲染分离

### 问题根源

**在 `import` 或 `await import()` 过程中渲染 UI（特别是 Ink 界面）会导致严重的进程管理问题**，特别是在 Windows 上会导致 Ctrl+C 退出异常。

### 错误示例 ❌

```javascript
// ❌ 错误：在文件末尾直接渲染 UI
// src/minimal-cli.jsx
render(<App />, { exitOnCtrlC: false });

// ❌ 错误：在文件末尾直接执行配置
// src/setup.js
setup().catch(console.error);

// ❌ 错误：命令文件直接导入会渲染 UI 的模块
// src/commands/minimal.js
import '../minimal-cli.jsx';  // minimal-cli.jsx 会立即渲染 UI

export default async function minimalCommand(args, options) {
  // ...
}
```

### 正确示例 ✅

```javascript
// ✅ 正确：导出启动函数，而不是立即渲染
// src/minimal-cli.jsx
import { isMainModule } from './utils/platform.js';

export function startMinimalMode() {
  render(<App />, { exitOnCtrlC: false });
}

// ✅ 正确：只在直接运行时才启动（跨平台兼容）
if (isMainModule(import.meta.url)) {
  startMinimalMode();
}

// ✅ 正确：命令文件导入启动函数，在需要时调用
// src/commands/minimal.js
import { startMinimalMode } from '../minimal-cli.jsx';

export default async function minimalCommand(args, options) {
  // 设置环境变量等
  if (options.test) {
    process.env.CLOSER_TEST_MODE = '1';
  }

  // 调用启动函数，此时才开始渲染 UI
  startMinimalMode();
}
```

### 核心原则

1. **模块导入时不应有任何副作用**
   - 不应渲染 UI
   - 不应启动进程
   - 不应监听事件
   - 不应修改全局状态

2. **导出函数，而不是立即执行**
   ```javascript
   // ✅ 正确
   export function startSomething() { /* ... */ }

   // ❌ 错误
   startSomething();
   ```

3. **只在直接运行时才执行**
   ```javascript
   // ✅ 正确：支持直接运行（node script.js），跨平台兼容
   import { isMainModule } from './utils/platform.js';

   if (isMainModule(import.meta.url)) {
     startSomething();
   }
   ```

4. **命令文件应该调用启动函数**
   ```javascript
   // ✅ 正确：在命令函数中调用
   export default async function command(args, options) {
     const { startApp } = await import('./app.js');
     startApp();  // 在这里才渲染 UI
   }
   ```

### 已修复的文件

- ✅ `src/minimal-cli.jsx` - 导出 `startMinimalMode()`
- ✅ `src/closer-cli.jsx` - 导出 `startChatMode()`
- ✅ `src/setup.js` - 导出 `setup()`
- ✅ `src/setup-enhanced.js` - 导出 `setupEnhanced()`
- ✅ `src/commands/minimal.js` - 调用 `startMinimalMode()`
- ✅ `src/commands/chat.js` - 调用 `startChatMode()`
- ✅ `src/commands/setup.js` - 调用 `setup()` 或 `setupEnhanced()`

### 检查清单

在修改或创建新模块时，确保：

- [ ] 模块文件不会在导入时立即执行
- [ ] UI 渲染代码在导出的函数中
- [ ] 支持 `import.meta.url` 检查以支持直接运行
- [ ] 命令文件调用启动函数，而不是直接导入会渲染的模块
- [ ] 没有在 `await import()` 链中触发副作用

### 为什么这很重要？

1. **进程管理**：Node.js 在处理动态 import 时可能开启中间进程，如果在 import 过程中渲染 UI，会导致进程状态混乱
2. **Ctrl+C 处理**：UI 渲染会设置事件监听器，如果在 import 过程中设置，会导致退出流程异常
3. **可测试性**：分离导入和执行使代码更容易测试
4. **可维护性**：明确的执行时机使代码更易理解和维护
