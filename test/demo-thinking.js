#!/usr/bin/env node
/**
 * Thinking 功能演示脚本
 *
 * 这个脚本演示了如何使用 AI 的 thinking 功能
 */

import { spawn } from 'child_process';
import path from 'path';

const DEMO_SCENARIOS = [
  {
    name: '简单查询',
    description: '演示基本的 thinking 过程',
    input: '列出当前目录的文件\n',
    duration: 5000
  },
  {
    name: '复杂任务',
    description: '演示多步骤思考过程',
    input: '请分析一下 src/ 目录下的所有 JavaScript 文件，总结它们的功能\n',
    duration: 15000
  },
  {
    name: '问题解决',
    description: '演示问题分析和解决过程',
    input: '帮我检查一下 package.json 中的依赖是否有安全漏洞\n',
    duration: 10000
  }
];

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  const colorCode = colors[color] || colors.reset;
  console.log(`${colorCode}${message}${colors.reset}`);
}

async function runDemo() {
  log('='.repeat(70), 'blue');
  log('AI Thinking 功能演示', 'blue');
  log('='.repeat(70), 'blue');

  log('\n这个演示将展示 AI 的思考过程。', 'cyan');
  log('请注意观察 "AI Thinking Process" 区域的内容。', 'cyan');
  log('\n按 Enter 键开始演示...', 'yellow');

  // 等待用户输入
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  for (const scenario of DEMO_SCENARIOS) {
    log('\n' + '='.repeat(70), 'blue');
    log(`场景: ${scenario.name}`, 'blue');
    log(`描述: ${scenario.description}`, 'cyan');
    log('='.repeat(70), 'blue');

    log('\n启动 Closer Code...', 'yellow');

    // 启动 CLI
    const cli = spawn('node', ['dist/closer-cli.js'], {
      cwd: process.cwd(),
      stdio: ['pipe', 'inherit', 'inherit'],
      env: {
        ...process.env,
        CLOSER_AUTO_PLAN: 'false',
        CLOSER_AUTO_EXECUTE: 'false'
      }
    });

    // 等待一段时间后发送输入
    await new Promise(resolve => setTimeout(resolve, 2000));

    log(`\n发送输入: ${scenario.input.trim()}`, 'cyan');
    cli.stdin.write(scenario.input);

    // 等待场景完成
    await new Promise(resolve => setTimeout(resolve, scenario.duration));

    // 终止进程
    cli.kill('SIGTERM');

    log(`\n场景 "${scenario.name}" 完成`, 'green');

    // 等待一段时间再进行下一个场景
    if (scenario !== DEMO_SCENARIOS[DEMO_SCENARIOS.length - 1]) {
      log('\n按 Enter 键继续下一个场景...', 'yellow');
      await new Promise(resolve => {
        process.stdin.once('data', resolve);
      });
    }
  }

  log('\n' + '='.repeat(70), 'blue');
  log('演示完成！', 'green');
  log('='.repeat(70), 'blue');
  log('\n你应该已经看到 AI 的思考过程在 "AI Thinking Process" 区域显示。', 'cyan');
  log('这个功能可以帮助你了解 AI 如何分析和解决问题。', 'cyan');
  log('\n更多信息请查看: docs/THINKING_FEATURE.md', 'yellow');

  process.exit(0);
}

// 处理错误
process.on('uncaughtException', (error) => {
  log(`\n错误: ${error.message}`, 'red');
  process.exit(1);
});

process.on('SIGINT', () => {
  log('\n\n演示已中断', 'yellow');
  process.exit(0);
});

// 运行演示
runDemo();
