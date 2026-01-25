/**
 * 工具执行引擎（使用 SDK）
 *
 * 使用 @anthropic-ai/sdk 的 betaZodTool 和 Zod 来定义工具
 * 优势：
 * - 类型安全的工具定义
 * - 自动 schema 验证
 * - SDK 自动处理工具调用循环（toolRunner）
 * - 无需手工解析工具调用
 */

import { z } from 'zod';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import fs from 'fs/promises';
import path from 'path';
import { executeBashCommand } from './bash-runner.js';
import { glob } from 'glob';
import { bashResultCache } from './bash-result-cache.js';

/**
 * 创建一个配置上下文，用于工具执行器
 */
let toolExecutorContext = null;

export function setToolExecutorContext(config) {
  toolExecutorContext = {
    workingDir: config.behavior.workingDir,
    enabledTools: new Set(config.tools.enabled)
  };
}

/**
 * 辅助函数：截断输出到指定行数
 */
function truncateOutput(output, maxLines) {
  if (!output) return '';
  const lines = output.split('\n');
  if (lines.length <= maxLines) return output;
  return lines.slice(0, maxLines).join('\n');
}

/**
 * Bash 工具 - 执行 bash 命令
 */
export const bashTool = betaZodTool({
  name: 'bash',
  description: `Execute a bash shell command.

**⚠️ CRITICAL - DO NOT use bash for file operations:**
- Reading files (cat, head, tail) → Use readFile/readFileLines/readFileTail
- Searching (grep, find) → Use searchCode/searchFiles
- Editing files (sed, awk) → Use editFile/regionConstrainedEdit

**✅ When to use bash:**
- Running tests: npm test, pytest, cargo test
- Git operations: git status, git commit, git log
- Build commands: npm run build, make, cmake
- System operations: ps, kill, df, top, lsof
- Package managers: npm install, pip install, cargo build
- Directory listing: ls, ls -la, tree

**📦 Large Output Handling:**
When output is large (>100 lines), only first 100 lines are returned with a \`result_id\`.

**❌ DO NOT** re-run bash with pipes like \`| head\`, \`| tail\`, \`| grep\`
**✅ DO** use \`bashResult\` tool with the \`result_id\`

**Example:**
\`\`\`javascript
bash({ command: "npm list --depth=0" })
// Returns: { result_id: "res_123", truncated: true, ... }

bashResult({ result_id: "res_123", action: "tail", lines: 50 })
\`\`\`

Use this IMMEDIATELY when user asks to run commands, execute tests, or perform terminal operations.`,
  inputSchema: z.object({
    command: z.string().describe('The bash command to execute (e.g., "ls -la", "npm test", "git status")'),
    timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000)')
  }),
  run: async (input) => {
    if (!toolExecutorContext) {
      throw new Error('Tool executor context not initialized');
    }

    const result = await executeBashCommand(input.command, {
      cwd: toolExecutorContext.workingDir,
      timeout: input.timeout || 30000
    });

    // 检查输出大小
    const totalOutput = result.stdout + result.stderr;
    const totalLines = totalOutput.split('\n').length;
    const isLarge = totalLines > 100 || totalOutput.length > 10 * 1024;

    if (isLarge) {
      // 生成 result_id
      const result_id = bashResultCache.generateResultId();
      
      // 存储完整结果到缓存
      bashResultCache.set(result_id, {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        command: input.command,
        timestamp: Date.now()
      });

      // 返回截断版本 + result_id
      return JSON.stringify({
        success: true,
        stdout: truncateOutput(result.stdout, 100),
        stderr: truncateOutput(result.stderr, 100),
        exitCode: result.exitCode,
        truncated: true,
        result_id: result_id,
        totalLines: totalLines,
        totalSize: totalOutput.length,
        hint: `Output is large (${totalLines} lines, ${formatSize(totalOutput.length)}). Use bashResult tool with result_id="${result_id}" to retrieve more content. Actions: head, tail, lineRange, grep, full.`
      });
    }

    // 小输出：完整返回
    if (result.success) {
      return JSON.stringify({
        success: true,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode
      });
    } else {
      return JSON.stringify({
        success: false,
        error: result.error,
        stdout: result.stdout,
        stderr: result.stderr
      });
    }
  }
});

/**
 * 检测文件中是否有超长行
 * @param {string} content - 文件内容
 * @param {number} threshold - 阈值（默认 10000 字符）
 * @returns {object} {hasLongLine: boolean, maxLineLength: number, lineCount: number}
 */
function detectLongLines(content, threshold = 10000) {
  const lines = content.split('\n');
  let maxLineLength = 0;
  
  for (const line of lines) {
    if (line.length > maxLineLength) {
      maxLineLength = line.length;
    }
  }
  
  return {
    hasLongLine: maxLineLength > threshold,
    maxLineLength: maxLineLength,
    lineCount: lines.length,
    threshold: threshold
  };
}

/**
 * 读取文件工具（智能分段）
 */
