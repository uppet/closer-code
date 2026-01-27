/**
 * Batch Agent 场景验证脚本
 *
 * 真实场景：使用 batch 模式同时启动多个 agents 执行不同的搜索任务
 */

import { loadConfig } from './src/config.js';
import { getGlobalAgentPool } from './src/agents/agent-pool.js';

async function runBatchScenario() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Batch Agent 场景验证测试                                 ║');
  console.log('║   验证并发执行多个 agents 的效果                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // 初始化
  console.log('📦 步骤 1: 初始化环境...\n');
  const config = loadConfig();
  const agentPool = getGlobalAgentPool(config);
  console.log('✅ Agent Pool 初始化完成\n');

  // 场景 1: 并发搜索项目关键信息
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  场景 1: 并发搜索项目关键信息                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const tasks1 = [
    {
      prompt: '搜索项目中所有的配置文件（.json, .yaml, .toml 等），列出文件路径',
      description: '搜索配置文件'
    },
    {
      prompt: '搜索项目中所有的测试文件（test, spec），列出文件路径',
      description: '搜索测试文件'
    },
    {
      prompt: '搜索项目中的 README 文档',
      description: '搜索 README'
    }
  ];

  console.log('📋 任务列表:');
  tasks1.forEach((task, index) => {
    console.log(`   ${index + 1}. ${task.description}`);
  });
  console.log('');

  console.log('🚀 启动批量执行...\n');
  const startTime1 = Date.now();

  try {
    const results1 = await agentPool.executeBatch(
      tasks1.map(task => ({
        prompt: task.prompt,
        timeout: 30000,
        maxTokens: 2048
      }))
    );

    const executionTime1 = Date.now() - startTime1;

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  执行结果                                                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log(`⏱️  总执行时间: ${executionTime1}ms (${(executionTime1 / 1000).toFixed(2)}s)`);
    console.log(`📊 任务统计:`);
    console.log(`   - 总任务数: ${results1.length}`);
    console.log(`   - 成功: ${results1.filter(r => r.success).length} ✅`);
    console.log(`   - 失败: ${results1.filter(r => !r.success).length} ❌`);
    console.log(`   - 成功率: ${((results1.filter(r => r.success).length / results1.length) * 100).toFixed(1)}%`);
    console.log('');

    results1.forEach((result, index) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📄 任务 ${index + 1}: ${tasks1[index].description}`);
      console.log(`   状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);
      
      if (result.success) {
        console.log(`   Agent ID: ${result.agentId}`);
        console.log(`   执行时间: ${result.executionTime}ms`);
        
        // 显示详细结果
        if (result.result) {
          if (result.result.summary) {
            console.log(`   摘要: ${result.result.summary}`);
          }
          if (result.result.text) {
            const preview = result.result.text.substring(0, 200);
            console.log(`   结果预览: ${preview}${result.result.text.length > 200 ? '...' : ''}`);
          }
          if (result.result.files && Array.isArray(result.result.files)) {
            console.log(`   找到文件: ${result.result.files.length} 个`);
            result.result.files.slice(0, 5).forEach(f => console.log(`     - ${f}`));
            if (result.result.files.length > 5) {
              console.log(`     ... 还有 ${result.result.files.length - 5} 个文件`);
            }
          }
        }
      } else {
        console.log(`   错误: ${result.error}`);
      }
      console.log('');
    });

    // 场景 2: 代码质量分析
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  场景 2: 代码质量分析（并发）                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const tasks2 = [
      {
        prompt: '统计项目中 .js 文件的数量和总行数',
        description: '统计 JS 文件'
      },
      {
        prompt: '查找项目中使用的主要依赖包（package.json）',
        description: '分析依赖包'
      },
      {
        prompt: '搜索项目中的 TODO 注释',
        description: '查找 TODO'
      }
    ];

    console.log('📋 任务列表:');
    tasks2.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task.description}`);
    });
    console.log('');

    console.log('🚀 启动批量执行...\n');
    const startTime2 = Date.now();

    const results2 = await agentPool.executeBatch(
      tasks2.map(task => ({
        prompt: task.prompt,
        timeout: 30000,
        maxTokens: 2048
      }))
    );

    const executionTime2 = Date.now() - startTime2;

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  执行结果                                                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log(`⏱️  总执行时间: ${executionTime2}ms (${(executionTime2 / 1000).toFixed(2)}s)`);
    console.log(`📊 性能指标:`);
    console.log(`   - 平均每任务: ${(executionTime2 / results2.length).toFixed(2)}ms`);
    console.log(`   - 吞吐量: ${(results2.length / (executionTime2 / 1000)).toFixed(2)} tasks/sec`);
    console.log('');

    results2.forEach((result, index) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📄 任务 ${index + 1}: ${tasks2[index].description}`);
      console.log(`   状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);
      
      if (result.success) {
        console.log(`   执行时间: ${result.executionTime}ms`);
        
        if (result.result) {
          if (result.result.summary) {
            console.log(`   结果: ${result.result.summary.substring(0, 150)}...`);
          }
          if (result.result.text) {
            console.log(`   详情: ${result.result.text.substring(0, 150)}...`);
          }
        }
      } else {
        console.log(`   错误: ${result.error}`);
      }
      console.log('');
    });

    // 总结
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  总体统计                                                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const allResults = [...results1, ...results2];
    const totalSuccess = allResults.filter(r => r.success).length;
    const totalExecutionTime = executionTime1 + executionTime2;

    console.log(`📊 综合统计:`);
    console.log(`   - 总任务数: ${allResults.length}`);
    console.log(`   - 总成功数: ${totalSuccess}`);
    console.log(`   - 总成功率: ${((totalSuccess / allResults.length) * 100).toFixed(1)}%`);
    console.log(`   - 总执行时间: ${totalExecutionTime}ms (${(totalExecutionTime / 1000).toFixed(2)}s)`);
    console.log(`   - 平均响应时间: ${(totalExecutionTime / allResults.length).toFixed(2)}ms`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ Batch Agent 场景验证完成！                             ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // 返回测试结果
    return {
      success: true,
      totalTasks: allResults.length,
      successCount: totalSuccess,
      successRate: (totalSuccess / allResults.length) * 100,
      totalTime: totalExecutionTime
    };

  } catch (error) {
    console.error('❌ 测试执行失败:', error.message);
    console.error(error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

// 运行测试
runBatchScenario().then(result => {
  if (result.success) {
    console.log('🎉 测试成功完成！');
    process.exit(0);
  } else {
    console.log('❌ 测试失败');
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 未预期的错误:', error);
  process.exit(1);
});
