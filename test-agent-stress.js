/**
 * Agent 系统 - 压力测试
 * 
 * 测试 Agent 系统在极限条件下的稳定性：
 * 1. 大量并发请求
 * 2. 长时间运行
 * 3. 大结果集处理
 * 4. 资源限制
 * 5. 错误恢复
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

describe('Agent 系统 - 压力测试', () => {
  const workingDir = __dirname;
  const testConversationId = `test_stress_${randomUUID()}`;
  let agentPool;
  let storage;

  before(async () => {
    setToolExecutorContext({
      workingDir,
      enabledTools: new Set(['dispatchAgent', 'agentResult', 'searchFiles', 'searchCode', 'listFiles', 'readFile'])
    });

    agentPool = getGlobalAgentPool({
      behavior: { workingDir },
      agents: { 
        maxConcurrent: 5,  // 增加并发数用于压力测试
        timeout: 90000     // 增加超时时间
      }
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

  it('STRESS-1: 大量并发请求 (20 个任务)', async () => {
    console.log('\n[STRESS-1] 测试大量并发请求...');

    const taskCount = 20;
    const tasks = Array.from({ length: taskCount }, (_, i) => ({
      prompt: `查找测试文件 ${i + 1}`,
      timeout: 60000
    }));

    const startTime = performance.now();

    const result = JSON.parse(await dispatchAgentTool.run({
      batch: tasks,
      conversationId: testConversationId
    }));

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    console.log(`[STRESS-1] 总任务数: ${taskCount}`);
    console.log(`[STRESS-1] 总执行时间: ${totalTime.toFixed(2)}ms`);
    console.log(`[STRESS-1] 平均每个任务: ${(totalTime / taskCount).toFixed(2)}ms`);
    console.log(`[STRESS-1] 成功任务数: ${result.results?.filter(r => r.success).length || 0}`);

    assert.equal(result.success, true, '批量执行应该成功');
    assert.equal(result.count, taskCount, `应该执行 ${taskCount} 个任务`);

    const successCount = result.results.filter(r => r.success).length;
    const successRate = (successCount / taskCount) * 100;

    console.log(`[STRESS-1] 成功率: ${successRate.toFixed(1)}%`);

    assert.ok(successRate >= 95, `成功率应该 >= 95% (实际: ${successRate.toFixed(1)}%)`);

    if (successRate === 100) {
      console.log(`[STRESS-1] ✅ 所有任务都成功执行`);
    } else {
      console.warn(`[STRESS-1] ⚠️  有 ${taskCount - successCount} 个任务失败`);
    }
  });

  it('STRESS-2: 长时间运行 (连续执行)', async () => {
    console.log('\n[STRESS-2] 测试长时间运行...');

    const iterations = 10;
    const results = [];
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const result = JSON.parse(await dispatchAgentTool.run({
        prompt: `查找文件 - 迭代 ${i + 1}`,
        conversationId: testConversationId,
        useCache: false
      }));
      
      results.push(result);
      
      // 显示进度
      if ((i + 1) % 5 === 0) {
        console.log(`[STRESS-2] 已完成 ${i + 1}/${iterations} 次迭代`);
      }
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    console.log(`[STRESS-2] 总迭代次数: ${iterations}`);
    console.log(`[STRESS-2] 总执行时间: ${(totalTime / 1000).toFixed(2)}秒`);
    console.log(`[STRESS-2] 平均每次迭代: ${(totalTime / iterations).toFixed(2)}ms`);

    const successCount = results.filter(r => r.success).length;
    const successRate = (successCount / iterations) * 100;

    console.log(`[STRESS-2] 成功率: ${successRate.toFixed(1)}%`);

    assert.ok(successRate >= 90, `成功率应该 >= 90% (实际: ${successRate.toFixed(1)}%)`);

    if (successRate === 100) {
      console.log(`[STRESS-2] ✅ 长时间运行稳定`);
    } else {
      console.warn(`[STRESS-2] ⚠️  有 ${iterations - successCount} 次执行失败`);
    }
  });

  it('STRESS-3: 大结果集处理', async () => {
    console.log('\n[STRESS-3] 测试大结果集处理...');

    // 执行一个可能返回大量结果的搜索
    const result = JSON.parse(await dispatchAgentTool.run({
      prompt: '找到项目中所有的文件（包括子目录）',
      conversationId: testConversationId,
      useCache: false
    }));

    console.log(`[STRESS-3] 执行成功: ${result.success}`);
    console.log(`[STRESS-3] Agent ID: ${result.agentId}`);
    console.log(`[STRESS-3] 执行时间: ${result.executionTime || 'N/A'}ms`);

    assert.equal(result.success, true, '执行应该成功');

    // 查询结果以获取更多信息
    const fullResult = JSON.parse(await agentResultTool.run({
      agent_id: result.agentId,
      action: 'full'
    }));

    console.log(`[STRESS-3] 结果状态: ${fullResult.result?.status}`);
    console.log(`[STRESS-3] 摘要: ${fullResult.result?.summary?.substring(0, 100)}...`);

    if (fullResult.result?.files) {
      console.log(`[STRESS-3] 找到的文件数: ${fullResult.result.files.length}`);
    }

    assert.equal(fullResult.success, true, '查询结果应该成功');
    console.log(`[STRESS-3] ✅ 大结果集处理成功`);
  });

  it('STRESS-4: 资源限制测试', async () => {
    console.log('\n[STRESS-4] 测试资源限制...');

    // 尝试超过最大并发数的任务
    const maxConcurrent = 5;
    const taskCount = 10;  // 超过 maxConcurrent

    const tasks = Array.from({ length: taskCount }, (_, i) => ({
      prompt: `资源限制测试 ${i + 1}`,
      timeout: 60000
    }));

    const startTime = performance.now();

    const result = JSON.parse(await dispatchAgentTool.run({
      batch: tasks,
      conversationId: testConversationId
    }));

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    console.log(`[STRESS-4] 最大并发数: ${maxConcurrent}`);
    console.log(`[STRESS-4] 请求任务数: ${taskCount}`);
    console.log(`[STRESS-4] 总执行时间: ${totalTime.toFixed(2)}ms`);
    console.log(`[STRESS-4] 实际并发: ${(taskCount / (totalTime / 1000)).toFixed(2)} 任务/秒`);

    assert.equal(result.success, true, '批量执行应该成功');

    const successCount = result.results.filter(r => r.success).length;
    assert.ok(successCount >= taskCount * 0.9, `至少 90% 的任务应该成功`);

    console.log(`[STRESS-4] ✅ 资源限制处理正常`);
  });

  it('STRESS-5: 快速连续请求', async () => {
    console.log('\n[STRESS-5] 测试快速连续请求...');

    const requestCount = 15;
    const results = [];
    const startTime = performance.now();

    // 快速连续发送请求（不等待）
    const promises = [];
    for (let i = 0; i < requestCount; i++) {
      promises.push(
        dispatchAgentTool.run({
          prompt: `快速请求 ${i + 1}`,
          conversationId: testConversationId,
          useCache: false
        }).then(result => {
          const parsed = JSON.parse(result);
          results.push(parsed);
          return parsed;
        })
      );
    }

    await Promise.all(promises);

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    console.log(`[STRESS-5] 请求数: ${requestCount}`);
    console.log(`[STRESS-5] 总执行时间: ${totalTime.toFixed(2)}ms`);
    console.log(`[STRESS-5] 平均每个请求: ${(totalTime / requestCount).toFixed(2)}ms`);

    const successCount = results.filter(r => r.success).length;
    const successRate = (successCount / requestCount) * 100;

    console.log(`[STRESS-5] 成功率: ${successRate.toFixed(1)}%`);

    assert.ok(successRate >= 90, `成功率应该 >= 90% (实际: ${successRate.toFixed(1)}%)`);

    if (successRate >= 95) {
      console.log(`[STRESS-5] ✅ 快速连续请求处理优秀`);
    } else {
      console.warn(`[STRESS-5] ⚠️  有 ${requestCount - successCount} 个请求失败`);
    }
  });

  it('STRESS-6: 错误恢复测试', async () => {
    console.log('\n[STRESS-6] 测试错误恢复...');

    // 混合正常和异常任务
    const tasks = [
      { prompt: '找到所有的测试文件' },
      { prompt: '找到所有的配置文件' },
      { prompt: '', timeout: 100 },  // 异常：空提示词
      { prompt: '找到所有的文档' },
      { prompt: '找到所有的源代码' }
    ];

    const result = JSON.parse(await dispatchAgentTool.run({
      batch: tasks,
      conversationId: testConversationId
    }));

    console.log(`[STRESS-6] 总任务数: ${tasks.length}`);
    console.log(`[STRESS-6] 成功任务数: ${result.results?.filter(r => r.success).length || 0}`);
    console.log(`[STRESS-6] 失败任务数: ${result.results?.filter(r => !r.success).length || 0}`);

    assert.equal(result.success, true, '批量执行应该完成');
    assert.ok(result.results, '应该返回结果数组');

    // 至少正常任务应该成功
    const normalTaskCount = tasks.filter(t => t.prompt && t.prompt.length > 0).length;
    const successCount = result.results.filter(r => r.success).length;
    
    assert.ok(successCount >= normalTaskCount * 0.8, 
              `正常任务的成功率应该 >= 80%`);

    console.log(`[STRESS-6] ✅ 错误恢复机制正常`);
  });

  it('STRESS-7: 缓存压力测试', async () => {
    console.log('\n[STRESS-7] 测试缓存压力...');

    const taskPrompt = '缓存压力测试任务';
    const repeatCount = 20;

    // 第一次执行（创建缓存）
    await dispatchAgentTool.run({
      prompt: taskPrompt,
      conversationId: testConversationId,
      useCache: false
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    // 快速重复执行（测试缓存读取性能）
    const startTime = performance.now();
    const results = [];

    for (let i = 0; i < repeatCount; i++) {
      const result = JSON.parse(await dispatchAgentTool.run({
        prompt: taskPrompt,
        conversationId: testConversationId,
        useCache: true
      }));
      results.push(result);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / repeatCount;

    console.log(`[STRESS-7] 重复执行次数: ${repeatCount}`);
    console.log(`[STRESS-7] 总执行时间: ${totalTime.toFixed(2)}ms`);
    console.log(`[STRESS-7] 平均每次: ${avgTime.toFixed(2)}ms`);

    const cachedCount = results.filter(r => r.cached).length;
    const cacheHitRate = (cachedCount / repeatCount) * 100;

    console.log(`[STRESS-7] 缓存命中数: ${cachedCount}`);
    console.log(`[STRESS-7] 缓存命中率: ${cacheHitRate.toFixed(1)}%`);

    assert.ok(cacheHitRate >= 95, `缓存命中率应该 >= 95% (实际: ${cacheHitRate.toFixed(1)}%)`);
    assert.ok(avgTime < 100, `平均每次执行应该 < 100ms (实际: ${avgTime.toFixed(2)}ms)`);

    console.log(`[STRESS-7] ✅ 缓存压力测试通过`);
  });
});

console.log('🧪 启动压力测试...');

describe('Agent 系统 - 压力测试', () => {
  // 测试将在上面定义
}).run();
