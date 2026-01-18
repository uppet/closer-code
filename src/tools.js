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
 * 读取文件工具
 */
export const readFileTool = betaZodTool({
  name: 'readFile',
  description: 'Read the contents of a file',
  inputSchema: z.object({
    filePath: z.string().describe('Absolute or relative path to the file'),
    encoding: z.string().optional().describe('File encoding (default: utf-8)')
  }),
  run: async (input) => {
    if (!toolExecutorContext) {
      throw new Error('Tool executor context not initialized');
    }

    const fullPath = path.resolve(toolExecutorContext.workingDir, input.filePath);
    const content = await fs.readFile(fullPath, input.encoding || 'utf-8');

    return JSON.stringify({
      success: true,
      content,
      path: fullPath
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
  writeFile: writeFileTool,
  editFile: editFileTool,
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
 * 生成工具执行的简短摘要
 * @param {string} toolName - 工具名称
 * @param {Object} input - 工具输入参数
 * @param {Object} result - 工具执行结果
 * @returns {string} 简短摘要
 */
export function generateToolSummary(toolName, input, result) {
  const success = result?.success;

  switch (toolName) {
    case 'bash':
      const cmd = input.command || '';
      // 提取命令和第一个参数
      const parts = cmd.trim().split(/\s+/);
      const command = parts[0] || 'bash';
      const arg1 = parts[1] ? parts[1].substring(0, 20) : '';
      return success ? `✓ ${command} ${arg1}` : `✗ ${command}`;

    case 'readFile':
      const filePath = input.filePath || '';
      const fileName = filePath.split('/').pop().substring(0, 20);
      return success ? `📖 ${fileName}` : `✗ ${fileName}`;

    case 'writeFile':
      const writePath = input.filePath || '';
      const writeFileName = writePath.split('/').pop().substring(0, 20);
      return success ? `✍️ ${writeFileName}` : `✗ ${writeFileName}`;

    case 'editFile':
      const editPath = input.filePath || '';
      const editFileName = editPath.split('/').pop().substring(0, 20);
      return success ? `✏️ ${editFileName}` : `✗ ${editFileName}`;

    case 'searchFiles':
      const pattern = input.pattern || '';
      const shortPattern = pattern.substring(0, 15);
      return success ? `🔍 ${shortPattern}` : `✗ search`;

    case 'searchCode':
      const query = input.query || '';
      const shortQuery = query.substring(0, 15);
      return success ? `🔎 ${shortQuery}` : `✗ search`;

    case 'listFiles':
      const dirPath = input.path || '.';
      const dirName = dirPath.split('/').pop() || '.';
      return success ? `📁 ${dirName}` : `✗ ${dirName}`;

    default:
      return success ? `✓ ${toolName}` : `✗ ${toolName}`;
  }
}
