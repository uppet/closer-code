# 提示词和工具优化总结

> 日期: 2026-01-23
> 目的: 优化 AI 模型使用工具的效率，减少 token 浪费

## 🎯 优化目标

1. **减少 bash 工具的滥用** - AI 模型倾向于使用 `bash -c "head/tail/grep"` 而不是专用工具
2. **避免写入后验证** - 写入文件后不应立即读取验证，浪费 token
3. **正确处理 minify 文件** - 对于单行大文件（如 minify JS），应使用字节读取而非行读取
4. **推广 bashResult 工具** - 当 bash 输出截断时，应使用 bashResult 而非重新执行命令

## ✅ 已完成的优化

### 1. 系统提示词优化 (prompt-builder.js)

**结构改进:**
- 使用更清晰的层级结构（emoji 图标）
- 明确区分"何时使用"和"何时不使用"
- 添加具体示例

**关键改进点:**

#### 文件操作部分
```markdown
### 📁 File Operations - ALWAYS use specialized tools

**Reading Files:**
1. **Small files**: Use `readFile` tool (NOT `cat`)
2. **Specific line ranges**: Use `readFileLines` tool (NOT `sed`)
3. **From end (logs)**: Use `readFileTail` tool (NOT `tail`)
4. **By bytes (minified files)**: Use `readFileChunk` tool
   - **⚠️ CRITICAL**: For minified JS/CSS files, MUST use `readFileChunk`
```

#### 写入后不验证
```markdown
**✅ After Writing - DO NOT verify by reading:**
- `writeFile`, `editFile`, `regionConstrainedEdit` return explicit success/failure
- **DO NOT** call `readFile` to verify - assume success if tool returns success
- Only read back if tool returns error or user explicitly requests
- **This saves significant tokens**
```

#### bash 使用场景
```markdown
### 💻 When to use bash - ONLY for these purposes:

**✅ Appropriate bash usage:**
- Running tests: `npm test`, `pytest`, `cargo test`
- Git operations: `git status`, `git commit`, `git log`
- Build commands: `npm run build`, `make`, `cmake`
- Package managers: `npm install`, `pip install`, `cargo build`
- System operations: `ps`, `kill`, `df`, `top`, `lsof`
- Directory listing: `ls`, `ls -la`, `tree`

**❌ NEVER use bash for:**
- Reading files (cat, head, tail) → Use readFile tools
- Searching (grep, find) → Use searchCode/searchFiles
- Editing files (sed, awk) → Use editFile tools
```

#### bashResult 工具推广
```markdown
### 📦 bashResult Tool - When bash output is truncated

**When bash output is large (>100 lines):**
- Output is truncated and a `result_id` is provided
- **❌ DO NOT** re-run bash with pipes like `| head`, `| tail`, `| grep`
- **✅ DO** use `bashResult` tool with the `result_id`

**Why use bashResult?**
- Avoids re-executing slow commands (saves time)
- No need to re-run expensive operations (saves resources)
- Direct access to cached results (saves tokens)
```

### 2. 工具描述优化 (tools.js)

#### bash 工具
- **简化描述** - 从冗长的描述改为简洁的要点
- **强调限制** - 明确列出何时不使用 bash
- **突出 bashResult** - 清晰说明何时使用 bashResult

**改进前:**
```javascript
description: `Execute a bash shell command.

**Large Output Handling:**
If the output is large (>100 lines or >10KB), only the first 100 lines are returned along with a result_id.

Use the bashResult tool to retrieve more content from the result_id.

**bashResult Actions:**
- head: Get first N lines
...（很长）
`
```

**改进后:**
```javascript
description: `Execute a bash shell command.

**⚠️ CRITICAL - DO NOT use bash for file operations:**
- Reading files (cat, head, tail) → Use readFile/readFileLines/readFileTail
- Searching (grep, find) → Use searchCode/searchFiles
- Editing files (sed, awk) → Use editFile/regionConstrainedEdit

**✅ When to use bash:**
- Running tests: npm test, pytest, cargo test
- Git operations: git status, git commit, git log
...