export const readFileTool = betaZodTool({
  name: 'readFile',
  description: `Read file contents with smart chunking for large files.

**Best practices:**
- Small files (< 10KB): reads entire file
- Medium files (10-100KB): reads first 100 lines
- Large files (> 100KB): use readFileLines or readFileChunk
- Log files: use readFileTail to read from end

**⚠️ CRITICAL - For minified files:**
- For minified JS/CSS (bundle.min.js, style.min.css): MUST use \`readFileChunk\`
- Line-based reading doesn't work for single-line files
- Example: \`readFileChunk({ filePath: "bundle.min.js", startByte: 0, endByte: 10240 })\``,
  inputSchema: z.object({
    filePath: z.string().describe('File path'),
    encoding: z.string().optional().describe('Encoding (default: utf-8)'),
    maxLines: z.number().optional().describe('Max lines to read for large files (default: 100)'),
    maxSize: z.number().optional().describe('Max size in bytes before truncating (default: 100KB)')
  }),
  run: async (input) => {
    if (!toolExecutorContext) {
      throw new Error('Tool executor context not initialized');
    }

    const fullPath = path.resolve(toolExecutorContext.workingDir, input.filePath);

    // 获取文件大小
    const stats = await fs.stat(fullPath);
    const maxSize = input.maxSize || 100 * 1024; // 默认 100KB

    // 如果文件过大，只读取前 N 行
    if (stats.size > maxSize) {
      const content = await readFileHead(fullPath, input.maxLines || 100);
      
      // 检测超长行
      const longLineInfo = detectLongLines(content);
      
      const result = {
        success: true,
        content,
        truncated: true,
        size: stats.size,
        readBytes: content.length,
        hint: `File is large (${formatSize(stats.size)}). Use readFileLines/readFileChunk for more control.`
      };
      
      // 如果检测到超长行，添加警告
      if (longLineInfo.hasLongLine) {
        result.hasLongLine = true;
        result.maxLineLength = longLineInfo.maxLineLength;
        result.lineCount = longLineInfo.lineCount;
        result.warning = `File contains extremely long lines (max: ${longLineInfo.maxLineLength.toLocaleString()} characters). This is likely a minified file. Use readFileChunk instead of line-based tools for better performance.`;
        result.suggestion = `Use: readFileChunk({ filePath: "${input.filePath}", startByte: 0, endByte: 10240 })`;
      }
      
      return JSON.stringify(result);
    }

    // 小文件：读取全部
    const content = await fs.readFile(fullPath, input.encoding || 'utf-8');
    
    // 即使是小文件，也检测超长行
    const longLineInfo = detectLongLines(content);
    
    const result = {
      success: true,
      content,
      size: stats.size
    };
    
    // 如果检测到超长行，添加警告
    if (longLineInfo.hasLongLine) {
      result.hasLongLine = true;
      result.maxLineLength = longLineInfo.maxLineLength;
      result.lineCount = longLineInfo.lineCount;
      result.warning = `File contains extremely long lines (max: ${longLineInfo.maxLineLength.toLocaleString()} characters). This is likely a minified file. Use readFileChunk instead of line-based tools for better performance.`;
      result.suggestion = `Use: readFileChunk({ filePath: "${input.filePath}", startByte: 0, endByte: 10240 })`;
    }
    
    return JSON.stringify(result);
  }
});

/**
 * 读取文件头部（前 N 行）
 */
async function readFileHead(filePath, maxLines) {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const headLines = lines.slice(0, maxLines);
  return headLines.join('\n');
}

/**
 * 读取文件指定行范围工具
 */
