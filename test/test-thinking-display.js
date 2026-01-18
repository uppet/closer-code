#!/usr/bin/env node
/**
 * Thinking 显示功能快速测试
 *
 * 测试 AI 的 thinking 内容是否能正确显示
 */

import { spawn } from 'child_process';

console.log('========================================');
console.log('Thinking 显示功能测试');
console.log('========================================\n');

console.log('这个测试将启动 Closer Code 并发送一个简单的问题。');
console.log('请观察 "AI Thinking Process" 区域是否有内容显示。\n');

console.log('提示：');
console.log('- Thinking 内容会以 🤔 开头');
console.log('- 工具调用会以 ⚡ 开头');
console.log('- 工具结果会以 📊 开头');
console.log('- 响应生成会以 ✍️ 开头\n');

console.log('按 Enter 键开始测试...');
await new Promise(resolve => {
  process.stdin.once('data', resolve);
});

console.log('\n启动 Closer Code...\n');

// 启动 CLI
const cli = spawn('node', ['dist/closer-cli.js'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'inherit', 'inherit'],
  env: {
    ...process.env,
    CLOSER_AUTO_PLAN: 'false',
    CLOSER_AUTO_EXECUTE: 'false'
  }
});

// 等待 CLI 启动
await new Promise(resolve => setTimeout(resolve, 2000));

console.log('\n发送测试问题: "列出当前目录的文件"\n');

cli.stdin.write('列出当前目录的文件\n');

// 等待响应
await new Promise(resolve => setTimeout(resolve, 10000));

console.log('\n\n测试完成！');
console.log('\n如果你在 "AI Thinking Process" 区域看到了内容，说明 thinking 功能正常工作。');
console.log('如果没有看到内容，可能是因为：');
console.log('1. API 没有返回 thinking 内容（某些简单查询可能不会触发 thinking）');
console.log('2. 网络延迟导致 thinking 内容没有及时显示');
console.log('\n建议尝试更复杂的问题，例如：');
console.log('"请分析一下这个项目的架构"');
console.log('"帮我检查代码中的安全问题"');

// 终止进程
cli.kill('SIGTERM');

await new Promise(resolve => setTimeout(resolve, 1000));

process.exit(0);
