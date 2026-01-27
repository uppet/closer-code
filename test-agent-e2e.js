/**
 * Agent 系统 - 端到端测试
 * 
 * 测试完整的 Agent 工作流程：
 * 1. 启动 Agent 执行任务
 * 2. 结果持久化存储
 * 3. 缓存复用
 * 4. 结果查询
 * 5. 自动清理
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 
  setToolExecutorContext, 
  dispatchAgentTool, 
  agentResultTool 
} from './src/tools.js';
import { getGlobalAgentStorage } from './src/agents/agent-storage.js';
import { getGlobalAgentPool } from './src/agents/agent-pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Agent 系统 - 端到端测试', () => {
  const workingDir = __dirname;
  const testConversationId = `test_e2e_${randomUUID()}`;
  let agentPool;
  let storage;

  before(async () => {
    // 初始化工具执行上下文
    setToolExecutorContext({
      workingDir,
      enabledTools: new Set(['dispatchAgent', 'agentResult', 'searchFiles', 'searchCode', 'listFiles', 'readFile'])
    });

    // 初始化 Agent Pool
    agentPool = getGlobalAgentPool({
      behavior: { workingDir },
      agents: { maxConcurrent: 3, timeout: 60000 }
    });

    // 初始化存储
    storage = getGlobalAgentStorage({ projectRoot: workingDir });
  });

  after(async () => {
    // 清理测试数据
    try {
      const agents = await storage.listAgents(testConversationId);
      for (const agent of agents) {
        await storage.deleteAgent(agent.agentId);
      }
    } catch (error) {
      console.warn('Cleanup failed:', error.message);
    }
  });

  it('E2E-1: 完整工作流程 - 执行、存储、查询', async () => {
    console.log('\n[E2E-1] 测试完整工作流程...');

    // Step 1: 执行 Agent 任务
    const dispatchInput = JSON.parse(await dispatchAgentTool.run({
      prompt: '找到所有的测试文件 (*.test.js)',
      conversationId: testConversationId,
      useCache: false // 第一次执行，不使用缓存
    }));

    console.log('[E2E-1] Agent 执行结果:', dispatchInput);
    assert.equal(dispatchInput.success, true, 'Agent 执行应该成功');
    assert.ok(dispatchInput.agentId, '应该返回 agent ID');
    assert.ok(dispatchInput.saved, '结果应该已保存');

    const agentId = dispatchInput.agentId;

    // Step 2: 验证结果已持久化
    const storedResult = await storage.getAgentResult(agentId);
    assert.ok(storedResult, '结果应该已持久化存储');
    assert.equal(storedResult.agentId, agentId, 'Agent ID 应该匹配');
    assert.ok(storedResult.result, '应该有结果数据');
    assert.ok(storedResult.cache, '应该有缓存元数据');

    // Step 3: 使用 agentResult 工具查询结果
    const queryInput1 = JSON.parse(await agentResultTool.run({
      agent_id: agentId,
      action: 'summary'
    }));

    console.log('[E2E-1] 查询摘要:', queryInput1);
    assert.equal(queryInput1.success, true, '查询摘要应该成功');
    assert.ok(queryInput1.summary, '应该返回摘要');

    // Step 4: 查询完整结果
    const queryInput2 = JSON.parse(await agentResultTool.run({
      agent_id: agentId,
      action: 'full'
    }));

    console.log('[E2E-1] 查询完整结果:', queryInput2);
    assert.equal(queryInput2.success, true, '查询完整结果应该成功');
    assert.ok(queryInput2.result, '应该返回完整结果');
    assert.ok(queryInput2.result.findings, '应该包含 findings');

    // Step 5: 搜索结果
    const queryInput3 = JSON.parse(await agentResultTool.run({
      agent_id: agentId,
      action: 'search',
      pattern: 'test'
    }));

    console.log('[E2E-1] 搜索结果:', queryInput3);
    assert.equal(queryInput3.success, true, '搜索应该成功');
    assert.ok(Array.isArray(queryInput3.matches), '应该返回匹配数组');

    console.log('[E2E-1] ✅ 完整工作流程测试通过');
  });

  it('E2E-2: 缓存复用 - 相同任务应返回缓存', async () => {
    console.log('\n[E2E-2] 测试缓存复用...');

    const taskPrompt = '找到所有的 package.json 文件';

    // 第一次执行
    const firstInput = JSON.parse(await dispatchAgentTool.run({
      prompt: taskPrompt,
      conversationId: testConversationId,
      useCache: false
    }));

    console.log('[E2E-2] 第一次执行:', firstInput);
    assert.equal(firstInput.success, true, '第一次执行应该成功');
    assert.equal(firstInput.cached, undefined, '第一次执行不应该来自缓存');
    const firstAgentId = firstInput.agentId;

    // 等待一小段时间确保保存完成
    await new Promise(resolve => setTimeout(resolve, 100));

    // 第二次执行（应该使用缓存）
    const secondInput = JSON.parse(await dispatchAgentTool.run({
      prompt: taskPrompt,
      conversationId: testConversationId,
      useCache: true
    }));

    console.log('[E2E-2] 第二次执行（缓存）:', secondInput);
    assert.equal(secondInput.success, true, '第二次执行应该成功');
    assert.equal(secondInput.cached, true, '第二次执行应该来自缓存');
    assert.equal(secondInput.agentId, firstAgentId, '应该返回相同的 agent ID');
    assert.ok(secondInput.stats, '应该包含缓存统计');
    assert.ok(secondInput.stats.accessCount, '应该有访问计数');

    console.log('[E2E-2] ✅ 缓存复用测试通过');
  });

  it('E2E-3: 批量执行 - 并发多个 agents', async () => {
    console.log('\n[E2E-3] 测试批量执行...');

    const batchInput = JSON.parse(await dispatchAgentTool.run({
      batch: [
        { prompt: '找到所有的 JavaScript 文件' },
        { prompt: '找到所有的 Markdown 文档' },
        { prompt: '找到所有的配置文件' }
      ],
      conversationId: testConversationId
    }));

    console.log('[E2E-3] 批量执行结果:', batchInput);
    assert.equal(batchInput.success, true, '批量执行应该成功');
    assert.equal(batchInput.mode, 'batch', '应该是批量模式');
    assert.equal(batchInput.count, 3, '应该执行 3 个任务');

    // 验证每个任务都成功
    assert.ok(Array.isArray(batchInput.results), '应该返回结果数组');
    for (const result of batchInput.results) {
      assert.equal(result.success, true, '每个任务都应该成功');
      assert.ok(result.agentId, '每个任务都应该有 agent ID');
    }

    console.log('[E2E-3] ✅ 批量执行测试通过');
  });

  it('E2E-4: Agent Pool 状态查询', async () => {
    console.log('\n[E2E-4] 测试 Agent Pool 状态查询...');

    // 查询池状态
    const statusInput = JSON.parse(await agentResultTool.run({
      action: 'pool_status'
    }));

    console.log('[E2E-4] Pool 状态:', statusInput);
    assert.equal(statusInput.success, true, '查询池状态应该成功');
    assert.ok(statusInput.pool, '应该返回池信息');
    assert.ok(typeof statusInput.pool.maxConcurrent === 'number', '应该有最大并发数');
    assert.ok(typeof statusInput.pool.running === 'number', '应该有运行中数量');
    assert.ok(typeof statusInput.pool.waiting === 'number', '应该有等待中数量');

    // 查询统计信息
    const statsInput = JSON.parse(await agentResultTool.run({
      action: 'stats'
    }));

    console.log('[E2E-4] 统计信息:', statsInput);
    assert.equal(statsInput.success, true, '查询统计应该成功');
    assert.ok(statsInput.stats, '应该返回统计信息');
    assert.ok(typeof statsInput.stats.totalExecuted === 'number', '应该有总执行数');
    assert.ok(typeof statsInput.stats.totalTokens === 'number', '应该有总 token 数');

    console.log('[E2E-4] ✅ Pool 状态查询测试通过');
  });

  it('E2E-5: 错误处理 - 无效 agent_id', async () => {
    console.log('\n[E2E-5] 测试错误处理...');

    // 查询不存在的 agent
    const errorInput = JSON.parse(await agentResultTool.run({
      agent_id: 'agent_nonexistent_123',
      action: 'full'
    }));

    console.log('[E2E-5] 错误处理结果:', errorInput);
    assert.equal(errorInput.success, false, '查询应该失败');
    assert.ok(errorInput.error, '应该返回错误信息');
    assert.ok(errorInput.error.includes('not found') || errorInput.error.includes('不存在'), 
              '错误信息应该提示 agent 不存在');

    console.log('[E2E-5] ✅ 错误处理测试通过');
  });

  it('E2E-6: 结果文件列表', async () => {
    console.log('\n[E2E-6] 测试结果文件列表...');

    // 先执行一个任务
    const dispatchInput = JSON.parse(await dispatchAgentTool.run({
      prompt: '找到所有的 src 目录下的文件',
      conversationId: testConversationId
    }));

    assert.equal(dispatchInput.success, true, 'Agent 执行应该成功');
    const agentId = dispatchInput.agentId;

    // 查询文件列表
    const filesInput = JSON.parse(await agentResultTool.run({
      agent_id: agentId,
      action: 'files'
    }));

    console.log('[E2E-6] 文件列表:', filesInput);
    assert.equal(filesInput.success, true, '查询文件列表应该成功');
    assert.ok(Array.isArray(filesInput.files), '应该返回文件数组');
    assert.ok(filesInput.files.length > 0, '应该至少有一个文件');

    console.log('[E2E-6] ✅ 文件列表测试通过');
  });

  it('E2E-7: 缓存统计', async () => {
    console.log('\n[E2E-7] 测试缓存统计...');

    // 执行几个任务以生成缓存数据
    await dispatchAgentTool.run({
      prompt: '测试任务 1',
      conversationId: testConversationId
    });

    await dispatchAgentTool.run({
      prompt: '测试任务 2',
      conversationId: testConversationId
    });

    // 等待保存完成
    await new Promise(resolve => setTimeout(resolve, 200));

    // 查询缓存统计
    const statsInput = JSON.parse(await agentResultTool.run({
      action: 'stats'
    }));

    console.log('[E2E-7] 缓存统计:', statsInput);
    assert.equal(statsInput.success, true, '查询统计应该成功');
    assert.ok(statsInput.stats, '应该返回统计信息');

    console.log('[E2E-7] ✅ 缓存统计测试通过');
  });
});

console.log('🧪 启动端到端测试...');

// 运行测试
describe('Agent 系统 - 端到端测试', () => {
  // 测试将在上面定义
}).run();