export const readFileLinesTool = betaZodTool({
  name: 'readFileLines',
  description: `Read specific line ranges from a file. Perfect for large files.

**Examples:**
- Lines 1-50: {startLine: 1, endLine: 50}
- Last 100 lines: {startLine: -100}
- Lines 100-200: {startLine: 100, endLine: 200}

**⚠️ Note:** For minified files (JS/CSS), use readFileChunk instead (by bytes, not lines).

**Handling long lines:**
- If file contains extremely long lines (>10,000 chars), use \`handleLongLines\` parameter:
  - "warn" (default): Return warning but don't split lines
  - "split": Split long lines at character boundaries (every 1000 chars)
  - "truncate": Truncate long lines to specified length
  - "skip": Skip lines longer than threshold`,
  inputSchema: z.object({
    filePath: z.string().describe('File path'),
    startLine: z.number().describe('Start line (1-based, negative for from end)'),
    endLine: z.number().optional().describe('End line (exclusive)'),
    maxLines: z.number().optional().describe('Max lines to return (default: 100)'),
    handleLongLines: z.enum(['warn', 'split', 'truncate', 'skip']).optional().describe('How to handle lines >10,000 chars (default: "warn")'),
    truncateLength: z.number().optional().describe('Max line length when handleLongLines="truncate" (default: 1000)')
  }),
  run: async (input) => {
    if (!toolExecutorContext) {
      throw new Error('Tool executor context not initialized');
    }

    const fullPath = path.resolve(toolExecutorContext.workingDir, input.filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n');
    const totalLines = lines.length;

    // 计算实际行号（处理负数）
    const startLine = input.startLine < 0
      ? Math.max(0, totalLines + input.startLine)
      : input.startLine - 1; // 转换为 0-based
    const endLine = input.endLine === undefined
      ? totalLines
      : (input.endLine < 0 ? Math.max(0, totalLines + input.endLine) : input.endLine - 1);

    // 验证行号
    if (startLine < 0 || startLine >= totalLines) {
      return JSON.stringify({
        success: false,
        error: `Invalid start line: ${input.startLine}. File has ${totalLines} lines.`
      });
    }

    // 修正 endLine 验证逻辑 - 允许 endLine 超出范围，自动调整到文件末尾
    const adjustedEndLine = Math.min(endLine, totalLines);
    
    if (adjustedEndLine < startLine) {
      return JSON.stringify({
        success: false,
        error: `Invalid line range: ${input.startLine}-${input.endLine}. File has ${totalLines} lines.`
      });
    }

    // 提取指定行（转换为 1-based）
    let selectedLines = lines.slice(startLine, adjustedEndLine);
    const maxLines = input.maxLines || 100;
    
    // 检测整个文件中的超长行
    const longLineInfo = detectLongLines(content);
    const handleLongLines = input.handleLongLines || 'warn';
    const truncateLength = input.truncateLength || 1000;
    
    // 处理超长行
    let longLineHandling = null;
    if (longLineInfo.hasLongLine) {
      longLineHandling = {
        detected: true,
        maxLineLength: longLineInfo.maxLineLength,
        mode: handleLongLines
      };
      
      if (handleLongLines === 'split') {
        // 分割超长行
        const splitLines = [];
        const splitSize = 1000; // 每1000字符分割
        
        for (const line of selectedLines) {
          if (line.length > splitSize) {
            // 分割长行
            for (let i = 0; i < line.length; i += splitSize) {
              splitLines.push(line.substring(i, i + splitSize));
            }
          } else {
            splitLines.push(line);
          }
        }
        
        selectedLines = splitLines;
        longLineHandling.splitCount = splitLines.length - (adjustedEndLine - startLine);
        longLineHandling.splitSize = splitSize;
      } else if (handleLongLines === 'truncate') {
        // 截断超长行
        selectedLines = selectedLines.map(line => {
          if (line.length > truncateLength) {
            return line.substring(0, truncateLength) + '... [truncated]';
          }
          return line;
        });
        longLineHandling.truncateLength = truncateLength;
        longLineHandling.truncatedCount = selectedLines.filter(l => l.includes('... [truncated]')).length;
      } else if (handleLongLines === 'skip') {
        // 跳过超长行
        const originalCount = selectedLines.length;
        selectedLines = selectedLines.filter(line => line.length <= 10000);
        longLineHandling.skippedCount = originalCount - selectedLines.length;
      }
      // 'warn' 模式：保持原样，只添加警告
    }
    
    const finalLines = selectedLines.slice(0, maxLines);
    
    const result = {
      success: true,
      content: finalLines.join('\n'),
      lineNumbers: {
        start: startLine + 1,
        end: Math.min(startLine + maxLines, adjustedEndLine) + 1,
        total: totalLines
      },
      truncated: selectedLines.length > maxLines,
      lineCount: finalLines.length
    };
    
    // 添加超长行处理信息
    if (longLineHandling) {
      result.hasLongLine = true;
      result.maxLineLength = longLineInfo.maxLineLength;
      result.longLineHandling = longLineHandling;
      
      if (handleLongLines === 'warn') {
        result.warning = `File contains extremely long lines (max: ${longLineInfo.maxLineLength.toLocaleString()} characters). This is likely a minified file. Using readFileLines is inefficient. Use readFileChunk instead for better performance.`;
        result.suggestion = `Use: readFileChunk({ filePath: "${input.filePath}", startByte: 0, endByte: 10240 })`;
      } else if (handleLongLines === 'split') {
        result.info = `Long lines split into ${longLineHandling.splitCount} segments (every ${longLineHandling.splitSize} characters)`;
      } else if (handleLongLines === 'truncate') {
        result.info = `${longLineHandling.truncatedCount} lines truncated to ${truncateLength} characters`;
      } else if (handleLongLines === 'skip') {
        result.info = `${longLineHandling.skippedCount} long lines skipped`;
      }
    }
    
    return JSON.stringify(result);
  }
});

/**
 * 读取文件字节范围工具（适用于 minify 文件）
 */
export const readFileChunkTool = betaZodTool({
  name: 'readFileChunk',
  description: `Read file content by byte range. Perfect for minified files (JS/CSS) where line-based reading doesn't work.

**When to use:**
- Minified JavaScript/CSS files (single line, large size)
- Binary files
- Any file where line-based reading is inefficient

**Examples:**
- First 10KB: {startByte: 0, endByte: 10240}
- Byte range 1000-5000: {startByte: 1000, endByte: 5000}
- Last 5KB: {startByte: -5120}`,
  inputSchema: z.object({
    filePath: z.string().describe('File path'),
    startByte: z.number().describe('Start byte position (0-based, negative for from end)'),
    endByte: z.number().optional().describe('End byte position (exclusive, default: end of file)'),
    encoding: z.string().optional().describe('Encoding (default: utf-8)')
  }),
  run: async (input) => {
    if (!toolExecutorContext) {
      throw new Error('Tool executor context not initialized');
    }

    const fullPath = path.resolve(toolExecutorContext.workingDir, input.filePath);
    const stats = await fs.stat(fullPath);
    const fileSize = stats.size;
    const encoding = input.encoding || 'utf-8';

    // 计算实际字节位置（处理负数）
    const startByte = input.startByte < 0
      ? Math.max(0, fileSize + input.startByte)
      : input.startByte;
    const endByte = input.endByte === undefined
      ? fileSize
      : (input.endByte < 0 ? Math.max(0, fileSize + input.endByte) : input.endByte);

    // 验证字节位置
    if (startByte < 0 || startByte >= fileSize) {
      return JSON.stringify({
        success: false,
        error: `Invalid startByte: ${input.startByte}. File size is ${fileSize} bytes.`
      });
    }

    if (endByte < startByte || endByte > fileSize) {
      return JSON.stringify({
        success: false,
        error: `Invalid endByte: ${input.endByte}. Must be between ${startByte} and ${fileSize}.`
      });
    }

    // 读取文件
    const buffer = await fs.readFile(fullPath);
    const chunk = buffer.slice(startByte, endByte);
    const content = chunk.toString(encoding);

    return JSON.stringify({
      success: true,
      content: content,
      byteRange: {
        start: startByte,
        end: endByte,
        size: endByte - startByte,
        total: fileSize
      },
      truncated: endByte < fileSize,
      encoding: encoding
    });
  }
});

/**
 * 写入文件工具
 */
export const writeFileTool = betaZodTool({
  name: 'writeFile',
  description: `Write content to a file (creates or overwrites). Supports plain text and base64-encoded content.

**✅ After writing - DO NOT verify by reading:**
- This tool returns explicit success/failure information
- Assume success if tool returns success
- DO NOT call readFile to verify - this wastes tokens
- Only read back if tool returns error or user explicitly requests

Returns detailed error messages if the operation fails, allowing you to analyze and fix the issue.`,
  inputSchema: z.object({
    filePath: z.string().describe('Absolute or relative path to the file'),
    content: z.string().optional().describe('Content to write to the file (plain text)'),
    contentBase64: z.string().optional().describe('Content to write to the file (base64 encoded, use this for binary data or special characters)'),
    encoding: z.string().optional().describe('File encoding (default: utf-8)')
  }),
  run: async (input) => {
    if (!toolExecutorContext) {
      throw new Error('Tool executor context not initialized');
    }

    const fullPath = path.resolve(toolExecutorContext.workingDir, input.filePath);

    // 优先使用 contentBase64，否则使用 content
    let dataToWrite;
    if (input.contentBase64) {
      dataToWrite = Buffer.from(input.contentBase64, 'base64');
    } else if (input.content !== undefined) {
      dataToWrite = input.content;
    } else {
      return JSON.stringify({
        success: false,
        error: 'Either content or contentBase64 must be provided'
      });
    }

    try {
      await fs.writeFile(fullPath, dataToWrite, input.encoding || 'utf-8');

      return JSON.stringify({
        success: true,
        path: fullPath,
        size: dataToWrite.length,
        encoding: input.contentBase64 ? 'base64' : (input.encoding || 'utf-8')
      });
    } catch (error) {
      // 提供详细的错误信息和修复建议
      let errorDetail = {
        success: false,
        error: error.code,
        message: error.message,
        path: fullPath
      };

      // 针对常见错误提供修复建议
      if (error.code === 'ENOENT') {
        const parentDir = path.dirname(fullPath);
        errorDetail.suggestion = `Parent directory does not exist. Create it first using: bash tool with "mkdir -p ${parentDir}"`;
        errorDetail.hint = 'The parent directory needs to be created before writing the file.';
      } else if (error.code === 'EACCES') {
        errorDetail.suggestion = 'Permission denied. Check if you have write permissions for this location.';
        errorDetail.hint = 'Try writing to a different location or check file permissions.';
      } else if (error.code === 'ENOSPC') {
        errorDetail.suggestion = 'No space left on device. Free up some disk space and retry.';
      }

      return JSON.stringify(errorDetail);
    }
  }
});

/**
 * 编辑文件工具（替换文本）
 */
export const editFileTool = betaZodTool({
  name: 'editFile',
  description: `Edit a file by replacing exact string matches.

**✅ Recommended for simple replacements (prioritize this over regionConstrainedEdit)**

**When to use:**
- Simple text replacements throughout a file
- Replacing variable names, function names, etc.
- Quick edits where exact text is known

**Examples:**
\\\`\\\`\\\`javascript
// ✅ Simple replacement
editFile({
  filePath: "app.js",
  oldText: "console.log('Hello');",
  newText: "console.log('Updated');"
})
\\\`\\\`\\\`

**✅ After editing - DO NOT verify by reading:**
- This tool returns explicit success/failure information
- Assume success if tool returns success
- DO NOT call readFile to verify - this wastes tokens

**Use this instead of bash \`sed\` command.**`,
  inputSchema: z.object({
    filePath: z.string().describe('Path to the file to edit'),
    oldText: z.string().describe('Exact text to replace (must be unique in the file)'),
    newText: z.string().describe('New text to replace with'),
    replaceAll: z.boolean().optional().describe('Replace all occurrences (default: false)')
  }),
  run: async (input) => {
    if (!toolExecutorContext) {
      throw new Error('Tool executor context not initialized');
    }

    const fullPath = path.resolve(toolExecutorContext.workingDir, input.filePath);
    let content = await fs.readFile(fullPath, 'utf-8');

    if (input.replaceAll) {
      content = content.split(input.oldText).join(input.newText);
    } else {
      if (!content.includes(input.oldText)) {
        return JSON.stringify({
          success: false,
          error: 'Old text not found in file'
        });
      }
      content = content.replace(input.oldText, input.newText);
    }

    await fs.writeFile(fullPath, content, 'utf-8');

    return JSON.stringify({
      success: true,
      path: fullPath,
      replacements: 1
    });
  }
});

/**
 * 区域约束编辑工具（精确替换）
 */
export const regionConstrainedEditTool = betaZodTool({
  name: 'regionConstrainedEdit',
  description: `Edit a file within a specific line range. Perfect for precise edits.

**Use cases:**
- Replace text in a specific function
- Modify configuration sections
- Edit code blocks without affecting other parts

**Line numbers:** 1-based, negative numbers count from end (-1 = last line)

**⚠️ CRITICAL - Exact match required:**
- The \`oldText\` parameter must match the file content EXACTLY (including whitespace, indentation)
- If you get "Text not found in region" error:
  1. Check for trailing/leading whitespace differences
  2. Check for tabs vs spaces
  3. Consider using \`isRegex: true\` for more flexible matching
  4. Use \`editFile\` tool instead for simple replacements

**Examples:**
- Lines 10-20: {begin: 10, end: 20}
- Last 10 lines: {begin: -10}
- With regex: {isRegex: true}

**✅ After editing - DO NOT verify by reading:**
- This tool returns explicit success/failure information
- Assume success if tool returns success
- DO NOT call readFile to verify - this wastes tokens`,
  inputSchema: z.object({
    filePath: z.string().describe('File path'),
    begin: z.number().describe('Start line (1-based, negative for from end)'),
    end: z.number().optional().describe('End line (exclusive, default: end of file)'),
    oldText: z.string().describe('Text to find - MUST match exactly including whitespace'),
    newText: z.string().describe('Replacement text'),
    isRegex: z.boolean().optional().describe('Treat oldText as regex pattern (more flexible)'),
    replaceAll: z.boolean().optional().describe('Replace all occurrences in region')
  }),
  run: async (input) => {
    if (!toolExecutorContext) {
      throw new Error('Tool executor context not initialized');
    }

    const fullPath = path.resolve(toolExecutorContext.workingDir, input.filePath);
    const content = await fs.readFile(fullPath, 'utf-8');

    // 分割为行数组
    const lines = content.split('\n');
    const totalLines = lines.length;

    // 计算实际行号（处理负数）
    const startLine = input.begin < 0
      ? totalLines + input.begin + 1
      : input.begin;
    const endLine = input.end === undefined
      ? totalLines
      : (input.end < 0 ? totalLines + input.end + 1 : input.end);

    // 验证行号
    if (startLine < 1 || startLine > totalLines) {
      return JSON.stringify({
        success: false,
        error: `Invalid start line: ${startLine}. File has ${totalLines} lines.`
      });
    }

    if (endLine < startLine || endLine > totalLines) {
      return JSON.stringify({
        success: false,
        error: `Invalid end line: ${endLine}. Must be between ${startLine} and ${totalLines}.`
      });
    }

    // 提取区域内容（转换为 0-based）
    const beforeRegion = lines.slice(0, startLine - 1).join('\n');
    const regionLines = lines.slice(startLine - 1, endLine - 1);
    const afterRegion = lines.slice(endLine - 1).join('\n');
    let regionContent = regionLines.join('\n');

    // 保存替换前内容（用于预览）
    const beforePreview = regionContent.substring(0, 200);

    // 在区域内执行替换
    let replacements = 0;
    if (input.isRegex) {
      const flags = input.replaceAll ? 'g' : '';
      try {
        const regex = new RegExp(input.oldText, flags);
        const matches = regionContent.match(regex);
        replacements = matches ? matches.length : 0;
        regionContent = regionContent.replace(regex, input.newText);
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: `Invalid regex: ${error.message}`
        });
      }
    } else {
      if (input.replaceAll) {
        const parts = regionContent.split(input.oldText);
        replacements = parts.length - 1;
        regionContent = parts.join(input.newText);
      } else {
        if (!regionContent.includes(input.oldText)) {
          // 尝试提供更详细的错误信息
          const errorDetail = {
            success: false,
            error: 'Text not found in region',
            region: { begin: startLine, end: endLine },
            hint: 'Check if the text exists in the specified line range.'
          };
          
          // 尝试找到相似的文本
          const oldTextTrimmed = input.oldText.trim();
          const oldTextLower = oldTextTrimmed.toLowerCase();
          const regionLines = regionContent.split('\n');
          let similarTexts = [];
          
          // 寻找包含 trimmed 文本的行
          for (let i = 0; i < regionLines.length; i++) {
            const line = regionLines[i];
            const lineTrimmed = line.trim();
            const lineLower = line.toLowerCase();
            
            // 检查是否包含 trimmed 版本的文本
            if (lineLower.includes(oldTextLower) || oldTextLower.includes(lineTrimmed.toLowerCase())) {
              // 检查空格差异
              const hasLeadingSpaceDiff = line.startsWith(' ') !== input.oldText.startsWith(' ');
              const hasTrailingSpaceDiff = line.endsWith(' ') !== input.oldText.endsWith(' ');
              const hasTabDiff = line.includes('\t') || input.oldText.includes('\t');
              
              similarTexts.push({
                line: startLine + i,
                content: line.substring(0, 100) + (line.length > 100 ? '...' : ''),
                differences: {
                  leadingSpace: hasLeadingSpaceDiff,
                  trailingSpace: hasTrailingSpaceDiff,
                  tabs: hasTabDiff
                }
              });
            }
          }
          
          if (similarTexts.length > 0) {
            errorDetail.similarTexts = similarTexts;
            errorDetail.suggestion = 'Found similar text(s) in the region. Check for whitespace differences (spaces vs tabs, trailing spaces).';
          }
          
          // 显示预期文本的前50个字符
          errorDetail.expectedText = input.oldText.substring(0, 50) + (input.oldText.length > 50 ? '...' : '');
          errorDetail.expectedLength = input.oldText.length;
          
          // 显示区域内容的前200个字符
          errorDetail.regionPreview = regionContent.substring(0, 200) + (regionContent.length > 200 ? '...' : '');
          errorDetail.regionLength = regionContent.length;
          
          errorDetail.troubleshooting = [
            '1. Check for trailing/leading whitespace differences',
            '2. Check for tabs vs spaces',
            '3. Consider using isRegex: true for more flexible matching',
            '4. Use editFile tool instead for simple replacements',
            '5. Read the file first to see the exact content'
          ];
          
          return JSON.stringify(errorDetail);
        }
        replacements = 1;
        regionContent = regionContent.replace(input.oldText, input.newText);
      }
    }

    // 重组文件内容（修复：过滤空字符串，避免额外的换行符）
    const parts = [beforeRegion, regionContent, afterRegion].filter(part => part !== '');
    const newContent = parts.join('\n');

    // 写入文件
    await fs.writeFile(fullPath, newContent, 'utf-8');

    // 生成预览（替换后）
    const afterPreview = regionContent.substring(0, 200);

    return JSON.stringify({
      success: true,
      filePath: fullPath,
      region: {
        begin: startLine,
        end: endLine,
        lines: endLine - startLine + 1
      },
      replacements,
      preview: {
        before: beforePreview + (beforePreview.length >= 200 ? '...' : ''),
        after: afterPreview + (afterPreview.length >= 200 ? '...' : '')
      }
    });
  }
});

