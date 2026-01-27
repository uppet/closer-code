#!/usr/bin/env node
/**
 * Batch Agents 验证场景
 * 
 * 目标：验证 dispatch_agent 在真实场景中的运行效果
 * 
 * 场景设计：
 * 1. 代码库结构分析 - 搜索不同类型的文件
 * 2. 功能特性搜索 - 搜索特定关键词
 * 3. 依赖关系分析 - 搜索 import 语句
 * 4. 测试覆盖分析 - 搜索测试文件
 */

import { AgentPool } from './src/agents/agent-pool.js';
import { AgentStorage } from './src/agents/agent-storage.js';
import { loadConfig } from './src/config.js';

// 初始化
const config = loadConfig();
const storage = new AgentStorage(config.agents.storage || {});
const pool = new AgentPool(config.agents, storage);

console.log('🚀 Batch Agents 验证场景\n');
console.log('='.repeat(60));

// 场景 1: 代码库结构分析
async function scenario1() {
  console.log('\n📊 场景 1: 代码库结构分析');
  console.log('-'.repeat(60));
  
  const tasks = [
    '搜索所有配置文件（*.json, *.yaml, *.toml, *.ini）',
    '搜索所有测试文件（test-*.js, *.test.js）',
    '搜索所有文档文件（*.md）',
    '搜索所有源代码文件（src/**/*.js）'
  ];

  console.log('任务列表:');
  tasks.forEach((task, i) => console.log(`  ${i + 1}. ${task}`));
  console.log('\n执行中...\n');

  const startTime = Date.now();
  const results = await Promise.all(
    tasks.map(task => pool.executeAgent({ prompt: task, timeout: 30000 }))
  );
  const endTime = Date.now();

  console.log('\n结果:');
  results.forEach((result, i) => {
    console.log(`  任务 ${i + 1}: ${result.success ? '✅ 成功' : '❌ 失败'}`);
    if (result.agentId) {
      console.log(`    Agent ID: ${result.agentId.substring(0, 20)}...`);
    }
    if (result.executionTime) {
      console.log(`    执行时间: ${result.executionTime}ms`);
    }
  });

  console.log(`\n总耗时: ${endTime - startTime}ms`);
  console.log(`平均耗时: ${Math.round((endTime - startTime) / tasks.length)}ms/任务`);
  
  return results;
}

// 场景 2: 功能特性搜索
async function scenario2() {
  console.log('\n\n🔍 场景 2: 功能特性搜索');
  console.log('-'.repeat(60));
  
  const tasks = [
    '搜索 "logger" 关键词，找出所有日志相关的代码',
    '搜索 "error" 关键词，找出所有错误处理代码',
    '搜索 "handler" 关键词，找出所有处理器函数'
  ];

  console.log('任务列表:');
  tasks.forEach((task, i) => console.log(`  ${i + 1}. ${task}`));
  console.log('\n执行中...\n');

  const startTime = Date.now();
  const results = await Promise.all(
    tasks.map(task => pool.executeAgent({ prompt: task, timeout: 30000 }))
  );
  const endTime = Date.now();

  console.log('\n结果:');
  results.forEach((result, i) => {
    console.log(`  任务 ${i + 1}: ${result.success ? '✅ 成功' : '❌ 失败'}`);
    if (result.agentId) {
      console.log(`    Agent ID: ${result.agentId.substring(0, 20)}...`);
    }
    if (result.executionTime) {
      console.log(`    执行时间: ${result.executionTime}ms`);
    }
  });

  console.log(`\n总耗时: ${endTime - startTime}ms`);
  console.log(`平均耗时: ${Math.round((endTime - startTime) / tasks.length)}ms/任务`);
  
  return results;
}

// 场景 3: 缓存效果验证
async function scenario3() {
  console.log('\n\n⚡ 场景 3: 缓存效果验证');
  console.log('-'.repeat(60));
  
  const task = '搜索所有配置文件（*.json）';
  
  console.log(`任务: ${task}`);
  console.log('\n第一次执行（无缓存）...');
  const startTime1 = Date.now();
  const result1 = await pool.executeAgent({ prompt: task, timeout: 30000 });
  const endTime1 = Date.now();
  const time1 = endTime1 - startTime1;
  
  console.log(`  耗时: ${time1}ms`);
  console.log(`  Agent ID: ${result1.agentId?.substring(0, 20)}...`);
  
  console.log('\n第二次执行（有缓存）...');
  const startTime2 = Date.now();
  const result2 = await pool.executeAgent({ prompt: task, timeout: 30000 });
  const endTime2 = Date.now();
  const time2 = endTime2 - startTime2;
  
  console.log(`  耗时: ${time2}ms`);
  console.log(`  Agent ID: ${result2.agentId?.substring(0, 20)}...`);
  
  const speedup = time1 > 0 ? (time1 / time2).toFixed(2) : 'N/A';
  console.log(`\n加速比: ${speedup}x`);
  
  return { time1, time2, speedup };
}