**📦 Large Output Handling:**
When output is large (>100 lines), only first 100 lines are returned with a \`result_id\`.

**❌ DO NOT** re-run bash with pipes like \`| head\`, \`| tail\`, \`| grep\`
**✅ DO** use \`bashResult\` tool with the \`result_id\`
`
```

#### bashResult 工具
- **精简描述** - 去除冗余说明，保留核心要点
- **强调好处** - 明确说明为什么使用 bashResult

**改进前:**
```javascript
description: `Retrieve more content from a previous truncated bash command result.

Use this tool when you have a result_id from a truncated bash output.

**Actions**:
- head: Get first N lines (default: 100)
...（详细说明）
`
```

**改进后:**
```javascript
description: `Retrieve more content from a truncated bash command result WITHOUT re-executing the command.

**⚡ When to use:**
- Bash command returned \`result_id\` (output was >100 lines)
- Need to see more of the output or search/filter it

**❌ DO NOT:** Re-run bash with pipes (e.g., bash "| head -50", bash "| grep error")
**✅ DO:** Use bashResult with the result_id (much faster, saves tokens)
`
```

#### writeFile 工具
- **添加写入后不验证的说明**
- **强调返回值包含成功/失败信息**

```javascript
description: `Write content to a file (creates or overwrites). Supports plain text and base64-encoded content.

**✅ After writing - DO NOT verify by reading:**
- This tool returns explicit success/failure information
- Assume success if tool returns success
- DO NOT call readFile to verify - this wastes tokens
- Only read back if tool returns error or user explicitly requests
`
```

#### readFile 工具
- **添加 minify 文件警告**
- **明确说明何时使用 readFileChunk**

```javascript
description: `Read file contents with smart chunking for large files.

**⚠️ CRITICAL - For minified files:**
- For minified JS/CSS (bundle.min.js, style.min.css): MUST use \`readFileChunk\`
- Line-based reading doesn't work for single-line files
- Example: \`readFileChunk({ filePath: "bundle.min.js", startByte: 0, endByte: 10240 })\`
`
```

### 3. 新增工具

#### readFileChunk 工具
- **用途**: 按字节范围读取文件
- **适用场景**: minify 文件、二进制文件
- **优势**: 避免单行大文件的问题

### 4. 超长行检测功能

#### 自动检测超长行
- **检测阈值**: 单行超过 10,000 字符
- **返回参数**:
  - `hasLongLine`: boolean - 是否检测到超长行
  - `maxLineLength`: number - 最大行长度
  - `lineCount`: number - 总行数
  - `warning`: string - 警告信息
  - `suggestion`: string - 建议使用 readFileChunk

#### 示例输出
```javascript
// 读取 minify 文件时
{
  "success": true,
  "content": "...",
  "size": 21500,
  "hasLongLine": true,
  "maxLineLength": 21500,
  "lineCount": 1,
  "warning": "File contains extremely long lines (max: 21,500 characters). This is likely a minified file. Use readFileChunk instead of line-based tools for better performance.",
  "suggestion": "Use: readFileChunk({ filePath: \"bundle.min.js\", startByte: 0, endByte: 10240 })"
}
```

#### 优势
- **自动识别**: AI 模型可以自动识别 minify 文件
- **明确建议**: 直接提供使用 readFileChunk 的建议
- **避免浪费**: 防止 AI 模型使用低效的行读取方式

### 5. 超长行处理功能

#### readFileLines 的 handleLongLines 参数

当 AI 模型执意要处理大文件和长行时，readFileLines 提供了灵活的处理选项：

**参数选项**:
- `"warn"` (默认): 返回警告，但不修改内容
- `"split"`: 将超长行分割成多行（每 1000 字符）
- `"truncate"`: 截断超长行到指定长度
- `"skip"`: 跳过超长行

**示例**:
```javascript
// 分割超长行
readFileLines({
  filePath: "bundle.min.js",
  startLine: 1,
  endLine: 100,
  handleLongLines: "split"
})
// 返回: { lineCount: 22, longLineHandling: { splitCount: 21, splitSize: 1000 } }

