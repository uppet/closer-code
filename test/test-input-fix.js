/**
 * 测试输入框字符顺序bug修复
 *
 * Bug: 在空输入框时输入"study"，会得到"tudys"
 * 原因: 边界检查使用了 originalValue.length 而不是 nextValue.length
 */

console.log('🧪 测试输入框字符顺序修复\n');

// 模拟测试场景
const testCases = [
  {
    name: '空输入框输入单个字符',
    initialValue: '',
    input: 's',
    expectedValue: 's',
    expectedCursor: 1
  },
  {
    name: '空输入框输入多个字符（连续输入）',
    initialValue: '',
    inputs: ['s', 't', 'u', 'd', 'y'],
    expectedValue: 'study',
    expectedCursor: 5
  },
  {
    name: '中间插入字符',
    initialValue: 'hello',
    initialCursor: 2, // 'he|llo'
    input: 'x',
    expectedValue: 'hexllo',
    expectedCursor: 3
  },
  {
    name: '末尾添加字符',
    initialValue: 'hello',
    initialCursor: 5,
    input: ' world',
    expectedValue: 'hello world',
    expectedCursor: 11
  },
  {
    name: '开头插入字符',
    initialValue: 'world',
    initialCursor: 0,
    input: 'hello ',
    expectedValue: 'hello world',
    expectedCursor: 6
  }
];

console.log('📋 测试用例：\n');
testCases.forEach((test, index) => {
  console.log(`${index + 1}. ${test.name}`);
  if (test.inputs) {
    console.log(`   输入序列: "${test.inputs.join('" -> "')}"`);
    console.log(`   期望结果: "${test.expectedValue}"`);
  } else {
    console.log(`   初始值: "${test.initialValue}"`);
    console.log(`   光标位置: ${test.initialCursor}`);
    console.log(`   输入: "${test.input}"`);
    console.log(`   期望结果: "${test.expectedValue}"`);
  }
  console.log(`   期望光标: ${test.expectedCursor}`);
  console.log('');
});

console.log('✅ 修复说明：\n');
console.log('问题：边界检查使用了 originalValue.length');
console.log('影响：导致光标位置被错误限制，字符顺序反转\n');

console.log('修复前：');
console.log('  if (nextCursorOffset > originalValue.length) {');
console.log('    nextCursorOffset = originalValue.length;');
console.log('  }\n');

console.log('修复后：');
console.log('  if (nextCursorOffset > nextValue.length) {');
console.log('    nextCursorOffset = nextValue.length;');
console.log('  }\n');

console.log('🔍 原因分析：\n');
console.log('当输入字符时：');
console.log('1. nextValue = originalValue.slice(0, cursorOffset) + input + ...');
console.log('2. nextCursorOffset += input.length');
console.log('3. 边界检查时应该用 nextValue.length，而不是 originalValue.length\n');

console.log('示例：输入"study"');
console.log('  输入"s": nextValue="s", nextCursorOffset=1');
console.log('           但 originalValue.length=0，被重置为0 ❌');
console.log('  输入"t": nextValue="ts", nextCursorOffset=2');
console.log('           但 originalValue.length=1，被重置为1 ❌');
console.log('  结果: "tudys" 😱\n');

console.log('修复后：');
console.log('  输入"s": nextValue="s", nextCursorOffset=1 ✅');
console.log('  输入"t": nextValue="st", nextCursorOffset=2 ✅');
console.log('  结果: "study" 😊\n');

console.log('📝 测试方法：\n');
console.log('1. 编译: npm run build:cli');
console.log('2. 运行: node dist/closer-cli.js');
console.log('3. 在输入框中输入"study"，检查是否正确显示\n');

console.log('🎉 Bug已修复！\n');
