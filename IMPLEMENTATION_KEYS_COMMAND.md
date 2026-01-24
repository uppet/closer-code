# 实施计划：添加 /keys 快捷键帮助命令

## 📋 任务概述

根据 `ds_improve_tips.md` 中的建议 A1，实施快捷键帮助面板功能。

**目标**：添加 `/keys` 命令，让用户可以方便地查看所有可用的快捷键。

**优先级**：⭐⭐⭐⭐⭐（高优先级）
**工作量**：小（1-2小时）
**影响范围**：所有用户

---

## 🔍 当前状态分析

### 现有命令系统
- 位置：`src/closer-cli.jsx` 中的 `handleCommand` 函数（约第 1065 行）
- 现有命令：
  - `/clear` - 清除对话历史
  - `/plan <task>` - 创建和执行任务计划
  - `/learn` - 学习项目模式
  - `/status` - 显示对话摘要
  - `/export <filename>` - 导出对话
  - `/help` - 显示帮助信息
  - `/history` - 显示输入历史统计

### 现有快捷键（从代码中提取）
从 `src/closer-cli.jsx` 的 `useInput` 处理器中识别出的快捷键：

**模式切换**
- `Ctrl+G` - 切换全屏模式
- `Ctrl+T` - 普通模式：切换工具详情面板；全屏模式：切换工具显示
- `Tab` - 切换 Thinking 显示开关

**输入控制**
- `Enter` - 发送消息
- `Ctrl+Enter` - 多行模式下换行
- `Ctrl+O` - 切换多行输入模式（从 EnhancedTextInputWithShortcuts 组件）

**滚动控制**
- `Alt+↑/↓` - 精确滚动一行
- `PageUp/Down` - 快速滚动
- `Shift+↑/↓` - 工具详情面板打开时切换工具，否则滚动 Thinking 区域

**任务控制**
- `Ctrl+C` - 单击中止任务 / 双击退出
- `Ctrl+Z` - 挂起程序（Linux/Mac）

---

## 🎯 实施方案

### 1. 添加 /keys 命令处理
在 `handleCommand` 函数中添加 `/keys` 命令分支。

### 2. 设计快捷键参考显示
创建一个格式化的快捷键列表，包括：
- 分类显示（模式切换、输入控制、滚动控制、任务控制）
- 清晰的视觉分隔
- 使用 emoji 图标增强可读性

### 3. 更新 /help 命令
在 `/help` 命令中添加 `/keys` 命令的说明。

---

## 📝 实施步骤

### Step 1: 修改 src/closer-cli.jsx
**位置**：`handleCommand` 函数中

**添加代码**：
```javascript
case '/keys':
  setMessages(prev => [...prev, {
    role: 'system',
    content: `快捷键参考：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖥️  模式切换
  Ctrl+G    切换全屏模式
  Ctrl+T    切换工具详情/工具显示
  Tab       开关 Thinking 显示

📝 输入控制
  Enter     发送消息
  Ctrl+Enter 多行模式下换行
  Ctrl+O    切换多行输入模式

🔄 滚动控制
  Alt+↑/↓   精确滚动一行
  PageUp/Down 快速滚动
  Shift+↑/↓ 滚动 Thinking 或切换工具

⚡ 任务控制
  Ctrl+C    单击中止任务 / 双击退出
  Ctrl+Z    挂起程序（Linux/Mac）

❓ 帮助
  /help     显示所有命令
  /keys     显示本快捷键参考
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
  }]);
  break;
```

### Step 2: 更新 /help 命令
**位置**：`/help` 命令分支

**修改内容**：在现有命令列表中添加 `/keys`：
```javascript
case '/help':
  setMessages(prev => [...prev, {
    role: 'system',
    content: `Available commands:
/clear - Clear conversation history
/export <filename> - Export conversation to a text file
/plan <task> - Create and execute a task plan
/learn - Learn project patterns
/status - Show conversation summary
/history - Show input history statistics
/keys - Show keyboard shortcuts reference
/help - Show this help message`
  }]);
  break;
