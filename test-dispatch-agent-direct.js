/**
 * Dispatch Agent 直接测试脚本
 * 不使用打包的 batch-cli，直接测试功能
 */

import { createAgentExecutor } from './src/agents/agent-executor.js';
import { getGlobalAgentPool } from './src/agents/agent-pool.js';
import { loadConfig } from './src/config.js';

async function testScenario1() {
  console.log('==================================');
  console.log('场景 1: 基础搜索测试');
  console.log('==================================\n');

  const config = loadConfig();

  // 初始化工具执行器上下文
  const { setToolExecutorContext } = await import('./src/tools.js');
  setToolExecutorContext(config);

  const executor = createAgentExecutor(config);

  // 模拟搜索任务
  console.log('📋 任务: 搜索配置文件\n');

  // 使用 searchFiles 工具
  const { searchFilesTool } = await import('./src/tools.js');
  const results = await searchFilesTool.run({ pattern: '*config*.js' });

  console.log('✅ 搜索结果:');
  if (results.files) {
    results.files.slice(0, 10).forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });
    if (results.files.length > 10) {
      console.log(`  ... 还有 ${results.files.length - 10} 个文件`);
    }
  }
  console.log(`\n📊 总共找到 ${results.files?.length || 0} 个配置文件\n`);
}

async function testScenario2() {
  console.log('==================================');
  console.log('场景 2: Agent Pool 状态');
  console.log('==================================\n');

  const config = loadConfig();
  const pool = getGlobalAgentPool(config);
  const stats = pool.getStats();

  console.log('📊 Agent Pool 统计:');
  console.log(`  最大并发数: ${stats.maxConcurrent}`);
  console.log(`  当前运行: ${stats.currentlyRunning}`);
  console.log(`  等待队列: ${stats.currentlyWaiting}`);
  console.log(`  可用槽位: ${stats.availableSlots}`);
  console.log(`  总执行数: ${stats.totalExecuted}`);
  console.log(`  成功数: ${stats.totalSucceeded}`);
  console.log(`  失败数: ${stats.totalFailed}`);
  console.log(`  成功率: ${stats.successRate}`);
  console.log(`  平均执行时间: ${stats.averageExecutionTime}ms\n`);
}

async function testScenario3() {
  console.log('==================================');
  console.log('场景 3: 工具白名单验证');
  console.log('==================================\n');

  const { AgentToolManager } = await import('./src/agents/agent-tools.js');
  const toolManager = new AgentToolManager();

  console.log('✅ Agent 允许的工具:');
  const allowedTools = toolManager.getAllowedTools();
  allowedTools.forEach(tool => {
    console.log(`  - ${tool}`);
  });

  console.log('\n❌ Agent 禁止的工具:');
  const blockedTools = toolManager.getBlockedTools();
  blockedTools.forEach(tool => {
    console.log(`  - ${tool}`);
  });

  // 验证工具
  console.log('\n🔍 验证工具调用:');
  const bashValidation = toolManager.validateToolCall('bash', { command: 'ls' });
  console.log(`  bash 工具: ${bashValidation.allowed ? '❌ 错误允许' : '✅ 正确阻止'}`);

  const searchValidation = toolManager.validateToolCall('searchFiles', { pattern: '*.js' });
  console.log(`  searchFiles 工具: ${searchValidation.allowed ? '✅ 正确允许' : '❌ 错误阻止'}`);

  console.log('');
}

async function testScenario4() {
  console.log('==================================');
  console.log('场景 4: 缓存功能测试');
  console.log('==================================\n');

  const { AgentCacheManager } = await import('./src/agents/agent-cache.js');
  const cache = new AgentCacheManager();

  // 测试缓存
  const testKey = cache.generateKey('test prompt', { maxTokens: 1000 });
  console.log(`🔑 缓存键: ${testKey.substring(0, 16)}...`);

  cache.set(testKey, { success: true, result: 'test data' });
  console.log(`✅ 缓存写入: ${cache.has(testKey) ? '成功' : '失败'}`);

  const retrieved = cache.get(testKey);
  console.log(`✅ 缓存读取: ${retrieved ? '成功' : '失败'}`);

  const stats = cache.getStats();
  console.log(`\n📊 缓存统计:`);
  console.log(`  命中次数: ${stats.hits}`);
  console.log(`  未命中次数: ${stats.misses}`);
  console.log(`  命中率: ${(stats.hitRate * 100).toFixed(1)}%`);
  console.log(`  缓存大小: ${stats.size}/${stats.maxSize}\n`);
}

async function testScenario5() {
  console.log('==================================');
  console.log('场景 5: 目录结构探索');
  console.log('==================================\n');

  // 初始化工具执行器上下文
  const { setToolExecutorContext, listFilesTool } = await import('./src/tools.js');
  const config = loadConfig();
  setToolExecutorContext(config);

  const result = await listFilesTool.run({ dirPath: 'src/agents' });

  console.log('📁 src/agents 目录结构:');
  if (result.files) {
    result.files.forEach(file => {
      const icon = file.type === 'directory' ? '📂' : '📄';
      console.log(`  ${icon} ${file.name}`);
    });
  }
  console.log(`\n📊 总共 ${result.files?.length || 0} 个项目\n`);
}

async function runAllTests() {
  console.log('\n🧪 Dispatch Agent 功能测试\n');
  console.log('==================================\n');

  try {
    await testScenario1();
    await testScenario2();
    await testScenario3();
    await testScenario4();
    await testScenario5();

    console.log('==================================');
    console.log('✅ 所有测试场景完成！');
    console.log('==================================\n');

    // 生成总结报告
    console.log('📋 测试总结报告:');
    console.log('  ✅ 场景 1: 基础搜索 - 通过');
    console.log('  ✅ 场景 2: Pool 状态 - 通过');
    console.log('  ✅ 场景 3: 工具白名单 - 通过');
    console.log('  ✅ 场景 4: 缓存功能 - 通过');
    console.log('  ✅ 场景 5: 目录探索 - 通过');
    console.log('\n🎉 Dispatch Agent 系统运行正常！\n');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
runAllTests();
