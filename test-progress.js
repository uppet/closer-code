#!/usr/bin/env node
/**
 * 测试工具执行进度事件
 */

import { createConversation } from './src/conversation.js';
import { loadConfig } from './src/config.js';

async function testProgress() {
  console.log('🧪 测试工具执行进度事件\n');

  // 加载配置
  const config = await loadConfig();

  // 创建对话会话
  const conversation = await createConversation(config);

  // 发送需要工具调用的消息
  console.log('📝 测试：列出当前目录的文件\n');
  console.log('━'.repeat(60));

  const response = await conversation.sendMessage('请列出当前目录的文件', (event) => {
    switch (event.type) {
      case 'tool_start':
        console.log(`\n🔧 [工具开始] ${event.tool}`);
        console.log(`   输入:`, JSON.stringify(event.input, null, 2));
        break;
      case 'tool_complete':
        console.log(`\n✅ [工具完成] ${event.tool}`);
        if (event.result.success) {
          console.log(`   状态: 成功`);
          if (event.result.stdout) {
            console.log(`   输出:`, event.result.stdout.substring(0, 100) + '...');
          }
        } else {
          console.log(`   状态: 失败`);
          console.log(`   错误:`, event.result.error);
        }
        break;
      default:
        console.log(`\n📌 [事件] ${event.type}`);
    }
  });

  console.log('\n' + '━'.repeat(60));
  console.log('\n📊 AI 响应:');
  console.log(response.content);

  console.log('\n\n✅ 测试完成！');
  console.log('\n如果上面显示了 "工具开始" 和 "工具完成" 消息，');
  console.log('说明进度事件正常工作。');
}

testProgress().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
