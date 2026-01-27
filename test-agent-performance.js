/**
 * Agent 系统 - 性能测试
 * 
 * 测试 Agent 系统的性能指标：
 * 1. 执行速度
 * 2. Token 使用效率
 * 3. 缓存命中率
 * 4. 并发性能
 * 5. 内存使用
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { 
  setToolExecutorContext, 
  dispatchAgentTool, 
  agentResultTool 
} from './src/tools.js';
import { getGlobalAgentStorage } from './src/agents/agent-storage.js';
import { getGlobalAgentPool } from './src/agents/agent-pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Agent 系统 - 性能测试', () => {
  const workingDir = __dirname;
  const testConversationId = `test_perf_${randomUUID()}`;
  let agentPool;
  let storage;

  before(async () => {
    setToolExecutorContext({
      workingDir,
      enabledTools: new Set(['dispatchAgent', 'agentResult', 'searchFiles', 'searchCode', 'listFiles', 'readFile'])
    });

    agentPool = getGlobalAgentPool({
      behavior: { workingDir },
      agents: { maxConcurrent: 3, timeout: 60000 }
    });

    storage = getGlobalAgentStorage({ projectRoot: workingDir });
  });

  after(async () => {
    try {
      const agents = await storage.listAgents(testConversationId);
      for (const agent of agents) {
        await storage.deleteAgent(agent.agentId);
      }
    } catch (error) {
      console.warn('Cleanup failed:', error.message);
    }
  });

  it('PERF-1: 单次执行速度', async () => {
    console.log('\n[PERF-1] 测试单次执行速度...');

    const taskPrompt = '找到所有的 package.json 文件';
    const startTime = performance.now();

    const result = JSON.parse(await dispatchAgentTool.run({
      prompt: taskPrompt,
      conversationId: testConversationId,
      useCache: false
    }));

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    console.log(`[PERF-1] 执行时间: ${executionTime.toFixed(2)}ms`);
    console.log(`[PERF-1] Token 使用: ${result.totalTokens || 'N/A'}`);
    console.log(`[PERF-1] 工具调用: ${result.toolCalls || 'N/A'}`);

    assert.equal(result.success, true, '执行应该成功');
    assert.ok(executionTime < 30000, `执行时间应该在 30 秒内 (实际: ${executionTime.toFixed(2)}ms)`);

    // 性能基准
    if (executionTime > 10000) {
      console.warn(`[PERF-1] ⚠️  执行时间较长 (${executionTime.toFixed(2)}ms)，可能需要优化`);
    } else if (executionTime < 5000) {
      console.log(`[PERF-1] ✅ 执行速度优秀 (${executionTime.toFixed(2)}ms)`);
    } else {
      console.log(`[PERF-1] ✅ 执行速度良好 (${executionTime.toFixed(2)}ms)`);
    }
  });

  it('PERF-2: 缓存加速效果', async () => {
    console.log('\n[PERF-2] 测试缓存加速效果...');

    const taskPrompt = '找到所有的 JavaScript 文件';

    // 第一次执行（无缓存）
    const firstStart = performance.now();
    const firstResult = JSON.parse(await dispatchAgentTool.run({
      prompt: taskPrompt,
      conversationId: testConversationId,
      useCache: false
    }));
    const firstTime = performance.now() - firstStart;

    // 等待保存完成
    await new Promise(resolve => setTimeout(resolve, 100));

    // 第二次执行（有缓存）
    const secondStart = performance.now();
    const secondResult = JSON.parse(await dispatchAgentTool.run({
      prompt: taskPrompt,
      conversationId: testConversationId,
      useCache: true
    }));
    const secondTime = performance.now() - secondStart;

    const speedup = firstTime / secondTime;
    const timeSaved = firstTime - secondTime;

    console.log(`[PERF-2] 第一次执行: ${firstTime.toFixed(2)}ms`);
    console.log(`[PERF-2] 第二次执行（缓存）: ${secondTime.toFixed(2)}ms`);
    console.log(`[PERF-2] 加速比: ${speedup.toFixed(2)}x`);
    console.log(`[PERF-2] 节省时间: ${timeSaved.toFixed(2)}ms`);

    assert.equal(firstResult.success, true, '第一次执行应该成功');
    assert.equal(secondResult.success, true, '第二次执行应该成功');
    assert.equal(secondResult.cached, true, '第二次执行应该使用缓存');
    assert.ok(speedup > 10, `缓存应该显著加速 (加速比: ${speedup.toFixed(2)}x)`);

    // 性能基准
    if (speedup > 100) {
      console.log(`[PERF-2] ✅ 缓存效果极佳 (加速 ${speedup.toFixed(2)}x)`);
    } else if (speedup > 50) {
      console.log(`[PERF-2] ✅ 缓存效果优秀 (加速 ${speedup.toFixed(2)}x)`);
    } else {
      console.log(`[PERF-2] ✅ 缓存效果良好 (加速 ${speedup.toFixed(2)}x)`);
    }
  });

  it('PERF-3: 并发执行性能', async () => {
    console.log('\n[PERF-3] 测试并发执行性能...');

    const tasks = [
      '找到所有的测试文件',
      '找到所有的配置文件',
      '找到所有的文档文件'
    ];

    // 串行执行
    const serialStart = performance.now();
    const serialResults = [];
    for (const task of tasks) {
      const result = JSON.parse(await dispatchAgentTool.run({
        prompt: task,
        conversationId: testConversationId,
        useCache: false
      }));
      serialResults.push(result);
    }
    const serialTime = performance.now() - serialStart;

    // 并行执行
    const parallelStart = performance.now();
    const parallelResult = JSON.parse(await dispatchAgentTool.run({
      batch: tasks.map(task => ({ prompt: task })),
      conversationId: testConversationId
    }));
    const parallelTime = performance.now() - parallelStart;

    const speedup = serialTime / parallelTime;

    console.log(`[PERF-3] 串行执行时间: ${serialTime.toFixed(2)}ms`);
    console.log(`[PERF-3] 并行执行时间: ${parallelTime.toFixed(2)}ms`);
    console.log(`[PERF-3] 加速比: ${speedup.toFixed(2)}x`);

    assert.equal(parallelResult.success, true, '并行执行应该成功');
    assert.ok(speedup > 1.5, `并行应该显著加速 (加速比: ${speedup.toFixed(2)}x)`);

    // 性能基准
    if (speedup > 2.5) {
      console.log(`[PERF-3] ✅ 并发效果极佳 (加速 ${speedup.toFixed(2)}x)`);
    } else if (speedup > 2.0) {
      console.log(`[PERF-3] ✅ 并发效果优秀 (加速 ${speedup.toFixed(2)}x)`);
    } else {
      console.log(`[PERF-3] ✅ 并发效果良好 (加速 ${speedup.toFixed(2)}x)`);
    }
  });

  it('PERF-4: Token 使用效率', async () => {
    console.log('\n[PERF-4] 测试 Token 使用效率...');

    const result = JSON.parse(await dispatchAgentTool.run({
      prompt: '找到所有的源代码文件',
      conversationId: testConversationId,
      useCache: false
    }));

    console.log(`[PERF-4] 总 Token 数: ${result.totalTokens || 'N/A'}`);
    console.log(`[PERF-4] 工具调用次数: ${result.toolCalls || 'N/A'}`);
    console.log(`[PERF-4] 访问文件数: ${result.filesAccessed || 'N/A'}`);

    assert.equal(result.success, true, '执行应该成功');

    if (result.totalTokens) {
      const tokensPerTool = result.totalTokens / (result.toolCalls || 1);
      console.log(`[PERF-4] 每次工具调用平均 Token: ${tokensPerTool.toFixed(0)}`);

      // 性能基准
      if (result.totalTokens < 2000) {
        console.log(`[PERF-4] ✅ Token 使用效率极高 (${result.totalTokens} tokens)`);
      } else if (result.totalTokens < 4000) {
        console.log(`[PERF-4] ✅ Token 使用效率优秀 (${result.totalTokens} tokens)`);
      } else if (result.totalTokens < 8000) {
        console.log(`[PERF-4] ✅ Token 使用效率良好 (${result.totalTokens} tokens)`);
      } else {
        console.warn(`[PERF-4] ⚠️  Token 使用较多 (${result.totalTokens} tokens)，可能需要优化`);
      }
    }
  });

  it('PERF-5: 结果查询性能', async () => {
    console.log('\n[PERF-5] 测试结果查询性能...');

    // 先执行一个任务
    const dispatchResult = JSON.parse(await dispatchAgentTool.run({
      prompt: '找到所有的测试文件',
      conversationId: testConversationId
    }));

    const agentId = dispatchResult.agentId;

    // 测试不同查询操作的性能
    const queries = [
      { name: 'summary', action: 'summary' },
      { name: 'full', action: 'full' },
      { name: 'files', action: 'files' },
      { name: 'search', action: 'search', pattern: 'test' }
    ];

    for (const query of queries) {
      const startTime = performance.now();
      const result = JSON.parse(await agentResultTool.run({
        agent_id: agentId,
        action: query.action,
        pattern: query.pattern
      }));
      const endTime = performance.now();
      const queryTime = endTime - startTime;

      console.log(`[PERF-5] ${query.name} 查询: ${queryTime.toFixed(2)}ms`);

      assert.equal(result.success, true, `${query.name} 查询应该成功`);
      assert.ok(queryTime < 1000, `${query.name} 查询应该在 1 秒内完成`);
    }

    console.log(`[PERF-5] ✅ 所有查询操作性能良好`);
  });

  it('PERF-6: 缓存命中率统计', async () => {
    console.log('\n[PERF-6] 测试缓存命中率...');

    const taskPrompt = '找到所有的 JSON 文件';

    // 执行多次相同任务
    const iterations = 5;
    const results = [];

    for (let i = 0; i < iterations; i++) {
      const result = JSON.parse(await dispatchAgentTool.run({
        prompt: taskPrompt,
        conversationId: testConversationId,
        useCache: true
      }));
      results.push(result);
      
      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const cachedCount = results.filter(r => r.cached).length;
    const hitRate = (cachedCount / iterations) * 100;

    console.log(`[PERF-6] 总执行次数: ${iterations}`);
    console.log(`[PERF-6] 缓存命中次数: ${cachedCount}`);
    console.log(`[PERF-6] 缓存命中率: ${hitRate.toFixed(1)}%`);

    // 第一次执行不应该命中缓存，后续应该命中
    assert.equal(results[0].cached, undefined, '第一次执行不应该命中缓存');
    assert.equal(results[1].cached, true, '第二次执行应该命中缓存');
    assert.ok(hitRate >= 80, `缓存命中率应该 >= 80% (实际: ${hitRate.toFixed(1)}%)`);

    // 性能基准
    if (hitRate >= 90) {
      console.log(`[PERF-6] ✅ 缓存命中率极高 (${hitRate.toFixed(1)}%)`);
    } else if (hitRate >= 80) {
      console.log(`[PERF-6] ✅ 缓存命中率优秀 (${hitRate.toFixed(1)}%)`);
    } else {
      console.warn(`[PERF-6] ⚠️  缓存命中率较低 (${hitRate.toFixed(1)}%)`);
    }
  });

  it('PERF-7: 内存使用估算', async () => {
    console.log('\n[PERF-7] 估算内存使用...');

    // 执行多个任务
    const tasks = [
      '找到所有的 JavaScript 文件',
      '找到所有的测试文件',
      '找到所有的配置文件'
    ];

    for (const task of tasks) {
      await dispatchAgentTool.run({
        prompt: task,
        conversationId: testConversationId
      });
    }

    // 等待保存完成
    await new Promise(resolve => setTimeout(resolve, 200));

    // 查询存储统计
    const stats = await storage.getStats();

    console.log(`[PERF-7] 总 Agent 数: ${stats.totalAgents}`);
    console.log(`[PERF-7] 总存储大小: ${(stats.totalSize / 1024).toFixed(2)} KB`);
    console.log(`[PERF-7] 平均每个 Agent: ${(stats.totalSize / stats.totalAgents / 1024).toFixed(2)} KB`);

    // 性能基准
    const avgSize = stats.totalSize / stats.totalAgents;
    if (avgSize < 50 * 1024) {
      console.log(`[PERF-7] ✅ 内存使用效率极高 (平均 ${avgSize / 1024} KB)`);
    } else if (avgSize < 100 * 1024) {
      console.log(`[PERF-7] ✅ 内存使用效率优秀 (平均 ${avgSize / 1024} KB)`);
    } else {
      console.warn(`[PERF-7] ⚠️  内存使用较大 (平均 ${avgSize / 1024} KB)`);
    }
  });
});

console.log('🧪 启动性能测试...');

describe('Agent 系统 - 性能测试', () => {
  // 测试将在上面定义
}).run();
