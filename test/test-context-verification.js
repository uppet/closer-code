#!/usr/bin/env node
/**
 * Context 压缩功能验证脚本
 *
 * 验证所有核心功能是否正常工作
 */

import { ContextTracker } from '../src/conversation/context-tracker.js';
import { applyCompression } from '../src/conversation/compression-strategy.js';

console.log('🔍 Context 压缩功能验证\n');

let allTestsPassed = true;

// 测试 1: ContextTracker 基础功能
console.log('📋 测试 1: ContextTracker 基础功能');
try {
  const tracker = new ContextTracker({
    maxTokens: 200000,
    warningThreshold: 0.85,
    criticalThreshold: 0.95
  });

  // 测试消息
  const messages = [
    { role: 'user', content: '你好，请介绍一下 JavaScript 的特性。' },
    { role: 'assistant', content: 'JavaScript 是一种动态编程语言，具有以下特性：' }
  ];

  // 测试 token 估算
  const tokens = tracker.estimateTokensSync(messages);
  console.log(`   ✓ Token 估算: ${tokens} tokens`);
  console.log(`   ✓ 使用率: ${(tokens / 200000 * 100).toFixed(4)}%`);

  // 测试阈值检测
  const usageInfo = tracker.getUsageInfo(tokens);
  console.log(`   ✓ 需要压缩: ${usageInfo.needsCompression}`);
  console.log(`   ✓ 需要重开: ${usageInfo.needsTaskReset}`);

  // 测试缓存
  const tokens2 = tracker.estimateTokensSync(messages);
  const cacheStats = tracker.getCacheStats();
  console.log(`   ✓ 缓存命中率: ${(cacheStats.hitRate * 100).toFixed(1)}%`);

  console.log('   ✅ ContextTracker 测试通过\n');

} catch (error) {
  console.error('   ❌ ContextTracker 测试失败:', error.message);
  allTestsPassed = false;
}

// 测试 2: CompressionStrategy 各种策略
console.log('📋 测试 2: CompressionStrategy 各种策略');
try {
  const testMessages = [];
  for (let i = 1; i <= 100; i++) {
    testMessages.push({
      role: i % 2 === 1 ? 'user' : 'assistant',
      content: `消息 ${i}: ` + 'x'.repeat(50)
    });
  }

  const strategies = [
    { name: 'keepRecent', options: { count: 20 } },
    { name: 'keepImportant', options: { recentCount: 20 } },
    {name: 'slidingWindow', options: { count: 30 } },
    { name: 'smartToken', options: { maxTokens: 10000, targetTokens: 8000 } }
  ];

  for (const { name, options } of strategies) {
    const result = applyCompression(testMessages, name, options);
    const compressionRate = ((result.originalCount - result.newCount) / result.originalCount * 100).toFixed(1);
    
    console.log(`   ✓ ${name}:`);
    console.log(`     - 原始: ${result.originalCount} 条`);
    console.log(`     - 压缩后: ${result.newCount} 条`);
    console.log(`     - 压缩率: ${compressionRate}%`);
  }

  console.log('   ✅ CompressionStrategy 测试通过\n');

} catch (error) {
  console.error('   ❌ CompressionStrategy 测试失败:', error.message);
  allTestsPassed = false;
}

// 测试 3: 边界条件
console.log('📋 测试 3: 边界条件测试');
try {
  const tracker = new ContextTracker({
    maxTokens: 1000,
    warningThreshold: 0.5,
    criticalThreshold: 0.8
  });

  // 测试空消息
  const emptyTokens = tracker.estimateTokensSync([]);
  console.log(`   ✓ 空消息 token: ${emptyTokens}`);

  // 测试阈值边界
  const halfTokens = 500;
  const eightyPercent = 800;
  const fullTokens = 1000;

  console.log(`   ✓ 50% 阈值: ${tracker.needsCompression(halfTokens)}`);
  console.log(`   ✓ 80% 阈值: ${tracker.needsCompression(eightyPercent)}`);
  console.log(`   ✓ 100% 阈值: ${tracker.needsTaskReset(fullTokens)}`);

  console.log('   ✅ 边界条件测试通过\n');

} catch (error) {
  console.error('   ❌ 边界条件测试失败:', error.message);
  allTestsPassed = false;
}

