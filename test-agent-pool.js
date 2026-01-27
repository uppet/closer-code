/**
 * 测试 Agent Pool 功能
 * 验证 Phase 3: 并发控制
 */

import { getGlobalAgentPool } from './src/agents/agent-pool.js';

async function testAgentPool() {
  console.log('🧪 测试 Agent Pool 功能\n');

  // 创建 Agent Pool
  const pool = getGlobalAgentPool({
    behavior: {
      workingDir: process.cwd()
    },
    agents: {
      maxConcurrent: 3,
      timeout: 60000
    }
  });

  console.log('✅ Agent Pool 创建成功');
  console.log('配置:', pool.getConfig ? pool.getConfig() : 'N/A');

  // 测试 1: 单个 agent 执行
  console.log('\n📋 测试 1: 单个 agent 执行');
  try {
    const result1 = await pool.executeAgent({
      prompt: '列出当前目录的所有文件',
      maxTokens: 1000
    });
    console.log('结果:', result1.success ? '✅ 成功' : '❌ 失败');
    if (result1.success) {
      console.log('执行时间:', result1.executionTime, 'ms');
    }
  } catch (error) {
    console.log('❌ 错误:', error.message);
  }

  // 测试 2: 批量执行多个 agents
  console.log('\n📋 测试 2: 批量执行多个 agents（并发）');
  try {
    const batchResults = await pool.executeBatch([
      { prompt: '搜索所有 JavaScript 文件', maxTokens: 500 },
      { prompt: '搜索所有 Markdown 文件', maxTokens: 500 },
      { prompt: '搜索所有 JSON 文件', maxTokens: 500 }
    ]);
    
    console.log('批量执行结果:');
    batchResults.forEach((result, index) => {
      console.log(`  Agent ${index + 1}:`, result.success ? '✅ 成功' : '❌ 失败');
      if (result.success && result.value) {
        console.log(`    执行时间: ${result.value.executionTime} ms`);
      }
    });
  } catch (error) {
    console.log('❌ 错误:', error.message);
  }

  // 测试 3: 查询池状态
  console.log('\n📋 测试 3: 查询池状态');
  const poolStatus = pool.getPoolStatus();
  console.log('池状态:', JSON.stringify(poolStatus, null, 2));

  // 测试 4: 查询性能统计
  console.log('\n📋 测试 4: 查询性能统计');
  const stats = pool.getStats();
  console.log('性能统计:', JSON.stringify(stats, null, 2));

  console.log('\n✅ 所有测试完成！');
}

// 运行测试
testAgentPool().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
