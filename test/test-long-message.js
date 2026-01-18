#!/usr/bin/env node
/**
 * 测试长消息显示
 */

import { writeFile } from 'fs/promises';

async function testLongMessage() {
  console.log('🧪 测试长消息显示\n');
  console.log('═'.repeat(60));

  // 创建一个超长的测试消息
  const longContent = [];

  // 1. 测试多行文本（100行）
  longContent.push('## 测试1: 多行文本（100行）');
  for (let i = 1; i <= 100; i++) {
    longContent.push(`这是第 ${i} 行内容，用于测试长文本显示功能。`);
  }

  // 2. 测试长字符串（5000字符）
  longContent.push('\n## 测试2: 长字符串（5000字符）');
  const longString = 'A'.repeat(5000);
  longContent.push(longString);

  // 3. 测试代码块（50行代码）
  longContent.push('\n## 测试3: 代码块（50行）');
  longContent.push('```javascript');
  for (let i = 1; i <= 50; i++) {
    longContent.push(`  const line${i} = "这是第 ${i} 行代码";`);
  }
  longContent.push('```');

  // 4. 测试混合内容
  longContent.push('\n## 测试4: 混合内容');
  longContent.push('这是一些普通文本...');
  longContent.push(''.padStart(200, '-')); // 200个横线
  longContent.push('更多内容...');

  const fullContent = longContent.join('\n');

  console.log('\n📊 统计信息:');
  console.log(`  总行数: ${fullContent.split('\n').length}`);
  console.log(`  总字符数: ${fullContent.length}`);
  console.log(`  总大小: ${(fullContent.length / 1024).toFixed(2)} KB`);

  console.log('\n✅ 测试消息已生成！');
  console.log('\n💡 使用方法:');
  console.log('  1. 启动 cloco');
  console.log('  2. 粘贴上面的测试内容');
  console.log('  3. 检查是否完整显示（不应有 "truncated" 提示）');
  console.log('  4. 使用上下箭头滚动查看');
  console.log('  5. 按 Enter 回到底部\n');

  // 保存到文件供参考
  await writeFile('test-long-message.txt', fullContent, 'utf-8');
  console.log('✅ 测试内容已保存到: test-long-message.txt\n');

  console.log('═'.repeat(60));
  console.log('\n📋 测试内容预览（前20行）:\n');
  console.log(fullContent.split('\n').slice(0, 20).join('\n'));
  console.log('\n... (还有更多内容)\n');
}

testLongMessage().catch(console.error);
