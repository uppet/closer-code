#!/usr/bin/env node
/**
 * UI 验证测试脚本
 *
 * 用于无人值守验证 UI 优化是否合格
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const TEST_TIMEOUT = 30000;
const LOG_FILE = path.join(process.cwd(), 'test', 'ui-verification-result.log');

// 测试场景
const testScenarios = [
  {
    name: '启动测试',
    input: 'hello\n',
    expectedOutputs: [
      'Closer Code',
      'Conversation',
      'Task Progress',
      'Tool Execution',
      'Latest Logs',
      'AI Thinking Process'
    ],
    timeout: 5000
  },
  {
    name: '长对话测试',
    input: '请列出当前目录的文件\n',
    expectedOutputs: [
      'bash',
      'Tool Execution'
    ],
    timeout: 10000
  },
  {
    name: 'Thinking 测试',
    input: '请帮我分析一下这个项目的结构\n',
    expectedOutputs: [
      'Thinking',
      'AI'
    ],
    timeout: 15000
  }
];

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  const colorCode = colors[color] || colors.reset;
  console.log(`${colorCode}[${timestamp}] ${message}${colors.reset}`);
}

/**
 * 验证 UI 元素是否存在
 */
async function verifyUIElements() {
  log('\n验证 UI 元素...', 'cyan');

  // 读取编译后的文件
  const cliPath = path.join(process.cwd(), 'dist', 'closer-cli.js');
  const content = await fs.readFile(cliPath, 'utf-8');

  const checks = [
    {
      name: 'Conversation 滚动限制',
      pattern: /maxVisibleMessages/,
      expected: true,
      description: '应该限制 Conversation 显示的消息数量'
    },
    {
      name: 'Tool Execution 数量限制',
      pattern: /slice\(-\d+\)/,
      expected: true,
      description: '应该限制 Tool Execution 显示的数量'
    },
    {
      name: 'Thinking 区域',
      pattern: /AI Thinking Process/,
      expected: true,
      description: '应该有 AI Thinking Process 区域'
    },
    {
      name: 'Thinking 状态处理',
      pattern: /thinking/,
      expected: true,
      description: '应该处理 thinking 事件'
    },
    {
      name: 'Thinking API 配置',
      pattern: /type.*enabled/,
      expected: true,
      description: '应该启用 thinking API'
    }
  ];

  const results = [];
  for (const check of checks) {
    const found = check.pattern.test(content);
    const success = found === check.expected;
    results.push({
      name: check.name,
      success,
      description: check.description
    });

    if (success) {
      log(`  ✓ ${check.name}: ${check.description}`, 'green');
    } else {
      log(`  ✗ ${check.name}: ${check.description}`, 'red');
    }
  }

  return results;
}

/**
 * 生成测试报告
 */
async function generateReport(elementResults) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: elementResults.length,
      passed: 0,
      failed: 0
    },
    elements: elementResults
  };

  // 统计结果
  for (const result of elementResults) {
    if (result.success) {
      report.summary.passed++;
    } else {
      report.summary.failed++;
    }
  }

  // 保存报告
  await fs.writeFile(LOG_FILE, JSON.stringify(report, null, 2));

  return report;
}

/**
 * 主测试函数
 */
async function main() {
  log('='.repeat(60), 'blue');
  log('UI 验证测试开始', 'blue');
  log('='.repeat(60), 'blue');

  try {
    // 1. 验证 UI 元素
    log('\n第 1 步: 验证 UI 元素', 'cyan');
    const elementResults = await verifyUIElements();

    // 2. 生成报告
    log('\n第 2 步: 生成测试报告', 'cyan');
    const report = await generateReport(elementResults);

    // 3. 输出总结
    log('\n' + '='.repeat(60), 'blue');
    log('测试总结', 'blue');
    log('='.repeat(60), 'blue');
    log(`总测试数: ${report.summary.total}`, 'cyan');
    log(`通过: ${report.summary.passed}`, 'green');
    log(`失败: ${report.summary.failed}`, report.summary.failed > 0 ? 'red' : 'green');
    log(`成功率: ${((report.summary.passed / report.summary.total) * 100).toFixed(1)}%`, 'cyan');
    log(`详细报告: ${LOG_FILE}`, 'cyan');

    // 4. 判断是否成功
    const successRate = report.summary.passed / report.summary.total;
    if (successRate >= 0.8) {
      log('\n✓ UI 验证测试通过！', 'green');
      process.exit(0);
    } else {
      log('\n✗ UI 验证测试未通过，成功率低于 80%', 'red');
      process.exit(1);
    }

  } catch (error) {
    log(`\n测试过程中出错: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// 运行测试
main();
