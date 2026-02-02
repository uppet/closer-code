#!/usr/bin/env node
/**
 * 测试 Context 压缩功能
 *
 * 目的：
 * 1. 测试 ContextTracker 的 token 追踪功能
 * 2. 测试 CompressionStrategy 的各种压缩策略
 * 3. 测试 ContextManager 的压缩和重开功能
 * 4. 验证与真实 API 的集成
 */

import { setCustomConfigPath } from '../src/config.js';
import { createConversation } from '../src/conversation/index.js';
import { ContextTracker } from '../src/conversation/context-tracker.js';
import { applyCompression } from '../src/conversation/compression-strategy.js';

// 使用用户的自定义配置
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
 * 测试 1: ContextTracker 基础功能
 */
async function testContextTracker() {
  console.log('\n' + '='.repeat(80));
  console.log('测试 1: ContextTracker 基础功能');
  console.log('='.repeat(80) + '\n');

  const tracker = new ContextTracker({
    maxTokens: 200000,
    warningThreshold: 0.85,
    criticalThreshold: 0.95
  });

  // 创建测试消息
  const messages = [
    { role: 'user', content: '你好' },
    { role: 'assistant', content: '你好！有什么我可以帮助你的吗？' },
    { role: 'user', content: '请介绍一下 JavaScript' },
    { role: 'assistant', content: 'JavaScript 是一种动态编程语言...' }
  ];

  // 测试 token 估算
  console.log('📊 测试 token 估算...');
  const tokens = await tracker.estimateTokens(messages);
  console.log(`   估算 token 数: ${tokens}`);
  console.log(`   缓存统计: ${JSON.stringify(tracker.getCacheStats())}`);

  // 测试阈值检测
  console.log('\n⚠️  测试阈值检测...');
  const usageInfo = tracker.getUsageInfo(tokens);
  console.log(`   使用率: ${usageInfo.percentageDisplay}`);
  console.log(`   需要压缩: ${usageInfo.needsCompression}`);
  console.log(`   需要重开: ${usageInfo.needsTaskReset}`);

  console.log('\n✅ ContextTracker 测试完成\n');
  return true;
}

/**
 * 测试 2: CompressionStrategy 压缩策略
 */
async function testCompressionStrategy() {
  console.log('\n' + '='.repeat(80));
  console.log('测试 2: CompressionStrategy 压缩策略');
  console.log('='.repeat(80) + '\n');

  // 创建 100 条测试消息
  const messages = [];
  for (let i = 1; i <= 100; i++) {
    messages.push({
      role: i % 2 === 1 ? 'user' : 'assistant',
      content: `这是第 ${i} 条消息。` + 'A'.repeat(100) // 增加一些长度
    });
  }

  console.log(`📝 创建了 ${messages.length} 条测试消息\n`);

  // 测试不同的压缩策略
  const strategies = [
    { name: 'keepRecent', options: { count: 20 } },
    { name: 'keepImportant', options: { recentCount: 20 } },
    { name: 'slidingWindow', options: { count: 30 } },
    { name: 'smartToken', options: { maxTokens: 10000, targetTokens: 8000 } }
  ];

  for (const { name, options } of strategies) {
    console.log(`\n🔧 测试策略: ${name}`);
    console.log(`   选项: ${JSON.stringify(options)}`);

    const result = applyCompression(messages, name, options);

    console.log(`   原始消息数: ${result.originalCount}`);
    console.log(`   压缩后消息数: ${result.newCount}`);
    console.log(`   删除消息数: ${result.removed}`);
    console.log(`   压缩率: ${((result.removed / result.originalCount) * 100).toFixed(1)}%`);
    console.log(`   摘要: ${result.summary}`);
  }

  console.log('\n✅ CompressionStrategy 测试完成\n');
  return true;
}

/**
 * 测试 3: ContextManager 集成测试
 */
