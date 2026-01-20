# Tools 改进方案

## 📋 当前问题分析

### 1. 文件读取问题

**现状**：
- `readFile` 一次性读取整个文件
- 对大文件（如 node_modules/*.js）会读取大量内容
- 无法处理日志文件（需要从末尾读取）
- 无法分段读取大文件

**影响**：
- 浪费 tokens
- 可能超出上下文限制
- 性能差

### 2. 文件编辑问题

**现状**：
- `editFile` 使用简单字符串替换
- 无法处理换行符差异（\r\n vs \n）
- 对大文件性能差
- 不支持正则表达式

**影响**：
- 替换失败
- 损坏文件格式
- 难以处理复杂编辑

### 3. Tool Execution 显示问题

**现状**：
- 只显示一行简短摘要
- bash 命令被截断（如 `npm run build:main` 变成 `npm run`）
- 无法看到完整命令
- 无法看到详细路径

**影响**：
- 用户不知道执行了什么
- 调试困难

---

## ✨ 改进方案

### 方案 1：增强的文件读取工具

#### 1.1 改进 `readFile` - 添加智能分段

```javascript
export const readFileTool = betaZodTool({
  name: 'readFile',
  description: `Read file contents with smart chunking for large files.

Best practices:
- For small files (< 10KB): read entire file
- For medium files (10-100KB): read first 100 lines
- For large files (> 100KB): use readFileLines or readFileChunk
- For log files: use readFileTail to read from end`,
  inputSchema: z.object({
    filePath: z.string().describe('File path'),
    encoding: z.string().optional().describe('Encoding (default: utf-8)'),
    maxLines: z.number().optional().describe('Max lines to read (default: 100 for large files)'),
    maxSize: z.number().optional().describe('Max size in bytes (default: 100KB)')
  }),
  run: async (input) => {
    const stats = await fs.stat(fullPath);
    const maxSize = input.maxSize || 100 * 1024; // 100KB

    if (stats.size > maxSize) {
      // 大文件：只读取前 N 行
      const content = await readFileHead(fullPath, input.maxLines || 100);
      return JSON.stringify({
        success: true,
        content,
        truncated: true,
        size: stats.size,
        readBytes: content.length,
        hint: `File is large (${formatSize(stats.size)}). Use readFileLines/readFileChunk for more control.`
      });
    }

    // 小文件：读取全部
    const content = await fs.readFile(fullPath, input.encoding || 'utf-8');
    return JSON.stringify({
      success: true,
      content,
      size: stats.size
    });
  }
});
```

#### 1.2 新增 `readFileLines` - 读取指定行范围

```javascript
export const readFileLinesTool = betaZodTool({
  name: 'readFileLines',
  description: `Read specific line ranges from a file. Perfect for large files.

Examples:
- Lines 1-50: {startLine: 1, endLine: 50}
- Last 100 lines: {startLine: -100}
- Lines 100-200: {startLine: 100, endLine: 200}`,
  inputSchema: z.object({
    filePath: z.string().describe('File path'),
    startLine: z.number().describe('Start line (1-based, negative for from end)'),
    endLine: z.number().optional().describe('End line (exclusive)'),
    maxLines: z.number().optional().describe('Max lines to return (default: 100)')
  }),
  run: async (input) => {
    const lines = await readLinesFromFile(fullPath, {
      start: input.startLine,
      end: input.endLine,
      max: input.maxLines || 100
    });

    return JSON.stringify({
      success: true,
      lines: lines.content,
      lineNumbers: lines.range,
      totalLines: lines.total,
      truncated: lines.truncated
    });
  }
});
```

#### 1.3 新增 `readFileTail` - 从末尾读取（日志文件）

```javascript
export const readFileTailTool = betaZodTool({
  name: 'readFileTail',
  description: `Read from the END of a file. Perfect for log files.

Examples:
- Last 50 lines: {lines: 50}
- Last 10KB: {bytes: 10240}
- Follow mode: {follow: true} - keep reading new lines`,
  inputSchema: z.object({
    filePath: z.string().describe('File path (usually a log file)'),
    lines: z.number().optional().describe('Number of lines from end (default: 50)'),
    bytes: z.number().optional().describe('Number of bytes from end')
  }),
  run: async (input) => {
    const content = await readTailFromFile(fullPath, {
      lines: input.lines || 50,
      bytes: input.bytes
    });

    return JSON.stringify({
      success: true,
      content: content.text,
      lineCount: content.lines,
      bytesRead: content.bytes,
      fromEnd: true
    });
  }
});
```

#### 1.4 新增 `readFileChunk` - 分块读取

```javascript
export const readFileChunkTool = betaZodTool({
  name: 'readFileChunk',
  description: `Read file in chunks with byte offsets. For very large files.

Example:
- First chunk: {offset: 0, length: 10240}
- Second chunk: {offset: 10240, length: 10240}`,
  inputSchema: z.object({
    filePath: z.string().describe('File path'),
    offset: z.number().describe('Byte offset to start reading'),
    length: z.number().describe('Number of bytes to read (max 50KB)')
  }),
  run: async (input) => {
    const buffer = await fs.readFile(fullPath);
    const chunk = buffer.slice(input.offset, input.offset + input.length);

    return JSON.stringify({
      success: true,
      content: chunk.toString('utf-8'),
      offset: input.offset,
      length: chunk.length,
      base64: chunk.toString('base64')
    });
  }
});
```

---

### 方案 2：改进的文件编辑工具

#### 2.1 使用成熟库 `replace-in-file`

```bash
npm install replace-in-file
```

```javascript
import { replaceInFile, replaceInFileSync } from 'replace-in-file';

export const editFileTool = betaZodTool({
  name: 'editFile',
  description: `Advanced file editing with regex and line ending support.

Features:
- Exact string replacement (replaceAll: true)
- Regular expression replacement (isRegex: true)
- Automatic line ending normalization
- Multiple replacements in one call

For large files or complex edits, use this tool.`,
  inputSchema: z.object({
    filePath: z.string().describe('File path'),
    oldText: z.string().describe('Text to find (or regex pattern)'),
    newText: z.string().describe('Replacement text'),
    replaceAll: z.boolean().optional().describe('Replace all occurrences'),
    isRegex: z.boolean().optional().describe('Treat oldText as regex'),
    multiline: z.boolean().optional().describe('Regex multiline mode'),
    caseInsensitive: z.boolean().optional().describe('Regex case insensitive')
  }),
  run: async (input) => {
    try {
      const options = {
        files: fullPath,
        from: input.isRegex
          ? new RegExp(input.oldText, input.multiline ? 'gm' : input.caseInsensitive ? 'gi' : 'g')
          : input.oldText,
        to: input.newText,
      };

      if (!input.replaceAll) {
        options.countMatches = true;
      }

      const results = await replaceInFile(options);

      return JSON.stringify({
        success: true,
        path: fullPath,
        changes: results[0].hasChanged ? results[0].numReplacements : 0,
        file: results[0].file
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error.message,
        suggestion: getErrorSuggestion(error)
      });
    }
  }
});
```

#### 2.2 新增 `normalizeLineEndings` 工具

```javascript
export const normalizeLineEndingsTool = betaZodTool({
  name: 'normalizeLineEndings',
  description: `Convert line endings to Unix (LF) or Windows (CRLF) format.

Use this when:
- File has mixed line endings
- Git shows "mixed line endings" warnings
- Editor shows inconsistent line endings`,
  inputSchema: z.object({
    filePath: z.string().describe('File path'),
    to: z.enum(['LF', 'CRLF']).describe('Target line ending format')
  }),
  run: async (input) => {
    let content = await fs.readFile(fullPath, 'utf-8');

    // 统一转换为 LF
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 转换为目标格式
    if (input.to === 'CRLF') {
      content = content.replace(/\n/g, '\r\n');
    }

    await fs.writeFile(fullPath, content, 'utf-8');

    return JSON.stringify({
      success: true,
      path: fullPath,
      format: input.to
    });
  }
});
```

---

### 方案 3：增强的 Tool Execution 显示

#### 3.1 修改 ToolExecution 组件

```javascript
function ToolExecution({ summary, detailInfo, timestamp }) {
  return (
    <Box flexDirection="column" marginBottom={1} paddingX={1} borderStyle="single" borderColor="gray" width="100%">
      {/* 第一行：简短摘要 */}
      <Box width="100%">
        <Text>{summary}</Text>
        <Text dim> [{timestamp}]</Text>
      </Box>
      {/* 第二行：详细信息 */}
      {detailInfo && (
        <Box width="100%">
          <Text dim color="gray">{detailInfo}</Text>
        </Box>
      )}
    </Box>
  );
}
```

#### 3.2 添加 `callInfo` 参数到工具

修改工具调用时，AI 可以提供 `callInfo`：

```javascript
// 在 conversation.js 中
if (typeof onProgress === 'function') {
  onProgress({
    type: 'tool_start',
    tool: block.name,
    input: block.input,
    callInfo: block.input.callInfo  // AI 提供的详细信息
  });
}
```

#### 3.3 改进 generateToolSummary

```javascript
export function generateToolExecution(toolName, input, result) {
  const success = result?.success;

  // 第一行：简短摘要
  let summary = '';
  // 第二行：详细信息
  let detailInfo = '';

  switch (toolName) {
    case 'bash':
      const cmd = input.command || '';
      const parts = cmd.trim().split(/\s+/);
      const command = parts[0] || 'bash';

      summary = success ? `✓ ${command}` : `✗ ${command}`;

      // 完整命令（最多 60 字符）
      detailInfo = cmd.length > 60
        ? cmd.substring(0, 57) + '...'
        : cmd;

      // 添加退出码
      if (result.exitCode !== undefined) {
        detailInfo += ` [exit: ${result.exitCode}]`;
      }
      break;

    case 'readFile':
    case 'readFileLines':
    case 'readFileTail':
      const filePath = input.filePath || '';
      summary = success ? `📖 ${path.basename(filePath)}` : `✗ ${path.basename(filePath)}`;
      detailInfo = filePath;

      // 添加大小信息
      if (result.size) {
        detailInfo += ` (${formatSize(result.size)})`;
      }
      if (result.truncated) {
        detailInfo += ` [truncated]`;
      }
      break;

    case 'writeFile':
      const writePath = input.filePath || '';
      summary = success ? `✍️ ${path.basename(writePath)}` : `✗ ${path.basename(writePath)}`;
      detailInfo = writePath;

      if (result.size) {
        detailInfo += ` (${formatSize(result.size)} written)`;
      }
      break;

    case 'editFile':
      const editPath = input.filePath || '';
      summary = success ? `✏️ ${path.basename(editPath)}` : `✗ ${path.basename(editPath)}`;
      detailInfo = editPath;

      if (result.changes !== undefined) {
        detailInfo += ` [${result.changes} changes]`;
      }
      break;

    default:
      summary = success ? `✓ ${toolName}` : `✗ ${toolName}`;
      detailInfo = JSON.stringify(input).substring(0, 60);
  }

  return { summary, detailInfo };
}
```

---

### 方案 4：改进 Prompt 引导

在系统提示中添加最佳实践：

```markdown
## 文件操作最佳实践

