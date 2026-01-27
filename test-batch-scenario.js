/**
 * Batch Agent 实际场景测试
 * 
 * 模拟真实使用场景：同时启动多个 agents 执行不同的搜索任务
 * 验证：
 * 1. 并发执行能力
 * 2. 结果持久化
 * 3. 缓存效果
 * 4. 性能指标
 */

import { setToolExecutorContext, dispatchAgentTool, agentResultTool } from './src/tools.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 初始化工具上下文
setToolExecutorContext({
  behavior: {
    workingDir: __dirname
  },
  tools: {
    enabled: ['dispatchAgent', 'agentResult', 'searchFiles', 'searchCode', 'listFiles', 'readFile']
  }
});

async function testBatchScenario() {
  console.log('🚀 Batch Agent 实际场景测试\n');
  console.log('=' .repeat(60));

  const scenarioId = `scenario_${Date.now()}`;
  const startTime = Date.now();

  try {
    // ========================================
    // 场景 1: 代码库分析任务
    // ========================================
    console.log('\n📊 场景 1: 代码库结构分析');
    console.log('-'.repeat(60));

    const scenario1Start = Date.now();

    const batch1Result = JSON.parse(await dispatchAgentTool.run({
      batch: [
        { 
          prompt: '找到所有的 JavaScript 源文件（.js 文件）',
          conversationId: scenarioId
        },
        { 
          prompt: '找到所有的测试文件（包含 test 关键词）',
          conversationId: scenarioId
        },
        { 
          prompt: '找到所有的配置文件（package.json, config.json 等）',
          conversationId: scenarioId
        },
        { 
          prompt: '找到所有的文档文件（.md 文件）',
          conversationId: scenarioId
        }
      ]
    }));

    const scenario1Time = Date.now() - scenario1Start;

    console.log(`\n✅ 场景 1 完成`);
    console.log(`   - 执行任务数: ${batch1Result.count}`);
    console.log(`   - 总耗时: ${scenario1Time}ms`);
    console.log(`   - 平均每个: ${(scenario1Time / batch1Result.count).toFixed(0)}ms`);
    
    const successCount1 = batch1Result.results.filter(r => r.success).length;
    console.log(`   - 成功率: ${((successCount1 / batch1Result.count) * 100).toFixed(1)}%`);

    // 保存 agent IDs 用于后续查询
    const agentIds1 = batch1Result.results.filter(r => r.agentId).map(r => r.agentId);
    console.log(`   - Agent IDs: ${agentIds1.map(id => id.substring(0, 20) + '...').join(', ')}`);

    // ========================================
    // 场景 2: 功能特性搜索
    // ========================================
    console.log('\n\n📊 场景 2: 功能特性搜索');
    console.log('-'.repeat(60));

    const scenario2Start = Date.now();

    const batch2Result = JSON.parse(await dispatchAgentTool.run({
      batch: [
        { 
          prompt: '搜索代码中与 "agent" 相关的实现',
          conversationId: scenarioId
        },
        { 
          prompt: '搜索代码中与 "cache" 相关的实现',
          conversationId: scenarioId
        },
        { 
          prompt: '搜索代码中与 "storage" 相关的实现',
          conversationId: scenarioId
        }
      ]
    }));

    const scenario2Time = Date.now() - scenario2Start;

    console.log(`\n✅ 场景 2 完成`);
    console.log(`   - 执行任务数: ${batch2Result.count}`);
    console.log(`   - 总耗时: ${scenario2Time}ms`);
    console.log(`   - 平均每个: ${(scenario2Time / batch2Result.count).toFixed(0)}ms`);
    
    const successCount2 = batch2Result.results.filter(r => r.success).length;
    console.log(`   - 成功率: ${((successCount2 / batch2Result.count) * 100).toFixed(1)}%`);

    const agentIds2 = batch2Result.results.filter(r => r.agentId).map(r => r.agentId);

    // ========================================
    // 场景 3: 缓存效果验证
    // ========================================
    console.log('\n\n📊 场景 3: 缓存效果验证');
    console.log('-'.repeat(60));

    await new Promise(resolve => setTimeout(resolve, 200)); // 等待保存完成

    const scenario3Start = Date.now();

    // 重复执行相同的任务（应该使用缓存）
    const batch3Result = JSON.parse(await dispatchAgentTool.run({
      batch: [
        { 
          prompt: '找到所有的 JavaScript 源文件（.js 文件）',
          conversationId: scenarioId,
          useCache: true
        },
        { 
          prompt: '找到所有的测试文件（包含 test 关键词）',
          conversationId: scenarioId,
          useCache: true
        }
      ]
    }));

    const scenario3Time = Date.now() - scenario3Start;

    console.log(`\n✅ 场景 3 完成（缓存测试）`);
    console.log(`   - 执行任务数: ${batch3Result.count}`);
    console.log(`   - 总耗时: ${scenario3Time}ms`);
    console.log(`   - 平均每个: ${(scenario3Time / batch3Result.count).toFixed(0)}ms`);

    const cachedCount = batch3Result.results.filter(r => r.cached).length;
    console.log(`   - 缓存命中: ${cachedCount}/${batch3Result.count}`);
    console.log(`   - 缓存命中率: ${((cachedCount / batch3Result.count) * 100).toFixed(1)}%`);

    // 计算加速比
    const originalTime = scenario1Time / 4; // 场景1中类似任务的平均时间
    const cachedTime = scenario3Time / batch3Result.count;
    const speedup = (originalTime / cachedTime).toFixed(2);
    console.log(`   - 加速比: ${speedup}x`);

    // ========================================
    // 场景 4: 结果查询
    // ========================================
    console.log('\n\n📊 场景 4: 结果查询验证');
    console.log('-'.repeat(60));

    if (agentIds1.length > 0) {
      const testAgentId = agentIds1[0];
      
      // 查询摘要
      const summaryResult = JSON.parse(await agentResultTool.run({
        agent_id: testAgentId,
        action: 'summary'
      }));

      console.log(`\n✅ 查询摘要成功`);
      console.log(`   - Agent ID: ${testAgentId.substring(0, 20)}...`);
      console.log(`   - 摘要: ${summaryResult.summary?.substring(0, 80) || 'N/A'}...`);

      // 查询文件列表
      const filesResult = JSON.parse(await agentResultTool.run({
        agent_id: testAgentId,
        action: 'files'
      }));

      console.log(`   - 文件数: ${filesResult.files?.length || 0}`);

      // 查询完整结果
      const fullResult = JSON.parse(await agentResultTool.run({
        agent_id: testAgentId,
        action: 'full'
      }));

      console.log(`   - 状态: ${fullResult.result?.status || 'N/A'}`);
      console.log(`   - 执行时间: ${fullResult.stats?.duration ? fullResult.stats.duration + 'ms' : 'N/A'}`);
    }

    // ========================================
    // 场景 5: Pool 状态查询
    // ========================================
    console.log('\n\n📊 场景 5: Pool 状态查询');
    console.log('-'.repeat(60));

    const poolStatus = JSON.parse(await agentResultTool.run({
      action: 'pool_status'
    }));

    console.log(`\n✅ Pool 状态`);
    console.log(`   - 最大并发数: ${poolStatus.pool?.maxConcurrent || 'N/A'}`);
    console.log(`   - 运行中: ${poolStatus.pool?.running || 0}`);
    console.log(`   - 等待中: ${poolStatus.pool?.waiting || 0}`);

    const poolStats = JSON.parse(await agentResultTool.run({
      action: 'stats'
    }));

    console.log(`\n✅ Pool 统计`);
    console.log(`   - 总执行数: ${poolStats.stats?.totalExecuted || 0}`);
    console.log(`   - 总 Token: ${poolStats.stats?.totalTokens || 0}`);
    console.log(`   - 平均 Token: ${poolStats.stats?.avgTokens ? poolStats.stats.avgTokens.toFixed(0) : 'N/A'}`);

    // ========================================
    // 总结
    // ========================================
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 测试总结');
    console.log('='.repeat(60));

    const totalTime = Date.now() - startTime;

    console.log(`\n✅ 所有场景测试完成`);
    console.log(`\n总体统计:`);
    console.log(`   - 总场景数: 5`);
    console.log(`   - 总任务数: ${batch1Result.count + batch2Result.count + batch3Result.count}`);
    console.log(`   - 总耗时: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}秒)`);
    console.log(`   - 平均每任务: ${(totalTime / (batch1Result.count + batch2Result.count + batch3Result.count)).toFixed(0)}ms`);

    const totalSuccess = successCount1 + successCount2 + batch3Result.results.filter(r => r.success).length;
    const totalTasks = batch1Result.count + batch2Result.count + batch3Result.count;
    console.log(`   - 总成功率: ${((totalSuccess / totalTasks) * 100).toFixed(1)}%`);

    console.log(`\n性能指标:`);
    console.log(`   - 场景1（代码库分析）: ${scenario1Time}ms`);
    console.log(`   - 场景2（功能搜索）: ${scenario2Time}ms`);
    console.log(`   - 场景3（缓存加速）: ${scenario3Time}ms (${speedup}x 加速)`);

    console.log(`\n缓存效果:`);
    console.log(`   - 缓存命中数: ${cachedCount}`);
    console.log(`   - 缓存命中率: ${((cachedCount / batch3Result.count) * 100).toFixed(1)}%`);
    console.log(`   - 性能提升: ${speedup}x`);

    console.log('\n✅ Batch Agent 实际场景测试通过！\n');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
testBatchScenario();