/**
 * 读取文件末尾工具（用于日志文件）
 */
export const readFileTailTool = betaZodTool({
  name: 'readFileTail',
  description: `Read from the END of a file. Perfect for log files.

**Examples:**
- Last 50 lines: {lines: 50}
- Last 10KB: {bytes: 10240}

Use this instead of bash \`tail\` command.`,
  inputSchema: z.object({
    filePath: z.string().describe('File path (usually a log file)'),
    lines: z.number().optional().describe('Number of lines from end (default: 50)'),
    bytes: z.number().optional().describe('Number of bytes from end')
  }),
  run: async (input) => {
    if (!toolExecutorContext) {
      throw new Error('Tool executor context not initialized');
    }

    const fullPath = path.resolve(toolExecutorContext.workingDir, input.filePath);
    const content = await fs.readFile(fullPath, 'utf-8');

    let result;

    if (input.lines) {
      // 按行数读取
      const lines = content.split('\n');
      const tailLines = lines.slice(-input.lines);
      result = {
        text: tailLines.join('\n'),
        lines: tailLines.length,
        fromEnd: true
      };
    } else if (input.bytes) {
      // 按字节数读取
      const tailBytes = content.slice(-input.bytes);
      result = {
        text: tailBytes,
        bytes: tailBytes.length,
        fromEnd: true
      };
    } else {
      // 默认读取最后 50 行
      const lines = content.split('\n');
      const tailLines = lines.slice(-50);
      result = {
        text: tailLines.join('\n'),
        lines: tailLines.length,
        fromEnd: true
      };
    }

    return JSON.stringify({
      success: true,
      content: result.text,
      ...result
    });
  }
});

