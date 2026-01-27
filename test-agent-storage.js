/**
 * Agent Storage 单元测试
 */

import { AgentStorage, getGlobalAgentStorage, resetGlobalAgentStorage } from './src/agents/agent-storage.js';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import os from 'os';

// 测试配置
const TEST_DIR = path.join(os.tmpdir(), 'agent-storage-test-' + Date.now());
const TEST_CONVERSATION_ID = 'test_conv_123';
const TEST_AGENT_RESULT = {
  task: {
    prompt: 'Find all configuration files',
    tools: ['searchFiles', 'readFile'],
    parameters: {
      pattern: '**/*.{json,yaml}'
    }
  },
  stats: {
    duration: 3500,
    totalTokens: 4500,
    toolCalls: 12,
    filesAccessed: 8
  },
  result: {
    status: 'success',
    summary: 'Found 15 configuration files',
    findings: [
      {
        type: 'file',
        path: 'package.json',
        relevance: 0.95,
        snippet: '{"name": "test"}'
      }
    ],
    files: ['package.json', 'tsconfig.json']
  }
};

// 清理测试目录
async function cleanup() {
  if (existsSync(TEST_DIR)) {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  }
}

// 测试套件
async function runTests() {
  console.log('🧪 Agent Storage 单元测试\n');
  
  let passed = 0;
  let failed = 0;

  // 初始清理
  await cleanup();

  // 测试 1: 初始化存储
  try {
    await test1_initialize();
    console.log('✅ 测试 1 通过: 初始化存储');
    passed++;
  } catch (error) {
    console.error('❌ 测试 1 失败:', error.message);
    failed++;
  }

  // 测试 2: 保存 agent 结果
  try {
    await cleanup();
    await test2_saveAgentResult();
    console.log('✅ 测试 2 通过: 保存 agent 结果');
    passed++;
  } catch (error) {
    console.error('❌ 测试 2 失败:', error.message);
    failed++;
  }

  // 测试 3: 获取 agent 结果
  try {
    await cleanup();
    await test3_getAgentResult();
    console.log('✅ 测试 3 通过: 获取 agent 结果');
    passed++;
  } catch (error) {
    console.error('❌ 测试 3 失败:', error.message);
    failed++;
  }

  // 测试 4: 列出 agents
  try {
    await cleanup();
    await test4_listAgents();
    console.log('✅ 测试 4 通过: 列出 agents');
    passed++;
  } catch (error) {
    console.error('❌ 测试 4 失败:', error.message);
    failed++;
  }

  // 测试 5: 相似任务检测
  try {
    await cleanup();
    await test5_findSimilarTask();
    console.log('✅ 测试 5 通过: 相似任务检测');
    passed++;
  } catch (error) {
    console.error('❌ 测试 5 失败:', error.message);
    failed++;
  }

  // 测试 6: 删除 agent 结果
  try {
    await cleanup();
    await test6_deleteAgentResult();
    console.log('✅ 测试 6 通过: 删除 agent 结果');
    passed++;
  } catch (error) {
    console.error('❌ 测试 6 失败:', error.message);
    failed++;
  }

  // 测试 7: 清理过期 agents
  try {
    await cleanup();
    await test7_cleanupExpiredAgents();
    console.log('✅ 测试 7 通过: 清理过期 agents');
    passed++;
  } catch (error) {
    console.error('❌ 测试 7 失败:', error.message);
    failed++;
  }

  // 测试 8: 文件大小限制
  try {
    await cleanup();
    await test8_fileSizeLimit();
    console.log('✅ 测试 8 通过: 文件大小限制');
    passed++;
  } catch (error) {
    console.error('❌ 测试 8 失败:', error.message);
    failed++;
  }

  // 测试 9: 获取统计信息
  try {
    await cleanup();
    await test9_getStats();
    console.log('✅ 测试 9 通过: 获取统计信息');
    passed++;
  } catch (error) {
    console.error('❌ 测试 9 失败:', error.message);
    failed++;
  }

  // 测试 10: 全局实例
  try {
    await cleanup();
    await test10_globalInstance();
    console.log('✅ 测试 10 通过: 全局实例');
    passed++;
  } catch (error) {
    console.error('❌ 测试 10 失败:', error.message);
    failed++;
  }

  // 清理
  await cleanup();

  console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败`);
  return failed === 0;
}

// 测试 1: 初始化存储
async function test1_initialize() {
  const storage = new AgentStorage({ projectRoot: TEST_DIR });
  await storage.initialize();

  // 检查目录是否创建
  const storageDir = path.join(TEST_DIR, '.agents_works');
  if (!existsSync(storageDir)) {
    throw new Error('存储目录未创建');
  }

  // 检查索引文件是否创建
  const indexPath = path.join(storageDir, '.index');
  if (!existsSync(indexPath)) {
    throw new Error('索引文件未创建');
  }

  const indexContent = await fs.readFile(indexPath, 'utf8');
  const index = JSON.parse(indexContent);

  if (index.version !== 1) {
    throw new Error('索引版本不正确');
  }
}

// 测试 2: 保存 agent 结果
async function test2_saveAgentResult() {
  const storage = new AgentStorage({ projectRoot: TEST_DIR });
  await storage.initialize();

  const agentId = await storage.saveAgentResult(TEST_CONVERSATION_ID, TEST_AGENT_RESULT);

  if (!agentId || !agentId.startsWith('agent_')) {
    throw new Error('agent ID 格式不正确');
  }

  // 检查文件是否创建
  const resultPath = path.join(TEST_DIR, '.agents_works', TEST_CONVERSATION_ID, `${agentId}.json`);
  if (!existsSync(resultPath)) {
    throw new Error('agent 结果文件未创建');
  }

  // 检查文件内容
  const content = await fs.readFile(resultPath, 'utf8');
  const result = JSON.parse(content);

  if (result.agentId !== agentId) {
    throw new Error('agent ID 不匹配');
  }

  if (result.conversationId !== TEST_CONVERSATION_ID) {
    throw new Error('conversation ID 不匹配');
  }

  if (result.result.summary !== 'Found 15 configuration files') {
    throw new Error('结果摘要不正确');
  }
}

// 测试 3: 获取 agent 结果
async function test3_getAgentResult() {
  const storage = new AgentStorage({ projectRoot: TEST_DIR });
  await storage.initialize();

  const agentId = await storage.saveAgentResult(TEST_CONVERSATION_ID, TEST_AGENT_RESULT);
  const result = await storage.getAgentResult(agentId);

  if (!result) {
    throw new Error('未找到 agent 结果');
  }

  if (result.agentId !== agentId) {
    throw new Error('agent ID 不匹配');
  }

  if (result.cache.accessCount !== 1) {
    throw new Error('访问计数不正确');
  }

  // 再次获取，访问计数应该增加
  const result2 = await storage.getAgentResult(agentId);
  if (result2.cache.accessCount !== 2) {
    throw new Error('访问计数未增加');
  }
}

// 测试 4: 列出 agents
async function test4_listAgents() {
  const storage = new AgentStorage({ projectRoot: TEST_DIR });
  await storage.initialize();

  // 保存多个 agents
  await storage.saveAgentResult(TEST_CONVERSATION_ID, {
    ...TEST_AGENT_RESULT,
    task: { prompt: 'Task 1' }
  });

  await storage.saveAgentResult(TEST_CONVERSATION_ID, {
    ...TEST_AGENT_RESULT,
    task: { prompt: 'Task 2' }
  });

  const agents = await storage.listAgents(TEST_CONVERSATION_ID);

  if (agents.length !== 2) {
    throw new Error(`预期 2 个 agents，实际 ${agents.length}`);
  }

  if (!agents[0].agentId || !agents[0].timestamp) {
    throw new Error('agent 信息不完整');
  }
}

// 测试 5: 相似任务检测
async function test5_findSimilarTask() {
  const storage = new AgentStorage({ projectRoot: TEST_DIR });
  await storage.initialize();

  const prompt = 'Find all configuration files';
  await storage.saveAgentResult(TEST_CONVERSATION_ID, {
    ...TEST_AGENT_RESULT,
    task: { prompt }
  });

  // 查找相同任务
  const cachedAgentId = await storage.findSimilarTask(TEST_CONVERSATION_ID, prompt);

  if (!cachedAgentId) {
    throw new Error('未找到缓存的 agent');
  }

  // 查找不同任务
  const differentAgentId = await storage.findSimilarTask(TEST_CONVERSATION_ID, 'Different task');

  if (differentAgentId) {
    throw new Error('不应该找到不同任务的缓存');
  }
}

// 测试 6: 删除 agent 结果
async function test6_deleteAgentResult() {
  const storage = new AgentStorage({ projectRoot: TEST_DIR });
  await storage.initialize();

  const agentId = await storage.saveAgentResult(TEST_CONVERSATION_ID, TEST_AGENT_RESULT);

  // 删除前应该存在
  let result = await storage.getAgentResult(agentId);
  if (!result) {
    throw new Error('agent 结果应该存在');
  }

  // 删除
  await storage.deleteAgentResult(TEST_CONVERSATION_ID, agentId);

  // 删除后不应该存在
  result = await storage.getAgentResult(agentId);
  if (result) {
    throw new Error('agent 结果应该被删除');
  }

  // 检查文件是否被删除
  const resultPath = path.join(TEST_DIR, '.agents_works', TEST_CONVERSATION_ID, `${agentId}.json`);
  if (existsSync(resultPath)) {
    throw new Error('agent 结果文件未被删除');
  }
}

// 测试 7: 清理过期 agents
async function test7_cleanupExpiredAgents() {
  const storage = new AgentStorage({
    projectRoot: TEST_DIR,
    maxAge: 100 // 100ms 过期期
  });
  await storage.initialize();

  // 保存 agent
  const agentId = await storage.saveAgentResult(TEST_CONVERSATION_ID, TEST_AGENT_RESULT);

  // 等待过期
  await new Promise(resolve => setTimeout(resolve, 150));

  // 清理
  const deletedCount = await storage.cleanupExpiredAgents();

  if (deletedCount !== 1) {
    throw new Error(`预期删除 1 个 agent，实际删除 ${deletedCount}`);
  }

  // 验证已删除
  const result = await storage.getAgentResult(agentId);
  if (result) {
    throw new Error('过期的 agent 应该被清理');
  }
}

// 测试 8: 文件大小限制
async function test8_fileSizeLimit() {
  const storage = new AgentStorage({
    projectRoot: TEST_DIR,
    maxFileSize: 100 // 100 bytes
  });
  await storage.initialize();

  // 创建一个大的结果
  const largeResult = {
    ...TEST_AGENT_RESULT,
    result: {
      status: 'success',
      summary: 'x'.repeat(1000) // 超过 100 bytes
    }
  };

  try {
    await storage.saveAgentResult(TEST_CONVERSATION_ID, largeResult);
    throw new Error('应该抛出文件大小限制错误');
  } catch (error) {
    if (!error.message.includes('exceeds maximum allowed size')) {
      throw error;
    }
  }
}

// 测试 9: 获取统计信息
async function test9_getStats() {
  const storage = new AgentStorage({ projectRoot: TEST_DIR });
  await storage.initialize();

  // 保存多个 agents
  await storage.saveAgentResult(TEST_CONVERSATION_ID, TEST_AGENT_RESULT);
  await storage.saveAgentResult(TEST_CONVERSATION_ID + '_2', TEST_AGENT_RESULT);

  const stats = await storage.getStats();

  if (stats.conversations !== 2) {
    throw new Error(`预期 2 个对话，实际 ${stats.conversations}`);
  }

  if (stats.totalAgents !== 2) {
    throw new Error(`预期 2 个 agents，实际 ${stats.totalAgents}`);
  }

  if (stats.totalSize <= 0) {
    throw new Error('总大小应该大于 0');
  }
}

// 测试 10: 全局实例
async function test10_globalInstance() {
  resetGlobalAgentStorage();

  const storage1 = getGlobalAgentStorage({ projectRoot: TEST_DIR });
  const storage2 = getGlobalAgentStorage();

  if (storage1 !== storage2) {
    throw new Error('应该返回同一个实例');
  }

  // 重置后应该是新实例
  resetGlobalAgentStorage();
  const storage3 = getGlobalAgentStorage();

  if (storage1 === storage3) {
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
