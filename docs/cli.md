# Closer Code CLI UI 架构文档

## 概述

Closer Code 提供了三种主要的 CLI 模式：
1. **交互式模式** (`closer-cli.jsx`) - 基于 Ink (React for CLI) 的全功能交互式 UI
2. **极简模式** (`minimal-cli.jsx`) - 极简界面，只保留输入框，适合快速对话
3. **批处理模式** (`batch-cli.js`) - 非交互式，适合脚本和自动化

### 模式启动方式
```bash
# 交互式模式（默认）
cloco

# 极简模式
cloco -s
# 或
cloco --simple

# 批处理模式
cloco -b "你的问题"
```

## 核心模块关系图

```
┌─────────────────────────────────────────────────────────────┐
│                      主入口                                  │
├─────────────────────────────────────────────────────────────┤
│  closer-cli.jsx (交互式) │ minimal-cli.jsx (极简) │ batch.js │
└──────────────┬──────────────┴──────────────┬────────────────┘
               │                             │
               ▼                             ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│   UI 组件层 (React/Ink)  │    │   输出格式化器           │
├──────────────────────────┤    ├──────────────────────────┤
│ • FullscreenConversation │    │ • OutputFormatter        │
│ • ToolDetailPanel        │    │ • 命令行参数解析         │
│ • ProgressBar            │    │ • 流式输出处理           │
│ • TextInput              │    └──────────────────────────┘
└──────────────┬───────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│                      输入系统                                │
├─────────────────────────────────────────────────────────────┤
│  EnhancedTextInput (src/input/enhanced-input.jsx)           │
│  • 快捷键支持 (Ctrl+Enter, Ctrl+O, Tab 等)                  │
│  • 历史记录导航 (↑/↓ 方向键)                                 │
│  • 多行输入模式                                              │
│  • 历史管理器 (src/input/history.js)                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    命令处理层                                │
├─────────────────────────────────────────────────────────────┤
│  slash-commands.js (src/commands/slash-commands.js)         │
│  • /clear - 清除对话历史                                     │
│  • /keys - 显示快捷键参考                                    │
│  • /config - 显示配置信息                                    │
│  • /skills - 显示技能系统状态                                │
│  • /agents - 管理 Agent 系统                                 │
│  • /help - 显示帮助信息                                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    对话管理层                                │
├─────────────────────────────────────────────────────────────┤
│  conversation.js                                             │
│  • 消息发送与接收                                            │
│  • 流式响应处理                                              │
│  • 工具调用管理                                              │
│  • 技能系统集成                                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   UI 渲染层                                  │
├─────────────────────────────────────────────────────────────┤
│  主界面布局 (closer-cli.jsx)                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 顶部状态栏 - 模式、状态、Token 统计                  │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ Thinking 区域 (17.5%) - AI 思考过程显示              │    │
│  ├──────────────────┬──────────────────────────────────┤    │
│  │ Conversation (65%)│  Task Progress (50%)            │    │
│  │  - 消息历史        │  - 任务进度条                   │    │
│  │  - 滚动控制        │  - 步骤列表                     │    │
│  │                   ├──────────────────────────────────┤    │
│  │                   │  Tool Execution (50%)            │    │
│  │                   │  - 工具调用摘要                  │    │
│  │                   │  - 执行状态                      │    │
│  └──────────────────┴──────────────────────────────────┘    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ 活动提示栏 - 当前操作状态                              │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ 输入区域 - EnhancedTextInput                         │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

## 主要组件说明

### 1. 主入口文件

#### `src/closer-cli.jsx` (交互式模式)
- **功能**: 提供全功能的交互式 CLI UI
- **技术栈**: React + Ink
- **主要特性**:
  - 实时流式响应显示
  - AI 思考过程可视化 (Thinking 区域)
  - 任务进度跟踪
  - 工具执行监控
  - Token 使用统计
  - 多种快捷键支持

#### `src/batch-cli.js` (批处理模式)
- **功能**: 非交互式批处理
- **主要特性**:
  - 命令行参数解析
  - 支持从文件或 stdin 读取输入
  - 多种输出格式 (text/json/verbose)
  - 适合脚本和自动化场景

#### `src/minimal-cli.jsx` (极简模式)
- **功能**: 极简界面，只保留输入框
- **技术栈**: React + Ink
- **主要特性**:
  - 极简界面，无干扰
  - 重用 `EnhancedTextInput` 输入组件
  - 重用历史记录管理器
  - 支持两次 Ctrl+C 退出
  - 支持 Ctrl+Z 挂起（非 Windows 平台）
  - 显示最后一条响应
  - 实时状态提示
- **适用场景**:
  - 快速对话
  - 不需要查看详细执行过程
  - 专注于输入输出

### 2. UI 组件层

#### 核心组件 (`src/components/`)

**FullscreenConversation** (`fullscreen-conversation.jsx`)
- 全屏对话模式
- 显示完整对话历史和工具详情

**ToolDetailPanel** (`tool-detail-view.jsx`)
- 工具详情面板
- 显示工具调用的完整输入输出
- 支持多个工具间的切换

**ProgressBar** (`progress-bar.jsx`)
- 任务进度条组件
- 显示计划执行进度

**TextInput 组件** (`multiline-text-input.jsx`, `ink-text-input/`)
- 多行文本输入
- 支持快捷键和历史记录

#### 工具渲染器 (`src/components/tool-renderers/`)
- `bash-renderer.jsx` - Bash 命令执行结果渲染
- `bash-result-renderer.jsx` - Bash 结果详细渲染
- `file-read-renderer.jsx` - 文件读取结果渲染
- `file-write-renderer.jsx` - 文件写入结果渲染
- `file-edit-renderer.jsx` - 文件编辑结果渲染
- `search-renderer.jsx` - 搜索结果渲染
- `list-renderer.jsx` - 列表渲染

### 3. 输入系统

#### `src/input/enhanced-input.jsx`
增强的文本输入组件，提供：
- **快捷键支持**:
  - `Ctrl+Enter` - 多行模式下换行
  - `Ctrl+O` - 切换多行输入模式
  - `Enter` - 发送消息
  - `↑/↓` - 历史记录导航
- **实时状态提示** - 显示历史记录索引
- **粘贴支持** - 自动处理多行粘贴

#### `src/input/history.js`
输入历史管理器：
- 历史记录持久化 (`~/.closer-code/closer-input-history`)
- 智能去重
- 搜索功能
- 统计信息

### 4. 命令系统

#### `src/commands/slash-commands.js`
斜杠命令处理模块，提供：
- **命令注册表** - 统一管理所有斜杠命令
- **命令解析** - 解析命令和参数
- **命令执行** - 跨交互式和批处理模式的命令实现
- **格式化输出** - 支持 Markdown 和纯文本格式

**可用命令**:
- `/clear` - 清除对话历史
- `/keys` - 显示键盘快捷键参考
- `/config` - 显示当前配置
- `/skills` - 显示技能系统状态
- `/agents` - 管理 Agent 系统
- `/help` - 显示帮助信息

### 5. 工具函数

#### `src/utils/cli.js`
CLI 工具函数：
- `parseOptions()` - 命令行参数解析
- `showError()`, `showTip()`, `showSuccess()` - 格式化输出
- 特殊命令识别 (config, setup, upgrade 等)

#### `src/hooks/use-throttled-state.js`
节流状态更新 Hook：
- 智能节流机制 (默认 1500ms)
- 立即更新类型配置 (error, abort 等)
- 减少 UI 重绘，提升性能

## UI 布局详解

### 普通模式布局
```
┌────────────────────────────────────────────────────┐
│ 顶部状态栏 (模式 | 状态)                           │
├────────────────────────────────────────────────────┤
│ 🧠 AI Thinking Process (17.5%)                     │
│ • AI 思考过程实时显示                               │
│ • 支持滚动查看历史思考                             │
│ • Tab 键开关显示                                   │
├─────────────────────────────┬──────────────────────┤
│ 💬 Conversation (67%)       │ 📋 Task Progress     │
│ • 消息历史显示              │ • 任务进度条          │
│ • 支持滚动 (Alt+↑/↓)        │ • 步骤列表            │
│ • Token 统计                │                      │
├─────────────────────────────┴──────────────────────┤
│ 🔧 Tool Execution                                   │
│ • 最近 3 个工具调用摘要                             │
│ • 执行状态和耗时                                    │
├────────────────────────────────────────────────────┤
│ 活动提示 / 退出提示                                │
├────────────────────────────────────────────────────┤
│ ▶ 输入消息 (EnhancedTextInput)                     │
│   Enter发送, Ctrl+Enter换行                        │
└────────────────────────────────────────────────────┘
```

### 全屏模式布局
```
┌────────────────────────────────────────────────────┐
│ 💬 Fullscreen Conversation                         │
│ • 完整对话历史                                      │
│ • 工具调用详情 (Ctrl+T 开关)                       │
│ • Token 统计                                        │
└────────────────────────────────────────────────────┘
```

### 极简模式布局
```
┌────────────────────────────────────────────────────┐
│ 顶部状态栏 (Closer Code - Simple Mode | 状态)     │
├────────────────────────────────────────────────────┤
│ 最后响应 (可选，如果有)                             │
├────────────────────────────────────────────────────┤
│ ▶ 输入消息 (EnhancedTextInput)                     │
│   Enter发送, Ctrl+Enter换行, Ctrl+Z挂起            │
└────────────────────────────────────────────────────┘
```

**极简模式特点**:
- 只保留核心输入功能
- 无 Thinking、Task Progress、Tool Execution 等面板
- 显示最后一条 AI 响应
- 支持所有输入快捷键（历史记录、多行等）
- 更轻量，启动更快

## 快捷键系统

### 模式切换
- `Ctrl+G` - 切换全屏模式
- `Ctrl+T` - 切换工具详情/工具显示
- `Tab` - 开关 Thinking 显示

### 输入控制
- `Enter` - 发送消息
- `Ctrl+Enter` - 多行模式下换行
- `Ctrl+O` - 切换多行输入模式

### 滚动控制
- `Alt+↑/↓` - 精确滚动一行
- `PageUp/Down` - 快速滚动
- `Shift+↑/↓` - 滚动 Thinking 或切换工具

### 任务控制
- `Ctrl+C` - 单击中止任务 / 双击退出
- `Ctrl+Z` - 挂起程序 (Linux/Mac)

## 数据流

### 用户输入流
```
用户输入
  ↓