/**
 * 搜索文件工具
 */
export const searchFilesTool = betaZodTool({
  name: 'searchFiles',
  description: `Search for files by name pattern using glob.

**Fast file pattern matching** that works with any codebase size.

**Examples:**
- All JS files: "**/*.js"
- TypeScript in src: "src/**/*.ts"
- Test files: "**/*.test.js"
- Multiple extensions: "**/*.{js,jsx,ts,tsx}"
- Nested pattern: "src/**/*.test.js"

**Use this instead of bash \`find\` command.**`,
  inputSchema: z.object({
    pattern: z.string().describe('Glob pattern (e.g., "**/*.js", "src/**/*.ts")'),
    cwd: z.string().optional().describe('Working directory (default: current directory)')
  }),
  run: async (input) => {
    if (!toolExecutorContext) {
      throw new Error('Tool executor context not initialized');
    }

    const searchDir = input.cwd
      ? path.resolve(toolExecutorContext.workingDir, input.cwd)
      : toolExecutorContext.workingDir;

    const files = await glob(input.pattern, { cwd: searchDir });

    return JSON.stringify({
      success: true,
      files,
      count: files.length
    });
  }
});

/**
 * 搜索代码内容工具
 */
export const searchCodeTool = betaZodTool({
  name: 'searchCode',
  description: `Search for text/patterns in file contents.

**Fast content search** that works with any codebase size. Supports full regex syntax.

**Examples:**
- Search for function: "function myFunc"
- Search for imports: "import.*from"
- Search with file type: "TODO" with fileType: "js"
- Case insensitive: "(?i)error"
- Word boundaries: "\\bconst\\s+\\w+"

**Use this instead of bash \`grep\` command.**`,
  inputSchema: z.object({
    pattern: z.string().describe('Regex pattern to search for'),
    path: z.string().optional().describe('Directory to search in (default: current directory)'),
    fileType: z.string().optional().describe('Filter by file type (e.g., "js", "py")')
  }),
  run: async (input) => {
    if (!toolExecutorContext) {
      throw new Error('Tool executor context not initialized');
    }

    const { searchCode } = await import('./search.js');
    const results = await searchCode(input.pattern, {
      path: input.path
        ? path.resolve(toolExecutorContext.workingDir, input.path)
        : toolExecutorContext.workingDir,
      type: input.fileType
    });

    return JSON.stringify({
      success: true,
      ...results
    });
  }
});

