# /export 命令使用说明

## 功能描述

`/export` 命令用于将当前对话历史导出为文本文件，方便保存和分享对话内容。

## 使用方法

### 基本用法

```
/export <filename>
```

### 示例

```bash
# 导出对话到 my-conversation.txt
/export my-conversation

# 导出对话到 chat-2024-01-18.txt（会自动添加 .txt 扩展名）
/export chat-2024-01-18

# 如果文件名已包含 .txt 扩展名，则不会重复添加
/export conversation.txt
```

## 导出格式

导出的文本文件包含以下内容：

```
================================================================================
Closer Code - Conversation Export
================================================================================
Export Date: 2024-01-18 14:30:00
Total Messages: 15
================================================================================

[1] 👤 User
--------------------------------------------------------------------------------
你好，请帮我写一个 Python 脚本

[2] 🤖 Assistant
--------------------------------------------------------------------------------
好的，我来帮你写一个 Python 脚本。请告诉我你需要什么功能...

[3] 👤 User
--------------------------------------------------------------------------------
需要一个读取 CSV 文件的脚本

...
```

## 特性

- ✅ 自动添加 `.txt` 扩展名（如果未指定）
- ✅ 包含导出日期和消息统计
- ✅ 清晰的消息分隔符
- ✅ 支持用户、助手、系统消息
- ✅ 支持工具调用和结果显示
- ✅ UTF-8 编码，支持中文

## 注意事项

1. 文件会保存在当前工作目录
2. 如果文件已存在，会被覆盖
3. 导出的是当前会话的所有对话历史
4. 包括从历史记录中加载的旧对话

## 完整命令列表

```
/clear - 清除对话历史
/export <filename> - 导出对话到文本文件
/plan <task> - 创建并执行任务计划
/learn - 学习项目模式
/status - 显示对话统计
/help - 显示帮助信息
```

## 快捷键

- `Ctrl+C` (双击) - 退出程序
- `ESC` - 同双击 Ctrl+C
- `↑/↓` - 滚动查看历史消息
- `Page Up/Down` - 快速滚动
- `Enter` - 回到底部

## 示例场景

### 场景1：保存重要的对话

```
你: /export api-design-discussion
系统: ✅ Conversation exported to: api-design-discussion.txt
```

### 场景2：导出调试会话

```
你: /export debug-session-$(date +%Y%m%d)
系统: ✅ Conversation exported to: debug-session-20240118.txt
```

### 场景3：备份对话历史

```
你: /export conversation-backup-before-clear
系统: ✅ Conversation exported to: conversation-backup-before-clear.txt
你: /clear
系统: 🗑️ 清除对话历史...
```

## 技术细节

### 实现位置

- 命令处理：`src/closer-cli.jsx` 中的 `handleCommand` 函数
- 导出逻辑：`exportConversation` 函数

### 支持的消息类型

- `user` - 用户消息（👤）
- `assistant` - AI 助手消息（🤖）
- `system` - 系统消息（ℹ️）
- `error` - 错误消息（❌）

### 复杂内容处理

对于包含工具调用的消息，导出时会格式化为：

```
[Tool: bash]
{
  "command": "ls -la"
}

[Tool Result]
total 16
drwxr-xr-x  4 user  staff  128 Jan 18 14:30 .
...
```

## 未来改进

可能的增强功能：
- 支持更多导出格式（Markdown、JSON、HTML）
- 添加过滤选项（按日期、关键词）
- 支持导出部分消息（指定范围）
- 添加导出预览功能
- 支持批量导出多个项目
