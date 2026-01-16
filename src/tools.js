/**
 * 工具执行引擎 - AI 可用的所有工具
 */

import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { executeBashCommand } from './bash-runner.js';
import { glob } from 'glob';

// 工具执行结果
export class ToolResult {
  constructor(success, data, error = null) {
    this.success = success;
    this.data = data;
    this.error = error;
    this.timestamp = new Date().toISOString();
  }
}

// 工具定义
export const TOOLS = {
  // 执行 bash 命令
  bash: {
    name: 'bash',
    description: 'Execute a bash shell command and return the output',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The bash command to execute'
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 30000)',
          default: 30000
        }
      },
      required: ['command']
    }
  },

  // 读取文件
  readFile: {
    name: 'readFile',
    description: 'Read the contents of a file',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Absolute or relative path to the file'
        },
        encoding: {
          type: 'string',
          description: 'File encoding (default: utf-8)',
          default: 'utf-8'
        }
      },
      required: ['filePath']
    }
  },

  // 写入文件
  writeFile: {
    name: 'writeFile',
    description: 'Write content to a file (creates or overwrites)',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Absolute or relative path to the file'
        },
        content: {
          type: 'string',
          description: 'Content to write to the file'
        },
        encoding: {
          type: 'string',
          description: 'File encoding (default: utf-8)',
          default: 'utf-8'
        }
      },
      required: ['filePath', 'content']
    }
  },

  // 编辑文件（替换）
  editFile: {
    name: 'editFile',
    description: 'Edit a file by replacing exact string matches',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the file to edit'
        },
        oldText: {
          type: 'string',
          description: 'Exact text to replace (must be unique in the file)'
        },
        newText: {
          type: 'string',
          description: 'New text to replace with'
        },
        replaceAll: {
          type: 'boolean',
          description: 'Replace all occurrences (default: false)',
          default: false
        }
      },
      required: ['filePath', 'oldText', 'newText']
    }
  },

  // 搜索文件
  searchFiles: {
    name: 'searchFiles',
    description: 'Search for files by name pattern',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Glob pattern (e.g., "**/*.js", "src/**/*.ts")'
        },
        cwd: {
          type: 'string',
          description: 'Working directory (default: current directory)'
        }
      },
      required: ['pattern']
    }
  },

  // 搜索代码内容
  searchCode: {
    name: 'searchCode',
    description: 'Search for text/patterns in file contents',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Regex pattern to search for'
        },
        path: {
          type: 'string',
          description: 'Directory to search in (default: current directory)'
        },
        fileType: {
          type: 'string',
          description: 'Filter by file type (e.g., "js", "py")'
        }
      },
      required: ['pattern']
    }
  },

  // 列出目录
  listFiles: {
    name: 'listFiles',
    description: 'List files and directories in a path',
    inputSchema: {
      type: 'object',
      properties: {
        dirPath: {
          type: 'string',
          description: 'Directory path (default: current directory)'
        },
        recursive: {
          type: 'boolean',
          description: 'List recursively (default: false)',
          default: false
        },
        showHidden: {
          type: 'boolean',
          description: 'Show hidden files (default: false)',
          default: false
        }
      }
    }
  },

  // 分析错误
  analyzeError: {
    name: 'analyzeError',
    description: 'Analyze an error message and suggest solutions',
    inputSchema: {
      type: 'object',
      properties: {
        error: {
          type: 'string',
          description: 'Error message or stack trace'
        },
        context: {
          type: 'string',
          description: 'Additional context about what was happening'
        }
      },
      required: ['error']
    }
  },

  // 运行测试
  runTests: {
    name: 'runTests',
    description: 'Run tests for the project',
    inputSchema: {
      type: 'object',
      properties: {
        testCommand: {
          type: 'string',
          description: 'Test command to run (default: auto-detect)'
        },
        filter: {
          type: 'string',
          description: 'Filter tests (e.g., test name pattern)'
        }
      }
    }
  },

  // 规划任务
  planTask: {
    name: 'planTask',
    description: 'Create a detailed plan for a complex task',
    inputSchema: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description: 'Description of the task to plan'
        },
        context: {
          type: 'string',
          description: 'Additional context about the project'
        }
      },
      required: ['task']
    }
  }
};

// 工具执行器
export class ToolExecutor {
  constructor(config) {
    this.config = config;
    this.workingDir = config.behavior.workingDir;
    this.enabledTools = new Set(config.tools.enabled);
  }

  // 检查工具是否可用
  isToolEnabled(toolName) {
    return this.enabledTools.has(toolName);
  }

