/**
 * 测试 Ctrl+B 和 Ctrl+F 快捷键
 *
 * Ctrl+B: 向后移动一个字符（Back，相当于左箭头）
 * Ctrl+F: 向前移动一个字符（Forward，相当于右箭头）
 */

console.log('🧪 测试 Ctrl+B 和 Ctrl+F 快捷键\n');

console.log('📋 快捷键说明：\n');
console.log('  Ctrl+B (Back)   - 向后移动一个字符');
console.log('  Ctrl+F (Forward) - 向前移动一个字符\n');

console.log('📝 测试场景：\n');

const testCases = [
  {
    name: '场景1: 从末尾向后移动',
    initialValue: 'hello',
    initialCursor: 5,
    operations: [
      { key: 'Ctrl+B', expectedCursor: 4, description: '光标移到位置4' },
      { key: 'Ctrl+B', expectedCursor: 3, description: '光标移到位置3' },
      { key: 'Ctrl+B', expectedCursor: 2, description: '光标移到位置2' }
    ]
  },
  {
    name: '场景2: 从开头向前移动',
    initialValue: 'world',
    initialCursor: 0,
    operations: [
      { key: 'Ctrl+F', expectedCursor: 1, description: '光标移到位置1' },
      { key: 'Ctrl+F', expectedCursor: 2, description: '光标移到位置2' },
      { key: 'Ctrl+F', expectedCursor: 3, description: '光标移到位置3' }
    ]
  },
  {
    name: '场景3: 混合使用',
    initialValue: 'test',
    initialCursor: 2,
    operations: [
      { key: 'Ctrl+F', expectedCursor: 3, description: '向前移动' },
      { key: 'Ctrl+B', expectedCursor: 2, description: '向后移动' },
      { key: 'Ctrl+B', expectedCursor: 1, description: '再向后移动' },
      { key: 'Ctrl+F', expectedCursor: 2, description: '再向前移动' }
    ]
  },
  {
    name: '场景4: 边界测试',
    initialValue: 'abc',
    initialCursor: 0,
    operations: [
      { key: 'Ctrl+B', expectedCursor: 0, description: '在开头按Ctrl+B，保持不动' },
      { key: 'Ctrl+F', expectedCursor: 1, description: '向前移动' },
      { key: 'Ctrl+F', expectedCursor: 2, description: '再向前移动' },
      { key: 'Ctrl+F', expectedCursor: 3, description: '移到末尾' },
      { key: 'Ctrl+F', expectedCursor: 3, description: '在末尾按Ctrl+F，保持不动' }
    ]
  },
  {
    name: '场景5: 与其他快捷键组合',
    initialValue: 'example text',
    initialCursor: 0,
    operations: [
      { key: 'Ctrl+E', expectedCursor: 12, description: '跳到末尾' },
      { key: 'Ctrl+B', expectedCursor: 11, description: '向后移动一个字符' },
      { key: 'Ctrl+B', expectedCursor: 10, description: '再向后移动' },
      { key: 'Ctrl+A', expectedCursor: 0, description: '跳到开头' },
      { key: 'Ctrl+F', expectedCursor: 1, description: '向前移动一个字符' }
    ]
  }
];

testCases.forEach((test, index) => {
  console.log(`${index + 1}. ${test.name}`);
  console.log(`   初始值: "${test.initialValue}"`);
  console.log(`   初始光标: ${test.initialCursor}`);
  console.log(`   操作序列:`);

  let currentCursor = test.initialCursor;
  test.operations.forEach((op, opIndex) => {
    console.log(`     ${opIndex + 1}. ${op.key} → 期望光标: ${op.expectedCursor} (${op.description})`);
    currentCursor = op.expectedCursor;
  });
  console.log('');
});

console.log('💡 使用技巧：\n');
console.log('1. 快速移动光标');
console.log('   - Ctrl+B: 不用离开主键盘区，向后移动光标');
console.log('   - Ctrl+F: 不用离开主键盘区，向前移动光标\n');

console.log('2. 组合使用');
console.log('   - Ctrl+A: 跳到行首');
console.log('   - Ctrl+F x N: 精确移动到指定位置');
console.log('   - Ctrl+E: 跳到行尾');
console.log('   - Ctrl+B x N: 精确移动到指定位置\n');

console.log('3. 编辑效率');
console.log('   - 输入文本');
console.log('   - 使用 Ctrl+B 回到需要修改的位置');
console.log('   - 修改后使用 Ctrl+F 或 Ctrl+E 跳到末尾继续输入\n');

console.log('🔍 bash 兼容性：\n');
console.log('这些快捷键在 bash 中有相同的含义：');
console.log('  Ctrl+B = backward-char (向后一个字符)');
console.log('  Ctrl+F = forward-char (向前一个字符)');
console.log('  Ctrl+A = beginning-of-line (行首)');
console.log('  Ctrl+E = end-of-line (行尾)\n');

console.log('📝 测试方法：\n');
console.log('1. 编译: npm run build:cli');
console.log('2. 运行: node dist/closer-cli.js');
console.log('3. 在输入框中输入 "hello world"');
console.log('4. 测试以下操作：');
console.log('   - 按 Ctrl+B 多次，光标应该向后移动');
console.log('   - 按 Ctrl+F 多次，光标应该向前移动');
console.log('   - 按 Ctrl+A 跳到开头，然后 Ctrl+F 移动');
console.log('   - 按 Ctrl+E 跳到末尾，然后 Ctrl+B 移动\n');

console.log('✅ Ctrl+B 和 Ctrl+F 快捷键已添加！\n');
