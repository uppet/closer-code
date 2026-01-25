# 提示词和工具优化 - 最终总结

> 日期: 2026-01-23
> 状态: ✅ 完成
> 目的: 优化 AI 模型使用工具的效率，减少 token 浪费，正确处理各种文件类型

## 🎯 优化目标

1. **减少 bash 工具的滥用** - AI 模型倾向于使用 `bash -c "head/tail/grep"` 而不是专用工具
2. **避免写入后验证** - 写入文件后不应立即读取验证，浪费 token
3. **正确处理 minify 文件** - 对于单行大文件（如 minify JS），应使用字节读取而非行读取
4. **推广 bashResult 工具** - 当 bash 输出截断时，应使用 bashResult 而非重新执行命令
5. **灵活处理超长行** - 当 AI 执意要处理大文件和长行时，提供对应的实现

## ✅ 已完成的优化

### 1. 系统提示词优化 (prompt-builder.js)

**改进内容**:
- 使用 emoji 图标增强可读性
- 明确区分"何时使用"和"何时不使用"
- 添加具体示例
- 强调写入后不验证
- 推广 bashResult 工具
- **新增**: 建议格式化文件使其行处理友好

**关键改进**:

#### 文件操作部分
```markdown
**Reading Files:**
1. **Small files**: Use `readFile` tool (NOT `cat`)
2. **Specific line ranges**: Use `readFileLines` tool (NOT `sed`)
3. **From end (logs)**: Use `readFileTail` tool (NOT `tail`)
4. **By bytes (minified files)**: Use `readFileChunk` tool
   - **⚠️ CRITICAL**: For minified JS/CSS files, MUST use `readFileChunk`

**💡 Pro Tip - Making files line-friendly:**
If you need to process a minified file line-by-line:
- **Option 1**: Format it first, then read
  `bash({ command: "npx prettier --write bundle.min.js" })`
- **Option 2**: Use `readFileChunk` to read byte ranges directly
- **Option 3**: Use `readFileLines` with `handleLongLines: "split"` parameter
```

### 2. 工具描述优化 (tools.js)

**优化内容**:
- 所有工具描述简化，去除冗余
- 添加明确的"使用此工具而不是 bash"说明
- 添加写入后不验证的说明
- 添加 minify 文件警告

**示例**:
```javascript
// writeFile 工具
description: `Write content to a file (creates or overwrites).

**✅ After writing - DO NOT verify by reading:**
- This tool returns explicit success/failure information
- Assume success if tool returns success
- DO NOT call readFile to verify - this wastes tokens`

// searchCode 工具
description: `Search for text/patterns in file contents.

**Examples:**
- Search for function: "function myFunc"
- Search for imports: "import.*from"

