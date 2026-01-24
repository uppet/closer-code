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
      // 导入增强版设置脚本
      const setupModule = await import('../setup-enhanced.js');
      // 增强版会自动运行
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
    const setupModule = await import('../setup.js');
    
    // 如果 setup.js 导出了 main 函数，调用它
    if (setupModule.main) {
      await setupModule.main();
    } else {
      // 否则尝试运行默认导出
      setupModule.default?.();
    }
  } catch (error) {
    console.error('配置向导运行失败:', error.message);
    process.exit(1);
  }
}