EnhancedTextInput (历史记录、快捷键)
  ↓
handleSubmit()
  ↓
检测斜杠命令?
  ├─ 是 → executeSlashCommand()
  │         ↓
  │      命令处理 (/clear, /config 等)
  │         ↓
  │      更新 UI
  │
  └─ 否 → conversation.sendMessage()
           ↓
        流式响应处理
           ↓
        thinkingUpdate (节流更新)
        messagesUpdate (节流更新)
        toolExecutionsUpdate (节流更新)
           ↓
        UI 自动重绘
```

### AI 响应流
```
conversation.sendMessage()
  ↓
流式响应事件
  ├─ thinking → thinkingUpdate → Thinking 区域
  ├─ token → messagesUpdate → Conversation 区域
  ├─ tool_start → toolExecutionsUpdate → Tool Execution 区域
  ├─ tool_complete → 工具详情面板更新
  └─ plan_progress → Task Progress 区域
  ↓
UI 节流更新 (useSmartThrottledState)
  ↓
Ink 自动重绘
```

## 性能优化

### 1. 节流更新机制
- **问题**: 高频更新导致 UI 卡顿
- **解决**: `useSmartThrottledState` Hook
  - 默认 1500ms 节流
  - 重要事件立即更新 (error, abort, tool_complete)
  - 减少不必要的重绘

### 2. 滚动优化
- **虚拟滚动**: 只渲染可见区域的行
- **智能滚动**: 自动滚动到底部，支持用户手动滚动

### 3. 状态管理
- **useState**: 本地状态
- **useRef**: 保存可变引用 (conversation, input)
- **useCallback**: 避免不必要的函数重建

## 扩展性

### 添加新的斜杠命令
1. 在 `src/commands/slash-commands.js` 中注册命令
2. 实现命令处理函数
3. 在 `COMMAND_REGISTRY` 中添加元数据

### 添加新的工具渲染器
1. 在 `src/components/tool-renderers/` 创建新渲染器
2. 在 `tool-detail-view.jsx` 中注册
3. 根据工具类型选择渲染器

### 自定义 UI 布局
1. 修改 `closer-cli.jsx` 中的布局组件
2. 调整 `flexGrow` 和 `width` 属性
3. 更新响应式高度计算

## 配置相关

### UI 配置项 (config.js)
```javascript
{
  ui: {
    theme: 'default',           // 主题
    showLineNumbers: true,      // 显示行号
    maxOutputLines: 100,        // 最大输出行数
    thinkingEnabled: true       // Thinking 显示开关
  }
}
```

### 环境变量
- `CLOSER_THINKING_ENABLED` - Thinking 显示开关 (1/0)
- `CLOSER_DEBUG_LOG` - 调试日志 (1/0)

## 依赖关系

### 核心依赖
- **ink** - React for CLI，UI 渲染引擎
- **react** - UI 组件框架
- **ink-text-input** - 文本输入组件

### 内部依赖
- `conversation.js` - 对话管理
- `config.js` - 配置管理
- `tools.js` - 工具系统
- `shortcuts.js` - 快捷键管理
- `snippets.js` - 代码片段管理
- `history.js` - 历史记录管理

## 开发指南

### 运行交互式模式
```bash
node src/closer-cli.jsx
# 或
npm start
```

### 运行批处理模式
```bash
node src/batch-cli.js "你的问题"
node src/batch-cli.js --file prompt.txt
node src/batch-cli.js --json "分析代码"
```

### 运行极简模式
```bash
# 通过 cloco 命令
cloco -s
# 或
cloco --simple

