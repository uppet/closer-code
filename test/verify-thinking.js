#!/usr/bin/env node
/**
 * Thinking 功能验证测试
 *
 * 验证 AI thinking 功能是否正确实现（符合 SDK Extended Thinking 规范）
 */

import fs from 'fs/promises';
import path from 'path';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

function log(message, color = 'reset') {
  const colorCode = colors[color] || colors.reset;
  console.log(`${colorCode}${message}${colors.reset}`);
}

/**
 * 验证源代码中的 thinking 实现
 */
async function verifySourceCode() {
  log('\n验证源代码实现...', 'cyan');

  const checks = [];

  // 1. 检查 ai-client.js
  log('\n1. 检查 ai-client.js', 'yellow');
  const aiClientPath = path.join(process.cwd(), 'src', 'ai-client.js');
  const aiClientContent = await fs.readFile(aiClientPath, 'utf-8');

  const hasThinkingInChat = /thinking:/.test(aiClientContent);
  const hasStreamEventListener = /stream\.on\('thinking'/.test(aiClientContent);
  const hasTextEventListener = /stream\.on\('text'/.test(aiClientContent);
  const hasSignatureEventListener = /stream\.on\('signature'/.test(aiClientContent);
  const hasFinalMessage = /finalMessage/.test(aiClientContent);

  checks.push({
    file: 'ai-client.js',
    check: 'chat 方法中的 thinking 配置',
    success: hasThinkingInChat
  });
  checks.push({
    file: 'ai-client.js',
    check: '使用 stream.on("thinking") 事件监听器',
    success: hasStreamEventListener
  });
  checks.push({
    file: 'ai-client.js',
    check: '使用 stream.on("text") 事件监听器',
    success: hasTextEventListener
  });
  checks.push({
    file: 'ai-client.js',
    check: '使用 stream.on("signature") 事件监听器',
    success: hasSignatureEventListener
  });
  checks.push({
    file: 'ai-client.js',
    check: '使用 stream.finalMessage() 获取最终消息',
    success: hasFinalMessage
  });

  log(`  ${hasThinkingInChat ? '✓' : '✗'} chat 方法中的 thinking 配置`, hasThinkingInChat ? 'green' : 'red');
  log(`  ${hasStreamEventListener ? '✓' : '✗'} 使用 stream.on("thinking") 事件监听器`, hasStreamEventListener ? 'green' : 'red');
  log(`  ${hasTextEventListener ? '✓' : '✗'} 使用 stream.on("text") 事件监听器`, hasTextEventListener ? 'green' : 'red');
  log(`  ${hasSignatureEventListener ? '✓' : '✗'} 使用 stream.on("signature") 事件监听器`, hasSignatureEventListener ? 'green' : 'red');
  log(`  ${hasFinalMessage ? '✓' : '✗'} 使用 stream.finalMessage() 获取最终消息`, hasFinalMessage ? 'green' : 'red');

  // 2. 检查 conversation.js
  log('\n2. 检查 conversation.js', 'yellow');
  const conversationPath = path.join(process.cwd(), 'src', 'conversation.js');
  const conversationContent = await fs.readFile(conversationPath, 'utf-8');

  const hasThinkingHandler = /type:\s*['"]thinking['"]/.test(conversationContent);
  const hasSnapshotInStream = /chunk\.snapshot/.test(conversationContent);
  const hasSignatureHandler = /thinking_signature/.test(conversationContent);
  const hasRedactedHandler = /thinking_redacted/.test(conversationContent);
  const hasRedactedThinkingBlock = /redacted_thinking/.test(conversationContent);

  checks.push({
    file: 'conversation.js',
    check: 'thinking 事件处理',
    success: hasThinkingHandler
  });
  checks.push({
    file: 'conversation.js',
    check: '流式模式中的 snapshot 支持',
    success: hasSnapshotInStream
  });
  checks.push({
    file: 'conversation.js',
    check: 'thinking signature 处理',
    success: hasSignatureHandler
  });
  checks.push({
    file: 'conversation.js',
    check: 'redacted thinking 处理',
    success: hasRedactedHandler
  });
  checks.push({
    file: 'conversation.js',
    check: '提取 redacted_thinking 块',
    success: hasRedactedThinkingBlock
  });

  log(`  ${hasThinkingHandler ? '✓' : '✗'} thinking 事件处理`, hasThinkingHandler ? 'green' : 'red');
  log(`  ${hasSnapshotInStream ? '✓' : '✗'} 流式模式中的 snapshot 支持`, hasSnapshotInStream ? 'green' : 'red');
  log(`  ${hasSignatureHandler ? '✓' : '✗'} thinking signature 处理`, hasSignatureHandler ? 'green' : 'red');
  log(`  ${hasRedactedHandler ? '✓' : '✗'} redacted thinking 处理`, hasRedactedHandler ? 'green' : 'red');
  log(`  ${hasRedactedThinkingBlock ? '✓' : '✗'} 提取 redacted_thinking 块`, hasRedactedThinkingBlock ? 'green' : 'red');

  // 3. 检查 closer-cli.jsx
  log('\n3. 检查 closer-cli.jsx', 'yellow');
  const cliPath = path.join(process.cwd(), 'src', 'closer-cli.jsx');
  const cliContent = await fs.readFile(cliPath, 'utf-8');

  const hasThinkingProgressHandler = /progress\.type\s*===?\s*['"]thinking['"]/.test(cliContent);
  const hasThinkingState = /setThinking/.test(cliContent);
  const hasThinkingUI = /AI Thinking Process/.test(cliContent);
  const hasSnapshotUsage = /progress\.snapshot/.test(cliContent);
  const hasSignatureUIHandler = /thinking_signature/.test(cliContent);
  const hasRedactedUIHandler = /thinking_redacted/.test(cliContent);

  checks.push({
    file: 'closer-cli.jsx',
    check: 'thinking 进度处理',
    success: hasThinkingProgressHandler
  });
  checks.push({
    file: 'closer-cli.jsx',
    check: 'thinking 状态更新',
    success: hasThinkingState
  });
  checks.push({
    file: 'closer-cli.jsx',
    check: 'thinking UI 区域',
    success: hasThinkingUI
  });
  checks.push({
    file: 'closer-cli.jsx',
    check: '使用 snapshot 避免重复',
    success: hasSnapshotUsage
  });
  checks.push({
    file: 'closer-cli.jsx',
    check: 'signature 事件处理',
    success: hasSignatureUIHandler
  });
  checks.push({
    file: 'closer-cli.jsx',
    check: 'redacted thinking 处理',
    success: hasRedactedUIHandler
  });

  log(`  ${hasThinkingProgressHandler ? '✓' : '✗'} thinking 进度处理`, hasThinkingProgressHandler ? 'green' : 'red');
  log(`  ${hasThinkingState ? '✓' : '✗'} thinking 状态更新`, hasThinkingState ? 'green' : 'red');
  log(`  ${hasThinkingUI ? '✓' : '✗'} thinking UI 区域`, hasThinkingUI ? 'green' : 'red');
  log(`  ${hasSnapshotUsage ? '✓' : '✗'} 使用 snapshot 避免重复`, hasSnapshotUsage ? 'green' : 'red');
  log(`  ${hasSignatureUIHandler ? '✓' : '✗'} signature 事件处理`, hasSignatureUIHandler ? 'green' : 'red');
  log(`  ${hasRedactedUIHandler ? '✓' : '✗'} redacted thinking 处理`, hasRedactedUIHandler ? 'green' : 'red');

  return checks;
}

/**
 * 验证编译后的代码
 */
async function verifyCompiledCode() {
  log('\n验证编译后的代码...', 'cyan');

  const compiledPath = path.join(process.cwd(), 'dist', 'closer-cli.js');
  const compiledContent = await fs.readFile(compiledPath, 'utf-8');

  const checks = [];

  // 检查关键字符串是否存在
  const keywords = [
    'thinking',
    'AI Thinking Process',
    'budget_tokens',
    'enabled',
    'snapshot',
    'signature'
  ];

  for (const keyword of keywords) {
    const found = compiledContent.includes(keyword);
    checks.push({
      file: 'closer-cli.js (compiled)',
      check: `包含关键字 "${keyword}"`,
      success: found
    });
    log(`  ${found ? '✓' : '✗'} 包含关键字 "${keyword}"`, found ? 'green' : 'red');
  }

  return checks;
}

/**
 * 验证文档
 */
async function verifyDocumentation() {
  log('\n验证文档...', 'cyan');

  const docsPath = path.join(process.cwd(), 'docs', 'THINKING_FEATURE.md');
  const checks = [];

  try {
    const docsContent = await fs.readFile(docsPath, 'utf-8');

    const hasOverview = /## 概述/.test(docsContent);
    const hasUsage = /## 使用场景/.test(docsContent);
    const hasTechnical = /## 技术细节/.test(docsContent);
    const hasExamples = /## 示例/.test(docsContent);

    checks.push({
      file: 'THINKING_FEATURE.md',
      check: '概述部分',
      success: hasOverview
    });
    checks.push({
      file: 'THINKING_FEATURE.md',
      check: '使用场景',
      success: hasUsage
    });
    checks.push({
      file: 'THINKING_FEATURE.md',
      check: '技术细节',
      success: hasTechnical
    });
    checks.push({
      file: 'THINKING_FEATURE.md',
      check: '示例',
      success: hasExamples
    });

    log(`  ${hasOverview ? '✓' : '✗'} 概述部分`, hasOverview ? 'green' : 'red');
    log(`  ${hasUsage ? '✓' : '✗'} 使用场景`, hasUsage ? 'green' : 'red');
    log(`  ${hasTechnical ? '✓' : '✗'} 技术细节`, hasTechnical ? 'green' : 'red');
    log(`  ${hasExamples ? '✓' : '✗'} 示例`, hasExamples ? 'green' : 'red');
  } catch (error) {
    log(`  ✗ 文档文件不存在`, 'red');
    checks.push({
      file: 'THINKING_FEATURE.md',
      check: '文档存在',
      success: false
    });
  }

  return checks;
}

/**
 * 生成测试报告
 */
async function generateReport(allChecks) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: allChecks.length,
      passed: 0,
      failed: 0
    },
    checks: allChecks
  };

  for (const check of allChecks) {
    if (check.success) {
      report.summary.passed++;
    } else {
      report.summary.failed++;
    }
  }

  // 保存报告
  const reportPath = path.join(process.cwd(), 'test', 'thinking-verification-result.log');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  return report;
}

/**
 * 主测试函数
 */
async function main() {
  log('='.repeat(70), 'cyan');
  log('AI Thinking 功能验证测试（符合 SDK Extended Thinking 规范）', 'cyan');
  log('='.repeat(70), 'cyan');

  try {
    // 1. 验证源代码
    const sourceCodeChecks = await verifySourceCode();

    // 2. 验证编译后的代码
    const compiledCodeChecks = await verifyCompiledCode();

    // 3. 验证文档
    const documentationChecks = await verifyDocumentation();

    // 4. 生成报告
    const allChecks = [...sourceCodeChecks, ...compiledCodeChecks, ...documentationChecks];
    const report = await generateReport(allChecks);

    // 5. 输出总结
    log('\n' + '='.repeat(70), 'cyan');
    log('测试总结', 'cyan');
    log('='.repeat(70), 'cyan');
    log(`总测试数: ${report.summary.total}`, 'cyan');
    log(`通过: ${report.summary.passed}`, 'green');
    log(`失败: ${report.summary.failed}`, report.summary.failed > 0 ? 'red' : 'green');
    log(`成功率: ${((report.summary.passed / report.summary.total) * 100).toFixed(1)}%`, 'cyan');
    log(`详细报告: test/thinking-verification-result.log`, 'cyan');

    // 6. 判断是否成功
    const successRate = report.summary.passed / report.summary.total;
    if (successRate >= 0.9) {
      log('\n✓ AI Thinking 功能验证通过！', 'green');
      process.exit(0);
    } else {
      log('\n✗ AI Thinking 功能验证未通过，成功率低于 90%', 'red');
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
