/**
 * 极简模式命令
 * 启动极简界面，只提供一个多行输入框
 */

export default async function minimalCommand(args, options) {
  // 将 testMode 选项传递给全局，供 minimal-cli.jsx 使用
  if (options.test) {
    process.env.CLOSER_TEST_MODE = '1';
  }
  // 动态导入并运行极简模式
  await import('../minimal-cli.jsx');
}