/**
 * 列出目录工具
 */
export const listFilesTool = betaZodTool({
  name: 'listFiles',
  description: `List files and directories in a path.

**Returns structured JSON output** (easier to parse than bash \`ls\`).

**Examples:**
- Current directory: {}
- Subdirectory: {dirPath: "src"}
- Recursively: {dirPath: "src", recursive: true}
- Show hidden: {showHidden: true}

**Use this instead of bash \`ls\` command for structured output.**`,
  inputSchema: z.object({
    dirPath: z.string().optional().describe('Directory path (default: current directory)'),
    recursive: z.boolean().optional().describe('List recursively (default: false)'),
    showHidden: z.boolean().optional().describe('Show hidden files (default: false)')
  }),
  run: async (input) => {
    if (!toolExecutorContext) {
      throw new Error('Tool executor context not initialized');
    }

    const fullPath = input.dirPath
      ? path.resolve(toolExecutorContext.workingDir, input.dirPath)
      : toolExecutorContext.workingDir;

    const files = await fs.readdir(fullPath, { withFileTypes: true });

    const result = [];
    for (const file of files) {
      if (!input.showHidden && file.name.startsWith('.')) continue;
      result.push({
        name: file.name,
        type: file.isDirectory() ? 'directory' : 'file',
        path: path.join(fullPath, file.name)
      });
    }

    return JSON.stringify({
      success: true,
      files: result,
      path: fullPath
    });
  }
});

/**
 * Bash Result 工具 - 从缓存的 bash 结果中获取更多内容
 */