Use this instead of bash \`grep\` command.`
```

### 3. 新增工具

#### readFileChunk 工具
- **用途**: 按字节范围读取文件
- **适用场景**: minify 文件、二进制文件
- **优势**: 避免单行大文件的问题

```javascript
readFileChunk({
  filePath: "bundle.min.js",
  startByte: 0,
  endByte: 10240  // 读取前 10KB
})
```

### 4. 超长行检测功能

**实现细节**:
- **检测阈值**: 单行超过 10,000 字符
- **适用工具**: readFile, readFileLines
- **返回参数**:
  - `hasLongLine`: boolean - 是否检测到超长行
  - `maxLineLength`: number - 最大行长度
  - `lineCount`: number - 总行数
  - `warning`: string - 警告信息
  - `suggestion`: string - 建议使用 readFileChunk

**示例输出**:
```javascript
{
  "success": true,
  "content": "...",
  "hasLongLine": true,
  "maxLineLength": 21500,
  "lineCount": 1,
  "warning": "File contains extremely long lines (max: 21,500 characters)...",
  "suggestion": "Use: readFileChunk({ filePath: \"bundle.min.js\", startByte: 0, endByte: 10240 })"
}
```

### 5. 超长行处理功能

**实现细节**:
- **参数**: `handleLongLines`
- **选项**:
  - `"warn"` (默认): 返回警告，但不修改内容
  - `"split"`: 将超长行分割成多行（每 1000 字符）
  - `"truncate"`: 截断超长行到指定长度
  - `"skip"`: 跳过超长行

**示例**:
```javascript
// 分割超长行
readFileLines({
  filePath: "bundle.min.js",
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

## 📊 完整功能列表

### 文件读取
- **readFile**: 智能读取，自动检测超长行
- **readFileLines**: 按行读取，支持处理超长行
- **readFileChunk**: 按字节读取（适用于 minify 文件）
- **readFileTail**: 从末尾读取（适用于日志）

### 文件写入
- **writeFile**: 写入文件，不验证
- **editFile**: 编辑文件，不验证
- **regionConstrainedEdit**: 精确编辑，不验证

### 搜索
- **searchFiles**: 搜索文件名
- **searchCode**: 搜索文件内容

### 其他
- **bash**: 执行命令，输出截断时使用 bashResult
- **bashResult**: 获取截断的 bash 输出
- **listFiles**: 列出目录

## 🎓 最佳实践

### 读取文件
```javascript
// ✅ 正确
readFile({ filePath: "app.js" })
readFileLines({ filePath: "app.js", startLine: 1, endLine: 50 })
readFileChunk({ filePath: "bundle.min.js", startByte: 0, endByte: 10240 })

// ❌ 错误
bash({ command: "cat app.js" })
bash({ command: "sed -n '1,50p' app.js" })
readFileLines({ filePath: "bundle.min.js", startLine: 1, endLine: 100 })  // 超长行
```

### 写入文件
```javascript
// ✅ 正确
writeFile({ filePath: "test.js", content: "..." })
// 直接继续，不验证

// ❌ 错误（浪费 tokens）
writeFile({ filePath: "test.js", content: "..." })
readFile({ filePath: "test.js" })  // 不必要的验证
```

### bash 输出截断
```javascript
// ✅ 正确
bash({ command: "find /usr -name '*.h'" })
// Returns: { result_id: "res_123", truncated: true, ... }
bashResult({ result_id: "res_123", action: "tail", lines: 100 })

// ❌ 错误（浪费时间）
bash({ command: "find /usr -name '*.h' | tail -n 100" })
```

### 处理 minify 文件
```javascript
// 方案 1: 格式化后读取
bash({ command: "npx prettier --write bundle.min.js" })
readFileLines({ filePath: "bundle.min.js", startLine: 1, endLine: 50 })

// 方案 2: 使用 readFileChunk
readFileChunk({ filePath: "bundle.min.js", startByte: 0, endByte: 10240 })

// 方案 3: 使用 handleLongLines
readFileLines({ filePath: "bundle.min.js", handleLongLines: "split" })
```

## 📈 预期效果

### Token 节省
1. **写入后不验证**: 每次写入节省 ~2000 tokens
2. **使用 bashResult**: 避免重新执行，节省 ~500 tokens/次
3. **使用专用工具**: 避免使用 bash 包装，节省 ~100-500 tokens/次

### 效率提升
1. **减少命令执行次数**: bashResult 避免重新执行慢速命令
2. **更好的错误处理**: 专用工具提供更详细的错误信息
3. **结构化输出**: 专用工具返回 JSON，更易于解析
4. **灵活处理**: AI 模型可以选择最适合的处理方式

## 🧪 测试覆盖

- ✅ 超长行检测测试
- ✅ handleLongLines 参数测试（所有四种模式）
- ✅ readFileChunk 工具测试
- ✅ 边界情况测试（单行文件、混合文件等）

## 📖 参考文档

- **详细说明**: OPTIMIZATION-SUMMARY.md
- **快速参考**: QUICK-REFERENCE.md

## 🎉 总结

本次优化通过以下方式提升效率：

1. ✅ **明确的工具使用指南** - 清楚说明何时使用哪个工具
2. ✅ **强调最佳实践** - 在多个地方重复关键信息
3. ✅ **简化工具描述** - 减少冗余，突出重点
4. ✅ **添加新工具** - readFileChunk 解决 minify 文件问题
5. ✅ **智能检测** - 自动检测超长行并提供建议
6. ✅ **灵活处理** - 提供多种处理超长行的方式
7. ✅ **统一风格** - 所有工具描述使用一致的格式

**预期收益**:
- 减少 20-30% 的 token 使用
- 提高响应速度（减少不必要的命令执行）
- 更好的错误处理和用户体验
- 正确处理各种文件类型（包括 minify 文件）
- 灵活处理超长行，满足不同场景需求
