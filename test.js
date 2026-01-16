const { executeBashCommand, BashResult } = require('./bash-runner');

/**
 * 测试示例
 */
async function runTests() {
  console.log('===== Bash 调用测试 =====\n');

  // 测试 1: 简单命令
  console.log('--- 测试 1: 列出当前目录文件 ---');
  const result1 = await executeBashCommand('ls -la');
  console.log(result1.toString());
  console.log('成功:', result1.success);
  console.log();

  // 测试 2: 带管道的命令
  console.log('--- 测试 2: 统计文件数量 ---');
  const result2 = await executeBashCommand('ls | wc -l');
  console.log('退出码:', result2.exitCode);
  console.log('输出:', result2.stdout.trim());
  console.log('成功:', result2.success);
  console.log();

  // 测试 3: 输出到 stderr 的命令
  console.log('--- 测试 3: 错误输出测试 ---');
  const result3 = await executeBashCommand('echo "错误信息" >&2');
  console.log('Stdout:', result3.stdout);
  console.log('Stderr:', result3.stderr);
  console.log();

  // 测试 4: 不存在的命令
  console.log('--- 测试 4: 不存在的命令 ---');
  const result4 = await executeBashCommand('thiscommanddoesnotexist123');
  console.log('成功:', result4.success);
  console.log('退出码:', result4.exitCode);
  console.log('Stderr:', result4.stderr);
  console.log();

  // 测试 5: JSON 格式输出
  console.log('--- 测试 5: JSON 格式输出 ---');
  const result5 = await executeBashCommand('echo "Hello from bash!" && echo "当前日期: $(date)"');
  console.log(JSON.stringify(result5.toJSON(), null, 2));
  console.log();

  // 测试 6: 复杂命令
  console.log('--- 测试 6: 复杂命令 (for 循环) ---');
  const complexCmd = `
for i in {1..3}; do
  echo "计数: $i"
done
echo "完成!"
`;
  const result6 = await executeBashCommand(complexCmd.trim());
  console.log(result6.toString());

  console.log('\n===== 测试完成 =====');
}

// 运行测试
runTests().catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});
