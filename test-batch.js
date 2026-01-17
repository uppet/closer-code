#!/usr/bin/env node
/**
 * 批处理模式测试脚本
 * 用于验证 AI 助理的对话能力是否开发完成
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(color + args.join(' ') + colors.reset);
}

/**
 * 检查配置是否存在
 */
async function checkConfig() {
  const configDir = path.join(os.homedir(), '.closer-code');
  const configFile = path.join(configDir, 'config.json');

  try {
    await fs.access(configFile);
    const config = JSON.parse(await fs.readFile(configFile, 'utf-8'));

    // 检查是否有 API Key
    const provider = config.ai?.provider || 'anthropic';
    const apiKey = config.ai?.[provider]?.apiKey ||
                   process.env[`CLOSER_${provider.toUpperCase()}_API_KEY`];

    if (!apiKey) {
      log(colors.red, '❌ 未找到 API Key');
      log(colors.yellow, '请运行以下命令设置 API Key:');
      log(colors.cyan, `  export CLOSER_${provider.toUpperCase()}_API_KEY="your-api-key"`);
      return false;
    }

    log(colors.green, '✓ 配置检查通过');
    log(colors.blue, `  提供商: ${provider}`);
    log(colors.blue, `  模型: ${config.ai?.[provider]?.model || 'N/A'}`);
    return true;
  } catch (error) {
    log(colors.red, '❌ 配置文件不存在');
    log(colors.yellow, '请运行 npm run setup 来初始化配置');
    return false;
  }
}

/**
 * 运行批处理命令
 */
async function runBatchCommand(prompt, options = {}) {
  const args = [];
  if (options.json) args.push('--json');
  if (options.verbose) args.push('--verbose');
  if (options.debug) args.push('--debug');
  args.push(prompt);

  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['dist/batch-cli.js', ...args], {
      cwd: process.cwd(),
      env: { ...process.env, CLOSER_DEBUG_LOG: options.debug ? '1' : '' }
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    proc.on('error', reject);
  });
}

/**
 * 测试用例
 */
const tests = [
  {
    name: '基础对话测试',
    prompt: '你好，请简单介绍一下你自己',
    verify: (output) => {
      return output.length > 10 && /closer|assistant|ai/i.test(output);
    }
  },
  {
    name: '工具调用测试 (bash)',
    prompt: '使用 bash 工具列出当前目录的文件',
    verify: (output) => {
      return output.length > 0;
    }
  },
  {
    name: '文件读取测试',
    prompt: '读取 package.json 文件并告诉我项目名称',
    verify: (output) => {
      return /closer/i.test(output);
    }
  },
  {
    name: 'JSON 输出格式测试',
    prompt: '计算 2 + 2',
    options: { json: true },
    verify: (output) => {
      try {
        const json = JSON.parse(output);
        return json.success === true && typeof json.content === 'string';
      } catch {
        return false;
      }
    }
  }
];

/**
 * 运行所有测试
 */
async function runTests() {
  log(colors.cyan, '\n========================================');
  log(colors.cyan, '  Closer Code - 批处理模式测试');
  log(colors.cyan, '========================================\n');

  // 检查配置
  const configOk = await checkConfig();
  if (!configOk) {
    log(colors.red, '\n测试失败: 配置不完整');
    process.exit(1);
  }

  log(colors.blue, '\n开始运行测试...\n');

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    log(colors.yellow, `运行: ${test.name}`);
    log(colors.dim, `  提示词: "${test.prompt}"`);

    try {
      const result = await runBatchCommand(test.prompt, test.options || {});

      if (result.code === 0) {
        const cleanOutput = result.stdout.trim();

        // 验证结果
        if (test.verify(cleanOutput)) {
          log(colors.green, `  ✓ 通过\n`);
          passed++;
        } else {
          log(colors.red, `  ✗ 验证失败`);
          log(colors.dim, `  输出: ${cleanOutput.slice(0, 100)}...\n`);
          failed++;
        }
      } else {
        log(colors.red, `  ✗ 退出码: ${result.code}`);
        if (result.stderr) {
          log(colors.dim, `  错误: ${result.stderr}`);
        }
        failed++;
      }
    } catch (error) {
      log(colors.red, `  ✗ 异常: ${error.message}\n`);
      failed++;
    }
  }

  // 输出测试结果
  log(colors.cyan, '========================================');
  log(colors.cyan, '  测试结果');
  log(colors.cyan, '========================================');
  log(colors.green, `  通过: ${passed}`);
  log(colors.red, `  失败: ${failed}`);
  log(colors.blue, `  总计: ${passed + failed}`);
  log(colors.cyan, '========================================\n');

  // 显示日志位置
  const logDir = path.join(os.homedir(), '.closer-code', 'logs');
  try {
    const files = await fs.readdir(logDir);
    const logFiles = files.filter(f => f.startsWith('closer_debug_log_')).sort().reverse();
    if (logFiles.length > 0) {
      log(colors.blue, `详细日志: ${path.join(logDir, logFiles[0])}`);
    }
  } catch {
    // ignore
  }

  if (failed > 0) {
    process.exit(1);
  }

  log(colors.green, '✓ 所有测试通过！批处理模式功能正常。\n');
}

// 运行测试
runTests().catch(error => {
  log(colors.red, '测试脚本错误:', error.message);
  console.error(error);
  process.exit(1);
});
