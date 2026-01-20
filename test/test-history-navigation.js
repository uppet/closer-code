/**
 * 测试历史记录导航功能
 */

import { createHistoryManager } from '../src/input/history.js';

async function test() {
  console.log('🧪 测试历史记录导航功能\n');

  const history = createHistoryManager({ maxSize: 10 });

  // 添加一些历史记录
  console.log('✅ 添加历史记录');
  history.add('第一条消息');
  history.add('第二条消息');
  history.add('第三条消息');
  history.add('第四条消息');
  history.add('第五条消息');
  console.log(`   添加了 5 条记录\n`);

  // 模拟用户输入
  let currentInput = '';

  // 测试向上导航
  console.log('✅ 测试向上导航（模拟按 ↑ 键）');
  for (let i = 0; i < 7; i++) {
    const result = history.navigate('up', currentInput);
    if (result !== null) {
      currentInput = result;
      const stats = history.getStats();
      console.log(`   第 ${i + 1} 次 ↑: "${result}" [索引: ${stats.currentIndex + 1}/${stats.total}]`);
    } else {
      console.log(`   第 ${i + 1} 次 ↑: 已到达最早记录`);
      break;
    }
  }
  console.log();

  // 测试向下导航
  console.log('✅ 测试向下导航（模拟按 ↓ 键）');
  for (let i = 0; i < 7; i++) {
    const result = history.navigate('down', currentInput);
    if (result !== null) {
      currentInput = result;
      const stats = history.getStats();
      console.log(`   第 ${i + 1} 次 ↓: "${result}" [索引: ${stats.currentIndex + 1}/${stats.total}]`);
    } else {
      console.log(`   第 ${i + 1} 次 ↓: 返回到输入模式`);
      break;
    }
  }
  console.log();

  // 测试在浏览历史时编辑输入
  console.log('✅ 测试在浏览历史时编辑输入');
  let navResult = history.navigate('up', '');
  console.log(`   按 ↑ 获取: "${navResult}"`);
  
  // 模拟用户编辑（这应该重置导航状态）
  console.log('   用户编辑输入框...');
  history.resetNavigation();
  
  // 再次尝试导航
  navResult = history.navigate('up', '');
  const stats = history.getStats();
  console.log(`   重置后按 ↑: "${navResult}" [索引: ${stats.currentIndex + 1}/${stats.total}]`);
  console.log();

  console.log('🎉 所有测试完成！\n');
  console.log('📝 使用说明：');
  console.log('   1. 在 CLI 中输入一些消息');
  console.log('   2. 按 ↑ 键浏览历史记录');
  console.log('   3. 按 ↓ 键返回更近的记录');
  console.log('   4. 开始编辑输入会自动退出历史浏览模式\n');
}

test().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