  // 执行工具
  async execute(toolName, input) {
    if (!this.isToolEnabled(toolName)) {
      return new ToolResult(false, null, `Tool '${toolName}' is not enabled`);
    }

    try {
      switch (toolName) {
        case 'bash':
          return await this.bash(input);
        case 'readFile':
          return await this.readFile(input);
        case 'writeFile':
          return await this.writeFile(input);
        case 'editFile':
          return await this.editFile(input);
        case 'searchFiles':
          return await this.searchFiles(input);
        case 'searchCode':
          return await this.searchCode(input);
        case 'listFiles':
          return await this.listFiles(input);
        case 'analyzeError':
          return await this.analyzeError(input);
        case 'runTests':
          return await this.runTests(input);
        case 'planTask':
          return await this.planTask(input);
        default:
          return new ToolResult(false, null, `Unknown tool: ${toolName}`);
      }
    } catch (error) {
      return new ToolResult(false, null, error.message);
    }
  }

  // 执行 bash 命令
  async bash({ command, timeout = 30000 }) {
    const result = await executeBashCommand(command, {
      cwd: this.workingDir,
      timeout
    });
    return new ToolResult(
      result.success,
      {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode
      },
      result.error
    );
  }

  // 读取文件
  async readFile({ filePath, encoding = 'utf-8' }) {
    const fullPath = path.resolve(this.workingDir, filePath);
    const content = await fs.readFile(fullPath, encoding);
    return new ToolResult(true, { content, path: fullPath });
  }

  // 写入文件
  async writeFile({ filePath, content, encoding = 'utf-8' }) {
    const fullPath = path.resolve(this.workingDir, filePath);
    await fs.writeFile(fullPath, content, encoding);
    return new ToolResult(true, { path: fullPath, size: content.length });
  }

  // 编辑文件
  async editFile({ filePath, oldText, newText, replaceAll = false }) {
    const fullPath = path.resolve(this.workingDir, filePath);
    let content = await fs.readFile(fullPath, 'utf-8');

    if (replaceAll) {
      content = content.split(oldText).join(newText);
    } else {
      if (!content.includes(oldText)) {
        return new ToolResult(false, null, 'Old text not found in file');
      }
      content = content.replace(oldText, newText);
    }

    await fs.writeFile(fullPath, content, 'utf-8');
    return new ToolResult(true, { path: fullPath, replacements: 1 });
  }

  // 搜索文件
  async searchFiles({ pattern, cwd }) {
    const searchDir = cwd ? path.resolve(this.workingDir, cwd) : this.workingDir;
    const files = await glob(pattern, { cwd: searchDir });
    return new ToolResult(true, { files, count: files.length });
  }

  // 搜索代码
  async searchCode({ pattern, path: searchPath, fileType }) {
    const { searchCode } = await import('./search.js');
    const results = await searchCode(pattern, {
      path: searchPath ? path.resolve(this.workingDir, searchPath) : this.workingDir,
      type: fileType
    });
    return new ToolResult(true, results);
  }

  // 列出文件
  async listFiles({ dirPath, recursive = false, showHidden = false }) {
    const fullPath = dirPath ? path.resolve(this.workingDir, dirPath) : this.workingDir;
    const files = await fs.readdir(fullPath, { withFileTypes: true });

    const result = [];
    for (const file of files) {
      if (!showHidden && file.name.startsWith('.')) continue;
      result.push({
        name: file.name,
        type: file.isDirectory() ? 'directory' : 'file',
        path: path.join(fullPath, file.name)
      });
    }

    return new ToolResult(true, { files: result, path: fullPath });
  }

  // 分析错误
  async analyzeError({ error, context }) {
    // 这是一个特殊的工具，返回结构化的错误分析
    return new ToolResult(true, {
      error,
      context,
      analysis: {
        summary: 'Error analysis - AI will provide detailed analysis',
        suggestions: ['Check syntax', 'Review dependencies', 'Verify configuration']
      }
    });
  }

  // 运行测试
  async runTests({ testCommand, filter }) {
    let command = testCommand;

    if (!command) {
      // 自动检测测试命令
      const packageJsonPath = path.join(this.workingDir, 'package.json');
      try {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        command = packageJson.scripts?.test || 'npm test';
      } catch {
        command = 'npm test';
      }
    }

    if (filter) {
      command += ` -- ${filter}`;
    }

    return await this.bash({ command });
  }

  // 规划任务
  async planTask({ task, context }) {
    // 返回任务描述，AI 会生成详细计划
    return new ToolResult(true, {
      task,
      context,
      message: 'Task planning request - AI will generate detailed plan'
    });
  }
}

// 获取工具列表（用于 AI）
export function getToolDefinitions(enabledTools) {
  return Object.values(TOOLS).filter(tool => enabledTools.includes(tool.name));
}
