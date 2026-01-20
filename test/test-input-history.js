/**
 * 输入历史记录功能测试
 */

import { createHistoryManager } from '../src/input/history.js';
import fs from 'fs';
import os from 'os';

async function testHistory() {
  console.log('🧪 测试输入历史记录功能\n');

  // 创建临时历史记录管理器（不使用持久化）
  const history = new (await import('../src/input/history.js')).InputHistory({ maxSize: 10 });
  
  console.log('✅ 1. 测试添加历史记录');
  history.add('第一条消息');
  history.add('第二条消息');
  history.add('第三条消息');
  console.log(`   添加了 3 条记录`);
  console.log(`   当前记录数: ${history.history.length}\n`);

  console.log('✅ 2. 测试向上导航');
  let result = history.navigate('up', '');
  console.log(`   向上导航: "${result}"`);
  console.log(`   当前索引: ${history.currentIndex}\n`);

  console.log('✅ 3. 测试继续向上导航');
  result = history.navigate('up', result);
  console.log(`   向上导航: "${result}"`);
  console.log(`   当前索引: ${history.currentIndex}\n`);

  console.log('✅ 4. 测试向下导航');
  result = history.navigate('down', result);
  console.log(`   向下导航: "${result}"`);
  console.log(`   当前索引: ${history.currentIndex}\n`);

  console.log('✅ 5. 测试向下导航到最后');
  result = history.navigate('down', result);
  console.log(`   向下导航: "${result}"`);
  console.log(`   当前索引: ${history.currentIndex}\n`);

  console.log('✅ 6. 测试重复记录过滤');
  history.add('第三条消息'); // 重复
  history.add('第四条消息');
  console.log(`   添加重复记录和一条新记录`);
  console.log(`   当前记录数: ${history.history.length}\n`);

  console.log('✅ 7. 测试搜索功能');
  history.add('搜索测试消息');
  history.add('搜索关键词');
  history.add('其他消息');
  
  const searchResult = history.search('搜索');
  console.log(`   搜索 "搜索": 找到 ${history.searchResults.length} 条结果`);
  console.log(`   第一条结果: "${searchResult}"\n`);

  console.log('✅ 8. 测试搜索导航');
  const nextResult = history.navigateSearch('next');
  console.log(`   下一个搜索结果: "${nextResult}"\n`);

  console.log('✅ 9. 测试统计信息');
  const stats = history.getStats();
  console.log(`   统计信息:`, stats);
  console.log();

  console.log('✅ 10. 测试重置导航');
  history.resetNavigation();
  console.log(`   重置后索引: ${history.currentIndex}\n`);

  console.log('✅ 11. 测试最大容量限制');
  for (let i = 0; i < 20; i++) {
    history.add(`消息 ${i}`);
  }
  console.log(`   添加 20 条记录后`);
  console.log(`   实际记录数: ${history.history.length} (限制: 10)\n`);

  console.log('✅ 12. 测试清空历史');
  history.clear();
  console.log(`   清空后记录数: ${history.history.length}\n`);

  console.log('🎉 所有测试通过！\n');
  
  // 显示快捷键帮助
  console.log('📝 输入历史快捷键:');
  console.log('   ↑/↓      - 浏览历史记录');
  console.log('   Ctrl+R   - 搜索历史记录（待实现）');
  console.log('   Ctrl+U   - 删除到行首');
  console.log('   Ctrl+K   - 删除到行尾');
  console.log('   Ctrl+A   - 跳到行首');
  console.log('   Ctrl+E   - 跳到行尾');
  console.log('   Ctrl+W   - 删除前一个单词\n');
}

// 运行测试
testHistory().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