export const bashResultTool = betaZodTool({
  name: 'bashResult',
  description: `Retrieve more content from a truncated bash command result WITHOUT re-executing the command.

**⚡ When to use:**
- Bash command returned \`result_id\` (output was >100 lines)
- Need to see more of the output or search/filter it

**❌ DO NOT:** Re-run bash with pipes (e.g., bash "| head -50", bash "| grep error")
**✅ DO:** Use bashResult with the result_id (much faster, saves tokens)

**Actions:** head, tail, lineRange, grep, full

**Examples:**
\`\`\`javascript
bashResult({ result_id: "res_123", action: "tail", lines: 100 })
bashResult({ result_id: "res_123", action: "lineRange", startLine: 100, endLine: 200 })
bashResult({ result_id: "res_123", action: "grep", pattern: "ERROR" })
bashResult({ result_id: "res_123", action: "full" })
\`\`\`

**Note:** result_id expires after 10 minutes.`,
  inputSchema: z.object({
    result_id: z.string().describe('The result_id from previous bash command (e.g., "res_1234567890_abc123")'),
    action: z.enum(['head', 'tail', 'lineRange', 'grep', 'full']).describe('Action to perform on the cached result'),
    lines: z.number().optional().describe('Number of lines to return (for head/tail, default: 100)'),
    startLine: z.number().optional().describe('Start line number (1-based, for lineRange action)'),
    endLine: z.number().optional().describe('End line number (exclusive, for lineRange action)'),
    pattern: z.string().optional().describe('Pattern to search for (required for grep action)')
  }),
  run: async (input) => {
    // 从缓存获取结果
    const cached = bashResultCache.get(input.result_id);
    
    if (!cached) {
      // 改进的错误提示
      return JSON.stringify({
        success: false,
        error: `result_id "${input.result_id}" not found or expired`,
        expired: true,
        hint: 'result_id expires after 10 minutes',
        suggestion: 'Re-execute the bash command to get a new result_id',
        explanation: 'The result you are looking for is no longer available in the cache. This can happen when: (1) More than 10 minutes have passed since the command was executed, or (2) The cache has been evicted due to size limits. Please run the command again to get fresh results.'
      });
    }

    const result = cached.result;
    const totalLines = result.stdout.split('\n').length;

    // 根据动作处理
    switch (input.action) {
      case 'head':
        const headLines = input.lines || 100;
        const headOutput = result.stdout.split('\n').slice(0, headLines).join('\n');
        return JSON.stringify({
          success: true,
          stdout: headOutput,
          action: 'head',
          lines: headLines,
          totalLines: totalLines,
          truncated: headLines < totalLines
        });

      case 'tail':
        const tailLines = input.lines || 100;
        const tailOutput = result.stdout.split('\n').slice(-tailLines).join('\n');
        return JSON.stringify({
          success: true,
          stdout: tailOutput,
          action: 'tail',
          lines: tailLines,
          totalLines: totalLines,
          truncated: tailLines < totalLines
        });

      case 'lineRange':
        // 新增：lineRange 模式
        if (!input.startLine || !input.endLine) {
          return JSON.stringify({
            success: false,
            error: 'startLine and endLine are required for lineRange action'
          });
        }
        
        // 转换为 0-based 索引
        const startIndex = input.startLine - 1;
        const endIndex = input.endLine - 1;
        
        // 验证行号
        if (startIndex < 0 || startIndex >= totalLines) {
          return JSON.stringify({
            success: false,
            error: `Invalid startLine: ${input.startLine}. Valid range: 1-${totalLines}`
          });
        }
        
        if (endIndex < startIndex || endIndex > totalLines) {
          return JSON.stringify({
            success: false,
            error: `Invalid endLine: ${input.endLine}. Valid range: ${input.startLine}-${totalLines}`
          });
        }
        
        const rangeOutput = result.stdout.split('\n').slice(startIndex, endIndex).join('\n');
        return JSON.stringify({
          success: true,
          stdout: rangeOutput,
          action: 'lineRange',
          startLine: input.startLine,
          endLine: input.endLine,
          lineCount: endIndex - startIndex,
          totalLines: totalLines,
          truncated: false
        });

      case 'grep':
        if (!input.pattern) {
          return JSON.stringify({
            success: false,
            error: 'pattern parameter is required for grep action'
          });
        }
        
        try {
          const regex = new RegExp(input.pattern);
          const filtered = result.stdout.split('\n')
            .filter(line => regex.test(line))
            .join('\n');
          const matchCount = filtered.split('\n').filter(l => l).length;
          
          return JSON.stringify({
            success: true,
            stdout: filtered,
            action: 'grep',
            pattern: input.pattern,
            matchCount: matchCount
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: `Invalid regex pattern: ${error.message}`
          });
        }

      case 'full':
        return JSON.stringify({
          success: true,
          stdout: result.stdout,
          stderr: result.stderr,
          action: 'full',
          exitCode: result.exitCode,
          command: result.command
        });

      default:
        return JSON.stringify({
          success: false,
          error: `Unknown action: ${input.action}. Valid actions: head, tail, lineRange, grep, full`
        });
    }
  }
});

/**
 * 所有工具的导出映射
 */
const TOOLS_MAP = {
  bash: bashTool,
  bashResult: bashResultTool,
  readFile: readFileTool,
  readFileLines: readFileLinesTool,
  readFileChunk: readFileChunkTool,
  readFileTail: readFileTailTool,
  writeFile: writeFileTool,
  editFile: editFileTool,
  regionConstrainedEdit: regionConstrainedEditTool,
  searchFiles: searchFilesTool,
  searchCode: searchCodeTool,
  listFiles: listFilesTool
};

// 动态技能工具（运行时添加）
let skillTools = [];

/**
 * 设置技能工具
 * @param {Array} tools - 技能工具数组
 */
export function setSkillTools(tools) {
  skillTools = tools;
}

/**
 * 获取启用工具的数组（用于 toolRunner）
 * @param {Array<string>} enabledTools - 启用的工具名称数组
 * @returns {Array} betaZodTool 对象数组
 */
export function getToolDefinitions(enabledTools) {
  const tools = enabledTools
    .map(toolName => TOOLS_MAP[toolName])
    .filter(tool => tool !== undefined);

  // 添加技能工具（如果启用）
  if (enabledTools.includes('skillDiscover') && enabledTools.includes('skillLoad')) {
    tools.push(...skillTools);
  }

  return tools;
}

/**
 * 获取所有工具（包括内置工具和 MCP 工具）
 * @param {Array<string>} enabledTools - 启用的工具名称数组
 * @param {boolean} includeMCP - 是否包含 MCP 工具
 * @returns {Promise<Array>} betaZodTool 对象数组
 */
export async function getAllToolDefinitions(enabledTools, includeMCP = true) {
  const tools = [];

  // 添加内置工具
  const builtinTools = getToolDefinitions(enabledTools);
  tools.push(...builtinTools);

  // 添加 MCP 工具
  if (includeMCP) {
    try {
      const { getAllMCPToolsAsBetaZod } = await import('./mcp/tools-adapter.js');
      const mcpTools = await getAllMCPToolsAsBetaZod();
      tools.push(...mcpTools);
    } catch (error) {
      console.warn('Failed to load MCP tools:', error.message);
    }
  }

  return tools;
}

/**
 * 获取工具的 JSON Schema 定义（用于兼容性）
 * @param {Array<string>} enabledTools - 启用的工具名称数组
 * @returns {Array} JSON Schema 格式的工具定义
 */
