#!/usr/bin/env node
/**
 * 测试改进后的 thinking 显示效果
 */

import { spawn } from 'child_process';

console.log('='.repeat(70));
console.log('测试改进后的 Thinking 显示效果');
console.log('='.repeat(70));
console.log('\n改进内容：');
console.log('1. budget_tokens: 1600 → 20000 (增加12.5倍)');
console.log('2. UI显示数量: 10条 → 30条 (增加3倍)');
console.log('3. 添加thinking长度统计 (字符数和token数)');
console.log('\n' + '='.repeat(70));
console.log('\n建议测试问题：');
console.log('1. 简单问题: "2+2=?"');
console.log('2. 中等问题: "解释什么是递归"');
console.log('3. 复杂问题: "分析快速排序的时间复杂度"');
console.log('4. 超级复杂: "设计一个微服务架构的电商系统"');
console.log('\n' + '='.repeat(70));
console.log('\n按 Enter 键启动 Closer Code...');

await new Promise(resolve => {
  process.stdin.once('data', resolve);
});

console.log('\n启动 Closer Code...\n');

// 启动 CLI
const cli = spawn('node', ['dist/closer-cli.js'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: {
    ...process.env,
    CLOSER_AUTO_PLAN: 'false',
    CLOSER_AUTO_EXECUTE: 'false'
  }
});

cli.on('exit', (code) => {
  console.log(`\nCloser Code 已退出 (code: ${code})`);
});