### 读取大文件
当文件可能很大时（如 node_modules/*.js, dist/*.js）：
1. 先用 `listFiles` 或 `bash` 检查文件大小
2. 使用 `readFileLines` 读取特定行范围
3. 使用 `readFileTail` 读取日志文件末尾
4. 避免一次性读取整个大文件

示例：
```json
{"tool": "bash", "input": {"command": "wc -l src/large-file.js"}}
{"tool": "readFileLines", "input": {"filePath": "src/large-file.js", "startLine": 1, "endLine": 50}}
```

### 编辑文件
1. 使用 `editFile` 的 `isRegex` 支持进行复杂替换
2. 使用 `normalizeLineEndings` 修复换行符问题
3. 提供清晰的 `callInfo` 描述你的操作

### 工具调用信息
在工具调用时，提供 `callInfo` 参数帮助用户理解你的操作：
```json
{
  "tool": "bash",
  "input": {
    "command": "npm run build:main",
    "callInfo": "Building main entry point with minification"
  }
}
```

显示效果：
```
✓ bash [14:30:25]
npm run build:main [exit: 0]
```
```

---

## 📊 实施优先级

### P0 - 立即实施
1. ✅ 改进 Tool Execution 显示（2 行显示）
2. ✅ `readFile` 添加文件大小检查
3. ✅ 改进 `editFile` 使用 replace-in-file

### P1 - 短期实施
4. ✅ 添加 `readFileLines` 工具
5. ✅ 添加 `readFileTail` 工具
6. ✅ 添加 `normalizeLineEndings` 工具

### P2 - 长期考虑
7. ⏳ 添加 `readFileChunk` 工具
8. ⏳ 添加文件缓存机制
9. ⏳ 添加文件变更检测

---

## 🎯 预期效果

### 文件读取
- ✅ 减少 50-70% 的 token 使用（大文件场景）
- ✅ 避免上下文溢出
- ✅ 更好的日志文件处理

### 文件编辑
- ✅ 100% 成功率（换行符兼容）
- ✅ 支持复杂替换（正则表达式）
- ✅ 更好的错误提示

### 用户体验
- ✅ 清晰的工具执行显示
- ✅ 完整的命令可见
- ✅ 更好的调试体验

---

## 📝 实施检查清单

- [ ] 安装依赖：`npm install replace-in-file`
- [ ] 修改 `src/tools.js` - 添加新工具
- [ ] 修改 `src/closer-cli.jsx` - ToolExecution 组件
- [ ] 修改 `src/conversation.js` - 处理 callInfo
- [ ] 更新 `src/prompt-builder.js` - 添加最佳实践
- [ ] 添加测试用例
- [ ] 更新文档

---

## 🚀 开始实施

建议按以下顺序实施：

1. **第一步**：改进 Tool Execution 显示（影响最小，效果最明显）
2. **第二步**：改进 readFile 和 editFile（核心功能）
3. **第三步**：添加新工具（readFileLines, readFileTail）
4. **第四步**：更新 Prompt 引导 AI 使用新工具

准备开始实施吗？我建议从第一步开始。