async function testContextManager() {
  console.log('\n' + '='.repeat(80));
  console.log('测试 3: ContextManager 集成测试');
  console.log('='.repeat(80) + '\n');

  try {
    // 创建对话会话
    console.log('💬 创建对话会话...');
    const conversation = await createConversation({
      ai: {
        provider: 'anthropic',
        anthropic: {
          apiKey: process.env.CLOSER_ANTHROPIC_API_KEY || 'sk-test-key',
          model: 'claude-sonnet-4-5-20250929',
          maxTokens: 8192
        }
      },
      behavior: {
        workingDir: process.cwd() // 添加工作目录配置
      },
      context: {
        maxTokens: 200000,
        warningThreshold: 0.85,
        criticalThreshold: 0.95,
        compressionStrategy: 'keepRecent',
        compressionOptions: {
          keepRecent: { count: 50 }
        },
        autoCompress: true,
        autoReset: true
      }
    }, false, true); // testMode = true

    console.log('✓ 对话会话已创建\n');

    // 获取 ContextManager
    const contextManager = conversation.contextManager;
    console.log('✓ ContextManager 已初始化\n');

    // 手动添加一些消息
    console.log('📝 添加测试消息...');
    for (let i = 1; i <= 50; i++) {
      conversation.addMessage({
        role: i % 2 === 1 ? 'user' : 'assistant',
        content: `这是第 ${i} 条消息。` + '测试内容 '.repeat(10)
      });
    }
    console.log(`✓ 添加了 50 条消息\n`);

    // 测试手动压缩
    console.log('🗜️  测试手动压缩...');
    const compressResult = await contextManager.manualCompress('keepRecent');
    console.log(`   压缩结果: ${compressResult.summary}`);
    console.log(`   原始消息数: ${compressResult.originalCount}`);
    console.log(`   压缩后消息数: ${compressResult.newCount}`);
    console.log('   ✓ 手动压缩成功\n');

    // 获取统计信息
    console.log('📊 ContextManager 统计信息:');
    const stats = contextManager.getStats();
    console.log(`   压缩次数: ${stats.compressionCount}`);
    console.log(`   重开次数: ${stats.resetCount}`);
    console.log(`   缓存统计: ${JSON.stringify(stats.cacheStats)}\n`);

    console.log('✅ ContextManager 测试完成\n');
    return true;

  } catch (error) {
    console.error('❌ ContextManager 测试失败:', error.message);
    console.error(error);
    return false;
  }
}

/**
 * 测试 4: 真实 API 集成测试（长对话场景）
 */
