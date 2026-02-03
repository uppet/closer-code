/**
 * 文本处理工具函数测试
 *
 * 运行测试: node src/utils/text-processing.test.js
 */

import {
  normalizeLineBreaks,
  getStringDisplayLength,
  getCharAtDisplayPosition,
  isPrintableChar,
  filterPrintableChars,
  truncateByDisplayWidth,
  padToDisplayWidth
} from './text-processing.js';

// 测试计数器
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// 测试辅助函数
function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ ${name}`);
    passedTests++;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   ${error.message}`);
    failedTests++;
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(
      message || `Expected "${expected}" but got "${actual}"`
    );
  }
}

console.log('🧪 开始测试文本处理工具函数\n');

// ========== normalizeLineBreaks 测试 ==========
console.log('📝 测试 normalizeLineBreaks');

test('应该将 \\r\\n 转换为 \\n', () => {
  assertEqual(normalizeLineBreaks('Hello\r\nWorld'), 'Hello\nWorld');
});

test('应该将 \\r 转换为 \\n', () => {
  assertEqual(normalizeLineBreaks('Hello\rWorld'), 'Hello\nWorld');
});

test('应该保持 \\n 不变', () => {
  assertEqual(normalizeLineBreaks('Hello\nWorld'), 'Hello\nWorld');
});

test('应该处理混合换行符', () => {
  assertEqual(
    normalizeLineBreaks('Line1\r\nLine2\rLine3\nLine4'),
    'Line1\nLine2\nLine3\nLine4'
  );
});

test('应该处理空字符串', () => {
  assertEqual(normalizeLineBreaks(''), '');
});

test('应该处理 null', () => {
  assertEqual(normalizeLineBreaks(null), '');
});

// ========== getStringDisplayLength 测试 ==========
console.log('\n📏 测试 getStringDisplayLength');

test('ASCII 字符宽度应该为 1', () => {
  assertEqual(getStringDisplayLength('Hello'), 5);
  assertEqual(getStringDisplayLength('12345'), 5);
});

test('中文字符宽度应该为 2', () => {
  assertEqual(getStringDisplayLength('你好'), 4);
  assertEqual(getStringDisplayLength('世界'), 4);
});

test('混合文本宽度计算正确', () => {
  assertEqual(getStringDisplayLength('Hello你好'), 9);
  assertEqual(getStringDisplayLength('A你B好C'), 7);
});

test('emoji 宽度应该为 2', () => {
  const result = getStringDisplayLength('😀😁');
  // emoji 可能是代理对，长度为 2 个字符，每个宽度为 2
  assertEqual(result >= 4, true);
});

test('空字符串宽度为 0', () => {
  assertEqual(getStringDisplayLength(''), 0);
});

// ========== getCharAtDisplayPosition 测试 ==========
console.log('\n🎯 测试 getCharAtDisplayPosition');

test('ASCII 字符位置转换正确', () => {
  assertEqual(getCharAtDisplayPosition('Hello', 2), 2);
  assertEqual(getCharAtDisplayPosition('Hello', 5), 5);
});

test('中文字符位置转换正确', () => {
  assertEqual(getCharAtDisplayPosition('你好', 0), 0);
  assertEqual(getCharAtDisplayPosition('你好', 1), 0);
  assertEqual(getCharAtDisplayPosition('你好', 2), 1);
  assertEqual(getCharAtDisplayPosition('你好', 3), 1);
  assertEqual(getCharAtDisplayPosition('你好', 4), 2);
});

test('混合文本位置转换正确', () => {
  assertEqual(getCharAtDisplayPosition('A你好', 0), 0);
  assertEqual(getCharAtDisplayPosition('A你好', 1), 1);
  assertEqual(getCharAtDisplayPosition('A你好', 2), 1);
  assertEqual(getCharAtDisplayPosition('A你好', 3), 2);
  assertEqual(getCharAtDisplayPosition('A你好', 4), 2);
  assertEqual(getCharAtDisplayPosition('A你好', 5), 3);
});

test('超出范围返回字符串长度', () => {
  assertEqual(getCharAtDisplayPosition('Hello', 10), 5);
  assertEqual(getCharAtDisplayPosition('你好', 10), 2);
});

// ========== isPrintableChar 测试 ==========
console.log('\n✅ 测试 isPrintableChar');

test('字母数字可打印', () => {
  assertEqual(isPrintableChar('a'), true);
  assertEqual(isPrintableChar('Z'), true);
  assertEqual(isPrintableChar('0'), true);
});

test('空格可打印', () => {
  assertEqual(isPrintableChar(' '), true);
});

test('制表符、换行符、回车符可打印', () => {
  assertEqual(isPrintableChar('\t'), true);
  assertEqual(isPrintableChar('\n'), true);
  assertEqual(isPrintableChar('\r'), true);
});

test('控制字符不可打印', () => {
  assertEqual(isPrintableChar('\x00'), false);
  assertEqual(isPrintableChar('\x01'), false);
  assertEqual(isPrintableChar('\x08'), false);
  assertEqual(isPrintableChar('\x7F'), false);
});

test('中文字符可打印', () => {
  assertEqual(isPrintableChar('你'), true);
  assertEqual(isPrintableChar('好'), true);
});

// ========== filterPrintableChars 测试 ==========
console.log('\n🔍 测试 filterPrintableChars');

test('应该过滤 null 字符', () => {
  assertEqual(filterPrintableChars('Hello\x00World'), 'HelloWorld');
});

test('应该保留换行符', () => {
  assertEqual(filterPrintableChars('Line1\nLine2'), 'Line1\nLine2');
});

test('应该过滤多个控制字符', () => {
  assertEqual(
    filterPrintableChars('A\x01\x02\x03B'),
    'AB'
  );
});

test('应该处理空字符串', () => {
  assertEqual(filterPrintableChars(''), '');
});

test('应该处理 null', () => {
  assertEqual(filterPrintableChars(null), '');
});

// ========== truncateByDisplayWidth 测试 ==========
console.log('\n✂️ 测试 truncateByDisplayWidth');

test('应该截断超长 ASCII 字符串', () => {
  assertEqual(truncateByDisplayWidth('Hello World', 8), 'Hello...');
});

test('应该截断超长中文', () => {
  const result = truncateByDisplayWidth('你好世界', 4);
  assertEqual(result.includes('...'), true);
});

test('不应该截断短字符串', () => {
  assertEqual(truncateByDisplayWidth('Hello', 10), 'Hello');
});

test('应该处理空字符串', () => {
  assertEqual(truncateByDisplayWidth('', 10), '');
});

// ========== padToDisplayWidth 测试 ==========
console.log('\n📐 测试 padToDisplayWidth');

test('应该填充 ASCII 字符串', () => {
  assertEqual(padToDisplayWidth('Hello', 10), 'Hello     ');
});

test('应该填充中文字符串', () => {
  const result = padToDisplayWidth('你好', 6);
  assertEqual(getStringDisplayLength(result), 6);
});

test('不应该填充已满宽度的字符串', () => {
  assertEqual(padToDisplayWidth('Hello', 5), 'Hello');
});

test('应该处理空字符串', () => {
  assertEqual(padToDisplayWidth('', 5), '     ');
});

// ========== 测试总结 ==========
console.log('\n' + '='.repeat(50));
console.log(`📊 测试完成！`);
console.log(`   总计: ${totalTests}`);
console.log(`   ✅ 通过: ${passedTests}`);
console.log(`   ❌ 失败: ${failedTests}`);
console.log('='.repeat(50));

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 所有测试通过！');
  process.exit(0);
}
