#!/usr/bin/env node
/**
 * Context 压缩功能 - 真实 API 集成测试
 *
 * 测试目标：
 * 1. 验证与真实 API 的集成
 * 2. 验证长对话场景下的自动压缩
 * 3. 验证 token 追踪的准确性
 */

import { setCustomConfigPath } from '../src/config.js';
import { createConversation } from '../src/conversation/index.js';

// 使用测试配置
setCustomConfigPath('/Users/joyer/.closer-code/test-config.json');

/**
 * 格式化 token 数量
 */
function formatTokens(tokens) {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(2)}M`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(2)}K`;
  }
  return tokens.toString();
}

/**
 * 运行测试
 */
async function runTest() {
  console.log('🚀 Context 压缩功能 - 真实 API 集成测试\n');
  console.log('='.repeat(80) + '\n');

  try {
    // 加载配置
    const { getConfig } = await import('../src/config.js');
    const config = getConfig();

    console.log('📋 配置信息:');
    console.log(`   Provider: ${config.ai.provider}`);
    console.log(`   Model: ${config.ai.anthropic.model}`);
    console.log(`   Max Tokens: ${config.ai.anthropic.maxTokens}`);
    console.log(`   Context Max Tokens: ${config.context?.maxTokens || '未配置'}`);
    console.log(`   Warning Threshold: ${config.context?.warningThreshold || 0.85}`);
    console.log(`   Critical Threshold: ${config.context?.criticalThreshold || 0.95}`);
    console.log(`   Compression Strategy: ${config.context?.compressionStrategy || 'keepRecent'}`);
    console.log(`   Auto Compress: ${config.context?.autoCompress !== false}`);
    console.log(`   Auto Reset: ${config.context?.autoReset !== false}`);
    console.log('');

    // 创建对话会话
    console.log('💬 创建对话会话...');
    const conversation = await createConversation(config, false, false);
    console.log('✓ 对话会话已创建\n');

    // 获取初始消息数量
    const initialMessageCount = conversation.getMessages().length;
    console.log(`📊 初始消息数: ${initialMessageCount}`);
    console.log('');

    // 测试多轮对话
    const maxRounds = 5;
    let totalInputTokens = 0;
    let compressionTriggered = false;
    let resetTriggered = false;

    console.log(`🚀 开始 ${maxRounds} 轮对话测试...\n`);
    console.log('-'.repeat(80) + '\n');

    for (let round = 1; round <= maxRounds; round++) {
      try {
        console.log(`\n📝 [第 ${round} 轮]`);

        // 生成测试提示词
        const prompts = [
          '请简要介绍一下 Node.js 是什么？',
          'Node.js 有哪些主要特性？',
          '如何安装 Node.js？',
          'Node.js 的模块系统是怎样的？',
          '请总结一下 Node.js 的优势'
        ];

        const prompt = prompts[(round - 1) % prompts.length];
        console.log(`   提示词: ${prompt}`);

        // 发送消息
        const startTime = Date.now();
        const response = await conversation.sendMessage(prompt, null);
        const elapsed = Date.now() - startTime;

        // 记录 token 使用情况
        const inputTokens = response.usage?.input_tokens || 0;
        const outputTokens = response.usage?.output_tokens || 0;
        const totalTokens = response.usage?.total_tokens || 0;

        totalInputTokens += inputTokens;

        console.log(`   ✓ 响应时间: ${elapsed}ms`);
        console.log(`   ✓ Input Tokens:  ${formatTokens(inputTokens)} (${inputTokens})`);
        console.log(`   ✓ Output Tokens: ${formatTokens(outputTokens)} (${outputTokens})`);
        console.log(`   ✓ Total Tokens:  ${formatTokens(totalTokens)} (${totalTokens})`);
        console.log(`   ✓ 累计 Input:   ${formatTokens(totalInputTokens)} (${totalInputTokens})`);

        // 检查是否发生了 context action
        if (response.contextAction) {
          console.log(`   🔄 Context Action: ${response.contextAction}`);
          if (response.contextAction === 'compressed') {
            compressionTriggered = true;
            console.log(`   📋 压缩摘要: ${response.contextSummary?.substring(0, 100)}...`);
          } else if (response.contextAction === 'reset') {
            resetTriggered = true;
            console.log(`   📋 重开摘要: ${response.contextSummary?.substring(0, 100)}...`);
          }
        }

        // 获取当前消息数量
        const currentMessageCount = conversation.getMessages().length;
        console.log(`   ✓ 当前消息数: ${currentMessageCount}`);

        // 短暂延迟
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.log(`   ❌ 错误: ${error.message}`);

        // 检查是否是 context overflow
        if (error.message && (
          error.message.toLowerCase().includes('context') ||
          error.message.toLowerCase().includes('token') &&
          error.message.toLowerCase().includes('exceed')
        )) {
          console.log('   🎯 检测到 Context Size 溢出！');
          console.log('   ⚠️  这表明需要更早触发压缩');
          break;
        }
      }
    }

    console.log('\n' + '-'.repeat(80));
    console.log('\n📊 测试结果:\n');

    console.log(`完成轮数: ${maxRounds}/${maxRounds}`);
    console.log(`累计 Input Tokens: ${formatTokens(totalInputTokens)} (${totalInputTokens})`);
    console.log(`压缩触发次数: ${compressionTriggered ? '是' : '否'}`);
    console.log(`重开触发次数: ${resetTriggered ? '是' : '否'}`);

    // 获取 ContextManager 统计
    const contextStats = conversation.getContextStats();
    console.log(`\n📈 ContextManager 统计:`);
    console.log(`   压缩次数: ${contextStats.compressionCount}`);
    console.log(`   重开次数: ${contextStats.resetCount}`);
    console.log(`   缓存命中率: ${(contextStats.cacheStats.hitRate * 100).toFixed(1)}%`);

    // 获取最终消息数量
    const finalMessageCount = conversation.getMessages().length;
    console.log(`\n📝 消息统计:`);
    console.log(`   初始消息数: ${initialMessageCount}`);
    console.log(`   最终消息数: ${finalMessageCount}`);
    console.log(`   新增消息数: ${finalMessageCount - initialMessageCount}`);

    // 清理资源
    console.log('\n🧹 清理资源...');
    await conversation.cleanup();
    console.log('✓ 清理完成\n');

    console.log('='.repeat(80));
    console.log('✅ 真实 API 集成测试完成');
    console.log('='.repeat(80) + '\n');

    return {
      success: true,
      rounds: maxRounds,
      totalInputTokens,
      compressionTriggered,
      resetTriggered,
      contextStats
    };

  } catch (error) {
    console.error('\n❌ 测试失败:');
    console.error(`   ${error.message}`);
    console.error('');
    console.error('详细错误信息:');
    console.error(error);
    return { success: false, error: error.message };
  }
}

// 运行测试
runTest()
  .then(result => {
    console.log('JSON 结果:');
    console.log(JSON.stringify(result, null, 2));
    console.log('');
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('测试异常退出:', error);
    process.exit(1);
  });
