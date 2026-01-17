#!/usr/bin/env node
/**
 * Closer Code - Batch Mode (非交互模式)
 *
 * 用于批处理场景，直接输出结果而不启动交互式 UI
 *
 * 使用方式:
 *   closer-batch "你的问题"
 *   echo "你的问题" | closer-batch
 *   closer-batch --file prompt.txt
 *   closer-batch --json "你的问题"
 */

import { createConversation } from './conversation.js';
import { getConfig } from './config.js';
import {
  initLogger,
  closeLogger,
  logSessionSummary
} from './logger.js';
import fs from 'fs/promises';
import readline from 'readline';

/**
 * 解析命令行参数
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    prompt: null,
    file: null,
    output: 'text', // text, json, verbose
    debug: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--file' || arg === '-f') {
      options.file = args[++i];
    } else if (arg === '--json' || arg === '-j') {
      options.output = 'json';
    } else if (arg === '--verbose' || arg === '-v') {
      options.output = 'verbose';
    } else if (arg === '--debug' || arg === '-d') {
      options.debug = true;
    } else if (!arg.startsWith('-')) {
      options.prompt = arg;
    }
  }

  return options;
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
Closer Code - Batch Mode (非交互模式)

使用方式:
  closer-batch [选项] "你的问题"
  echo "你的问题" | closer-batch
  closer-batch --file prompt.txt

选项:
  -f, --file <文件>     从文件读取提示词
  -j, --json            以 JSON 格式输出
  -v, --verbose         详细输出（包含工具调用）
  -d, --debug           启用调试日志
  -h, --help            显示帮助信息

环境变量:
  CLOSER_DEBUG_LOG=1    启用调试日志
  CLOSER_AI_PROVIDER     AI 提供商 (anthropic, openai, ollama)
  CLOSER_ANTHROPIC_API_KEY  Anthropic API Key

输出格式:
  text    纯文本输出（默认）
  json    JSON 格式，包含完整响应信息
  verbose 详细输出，包含工具调用详情

退出码:
  0       成功
  1       错误
  2       参数错误

示例:
  closer-batch "列出当前目录的文件"
  closer-batch --json "分析 package.json"
  cat prompt.txt | closer-batch
  closer-batch --file prompt.txt --verbose
`);
}

/**
 * 从标准输入读取提示词
 */
async function readStdin() {
  return new Promise((resolve, reject) => {
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      terminal: false
    });

    let content = '';
    rl.on('line', (line) => {
      content += line + '\n';
    });
    rl.on('close', () => {
      resolve(content.trim());
    });
    rl.on('error', reject);
  });
}

/**
 * 格式化输出
 */
class OutputFormatter {
  constructor(mode) {
    this.mode = mode;
    this.toolCalls = [];
    this.startTime = Date.now();
  }

  /**
   * 输出进度信息
   */
  progress(message) {
    if (this.mode === 'verbose') {
      console.error(`[INFO] ${message}`);
    }
  }

  /**
   * 记录工具调用
   */
  recordToolCall(toolName, input, result) {
    this.toolCalls.push({
      tool: toolName,
      input,
      success: result.success,
      result: result.success ? result.data : result.error,
      timestamp: new Date().toISOString()
    });

    if (this.mode === 'verbose') {
      console.error(`[TOOL] ${toolName}`);
      if (result.success) {
        console.error(`  ✓ Success`);
      } else {
        console.error(`  ✗ Failed: ${result.error}`);
      }
    }
  }

  /**
   * 格式化最终输出
   */
  format(content) {
    const duration = Date.now() - this.startTime;

    if (this.mode === 'json') {
      return JSON.stringify({
        success: true,
        content,
        toolCalls: this.toolCalls,
        metadata: {
          duration,
          toolCount: this.toolCalls.length,
          timestamp: new Date().toISOString()
        }
      }, null, 2);
    }

    if (this.mode === 'verbose') {
      return `
${content}

---
工具调用: ${this.toolCalls.length} 次
耗时: ${duration}ms
`;
    }

    // text 模式：只输出内容
    return content;
  }

  /**
   * 格式化错误
   */
  error(message) {
    if (this.mode === 'json') {
      return JSON.stringify({
        success: false,
        error: message,
        timestamp: new Date().toISOString()
      }, null, 2);
    }

    return `Error: ${message}`;
  }
}

/**
 * 批处理模式主函数
 */
async function runBatch() {
  const options = parseArgs();

  // 显示帮助
  if (options.help) {
    showHelp();
    process.exit(0);
  }

  // 启用调试日志
  if (options.debug) {
    process.env.CLOSER_DEBUG_LOG = '1';
  }

  // 初始化输出格式化器
  const formatter = new OutputFormatter(options.output);

  try {
    // 获取提示词
    let prompt = options.prompt;

    if (options.file) {
      formatter.progress(`从文件读取: ${options.file}`);
      prompt = await fs.readFile(options.file, 'utf-8');
      prompt = prompt.trim();
    } else if (!prompt) {
      formatter.progress('从标准输入读取...');
      prompt = await readStdin();
    }

    if (!prompt) {
      console.error(formatter.error('未提供提示词。使用 --help 查看使用说明。'));
      process.exit(2);
    }

    formatter.progress('初始化配置...');
    const config = getConfig();

    formatter.progress('创建对话会话...');
    const conversation = await createConversation(config);

    formatter.progress('发送消息到 AI...');
    const response = await conversation.sendMessage(
      prompt,
      (progress) => {
        if (progress.type === 'tool_start') {
          formatter.progress(`执行工具: ${progress.tool}`);
        } else if (progress.type === 'tool_complete') {
          formatter.recordToolCall(
            progress.tool,
            null, // input 已经在 tool_start 中记录
            progress.result
          );
        } else if (progress.type === 'token') {
          // 流式输出 token（仅 text 模式）
          if (options.output === 'text') {
            process.stdout.write(progress.content);
          }
        }
      }
    );

    // 输出最终结果（非 text 模式或没有流式输出时）
    if (options.output !== 'text') {
      console.log(formatter.format(response.content));
    } else if (!response.content) {
      // 如果 content 为空，至少输出一个换行
      console.log();
    }

    formatter.progress('完成！');

    // 记录会话摘要到日志
    await logSessionSummary(conversation);

    // 关闭日志
    await closeLogger();

    process.exit(0);

  } catch (error) {
    console.error(formatter.error(error.message));
    console.error('');
    console.error('详细错误信息:');
    console.error(error);

    // 关闭日志
    await closeLogger();

    process.exit(1);
  }
}

// 导出运行函数，供 cloco 命令使用
export { runBatch };

// 只在直接运行时执行
// 检查当前模块是否是主入口模块
const modulePath = new URL(import.meta.url).pathname;
const argvPath = process.argv[1];
// 在 Windows 和 Unix 系统上都能正常工作的路径比较
const isMainModule = argvPath === modulePath ||
                      argvPath === modulePath.replace(/^\//, '') ||
                      argvPath.endsWith('batch-cli.js') ||
                      argvPath.endsWith('batch-cli');

if (isMainModule) {
  runBatch();
}