# 直接运行（开发调试）
node src/minimal-cli.jsx
```

### 调试 UI
1. 启用调试日志: `export CLOSER_DEBUG_LOG=1`
2. 使用 `--verbose` 标志查看详细信息
3. 检查 Ink 渲染日志

## 常见问题

### Q: 如何修改 UI 布局比例？
A: 修改 `closer-cli.jsx` 中的 `flexGrow` 和 `width` 属性。

### Q: 如何添加新的快捷键？
A: 在 `useInput` 回调中添加新的按键处理逻辑。

### Q: Thinking 区域占用太多空间？
A: 使用 `Tab` 键切换显示，或调整 `thinkingHeight` 常量。

### Q: 如何自定义工具渲染？
A: 在 `src/components/tool-renderers/` 中创建自定义渲染器。

### Q: 极简模式和交互式模式有什么区别？
A: 极简模式只保留输入框和最后响应，无 Thinking、Task Progress 等面板，适合快速对话。交互式模式提供完整的 UI 和详细信息。

### Q: 极简模式支持历史记录吗？
A: 是的，极简模式重用了 `EnhancedTextInput` 组件，支持所有历史记录功能（↑/↓ 导航、搜索等）。

### Q: 如何在极简模式中查看工具执行详情？
A: 极简模式不显示工具详情面板。如需查看详细信息，请使用交互式模式（默认）或全屏模式（Ctrl+G）。

## 总结

Closer Code 的 CLI UI 采用现代化的 React + Ink 架构，提供了：
- 📱 **响应式布局** - 自适应终端尺寸
- ⚡ **高性能** - 节流更新和虚拟滚动
- 🎨 **可扩展** - 组件化设计，易于定制
- 🔧 **功能丰富** - 支持多种模式和快捷键
- 📊 **可视化** - 实时显示 AI 思考和工具执行

通过理解这些模块关系，开发者可以轻松地扩展和定制 CLI UI 功能。
