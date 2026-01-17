#!/usr/bin/env node
// 简单的测试运行器
import { add, multiply, subtract, divide } from './scenarios/output/math-utils.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
    passed++;
  } catch (error) {
    console.log('✗', name);
    console.log('  Error:', error.message);
    failed++;
  }
}

// 运行测试
test('add(2, 3) === 5', () => {
  if (add(2, 3) !== 5) throw new Error('Expected 5');
});

test('add(-2, 3) === 1', () => {
  if (add(-2, 3) !== 1) throw new Error('Expected 1');
});

test('multiply(2, 3) === 6', () => {
  if (multiply(2, 3) !== 6) throw new Error('Expected 6');
});

test('multiply(-2, 3) === -6', () => {
  if (multiply(-2, 3) !== -6) throw new Error('Expected -6');
});

test('subtract(5, 3) === 2', () => {
  if (subtract(5, 3) !== 2) throw new Error('Expected 2');
});

test('divide(6, 3) === 2', () => {
  if (divide(6, 3) !== 2) throw new Error('Expected 2');
});

test('divide(5, 0) throws error', () => {
  try {
    divide(5, 0);
    throw new Error('Should have thrown');
  } catch (error) {
    if (!error.message.includes('Division by zero')) throw new Error('Wrong error');
  }
});

console.log(`\n测试结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed > 0 ? 1 : 0);
#!/usr/bin/env node
// 简单的测试运行器
import { add, multiply, subtract, divide } from './scenarios/output/math-utils.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
    passed++;
  } catch (error) {
    console.log('✗', name);
    console.log('  Error:', error.message);
    failed++;
  }
}

// 运行测试
test('add(2, 3) === 5', () => {
  if (add(2, 3) !== 5) throw new Error('Expected 5');
});

test('add(-2, 3) === 1', () => {
  if (add(-2, 3) !== 1) throw new Error('Expected 1');
});

test('multiply(2, 3) === 6', () => {
  if (multiply(2, 3) !== 6) throw new Error('Expected 6');
});

test('multiply(-2, 3) === -6', () => {
  if (multiply(-2, 3) !== -6) throw new Error('Expected -6');
});

test('subtract(5, 3) === 2', () => {
  if (subtract(5, 3) !== 2) throw new Error('Expected 2');
});

test('divide(6, 3) === 2', () => {
  if (divide(6, 3) !== 2) throw new Error('Expected 2');
});

test('divide(5, 0) throws error', () => {
  try {
    divide(5, 0);
    throw new Error('Should have thrown');
  } catch (error) {
    if (!error.message.includes('Division by zero')) throw new Error('Wrong error');
  }
});

console.log(`\n测试结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed > 0 ? 1 : 0);
