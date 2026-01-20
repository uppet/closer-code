#!/usr/bin/env node
/**
 * Ctrl+Z 功能测试
 *
 * 这个脚本测试 Ctrl+Z 挂起功能是否正常工作
 */

import readline from 'readline';

console.log('=== Ctrl+Z 功能测试 ===\n');
console.log('这个测试会模拟 Cloco 的 Ctrl+Z 处理\n');

console.log('测试说明：');
console.log('1. 程序会等待键盘输入');
console.log('2. 按 Ctrl+Z 应该会挂起程序');
console.log('3. 在终端输入 fg 恢复程序');
console.log('4. 按 Ctrl+C 退出测试\n');

console.log('开始测试...\n');
console.log('✅ 程序正在运行');
console.log('💡 现在按 Ctrl+Z 挂起程序\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 监听键盘输入
rl.input.on('keypress', (str, key) => {
  if (key.ctrl && key.name === 'z') {
    console.log('\n⏸️  检测到 Ctrl+Z');
    console.log('📤 发送 SIGTSTP 信号挂起程序...\n');

    // 发送 SIGTSTP 信号给自己
    process.kill(process.pid, 'SIGTSTP');

    // 程序恢复后会继续执行这里
    console.log('✅ 程序已恢复！');
    console.log('💡 按 Ctrl+C 退出测试\n');
  } else if (key.ctrl && key.name === 'c') {
    console.log('\n👋 退出测试\n');
    rl.close();
    process.exit(0);
  }
});

// 启用原始模式以接收所有按键
process.stdin.setRawMode(true);
process.stdin.resume();

// 监听 SIGCONT 信号（恢复时触发）
process.on('SIGCONT', () => {
  console.log('📥 收到 SIGCONT 信号，程序正在恢复...\n');
});