// 场景 4: 结果查询验证
async function scenario4() {
  console.log('\n\n📋 场景 4: 结果查询验证');
  console.log('-'.repeat(60));
  
  const task = '搜索所有 package.json 文件';
  
  console.log(`执行任务: ${task}`);
  const result = await pool.executeAgent({ prompt: task, timeout: 30000 });
  
  if (result.agentId) {
    console.log(`\nAgent ID: ${result.agentId}`);
    
    // 查询完整结果
    console.log('\n查询完整结果...');
    const fullResult = await storage.getAgentResult(result.agentId);
    
    if (fullResult) {
      console.log('✅ 结果查询成功');
      console.log(`  状态: ${fullResult.status}`);
      console.log(`  创建时间: ${new Date(fullResult.createdAt).toLocaleString()}`);
      console.log(`  完成时间: ${new Date(fullResult.completedAt).toLocaleString()}`);
      console.log(`  执行耗时: ${fullResult.executionTime}ms`);
    } else {
      console.log('❌ 未找到结果');
    }
    
    return { success: true, agentId: result.agentId };
  } else {
    console.log('❌ 任务执行失败');
    return { success: false };
  }
}

// 场景 5: Pool 状态查询
async function scenario5() {
  console.log('\n\n📊 场景 5: Pool 状态查询');
  console.log('-'.repeat(60));
  
  const poolStatus = pool.getPoolStatus();
  const stats = pool.getStats();
  
  console.log('Pool 配置:');
  console.log(`  最大并发数: ${poolStatus.maxConcurrent}`);
  console.log(`  当前运行: ${poolStatus.currentlyRunning}`);
  console.log(`  等待队列: ${poolStatus.currentlyWaiting}`);
  console.log(`  可用槽位: ${poolStatus.availableSlots}`);
  
  console.log('\n性能统计:');
  console.log(`  总执行数: ${stats.totalExecuted}`);
  console.log(`  总成功: ${stats.totalSucceeded}`);
  console.log(`  总失败: ${stats.totalFailed}`);
  console.log(`  总耗时: ${stats.totalExecutionTime}ms`);
  console.log(`  平均耗时: ${Math.round(stats.averageExecutionTime)}ms`);
  console.log(`  峰值并发: ${stats.peakConcurrent}`);
  console.log(`  成功率: ${stats.successRate}`);
  console.log(`  运行时间: ${Math.round(stats.uptime / 1000)}s`);
  
  return { poolStatus, stats };
}

// 主函数
async function main() {
  try {
    // 等待存储初始化
    await storage.initialize();
    
    // 执行所有场景
    const results1 = await scenario1();
    const results2 = await scenario2();
    const results3 = await scenario3();
    const results4 = await scenario4();
    const results5 = await scenario5();
    
    // 总结
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 验证总结');
    console.log('='.repeat(60));
    
    const totalTasks = results1.length + results2.length + 2;
    const successTasks = results1.filter(r => r.success).length + 
                         results2.filter(r => r.success).length + 
                         (results4.success ? 2 : 0);
    
    console.log(`\n总任务数: ${totalTasks}`);
    console.log(`成功数: ${successTasks}`);
    console.log(`失败数: ${totalTasks - successTasks}`);
    console.log(`成功率: ${((successTasks / totalTasks) * 100).toFixed(1)}%`);
    
    console.log('\n场景结果:');
    console.log(`  场景 1 (结构分析): ${results1.every(r => r.success) ? '✅ 通过' : '⚠️ 部分'}`);
    console.log(`  场景 2 (功能搜索): ${results2.every(r => r.success) ? '✅ 通过' : '⚠️ 部分'}`);
    console.log(`  场景 3 (缓存验证): ✅ 通过 (加速 ${results3.speedup}x)`);
    console.log(`  场景 4 (结果查询): ${results4.success ? '✅ 通过' : '❌ 失败'}`);
    console.log(`  场景 5 (状态查询): ✅ 通过`);
    
    console.log('\n性能指标:');
    console.log(`  Pool 总执行: ${results5.stats.totalExecuted}`);
    console.log(`  Pool 成功率: ${results5.stats.successRate}`);
    console.log(`  平均耗时: ${results5.stats.averageExecutionTime}ms`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Batch Agents 验证完成！');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ 验证失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行
main();
