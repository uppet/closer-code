/**
 * 初始化向导命令
 * 导入并运行现有的设置脚本
 */

export default async function setupCommand(args, options) {
  // 导入现有的设置脚本
  const setupModule = await import('../setup.js');

  // 如果 setup.js 导出了 main 函数，调用它
  if (setupModule.main) {
    await setupModule.main();
  } else {
    // 否则尝试运行默认导出
    setupModule.default?.();
  }
}
