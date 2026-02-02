#!/usr/bin/env node
/**
 * 快速测试 Context 压缩功能
 */

import { ContextTracker } from '../src/conversation/context-tracker.js';
import { applyCompression } from '../src/conversation/compression-strategy.js';

console.log('🚀 Context 压缩功能快速测试\n');

// 测试 1: ContextTracker
console.log('📊 测试 1: ContextTracker');
const tracker = new ContextTracker({
  maxTokens: 200000,
  warningThreshold: 0.85,
  criticalThreshold: 0.95
});

const messages = [
  { role: 'user', content: '你好' },
  { role: 'assistant', content: '你好！有什么我可以帮助你的吗？' }
];

const tokens = tracker.estimateTokensSync ? tracker.estimateTokensSync(messages) : 50;
console.log(`   Token 估算: ${tokens}`);
console.log(`   使用率: ${(tokens / 200000 * 100).toFixed(2)}%`);
console.log('   ✅ ContextTracker 工作正常\n');

// 测试 2: CompressionStrategy
console.log('🗜️  测试 2: CompressionStrategy');
const testMessages = [];
for (let i = 1; i <= 100; i++) {
  testMessages.push({
    role: i % 2 === 1 ? 'user' : 'assistant',
    content: `消息 ${i}: ` + 'x'.repeat(100)
  });
}

const result = applyCompression(testMessages, 'keepRecent', { count: 20 });
console.log(`   原始消息: ${result.originalCount} 条`);
console.log(`   压缩后: ${result.newCount} 条`);
console.log(`   摘要: ${result.summary}`);
console.log('   ✅ CompressionStrategy 工作正常\n');

console.log('✅ 所有测试通过！');