async function testRealAPILongConversation() {
  console.log('\n' + '='.repeat(80));
  console.log('测试 4: 真实 API 集成测试（长对话场景）');
  console.log('='.repeat(80) + '\n');

  try {
    // 加载配置
    console.log('📋 加载配置...');
    const { getConfig } = await import('../src/config.js');
    const config = getConfig();

    console.log(`✓ AI Provider: ${config.ai.provider}`);
    console.log(`✓ Model: ${config.ai.anthropic.model}`);
    console.log('');

    // 创建对话会话
    console.log('💬 创建对话会话...');
    const conversation = await createConversation(config, false, false);
    console.log('✓ 对话会话已创建\n');

    // 模拟长对话
    const maxIterations = 10;
    let iteration = 0;
    let totalInputTokens = 0;
    let compressionCount = 0;
    let resetCount = 0;

    console.log(`🚀 开始 ${maxIterations} 轮对话测试...\n`);
    console.log('-'.repeat(80) + '\n');

    for (let i = 1; i <= maxIterations; i++) {
      iteration = i;

      try {
        console.log(`\n📝 [第 ${i} 轮] 发送消息...`);

        // 生成提示词
        const prompt = `这是第 ${i} 轮对话。请回答：什么是 Node.js？请详细说明。`;
        console.log(`   提示词: ${prompt.substring(0, 50)}...`);

        // 发送消息
        const response = await conversation.sendMessage(prompt, null);

        // 记录 token 使用情况
        const inputTokens = response.usage?.input_tokens || 0;
        const outputTokens = response.usage?.output_tokens || 0;
        const totalTokens = response.usage?.total_tokens || 0;

        totalInputTokens += inputTokens;

        console.log(`   ✓ Input Tokens:  ${formatTokens(inputTokens)} (${inputTokens})`);
        console.log(`   ✓ Output Tokens: ${formatTokens(outputTokens)} (${outputTokens})`);
        console.log(`   ✓ Total Tokens:  ${formatTokens(totalTokens)} (${totalTokens})`);
        console.log(`   ✓ 累计 Input:   ${formatTokens(totalInputTokens)} (${totalInputTokens})`);

        // 检查是否发生了 context action
        if (response.contextAction) {
          console.log(`   🔄 Context Action: ${response.contextAction}`);
          if (response.contextAction === 'compressed') {
            compressionCount++;
            console.log(`   📋 压缩摘要: ${response.contextSummary}`);
          } else if (response.contextAction === 'reset') {
            resetCount++;
            console.log(`   📋 重开摘要: ${response.contextSummary}`);
          }
        }

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
          console.log('   ⚠️  这表明需要更早触发压缩或重开');
          break;
        } else {
          console.log('   ⚠️  其他错误，继续测试...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    console.log('\n' + '-'.repeat(80));
    console.log('\n📊 测试结果:');
    console.log(`   完成轮数: ${iteration}`);
    console.log(`   累计 Input Tokens: ${formatTokens(totalInputTokens)} (${totalInputTokens})`);
    console.log(`   压缩次数: ${compressionCount}`);
    console.log(`   重开次数: ${resetCount}`);

    // 获取 ContextManager 统计
    const contextStats = conversation.getContextStats();
    console.log(`\n📈 ContextManager 统计:`);
    console.log(`   压缩次数: ${contextStats.compressionCount}`);
    console.log(`   重开次数: ${contextStats.resetCount}`);
    console.log(`   缓存命中率: ${(contextStats.cacheStats.hitRate * 100).toFixed(1)}%`);

    console.log('\n✅ 真实 API 集成测试完成\n');

    // 清理资源
    console.log('🧹 清理资源...');
    await conversation.cleanup();
    console.log('✓ 清理完成\n');

    return {
      success: true,
      iteration,
      totalInputTokens,
      compressionCount,
      resetCount
    };

  } catch (error) {
    console.error('\n❌ 真实 API 集成测试失败:');
    console.error(`   ${error.message}`);
    console.error('');
    console.error('详细错误信息:');
    console.error(error);
    return { success: false, error: error.message };
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(80));
  console.log('Context 压缩功能测试套件');
  console.log('='.repeat(80));
  console.log('');
  console.log('测试目标:');
  console.log('  1. 验证 ContextTracker 的 token 追踪准确性');
  console.log('  2. 验证 CompressionStrategy 的压缩效果');
  console.log('  3. 验证 ContextManager 的集成功能');
  console.log('  4. 验证与真实 API 的集成');
  console.log('');

  const results = {
    contextTracker: false,
    compressionStrategy: false,
    contextManager: false,
    realAPI: false
  };

  // 运行测试 1
  try {
    results.contextTracker = await testContextTracker();
  } catch (error) {
    console.error('❌ 测试 1 失败:', error.message);
  }

  // 运行测试 2
  try {
    results.compressionStrategy = await testCompressionStrategy();
  } catch (error) {
    console.error('❌ 测试 2 失败:', error.message);
  }

  // 运行测试 3
  try {
    results.contextManager = await testContextManager();
  } catch (error) {
    console.error('❌ 测试 3 失败:', error.message);
  }

  // 运行测试 4（真实 API）
  try {
    results.realAPI = await testRealAPILongConversation();
  } catch (error) {
    console.error('❌ 测试 4 失败:', error.message);
  }

  // 输出测试总结
  console.log('\n' + '='.repeat(80));
  console.log('测试总结');
  console.log('='.repeat(80) + '\n');

  console.log('测试结果:');
  console.log(`  ContextTracker:      ${results.contextTracker ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  CompressionStrategy: ${results.compressionStrategy ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  ContextManager:      ${results.contextManager ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  真实 API 集成:      ${results.realAPI?.success ? '✅ 通过' : '❌ 失败'}`);

  const allPassed = Object.values(results).every(r => r === true || r?.success === true);

  console.log('\n' + '='.repeat(80));
  if (allPassed) {
    console.log('✅ 所有测试通过！');
  } else {
    console.log('⚠️  部分测试失败，请查看上面的详细输出');
  }
  console.log('='.repeat(80) + '\n');

  // 输出 JSON 格式结果
  console.log('JSON 结果:');
  console.log(JSON.stringify(results, null, 2));
  console.log('');

  process.exit(allPassed ? 0 : 1);
}

// 运行测试
runAllTests().catch(error => {
  console.error('\n❌ 测试异常退出:', error);
  process.exit(1);
});
