/**
 * 初始化向导命令
 * 支持增强版和原版配置向导
 */

export default async function setupCommand(args, options) {
  console.log('🚀 Closer Code 配置向导\n');

  // 检查是否使用增强版
  const useEnhanced = !options.legacy;

  if (useEnhanced) {
    console.log('使用增强版配置向导...\n');
    try {
      // 导入增强版设置脚本并调用其函数
      const { setupEnhanced } = await import('../setup-enhanced.js');
      await setupEnhanced();
    } catch (error) {
      console.log('⚠️  增强版配置向导加载失败，使用原版...\n');
      // 回退到原版
      await runLegacySetup();
    }
  } else {
    console.log('使用原版配置向导...\n');
    await runLegacySetup();
  }
}

/**
 * 运行原版配置向导
 */
async function runLegacySetup() {
  try {
    const { setup } = await import('../setup.js');
    await setup();
  } catch (error) {
    console.error('配置向导运行失败:', error.message);
    process.exit(1);
  }
}
