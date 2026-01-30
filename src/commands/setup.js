/**
 * 初始化向导命令
 * 使用 Ink 组件避免与主应用的输入处理冲突
 */

export default async function setupCommand(args, options) {
  // 使用 Ink 版本的配置向导
  try {
    const { startSetupWizard } = await import('./setup-wizard.jsx');
    const config = await startSetupWizard();
    
    console.log('\n✅ 配置完成！');
    console.log('\n你现在可以运行: npm start\n');
  } catch (error) {
    console.error('\n❌ 配置失败:', error.message);
    process.exit(1);
  }
}
