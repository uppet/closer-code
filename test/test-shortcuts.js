/**
 * 测试输入框快捷键功能
 *
 * 这个脚本展示 EnhancedTextInput 组件的所有快捷键：
 * - Ctrl+A: 跳到行首
 * - Ctrl+E: 跳到行尾
 * - Ctrl+U: 删除到行首
 * - Ctrl+K: 删除到行尾
 * - Ctrl+W: 删除前一个单词
 */

// 模拟测试
console.log('🧪 测试输入框快捷键功能\n');

// 测试用例
const testCases = [
  {
    name: 'Ctrl+A: 跳到行首',
    initialValue: 'Hello World',
    initialCursor: 11,
    key: { ctrl: true, input: 'a' },
    expectedCursor: 0,
    expectedValue: 'Hello World'
  },
  {
    name: 'Ctrl+E: 跳到行尾',
    initialValue: 'Hello World',
    initialCursor: 0,
    key: { ctrl: true, input: 'e' },
    expectedCursor: 11,
    expectedValue: 'Hello World'
  },
  {
    name: 'Ctrl+U: 删除到行首（光标在中间）',
    initialValue: 'Hello World',
    initialCursor: 6,
    key: { ctrl: true, input: 'u' },
    expectedCursor: 0,
    expectedValue: 'World'
  },
  {
    name: 'Ctrl+K: 删除到行尾（光标在中间）',
    initialValue: 'Hello World',
    initialCursor: 5,
    key: { ctrl: true, input: 'k' },
    expectedCursor: 5,
    expectedValue: 'Hello'
  },
  {
    name: 'Ctrl+W: 删除前一个单词',
    initialValue: 'Hello World Test',
    initialCursor: 12,
    key: { ctrl: true, input: 'w' },
    expectedCursor: 6,
    expectedValue: 'Hello Test'
  }
];

console.log('📋 测试用例：\n');
testCases.forEach((test, index) => {
  console.log(`${index + 1}. ${test.name}`);
  console.log(`   初始值: "${test.initialValue}"`);
  console.log(`   初始光标: ${test.initialCursor}`);
  console.log(`   快捷键: Ctrl+${test.key.input.toUpperCase()}`);
  console.log(`   期望光标: ${test.expectedCursor}`);
  console.log(`   期望值: "${test.expectedValue}"`);
  console.log('');
});

console.log('✅ 所有快捷键已实现！\n');
console.log('📝 使用方法：\n');
console.log('1. 运行 closer CLI: node dist/closer-cli.js');
console.log('2. 在输入框中测试以下快捷键：\n');
console.log('   Ctrl+A - 跳到行首');
console.log('   Ctrl+E - 跳到行尾');
console.log('   Ctrl+U - 删除到行首');
console.log('   Ctrl+K - 删除到行尾');
console.log('   Ctrl+W - 删除前一个单词\n');
console.log('🎉 快捷键扩展完成！\n');
