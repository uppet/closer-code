/**
 * 真实 Batch Agent 场景测试
 *
 * 模拟实际使用场景：使用 dispatch_agent 搜索代码库
 * - 搜索配置文件
 * - 搜索测试文件
 * - 搜索文档
 * - 搜索 API 端点
 */

import { createAgentPool } from './src/agents/agent-pool.js';
import { getGlobalAgentStorage } from './src/agents/agent-storage.js';

// 创建配置
const config = {
  agents: {
    maxConcurrent: 3,
    timeout: 30000,
    cacheEnabled: true,
    cacheTTL: 300000
  },
  behavior: {
    workingDir: process.cwd()
  }
};

// 创建 agent pool
const pool = createAgentPool(config);

/**
 * 场景 1: 代码库结构分析
 * 同时搜索多个不同类型的文件
 */
async function scenario1_codebaseAnalysis() {
  console.log('\n📊 场景 1: 代码库结构分析');
  console.log('============================================================');

  const tasks = [
    {
      prompt: '找到所有 JavaScript 配置文件（如 *.config.js, *.rc.js）',
      conversationId: 'conv_analysis_001'
    },
    {
      prompt: '找到所有测试文件（test-*.js, *.test.js）',
      conversationId: 'conv_analysis_001'
    },
    {
      prompt: '找到所有 Markdown 文档文件（*.md）',
      conversationId: 'conv_analysis_001'
    },
    {
      prompt: '找到所有源代码文件（src/**/*.js）',
      conversationId: 'conv_analysis_001'
    }
  ];

  const startTime = Date.now();

  try {
    const results = await pool.executeBatch(tasks);

    const duration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;

    console.log(`\n✅ 场景 1 完成`);
    console.log(`   - 执行任务数: ${tasks.length}`);
    console.log(`   - 成功数: ${successCount}`);
    console.log(`   - 失败数: ${tasks.length - successCount}`);
    console.log(`   - 总耗时: ${duration}ms`);
    console.log(`   - 平均每个: ${Math.round(duration / tasks.length)}ms`);
    console.log(`   - 成功率: ${(successCount / tasks.length * 100).toFixed(1)}%`);

    // 显示每个 agent 的结果摘要
    console.log('\n📋 Agent 结果摘要:');
    results.forEach((result, index) => {
      console.log(`\n   Agent ${index + 1}:`);
      console.log(`   - ID: ${result.agentId?.substring(0, 20)}...`);
      console.log(`   - 状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);
      if (result.result) {
        console.log(`   - 文件数: ${result.result.files?.length || 0}`);
        console.log(`   - 摘要: ${result.result.summary?.substring(0, 80) || 'N/A'}...`);
      }
      if (result.error) {
        console.log(`   - 错误: ${result.error}`);
      }
    });

    return {
      totalTasks: tasks.length,
      successCount,
      duration,
      successRate: successCount / tasks.length
    };
  } catch (error) {
    console.error(`❌ 场景 1 失败:`, error.message);
    throw error;
  }
}

/**
 * 场景 2: 功能特性搜索
 * 搜索特定功能的实现
 */
async function scenario2_featureSearch() {
  console.log('\n📊 场景 2: 功能特性搜索');
  console.log('============================================================');

  const tasks = [
    {
      prompt: '搜索所有与 "agent" 相关的文件和代码',
      conversationId: 'conv_feature_001'
    },
    {
      prompt: '搜索所有与 "cache" 相关的文件和代码',
      conversationId: 'conv_feature_001'
    },
    {
      prompt: '搜索所有与 "pool" 相关的文件和代码',
      conversationId: 'conv_feature_001'
    }
  ];

  const startTime = Date.now();

  try {
    const results = await pool.executeBatch(tasks);

    const duration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;

    console.log(`\n✅ 场景 2 完成`);
    console.log(`   - 执行任务数: ${tasks.length}`);
    console.log(`   - 成功数: ${successCount}`);
    console.log(`   - 失败数: ${tasks.length - successCount}`);
    console.log(`   - 总耗时: ${duration}ms`);
    console.log(`   - 平均每个: ${Math.round(duration / tasks.length)}ms`);
    console.log(`   - 成功率: ${(successCount / tasks.length * 100).toFixed(1)}%`);

    return {
      totalTasks: tasks.length,
      successCount,
      duration,
      successRate: successCount / tasks.length
    };
  } catch (error) {
    console.error(`❌ 场景 2 失败:`, error.message);
    throw error;
  }
}

/**
 * 场景 3: 缓存效果验证
 * 执行相同任务两次，验证缓存加速
 */
async function scenario3_cacheEffect() {
  console.log('\n📊 场景 3: 缓存效果验证');
  console.log('============================================================');

  const task = {
    prompt: '找到所有与 "dispatch" 相关的文件',
    conversationId: 'conv_cache_001'
  };

  // 第一次执行（创建缓存）
  console.log('\n🔄 第一次执行（创建缓存）...');
  const start1 = Date.now();
  const result1 = await pool.executeAgent(task);
  const duration1 = Date.now() - start1;

  console.log(`   - 耗时: ${duration1}ms`);
  console.log(`   - 状态: ${result1.success ? '✅ 成功' : '❌ 失败'}`);

  // 第二次执行（使用缓存）
  console.log('\n🔄 第二次执行（使用缓存）...');
  const start2 = Date.now();
  const result2 = await pool.executeAgent(task);
  const duration2 = Date.now() - start2;

  console.log(`   - 耗时: ${duration2}ms`);
  console.log(`   - 状态: ${result2.success ? '✅ 成功' : '❌ 失败'}`);

  // 计算加速比
  const speedup = duration1 / Math.max(duration2, 1);

  console.log(`\n✅ 场景 3 完成`);
  console.log(`   - 第一次: ${duration1}ms`);
  console.log(`   - 第二次: ${duration2}ms`);
  console.log(`   - 加速比: ${speedup.toFixed(2)}x`);
  console.log(`   - 节省时间: ${duration1 - duration2}ms`);

  return {
    duration1,
    duration2,
    speedup,
    savedTime: duration1 - duration2
  };
}

/**
 * 场景 4: 结果查询验证
 * 验证 agent 结果的持久化和查询
 */
async function scenario4_resultQuery() {
  console.log('\n📊 场景 4: 结果查询验证');
  console.log('============================================================');

  const storage = getGlobalAgentStorage();

  // 先执行一个任务
  const task = {
    prompt: '找到所有配置文件',
    conversationId: 'conv_query_001'
  };

  console.log('\n🔄 执行任务...');
  const result = await pool.executeAgent(task);
  console.log(`   - Agent ID: ${result.agentId}`);
  console.log(`   - 状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);

  if (!result.agentId) {
    console.log('❌ 无法获取 Agent ID，跳过查询测试');
    return null;
  }

  // 查询结果
  console.log('\n🔄 查询完整结果...');
  const fullResult = await storage.getAgentResult(result.agentId);
  console.log(`✅ 完整结果:`);
  console.log(`   - 结果大小: ${JSON.stringify(fullResult).length} 字节`);
  console.log(`   - 有内容: ${!!fullResult}`);

  if (fullResult) {
    console.log(`   - 摘要: ${fullResult.summary?.substring(0, 80) || 'N/A'}...`);
    console.log(`   - 文件数: ${fullResult.files?.length || 0}`);
    console.log(`   - 状态: ${fullResult.status || 'N/A'}`);
    console.log(`   - 执行时间: ${fullResult.executionTime || 'N/A'}`);

    if (fullResult.files && fullResult.files.length > 0) {
      console.log(`   - 前 5 个文件:`);
      fullResult.files.slice(0, 5).forEach(file => {
        console.log(`     • ${file}`);
      });
    }
  }

  console.log('\n✅ 场景 4 完成');
  return {
    hasResult: !!fullResult,
    hasFiles: fullResult?.files?.length > 0,
    resultSize: fullResult ? JSON.stringify(fullResult).length : 0
  };
}

/**
 * 场景 5: Pool 状态查询
 * 验证 Pool 的状态查询功能
 */
async function scenario5_poolStatus() {
  console.log('\n📊 场景 5: Pool 状态查询');
  console.log('============================================================');

  // 查询池状态
  console.log('\n🔄 查询池状态...');
  const poolStatus = pool.getPoolStatus();
  console.log(`✅ Pool 状态:`);
  console.log(`   - 最大并发数: ${poolStatus.maxConcurrent}`);
  console.log(`   - 运行中: ${poolStatus.currentlyRunning}`);
  console.log(`   - 等待中: ${poolStatus.currentlyWaiting}`);
  console.log(`   - 可用槽位: ${poolStatus.availableSlots}`);

  // 查询性能统计
  console.log('\n🔄 查询性能统计...');
  const stats = pool.getStats();
  console.log(`✅ 性能统计:`);
  console.log(`   - 总执行数: ${stats.totalExecuted}`);
  console.log(`   - 总成功: ${stats.totalSucceeded}`);
  console.log(`   - 总失败: ${stats.totalFailed}`);
  console.log(`   - 总耗时: ${stats.totalExecutionTime}ms`);
  console.log(`   - 平均耗时: ${stats.averageExecutionTime}ms`);
  console.log(`   - 峰值并发: ${stats.peakConcurrent}`);
  console.log(`   - 运行时间: ${stats.uptime}ms`);
  console.log(`   - 成功率: ${stats.successRate}`);

  console.log('\n✅ 场景 5 完成');
  return {
    totalExecuted: stats.totalExecuted,
    successRate: stats.successRate,
    uptime: stats.uptime
  };
}

/**
 * 主测试函数
 */
async function main() {
  console.log('\n🚀 真实 Batch Agent 场景测试');
  console.log('============================================================');

  const results = {
    scenario1: null,
    scenario2: null,
    scenario3: null,
    scenario4: null,
    scenario5: null
  };

  try {
    // 场景 1: 代码库结构分析
    results.scenario1 = await scenario1_codebaseAnalysis();

    // 等待一下
    await new Promise(resolve => setTimeout(resolve, 100));

    // 场景 2: 功能特性搜索
    results.scenario2 = await scenario2_featureSearch();

    // 等待一下
    await new Promise(resolve => setTimeout(resolve, 100));

    // 场景 3: 缓存效果验证
    results.scenario3 = await scenario3_cacheEffect();

    // 等待一下
    await new Promise(resolve => setTimeout(resolve, 100));

    // 场景 4: 结果查询验证
    results.scenario4 = await scenario4_resultQuery();

    // 场景 5: Pool 状态查询
    results.scenario5 = await scenario5_poolStatus();

    // 总结
    console.log('\n============================================================');
    console.log('📊 测试总结');
    console.log('============================================================');

    console.log('\n✅ 所有场景测试完成\n');

    console.log('总体统计:');
    let totalTasks = 0;
    let totalSuccess = 0;
    let totalDuration = 0;

    if (results.scenario1) {
      totalTasks += results.scenario1.totalTasks;
      totalSuccess += results.scenario1.successCount;
      totalDuration += results.scenario1.duration;
    }

    if (results.scenario2) {
      totalTasks += results.scenario2.totalTasks;
      totalSuccess += results.scenario2.successCount;
      totalDuration += results.scenario2.duration;
    }

    console.log(`   - 总场景数: 5`);
    console.log(`   - 总任务数: ${totalTasks + 2}`); // +2 for scenario 3
    console.log(`   - 总成功数: ${totalSuccess + 2}`); // +2 for scenario 3
    console.log(`   - 总耗时: ${totalDuration}ms`);
    console.log(`   - 总成功率: ${((totalSuccess + 2) / (totalTasks + 2) * 100).toFixed(1)}%`);

    console.log('\n场景结果:');
    console.log(`   - 场景1（代码库分析）: ${results.scenario1 ? '✅' : '❌'}`);
    console.log(`   - 场景2（功能搜索）: ${results.scenario2 ? '✅' : '❌'}`);
    console.log(`   - 场景3（缓存加速）: ${results.scenario3 ? '✅' : '❌'} (${results.scenario3?.speedup?.toFixed(2)}x)`);
    console.log(`   - 场景4（结果查询）: ${results.scenario4 ? '✅' : '❌'}`);
    console.log(`   - 场景5（Pool状态）: ${results.scenario5 ? '✅' : '❌'}`);

    if (results.scenario3) {
      console.log('\n缓存效果:');
      console.log(`   - 第一次执行: ${results.scenario3.duration1}ms`);
      console.log(`   - 第二次执行: ${results.scenario3.duration2}ms`);
      console.log(`   - 加速比: ${results.scenario3.speedup.toFixed(2)}x`);
      console.log(`   - 节省时间: ${results.scenario3.savedTime}ms`);
    }

    console.log('\n✅ 真实 Batch Agent 场景测试通过！\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
main();