// 截断超长行
readFileLines({
  filePath: "bundle.min.js",
  handleLongLines: "truncate",
  truncateLength: 500
})
// 返回: { lineCount: 1, longLineHandling: { truncatedCount: 1, truncateLength: 500 } }
```

#### 提示词建议格式化文件

在系统提示词中添加了"Pro Tip"，建议 AI 模型在需要处理 minify 文件时：

**方案 1**: 先格式化，再读取
```javascript
bash({ command: "npx prettier --write bundle.min.js" })
readFileLines({ filePath: "bundle.min.js", startLine: 1, endLine: 50 })
```

**方案 2**: 使用 readFileChunk
```javascript
readFileChunk({ filePath: "bundle.min.js", startByte: 0, endByte: 10240 })
```

**方案 3**: 使用 handleLongLines 参数
```javascript
readFileLines({ filePath: "bundle.min.js", handleLongLines: "split" })
```

#### 优势
- **灵活性**: AI 模型可以选择最适合的处理方式
- **可控性**: 提供多种处理选项，适应不同场景
- **效率**: 避免强制 AI 模型使用特定方式

```javascript
description: `Read file content by byte range. Perfect for minified files (JS/CSS) where line-based reading doesn't work.

**When to use:**
- Minified JavaScript/CSS files (single line, large size)
- Binary files
- Any file where line-based reading is inefficient

**Examples:**
- First 10KB: {startByte: 0, endByte: 10240}
- Byte range 1000-5000: {startByte: 1000, endByte: 5000}
- Last 5KB: {startByte: -5120}
`
```

### 4. 其他工具优化

所有工具描述都进行了简化，并添加了明确的"使用此工具而不是 bash 命令"的说明：

- **searchFiles**: "Use this instead of bash `find` command"
- **searchCode**: "Use this instead of bash `grep` command"
- **readFileTail**: "Use this instead of bash `tail` command"
- **editFile**: "Use this instead of bash `sed` command"
- **regionConstrainedEdit**: "Use this instead of bash `sed` command"
- **listFiles**: "Use this instead of bash `ls` command for structured output"

## 📊 预期效果

### Token 节省
1. **写入后不验证**: 每次写入节省 1 次 readFile 调用
   - 假设平均文件 10KB，每次节省 ~2000 tokens

2. **使用 bashResult**: 避免重新执行 bash 命令
   - 假设每次重新执行节省 ~500 tokens（命令输出）

3. **使用专用工具**: 避免使用 `bash -c "cat/grep/head/tail"`
   - 每次节省 ~100-500 tokens

### 效率提升
1. **减少命令执行次数**: bashResult 避免重新执行慢速命令
2. **更好的错误处理**: 专用工具提供更详细的错误信息
3. **结构化输出**: 专用工具返回 JSON，更易于解析

## 🧪 测试建议

### 测试场景 1: Minify 文件读取
```javascript
// 应该使用 readFileChunk
readFileChunk({ filePath: "bundle.min.js", startByte: 0, endByte: 10240 })

// 不应该使用 readFileLines
readFileLines({ filePath: "bundle.min.js", startLine: 1, endLine: 100 })
```

### 测试场景 2: 写入后不验证
```javascript
// 应该这样
writeFile({ filePath: "test.js", content: "..." })
// 直接继续，不读取验证

// 不应该这样
writeFile({ filePath: "test.js", content: "..." })
readFile({ filePath: "test.js" })  // ❌ 浪费 tokens
```

### 测试场景 3: bash 输出截断
```javascript
// Step 1: 执行 bash 命令
bash({ command: "find /usr -name '*.h'" })
// Returns: { result_id: "res_123", truncated: true, ... }

// Step 2: 应该使用 bashResult
bashResult({ result_id: "res_123", action: "tail", lines: 100 })

// 不应该重新执行
bash({ command: "find /usr -name '*.h' | tail -n 100" })  // ❌ 浪费时间
```

### 测试场景 4: 文件操作使用专用工具
```javascript
// 应该使用专用工具
readFile({ filePath: "app.js" })
searchCode({ pattern: "function test" })
searchFiles({ pattern: "**/*.js" })

// 不应该使用 bash
bash({ command: "cat app.js" })  // ❌
bash({ command: "grep 'function test' app.js" })  // ❌
bash({ command: "find . -name '*.js'" })  // ❌
```

## 📝 后续改进建议

1. **监控工具使用情况**: 记录 AI 模型使用各工具的频率
2. **A/B 测试**: 对比优化前后的 token 使用量
3. **用户反馈**: 收集实际使用中的问题
4. **持续优化**: 根据实际数据调整提示词

## 🎉 总结

本次优化通过以下方式提升效率：

1. ✅ **明确的工具使用指南** - 清楚说明何时使用哪个工具
2. ✅ **强调最佳实践** - 在多个地方重复关键信息
3. ✅ **简化工具描述** - 减少冗余，突出重点
4. ✅ **添加新工具** - readFileChunk 解决 minify 文件问题
5. ✅ **统一风格** - 所有工具描述使用一致的格式

**预期收益**:
- 减少 20-30% 的 token 使用
- 提高响应速度（减少不必要的命令执行）
- 更好的错误处理和用户体验