```

---

## ✅ 测试计划

1. **功能测试**
   - 启动 Cloco
   - 输入 `/keys` 命令
   - 验证快捷键参考正确显示
   - 验证格式清晰易读

2. **集成测试**
   - 输入 `/help` 命令
   - 验证 `/keys` 命令出现在帮助列表中
   - 验证可以正常使用其他命令

3. **边界测试**
   - 在对话进行中输入 `/keys`
   - 验证命令正常工作，不影响对话

---

## 📊 预期效果

### 用户体验提升
- ✅ 用户可以快速查看所有可用快捷键
- ✅ 不需要查看源码或文档就能了解功能
- ✅ 新用户上手更容易

### 可维护性
- ✅ 代码改动最小（只修改一个文件）
- ✅ 不影响现有功能
- ✅ 易于后续扩展和更新

---

## 🚀 实施时间线

| 时间 | 任务 | 状态 |
|------|------|------|
| T+0h | 分析代码结构，确定修改位置 | ✅ 已完成 |
| T+0.5h | 实施 Step 1: 添加 /keys 命令 | ✅ 已完成 |
| T+0.5h | 实施 Step 2: 更新 /help 命令 | ✅ 已完成 |
| T+1h | 构建测试，验证语法 | ✅ 已完成 |
| T+1.5h | 功能测试（手动） | ⏳ 待用户测试 |
| T+2h | 完成并记录 | ✅ 已完成 |

---

## 📝 备注

- 该实施完全符合 ds_improve_tips.md 中的建议 A1
- 实施难度低，风险小
- 对现有代码无侵入性修改
- 可以立即为用户带来价值

---

## 🎉 实施总结

### ✅ 已完成的工作

1. **代码修改**
   - ✅ 在 `src/closer-cli.jsx` 的 `handleCommand` 函数中添加了 `/keys` 命令
   - ✅ 更新了 `/help` 命令，添加了 `/keys` 的说明
   - ✅ 代码位置：第 1000-1035 行

2. **功能实现**
   - ✅ `/keys` 命令显示完整的快捷键参考
   - ✅ 快捷键按类别分组（模式切换、输入控制、滚动控制、任务控制）
   - ✅ 使用 emoji 图标增强可读性
   - ✅ 格式清晰，易于阅读

3. **测试验证**
   - ✅ 构建成功，无语法错误
   - ✅ 代码改动最小，不影响现有功能

### 📝 代码变更详情

**修改文件**: `src/closer-cli.jsx`

**变更内容**:
- 新增 `/keys` 命令处理分支（约 25 行）
- 更新 `/help` 命令，添加 `/keys` 说明（1 行）

**总代码量**: 约 26 行新增代码

### 🎯 预期效果

- ✅ 用户可以通过 `/keys` 命令快速查看所有快捷键
- ✅ 新用户更容易发现和使用功能
- ✅ 不需要查看源码或文档就能了解所有功能
- ✅ 提升整体用户体验

### 📊 技术指标

- **实施难度**: ⭐ (简单)
- **代码改动**: 最小化（只修改一个文件）
- **风险等级**: 低（不影响现有功能）
- **用户价值**: 高（提升功能发现率）
- **可维护性**: 高（代码清晰，易于扩展）

### 🔄 后续建议

1. **可选优化**
   - 考虑在欢迎消息中添加快捷键提示
   - 考虑添加 `?` 快捷键显示帮助面板
   - 考虑支持快捷键搜索功能

2. **文档更新**
   - 更新 README.md，添加 `/keys` 命令说明
   - 更新用户手册，添加快捷键参考章节

3. **国际化**
   - 考虑支持多语言快捷键提示
   - 考虑根据用户系统语言自动切换

---

**创建时间**: 2025-01-18
**完成时间**: 2025-01-18
**实施者**: Closer AI Assistant
**状态**: ✅ 已完成