export function getToolSchemaDefinitions(enabledTools) {
  return enabledTools
    .filter(toolName => TOOLS_MAP[toolName] !== undefined)
    .map(toolName => {
      const tool = TOOLS_MAP[toolName];
      return {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.input_schema
      };
    });
}

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * 生成工具执行的详细信息（双行显示）
 * @param {string} toolName - 工具名称
 * @param {Object} input - 工具输入参数
 * @param {Object} result - 工具执行结果
 * @returns {Object} {summary: string, detailInfo: string}
 */
export function generateToolSummary(toolName, input, result) {
  const success = result?.success;
  let summary, detailInfo;

  switch (toolName) {
    case 'bash':
      const cmd = input.command || '';
      const parts = cmd.trim().split(/\s+/);
      const command = parts[0] || 'bash';

      summary = success ? `✓ ${command}` : `✗ ${command}`;

      // 详细信息：完整命令（最多60字符）
      detailInfo = cmd.length > 60
        ? cmd.substring(0, 57) + '...'
        : cmd;

      // 添加退出码
      if (result.exitCode !== undefined) {
        detailInfo += ` [exit: ${result.exitCode}]`;
      }

      // 添加错误信息
      if (!success && result.error) {
        detailInfo += ` - ${result.error}`;
      }

      return { summary, detailInfo };

    case 'readFile':
    case 'readFileLines':
    case 'readFileTail':
    case 'readFileChunk':
      const filePath = input.filePath || '';
      const fileName = filePath.split('/').pop();
      summary = success ? `📖 ${fileName}` : `✗ ${fileName}`;

      // 详细信息：完整路径
      detailInfo = filePath;

      // 添加大小信息
      if (result.size) {
        detailInfo += ` (${formatSize(result.size)})`;
      }

      // 添加字节范围信息（readFileChunk 专用）
      if (result.byteRange) {
        detailInfo += ` [bytes ${result.byteRange.start}-${result.byteRange.end}]`;
      }

      // 添加截断信息
      if (result.truncated) {
        detailInfo += ` [truncated]`;
      }

      // 添加行信息
      if (result.lineCount) {
        detailInfo += ` [${result.lineCount} lines]`;
      }

      return { summary, detailInfo };

    case 'writeFile':
      const writePath = input.filePath || '';
      const writeFileName = writePath.split('/').pop();
      summary = success ? `✍️ ${writeFileName}` : `✗ ${writeFileName}`;

      // 详细信息：完整路径 + 写入大小
      detailInfo = writePath;
      if (result.size) {
        detailInfo += ` (${formatSize(result.size)} written)`;
      }

      return { summary, detailInfo };

    case 'editFile':
      const editPath = input.filePath || '';
      const editFileName = editPath.split('/').pop();
      summary = success ? `✏️ ${editFileName}` : `✗ ${editFileName}`;

      // 详细信息：完整路径 + 修改次数
      detailInfo = editPath;
      if (result.replacements !== undefined) {
        detailInfo += ` [${result.replacements} replacement${result.replacements > 1 ? 's' : ''}]`;
      }

      return { summary, detailInfo };

    case 'regionConstrainedEdit':
      const regionEditPath = input.filePath || '';
      const regionEditFileName = regionEditPath.split('/').pop();
      summary = success ? `✏️ ${regionEditFileName}` : `✗ ${regionEditFileName}`;

      // 详细信息：完整路径 + 修改次数 + 区域信息
      detailInfo = regionEditPath;
      if (result.replacements !== undefined) {
        detailInfo += ` [${result.replacements} replacement${result.replacements > 1 ? 's' : ''}]`;
      }

      // 区域信息（只有 regionConstrainedEdit 才有）
      if (result.region) {
        detailInfo += ` [lines ${result.region.begin}-${result.region.end}]`;
      }

      return { summary, detailInfo };

    case 'searchFiles':
      const pattern = input.pattern || '';
      const shortPattern = pattern.substring(0, 30);
      summary = success ? `🔍 ${shortPattern}` : `✗ search`;

      detailInfo = pattern;
      if (result.count !== undefined) {
        detailInfo += ` [${result.count} files]`;
      }

      return { summary, detailInfo };

    case 'searchCode':
      const query = input.pattern || '';
      const shortQuery = query.substring(0, 30);
      summary = success ? `🔎 ${shortQuery}` : `✗ search`;

      detailInfo = `Pattern: ${query}`;
      if (result.matchCount !== undefined) {
        detailInfo += ` [${result.matchCount} matches]`;
      }

      return { summary, detailInfo };

    case 'listFiles':
      const dirPath = input.dirPath || '.';
      const dirName = dirPath.split('/').pop() || '.';
      summary = success ? `📁 ${dirName}` : `✗ ${dirName}`;

      detailInfo = dirPath;
      if (result.files) {
        detailInfo += ` [${result.files.length} items]`;
      }

      return { summary, detailInfo };

    case 'bashResult':
      const action = input.action || 'unknown';
      summary = success ? `✓ bashResult:${action}` : `✗ bashResult:${action}`;
      
      // 详细信息：result_id + action
      detailInfo = `result_id: ${input.result_id.substring(0, 20)}...`;
      detailInfo += ` [${action}]`;
      
      // 添加行数信息
      if (result.totalLines) {
        detailInfo += ` [${result.totalLines} total]`;
      }
      
      // 添加行数或匹配数
      if (result.lines) {
        detailInfo += ` [${result.lines} lines]`;
      } else if (result.lineCount) {
        detailInfo += ` [${result.lineCount} lines]`;
      } else if (result.matchCount !== undefined) {
        detailInfo += ` [${result.matchCount} matches]`;
      }
      
      return { summary, detailInfo };

    default:
      summary = success ? `✓ ${toolName}` : `✗ ${toolName}`;
      detailInfo = JSON.stringify(input).substring(0, 60);
      return { summary, detailInfo };
  }
}
