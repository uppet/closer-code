# 对话导出功能使用指南

## 概述

Closer Code 提供了两种对话导出格式，满足不同的使用场景：

- **简洁格式** (`/export`) - 包含对话内容和 AI 思考过程，适合阅读和分享
- **完整格式** (`/export_all`) - 包含所有细节（thinking、工具调用、统计等），适合调试和归档

## 命令用法

### /export - 简洁格式导出（推荐）

```
/export <filename>
```

**导出内容**：
- ✅ 用户和助手的对话内容
- ✅ AI 思考过程（thinking）
- ✅ 代码块和格式化文本
- ❌ 工具调用详情
- ❌ Token 统计

**适用场景**：
- 分享对话给他人
- 存档重要的对话内容
- 在 Markdown 编辑器中阅读
- **了解 AI 的思考过程**

**示例**：
```
/export conversation-2025-02-06
```

生成文件：`conversation-2025-02-06.md`

---

### /export_all - 完整格式导出

```
/export_all <filename>
```

**导出内容**：
- ✅ 所有对话内容
- ✅ AI 思考过程
- ✅ 工具调用详情（输入、输出、耗时）
- ✅ Token 统计信息
- ✅ 时间戳和元数据

**适用场景**：
- 调试和问题排查
- 完整的对话归档
- 分析 AI 的思考过程
- 性能分析（工具耗时、Token 使用）

**示例**：
```
/export_all full-conversation-2025-02-06
```

生成文件：`full-conversation-2025-02-06.md`

---

## 输出格式示例

### 简洁格式示例（包含 thinking）

```markdown
# Closer Code 对话记录

**导出时间**: 2025/2/6 17:23:21
**原始消息数**: 4

---

## 🧠 AI 思考过程

1. 开始分析用户请求
2. 准备编写文件
3. 调用 writeFile 工具
4. 文件创建完成

---

**有效消息数**: 4

---

## 👤 用户

你好，请帮我写一个排序算法

---

## 🤖 助手

好的！这是一个快速排序算法的实现：

\`\`\`javascript
function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[0];
  const left = arr.filter(x => x < pivot);
  const right = arr.filter(x => x >= pivot);
  return [...quickSort(left), pivot, ...quickSort(right)];
}
\`\`\`

这个算法的时间复杂度是 O(n log n)。

---
```

### 完整格式示例

```markdown
# Closer Code 完整对话记录

## 📊 元数据

- **导出时间**: 2025/2/6 17:23:21
- **消息数量**: 4
- **工具调用**: 2 次
- **Thinking 记录**: 4 条
- **Token 使用**: 1,250 / 4,096
  - 输入: 500
  - 输出: 750

---

## 🧠 AI Thinking 过程

### 1. 🤔 [14:30:20] 开始分析用户请求

### 2. ✍️ [14:30:22] 准备编写排序算法

---

## 🔧 工具执行记录

### 1. ✅ readFile

- **状态**: success
- **时间**: 14:30:25
- **耗时**: 150ms
- **输入**:
\`\`\`json
{
  "filePath": "sort.js"
}
\`\`\`

---

## 💬 对话内容

（对话内容...）
```

---

## 文件管理

### 文件命名建议

- 使用描述性文件名
- 包含日期或主题
- 使用连字符分隔单词

**好的示例**：
- `conversation-2025-02-06.md`
- `debug-session-sort-algo.md`
- `project-planning.md`

**避免的示例**：
- `export.md` (太通用)
- `a.txt` (无意义)
- `my file.md` (包含空格)

### 文件位置

导出的文件默认保存在当前工作目录。建议：

```bash
# 创建专门的导出目录
mkdir -p exports

# 导出到该目录
/export exports/conversation-$(date +%Y-%m-%d).md
```

---

## 使用技巧

### 1. 定期备份重要对话

```bash
# 每天结束时导出当天对话
/export_all daily-$(date +%Y-%m-%d)
```

### 2. 分享特定对话

```bash
# 只分享对话内容，不包含调试信息
/export share-with-team
```

### 3. 调试问题

```bash
# 导出完整信息用于调试
/export_all debug-session-issue-123
```

### 4. 归档项目对话

```bash
# 项目结束时归档所有对话
/export_all project-complete-$(date +%Y-%m-%d)
```

---

## 常见问题

### Q: 导出的文件在哪里？
A: 默认在当前工作目录。可以使用相对路径或绝对路径：
```
/export exports/conversation.md
/export /home/user/docs/conversation.md
```

### Q: 可以修改导出的文件吗？
A: 可以！导出的是标准 Markdown 文件，可以在任何文本编辑器中修改。

### Q: 如何在 GitHub 上分享导出的对话？
A: 直接将 `.md` 文件提交到 GitHub，它会自动渲染成漂亮的格式。

### Q: 导出的文件包含敏感信息吗？
A: 完整格式包含所有对话内容。分享前请检查是否包含敏感信息。

### Q: 可以导出为其他格式吗？
A: 目前只支持 Markdown。你可以使用 Pandoc 等工具转换为其他格式：
```bash
pandoc conversation.md -o conversation.pdf
```

---

## 相关命令

- `/clear` - 清除对话历史
- `/history` - 查看输入历史统计
- `/status` - 查看对话摘要
