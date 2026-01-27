/**
 * Agent Cleanup Scheduler 单元测试
 */

import { AgentCleanupScheduler, getGlobalCleanupScheduler, resetGlobalCleanupScheduler } from './src/agents/agent-cleanup.js';
import { AgentStorage, resetGlobalAgentStorage } from './src/agents/agent-storage.js';
import path from 'path';
import { existsSync } from 'fs';
import os from 'os';

// 测试配置
const TEST_DIR = path.join(os.tmpdir(), 'agent-cleanup-test-' + Date.now());
const TEST_CONVERSATION_ID = 'test_conv_cleanup';
const TEST_AGENT_RESULT = {
  task: { prompt: 'Test cleanup' },
  stats: { duration: 1000 },
  result: { status: 'success', summary: 'Test' }
};

// 清理测试目录
async function cleanup() {
  if (existsSync(TEST_DIR)) {
    const { promises: fs } = await import('fs');
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  }
}

// 测试套件
async function runTests() {
  console.log('🧪 Agent Cleanup Scheduler 单元测试\n');
  
  let passed = 0;
  let failed = 0;

  // 初始清理
  await cleanup();

  // 测试 1: 创建调度器
  try {
    await test1_createScheduler();
    console.log('✅ 测试 1 通过: 创建调度器');
    passed++;
  } catch (error) {
    console.error('❌ 测试 1 失败:', error.message);
    failed++;
  }

  // 测试 2: 启动和停止
  try {
    await cleanup();
    await test2_startStop();
    console.log('✅ 测试 2 通过: 启动和停止');
    passed++;
  } catch (error) {
    console.error('❌ 测试 2 失败:', error.message);
    failed++;
  }

  // 测试 3: 执行清理
  try {
    await cleanup();
    await test3_cleanup();
    console.log('✅ 测试 3 通过: 执行清理');
    passed++;
  } catch (error) {
    console.error('❌ 测试 3 失败:', error.message);
    failed++;
  }

  // 测试 4: 过期清理
  try {
    await cleanup();
    await test4_expiredCleanup();
    console.log('✅ 测试 4 通过: 过期清理');
    passed++;
  } catch (error) {
    console.error('❌ 测试 4 失败:', error.message);
    failed++;
  }

  // 测试 5: 获取统计
  try {
    await cleanup();
    await test5_getStats();
    console.log('✅ 测试 5 通过: 获取统计');
    passed++;
  } catch (error) {
    console.error('❌ 测试 5 失败:', error.message);
    failed++;
  }

  // 测试 6: 全局实例
  try {
    await cleanup();
    await test6_globalInstance();
    console.log('✅ 测试 6 通过: 全局实例');
    passed++;
  } catch (error) {
    console.error('❌ 测试 6 失败:', error.message);
    failed++;
  }

  // 清理
  await cleanup();

  console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败`);
  return failed === 0;
}

// 测试 1: 创建调度器
async function test1_createScheduler() {
  const scheduler = new AgentCleanupScheduler({
    projectRoot: TEST_DIR,
    cleanupInterval: 1000, // 1秒
    maxAge: 5000 // 5秒
  });

  if (!scheduler) {
    throw new Error('调度器未创建');
  }

  if (scheduler.cleanupInterval !== 1000) {
    throw new Error('cleanupInterval 未正确设置');
  }

  if (scheduler.maxAge !== 5000) {
    throw new Error('maxAge 未正确设置');
  }
}

// 测试 2: 启动和停止
async function test2_startStop() {
  const scheduler = new AgentCleanupScheduler({
    projectRoot: TEST_DIR,
    cleanupInterval: 10000 // 10秒
  });

  if (scheduler.isRunning) {
    throw new Error('调度器不应该在启动时运行');
  }

  scheduler.start();

  if (!scheduler.isRunning) {
    throw new Error('调度器应该正在运行');
  }

  // 等待一小段时间确保定时器已设置
  await new Promise(resolve => setTimeout(resolve, 100));

  scheduler.stop();

  if (scheduler.isRunning) {
    throw new Error('调度器应该已停止');
  }
}

// 测试 3: 执行清理
async function test3_cleanup() {
  const scheduler = new AgentCleanupScheduler({
    projectRoot: TEST_DIR,
    maxAge: 5000
  });

  // 保存一些 agents
  const storage = new AgentStorage({ projectRoot: TEST_DIR });
  await storage.initialize();

  await storage.saveAgentResult(TEST_CONVERSATION_ID, TEST_AGENT_RESULT);
  await storage.saveAgentResult(TEST_CONVERSATION_ID + '_2', TEST_AGENT_RESULT);

  // 执行清理（不应该删除任何东西，因为它们还没过期）
  const deleted = await scheduler.cleanup();

  if (deleted !== 0) {
    throw new Error(`预期删除 0 个 agents，实际删除 ${deleted}`);
  }
}

// 测试 4: 过期清理
async function test4_expiredCleanup() {
  // 重置全局 storage，确保使用新的配置
  resetGlobalAgentStorage();

  const maxAge = 100; // 100ms

  const scheduler = new AgentCleanupScheduler({
    projectRoot: TEST_DIR,
    maxAge
  });

  // 保存 agent（使用相同的 maxAge）
  const storage = new AgentStorage({ 
    projectRoot: TEST_DIR,
    maxAge
  });
  await storage.initialize();

  const agentId = await storage.saveAgentResult(TEST_CONVERSATION_ID, TEST_AGENT_RESULT);

  // 等待过期
  await new Promise(resolve => setTimeout(resolve, 150));

  // 执行清理
  const deleted = await scheduler.cleanup();

  if (deleted !== 1) {
    throw new Error(`预期删除 1 个 agent，实际删除 ${deleted}`);
  }

  // 验证已删除
  const result = await storage.getAgentResult(agentId);
  if (result) {
    throw new Error('过期的 agent 应该被清理');
  }
}

// 测试 5: 获取统计
async function test5_getStats() {
  const scheduler = new AgentCleanupScheduler({
    projectRoot: TEST_DIR,
    cleanupInterval: 10000,
    maxAge: 5000
  });

  // 保存一些 agents
  const storage = new AgentStorage({ projectRoot: TEST_DIR });
  await storage.initialize();

  await storage.saveAgentResult(TEST_CONVERSATION_ID, TEST_AGENT_RESULT);

  const stats = await scheduler.getStats();

  if (!stats) {
    throw new Error('统计信息不存在');
  }

  if (stats.totalAgents !== 1) {
    throw new Error(`预期 1 个 agent，实际 ${stats.totalAgents}`);
  }

  if (stats.cleanupInterval !== 10000) {
    throw new Error('cleanupInterval 不正确');
  }

  if (stats.maxAge !== 5000) {
    throw new Error('maxAge 不正确');
  }
}

// 测试 6: 全局实例
async function test6_globalInstance() {
  resetGlobalCleanupScheduler();

  const scheduler1 = getGlobalCleanupScheduler({ projectRoot: TEST_DIR });
  const scheduler2 = getGlobalCleanupScheduler();

  if (scheduler1 !== scheduler2) {
    throw new Error('应该返回同一个实例');
  }

  // 重置后应该是新实例
  resetGlobalCleanupScheduler();
  const scheduler3 = getGlobalCleanupScheduler();

  if (scheduler1 === scheduler3) {
    throw new Error('重置后应该是新实例');
  }
}

// 运行测试
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('测试运行失败:', error);
  process.exit(1);
});