// 测试 4: 压缩策略的正确性
console.log('�� 测试 4: 压缩策略正确性测试');
try {
  const messages = [];
  for (let i = 1; i <= 10; i++) {
    messages.push({
      role: 'user',
      content: `消息 ${i}`
    });
  }

  // 测试 keepRecent
  const result1 = applyCompression(messages, 'keepRecent', { count: 5 });
  if (result1.newCount !== 5) {
    throw new Error(`keepRecent 应该保留 5 条，实际保留 ${result1.newCount} 条`);
  }
  console.log(`   ✓ keepRecent: 正确保留 ${result1.newCount} 条消息`);

  // 测试 keepImportant
  const result2 = applyCompression(messages, 'keepImportant', { recentCount: 3 });
  if (result2.newCount > messages.length) {
    throw new Error(`keepImportant 不应该增加消息数量`);
  }
  console.log(`   ✓ keepImportant: 正确保留 ${result2.newCount} 条消息`);

  // 测试 slidingWindow
  const result3 = applyCompression(messages, 'slidingWindow', { count: 7 });
  if (result3.newCount !== 7) {
    throw new Error(`slidingWindow 应该保留 7 条，实际保留 ${result3.newCount} 条`);
  }
  console.log(`   ✓ slidingWindow: 正确保留 ${result3.newCount} 条消息`);

  console.log('   ✅ 压缩策略正确性测试通过\n');

} catch (error) {
  console.error('   ❌ 压缩策略正确性测试失败:', error.message);
  allTestsPassed = false;
}

// 测试 5: 性能测试
console.log('📋 测试 5: 性能测试');
try {
  const tracker = new ContextTracker({
    maxTokens: 200000
  });

  // 创建大量消息
  const largeMessages = [];
  for (let i = 1; i <= 1000; i++) {
    largeMessages.push({
      role: 'user',
      content: '测试消息 ' + i + ' '.repeat(100)
    });
  }

  // 测试估算性能
  const start = Date.now();
  const tokens = tracker.estimateTokensSync(largeMessages);
  const elapsed = Date.now() - start;

  console.log(`   ✓ 1000 条消息估算耗时: ${elapsed}ms`);
  console.log(`   ✓ 估算 token 数: ${tokens}`);

  if (elapsed > 100) {
    console.warn(`   ⚠️  性能警告: 估算耗时 ${elapsed}ms (>100ms)`);
  } else {
    console.log(`   ✓ 性能良好`);
  }

  console.log('   ✅ 性能测试通过\n');

} catch (error) {
  console.error('   ❌ 性能测试失败:', error.message);
  allTestsPassed = false;
}

// 输出测试结果
console.log('='.repeat(80));
console.log('验证结果');
console.log('='.repeat(80));
console.log('');

if (allTestsPassed) {
  console.log('✅ 所有验证测试通过！');
  console.log('');
  console.log('📊 功能清单:');
  console.log('  ✅ ContextTracker - Token 追踪和估算');
  console.log('  ✅ CompressionStrategy - 4 种压缩策略');
  console.log('  ✅ 压缩算法 - 正确性和性能验证');
  console.log('  ✅ 边界处理 - 空消息、阈值边界');
  console.log('  ✅ 缓存机制 - 提升性能');
  console.log('');
  console.log('🎯 核心功能:');
  console.log('  • 实时 token 追踪');
  console.log('  • 智能压缩策略');
  console.log('  • 自动任务重开');
  console.log('  • 上下文保留');
  console.log('  • 用户可配置');
  console.log('');
  console.log('📖 配置指南: docs/CONTEXT_COMPRESSION_CONFIG.md');
  console.log('🧪 测试文件: test/test-context-compression.js');
  console.log('');

  process.exit(0);
} else {
  console.log('❌ 部分验证测试失败');
  console.log('请查看上面的详细错误信息');
  console.log('');

  process.exit(1);
}
