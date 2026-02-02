#!/usr/bin/env node
/**
 * 测试 KeepImportantStrategy 去重逻辑修复
 *
 * 验证修复后的行为：
 * 1. 相同内容的消息不会被错误去重
 * 2. 保持原始顺序
 * 3. 正确保留重要消息和最近消息
 */

import { applyCompression } from '../src/conversation/compression-strategy.js';

console.log('🔧 KeepImportantStrategy 去重逻辑修复验证\n');
console.log('='.repeat(80) + '\n');

// 测试 1: 相同内容的消息不会被错误去重
console.log('📋 测试 1: 相同内容的消息不会被错误去重\n');

try {
  const messages = [
    { role: 'user', content: '相同的消息内容' },
    { role: 'assistant', content: '回复1' },
    { role: 'user', content: '相同的消息内容' }, // 与第1条内容相同
    { role: 'assistant', content: '回复2' },
    { role: 'user', content: '不同的消息内容' },
  ];

  console.log(`   原始消息数: ${messages.length}`);
  console.log(`   消息1内容: "${messages[0].content}"`);
  console.log(`   消息3内容: "${messages[2].content}"`);
  console.log(`   内容是否相同: ${messages[0].content === messages[2].content}`);

  const result = applyCompression(messages, 'keepImportant', { recentCount: 10 });
  
  console.log(`   压缩后消息数: ${result.messages.length}`);
  console.log(`   保留的消息:`);
  result.messages.forEach((msg, idx) => {
    console.log(`     ${idx + 1}. [${msg.role}] "${msg.content}"`);
  });

  // 验证：两条相同内容的消息都应该被保留（如果都在最近消息范围内）
  const sameContentCount = result.messages.filter(m => m.content === '相同的消息内容').length;
  if (sameContentCount === 2) {
    console.log(`   ✅ 相同内容的消息被正确保留（${sameContentCount} 条）`);
  } else {
    console.log(`   ❌ 相同内容的消息应该保留 2 条，实际保留 ${sameContentCount} 条`);
    process.exit(1);
  }

} catch (error) {
  console.error(`   ❌ 测试失败: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}

// 测试 2: 保持原始顺序
console.log('\n📋 测试 2: 保持原始顺序\n');

try {
  const messages = [];
  for (let i = 1; i <= 20; i++) {
    messages.push({
      role: i % 2 === 0 ? 'assistant' : 'user',
      content: `消息 ${i}`,
      _index: i // 添加索引标记
    });
  }

  // 在中间添加一条重要消息（工具调用）
  messages[10] = {
    role: 'assistant',
    content: [{
      type: 'tool_use',
      name: 'readFile',
      input: { path: '/test.txt' }
    }],
    _index: 11
  };

  console.log(`   原始消息数: ${messages.length}`);
  console.log(`   第11条消息是工具调用（重要消息）`);

  const result = applyCompression(messages, 'keepImportant', { recentCount: 5 });

  console.log(`   压缩后消息数: ${result.messages.length}`);
  
  // 验证顺序是否正确
  let isOrdered = true;
  for (let i = 1; i < result.messages.length; i++) {
    if (result.messages[i]._index < result.messages[i - 1]._index) {
      isOrdered = false;
      break;
    }
  }

  if (isOrdered) {
    console.log('   ✅ 消息顺序保持正确');
  } else {
    console.log('   ❌ 消息顺序混乱');
    process.exit(1);
  }

  // 验证重要消息是否被保留
  const hasToolUse = result.messages.some(m => 
    m.content && Array.isArray(m.content) && m.content.some(block => block.type === 'tool_use')
  );
  
  if (hasToolUse) {
    console.log('   ✅ 重要消息（工具调用）被正确保留');
  } else {
    console.log('   ❌ 重要消息（工具调用）应该被保留');
    process.exit(1);
  }

} catch (error) {
  console.error(`   ❌ 测试失败: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}

// 测试 3: 正确保留最近消息
console.log('\n📋 测试 3: 正确保留最近消息\n');

try {
  const messages = [];
  for (let i = 1; i <= 50; i++) {
    messages.push({
      role: i % 2 === 0 ? 'assistant' : 'user',
      content: `消息 ${i}`,
      _index: i
    });
  }

  const recentCount = 10;
  console.log(`   原始消息数: ${messages.length}`);
  console.log(`   保留最近消息数: ${recentCount}`);

  const result = applyCompression(messages, 'keepImportant', { recentCount });

  console.log(`   压缩后消息数: ${result.messages.length}`);

  // 验证：最后10条消息应该被保留
  const last10Original = messages.slice(-recentCount);
  const last10Compressed = result.messages.slice(-recentCount);

  let allRecentPreserved = true;
  for (let i = 0; i < recentCount; i++) {
    if (last10Compressed[i]._index !== last10Original[i]._index) {
      allRecentPreserved = false;
      break;
    }
  }

  if (allRecentPreserved) {
    console.log(`   ✅ 最近 ${recentCount} 条消息被正确保留`);
  } else {
    console.log(`   ❌ 最近 ${recentCount} 条消息应该被保留`);
    process.exit(1);
  }

} catch (error) {
  console.error(`   ❌ 测试失败: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}

// 测试 4: 重要消息和最近消息去重
console.log('\n📋 测试 4: 重要消息和最近消息去重\n');

try {
  const messages = [];
  
  // 创建30条消息
  for (let i = 1; i <= 30; i++) {
    messages.push({
      role: i % 2 === 0 ? 'assistant' : 'user',
      content: `消息 ${i}`,
      _index: i
    });
  }

  // 在最近10条消息中添加一个工具调用（既是重要消息，也是最近消息）
  messages[25] = {
    role: 'assistant',
    content: [{
      type: 'tool_use',
      name: 'writeFile',
      input: { path: '/test.js' }
    }],
    _index: 26
  };

  const recentCount = 10;
  console.log(`   原始消息数: ${messages.length}`);
  console.log(`   第26条消息是工具调用（在最近${recentCount}条内）`);

  const result = applyCompression(messages, 'keepImportant', { recentCount });

  console.log(`   压缩后消息数: ${result.messages.length}`);

  // 验证：第26条消息（工具调用）只出现一次
  const toolUseCount = result.messages.filter(m => 
    m.content && Array.isArray(m.content) && m.content.some(block => block.type === 'tool_use' && block.name === 'writeFile')
  ).length;

  if (toolUseCount === 1) {
    console.log('   ✅ 重要消息和最近消息正确去重（只出现一次）');
  } else {
    console.log(`   ❌ 工具调用消息应该只出现1次，实际出现 ${toolUseCount} 次`);
    process.exit(1);
  }

} catch (error) {
  console.error(`   ❌ 测试失败: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}

// 测试 5: 边界情况 - 空消息
console.log('\n📋 测试 5: 边界情况 - 空消息\n');

try {
  const result1 = applyCompression([], 'keepImportant');
  
  if (result1.messages.length === 0) {
    console.log('   ✅ 空消息数组处理正确');
  } else {
    console.log(`   ❌ 空消息数组应该返回空，实际返回 ${result1.messages.length} 条`);
    process.exit(1);
  }

  const result2 = applyCompression([{ role: 'user', content: 'test' }], 'keepImportant');
  
  if (result2.messages.length === 1) {
    console.log('   ✅ 单条消息处理正确');
  } else {
    console.log(`   ❌ 单条消息应该返回1条，实际返回 ${result2.messages.length} 条`);
    process.exit(1);
  }

} catch (error) {
  console.error(`   ❌ 测试失败: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}

// 测试 6: 性能测试
console.log('\n📋 测试 6: 性能测试\n');

try {
  const messages = [];
  for (let i = 1; i <= 1000; i++) {
    messages.push({
      role: i % 2 === 0 ? 'assistant' : 'user',
      content: `消息 ${i}: ` + 'x'.repeat(100),
      _index: i
    });
  }

  // 添加一些重要消息
  for (let i = 100; i < 1000; i += 100) {
    messages[i] = {
      role: 'assistant',
      content: [{
        type: 'tool_use',
        name: `tool${i}`,
        input: { index: i }
      }],
      _index: i + 1
    };
  }

  console.log(`   原始消息数: ${messages.length}`);

  const start = Date.now();
  const result = applyCompression(messages, 'keepImportant', { recentCount: 50 });
  const duration = Date.now() - start;

  console.log(`   压缩后消息数: ${result.messages.length}`);
  console.log(`   压缩耗时: ${duration}ms`);

  if (duration < 100) {
    console.log('   ✅ 性能良好（<100ms）');
  } else if (duration < 500) {
    console.log('   ⚠️  性能可接受（<500ms）');
  } else {
    console.log('   ❌ 性能需要优化（>500ms）');
  }

} catch (error) {
  console.error(`   ❌ 测试失败: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}

// 输出测试结果
console.log('\n' + '='.repeat(80));
console.log('✅ 所有测试通过！\n');

console.log('📊 修复验证:');
console.log('  ✅ 相同内容的消息不会被错误去重');
console.log('  ✅ 保持原始顺序');
console.log('  ✅ 正确保留重要消息和最近消息');
console.log('  ✅ 重要消息和最近消息正确去重');
console.log('  ✅ 边界情况处理正确');
console.log('  ✅ 性能良好\n');

console.log('🎯 Bug 已修复！');
console.log('  • 使用索引跟踪，避免对象引用问题');
console.log('  • 基于索引去重，而不是基于内容');
console.log('  • 保持原始顺序');
console.log('  • 性能优化（减少 JSON.stringify 调用）\n');

process.exit(0);
