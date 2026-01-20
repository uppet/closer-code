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
 * Bash 工具 - 执行 bash 命令
 */
export const bashTool = betaZodTool({
  name: 'bash',
  description: 'Execute a bash shell command. Use this IMMEDIATELY when user asks to: list/show directory contents (ls, dir), run commands, execute tests, check file info, run git commands, or ANY terminal operation. DO NOT just say "I will check" - CALL THIS TOOL.',
  inputSchema: z.object({
    command: z.string().describe('The bash command to execute (e.g., "ls -la", "cat file.txt", "npm test", "git status")'),
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
 * 读取文件工具（智能分段）
 */
export const readFileTool = betaZodTool({
  name: 'readFile',
  description: `Read file contents with smart chunking for large files.

Best practices:
- For small files (< 10KB): reads entire file
- For medium files (10-100KB): reads first 100 lines
- For large files (> 100KB): use readFileLines or readFileChunk
- For log files: use readFileTail to read from end`,
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

    if (endLine < startLine || endLine > totalLines) {
      return JSON.stringify({
        success: false,
        error: `Invalid end line: ${input.endLine}. Must be between ${startLine + 1} and ${totalLines}.`
      });
    }

    // 提取指定行（转换为 1-based）
    const selectedLines = lines.slice(startLine, endLine);
    const maxLines = input.maxLines || 100;
    const finalLines = selectedLines.slice(0, maxLines);

    return JSON.stringify({
      success: true,
      content: finalLines.join('\n'),
      lineNumbers: {
        start: startLine + 1,
        end: Math.min(startLine + maxLines, endLine) + 1,
        total: totalLines
      },
      truncated: selectedLines.length > maxLines,
      lineCount: finalLines.length
    });
  }
});

/**
 * 写入文件工具
 */
export const writeFileTool = betaZodTool({
  name: 'writeFile',
  description: 'Write content to a file (creates or overwrites). Supports both plain text content and base64-encoded content. Returns detailed error messages if the operation fails, allowing you to analyze and fix the issue.',
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
  description: 'Edit a file by replacing exact string matches',
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

Use cases:
- Replace text in a specific function
- Modify configuration sections
- Edit code blocks without affecting other parts

Line numbers are 1-based. Negative numbers count from the end (-1 = last line).

Examples:
- Lines 10-20: {begin: 10, end: 20}
- Last 10 lines: {begin: -10}
- With regex: {isRegex: true}`,
  inputSchema: z.object({
    filePath: z.string().describe('File path'),
    begin: z.number().describe('Start line (1-based, negative for from end)'),
    end: z.number().optional().describe('End line (exclusive, default: end of file)'),
    oldText: z.string().describe('Text to find (or regex pattern)'),
    newText: z.string().describe('Replacement text'),
    isRegex: z.boolean().optional().describe('Treat oldText as regex pattern'),
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
          return JSON.stringify({
            success: false,
            error: 'Text not found in region',
            region: { begin: startLine, end: endLine },
            hint: 'Check if the text exists in the specified line range.'
          });
        }
        replacements = 1;
        regionContent = regionContent.replace(input.oldText, input.newText);
      }
    }

    // 重组文件内容
    const newContent = [beforeRegion, regionContent, afterRegion].join('\n');

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

Examples:
- Last 50 lines: {lines: 50}
- Last 10KB: {bytes: 10240}`,
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
  description: 'Search for files by name pattern using glob',
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
  description: 'Search for text/patterns in file contents',
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
  description: 'List files and directories in a path',
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
 * 所有工具的导出映射
 */
const TOOLS_MAP = {
  bash: bashTool,
  readFile: readFileTool,
  readFileLines: readFileLinesTool,
  readFileTail: readFileTailTool,
  writeFile: writeFileTool,
  editFile: editFileTool,
  regionConstrainedEdit: regionConstrainedEditTool,
  searchFiles: searchFilesTool,
  searchCode: searchCodeTool,
  listFiles: listFilesTool
};

/**
 * 获取启用工具的数组（用于 toolRunner）
 * @param {Array<string>} enabledTools - 启用的工具名称数组
 * @returns {Array} betaZodTool 对象数组
 */
export function getToolDefinitions(enabledTools) {
  return enabledTools
    .map(toolName => TOOLS_MAP[toolName])
    .filter(tool => tool !== undefined);
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
      const filePath = input.filePath || '';
      const fileName = filePath.split('/').pop();
      summary = success ? `📖 ${fileName}` : `✗ ${fileName}`;

      // 详细信息：完整路径
      detailInfo = filePath;

      // 添加大小信息
      if (result.size) {
        detailInfo += ` (${formatSize(result.size)})`;
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

    default:
      summary = success ? `✓ ${toolName}` : `✗ ${toolName}`;
      detailInfo = JSON.stringify(input).substring(0, 60);
      return { summary, detailInfo };
  }
}
