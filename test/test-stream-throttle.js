/**
 * 测试流式更新节流功能（Buffer + Throttle）
 *
 * 验证消息逐字打印的更新频率限制
 */

import { createConversation } from '../src/conversation.js';
import { loadConfig } from '../src/config.js';

// 加载配置
const config = loadConfig();

// 显示当前配置
console.log('🔧 流式更新配置:');
console.log(`   更新间隔: ${config.ui.streamUpdate.interval}ms`);
console.log(`   缓冲区大小: ${config.ui.streamUpdate.bufferSize} tokens`);
console.log(`   标点更新: ${config.ui.streamUpdate.updateOnPunctuation ? '启用' : '禁用'}`);
console.log('');

// 模拟 token 流
function simulateTokenStream() {
  const testText = '这是一个测试句子。这是第二个句子！这是第三个句子？这是第四个句子。';

  console.log('📝 模拟 token 流:');
  console.log(`   原始文本: "${testText}"`);
  console.log(`   字符数: ${testText.length}`);
  console.log('');

  // 创建模拟的 Conversation 对象（只测试节流逻辑）
  const mockConversation = {
    streamUpdate: {
      lastUpdateTime: 0,
      queuedTokens: [],
      interval: config.ui.streamUpdate.interval,
      bufferSize: config.ui.streamUpdate.bufferSize,
      updateOnPunctuation: config.ui.streamUpdate.updateOnPunctuation
    }
  };

  const updates = [];
  const startTime = Date.now();

  // 逐字符发送（模拟 token 流）
  for (let i = 0; i < testText.length; i++) {
    const char = testText[i];
    const now = Date.now();
    const timeSinceLastUpdate = now - mockConversation.streamUpdate.lastUpdateTime;

    // 累积 token
    mockConversation.streamUpdate.queuedTokens.push(char);
    const combinedContent = mockConversation.streamUpdate.queuedTokens.join('');

    // 检查是否应该更新（满足任一条件）
    const shouldUpdate =
      timeSinceLastUpdate >= mockConversation.streamUpdate.interval || // 条件1: 时间间隔
      mockConversation.streamUpdate.queuedTokens.length >= mockConversation.streamUpdate.bufferSize || // 条件2: 缓冲区满
      (mockConversation.streamUpdate.updateOnPunctuation && /[.!?。！？]\s*$/.test(combinedContent)); // 条件3: 句子结束

    if (shouldUpdate) {
      updates.push({
        time: now - startTime,
        content: combinedContent,
        tokenCount: mockConversation.streamUpdate.queuedTokens.length,
        reason: [
          timeSinceLastUpdate >= mockConversation.streamUpdate.interval ? '时间间隔' : null,
          mockConversation.streamUpdate.queuedTokens.length >= mockConversation.streamUpdate.bufferSize ? '缓冲区满' : null,
          (mockConversation.streamUpdate.updateOnPunctuation && /[.!?。！？]\s*$/.test(combinedContent)) ? '标点符号' : null
        ].filter(Boolean).join(' + ')
      });

      mockConversation.streamUpdate.queuedTokens = [];
      mockConversation.streamUpdate.lastUpdateTime = now;
    }

    // 模拟延迟（每个 token 间隔 50ms）
    // 注意：实际测试时不需要延迟，这里只是为了演示
  }

  // 发送剩余的 tokens
  if (mockConversation.streamUpdate.queuedTokens.length > 0) {
    updates.push({
      time: Date.now() - startTime,
      content: mockConversation.streamUpdate.queuedTokens.join(''),
      tokenCount: mockConversation.streamUpdate.queuedTokens.length,
      reason: '剩余内容'
    });
  }

  return updates;
}

// 运行测试
try {
  const updates = simulateTokenStream();

  console.log('📊 更新统计:');
  console.log(`   总更新次数: ${updates.length}`);
  console.log(`   原始 token 数: ${updates.reduce((sum, u) => sum + u.tokenCount, 0)}`);
  console.log('');

  console.log('📋 更新详情:');
  updates.forEach((update, index) => {
    console.log(`   更新 #${index + 1}:`);
    console.log(`     时间: ${update.time}ms`);
    console.log(`     Token 数: ${update.tokenCount}`);
    console.log(`     原因: ${update.reason}`);
    console.log(`     内容: "${update.content}"`);
    console.log('');
  });

  console.log('✅ 测试完成！');
  console.log('');
  console.log('💡 说明:');
  console.log('   - 每次更新都包含多个累积的 tokens');
  console.log('   - 更新由以下条件触发（满足任一即可）:');
  console.log('     1. 时间间隔达到设定值（默认 1000ms）');
  console.log('     2. 缓冲区达到设定大小（默认 50 tokens）');
  console.log('     3. 遇到句子结束标点（., !, ?, 。, ！, ？）');
  console.log('   - 响应结束后会发送所有剩余的 tokens');

} catch (error) {
  console.error('❌ 测试失败:', error);
  process.exit(1);
}
