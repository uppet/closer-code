/**
 * Batch Agent 场景测试
 *
 * 真实场景验证：使用 batch 模式同时启动多个 agents 执行不同的搜索任务
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { loadConfig } from './src/config.js';
import { getGlobalAgentPool } from './src/agents/agent-pool.js';

describe('Batch Agent Scenario Tests', () => {
  let agentPool;
  let config;

  before(async () => {
    console.log('\n📦 初始化测试环境...\n');
    config = loadConfig();
    agentPool = getGlobalAgentPool(config);
    console.log('✅ Agent Pool 初始化完成\n');
  });

  after(async () => {
    console.log('\n🧹 清理测试环境...\n');
    // 清理资源
  });

  it('Scenario 1: 并发搜索项目关键信息', async () => {
    console.log('🎯 场景 1: 并发搜索项目关键信息\n');
    console.log('目标: 同时搜索配置文件、测试文件和 API 端点\n');

    const tasks = [
      {
        prompt: '找到项目中所有的配置文件（如 .json, .yaml, .toml 等）',
        description: '搜索配置文件'
      },
      {
        prompt: '找到项目中所有的测试文件（test, spec）',
        description: '搜索测试文件'
      },
      {
        prompt: '找到项目中定义的 API 端点或路由',
        description: '搜索 API 端点'
      }
    ];

    console.log(`📋 任务列表:`);
    tasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task.description}`);
    });
    console.log('');

    const startTime = Date.now();

    // 使用 batch 模式执行
    const results = await agentPool.executeBatch(
      tasks.map(task => ({
        prompt: task.prompt,
        timeout: 30000,
        maxTokens: 2048
      }))
    );

    const executionTime = Date.now() - startTime;

    console.log(`\n⏱️  执行时间: ${executionTime}ms`);
    console.log(`📊 结果统计:`);
    console.log(`   - 总任务数: ${results.length}`);
    console.log(`   - 成功: ${results.filter(r => r.success).length}`);
    console.log(`   - 失败: ${results.filter(r => !r.success).length}`);
    console.log('');

    // 验证结果
    assert.strictEqual(results.length, 3, '应该返回3个结果');

    results.forEach((result, index) => {
      console.log(`\n📄 任务 ${index + 1}: ${tasks[index].description}`);
      console.log(`   状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);
      
      if (result.success) {
        console.log(`   Agent ID: ${result.agentId}`);
        console.log(`   执行时间: ${result.executionTime}ms`);
        
        // 显示结果摘要
        if (result.result) {
          const summary = result.result.summary || result.result.text || '无摘要';
          console.log(`   摘要: ${summary.substring(0, 100)}${summary.length > 100 ? '...' : ''}`);
        }
      } else {
        console.log(`   错误: ${result.error}`);
      }
    });

    console.log('\n✅ 场景 1 测试完成\n');
  });

  it('Scenario 2: 代码质量分析（并发）', async () => {
    console.log('🎯 场景 2: 代码质量分析\n');
    console.log('目标: 同时分析代码库的不同方面\n');

    const tasks = [
      {
        prompt: '分析代码库中的 TODO 和 FIXME 注释',
        description: '查找待办事项'
      },
      {
        prompt: '统计项目中使用的主要框架和库',
        description: '分析依赖关系'
      },
      {
        prompt: '查找项目中可能存在的安全风险代码（如 eval, hardcoded secrets）',
        description: '安全检查'
      }
    ];

    console.log(`📋 任务列表:`);
    tasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task.description}`);
    });
    console.log('');

    const startTime = Date.now();

    const results = await agentPool.executeBatch(
      tasks.map(task => ({
        prompt: task.prompt,
        timeout: 30000,
        maxTokens: 2048
      }))
    );

    const executionTime = Date.now() - startTime;

    console.log(`\n⏱️  执行时间: ${executionTime}ms`);
    console.log(`📊 并发效率: ${results.length} 个任务在 ${(executionTime / 1000).toFixed(2)}s 内完成`);

    // 验证并发性能
    const avgTimePerTask = executionTime / results.length;
    console.log(`   平均每任务: ${avgTimePerTask.toFixed(2)}ms`);
    console.log('');

    results.forEach((result, index) => {
      console.log(`📄 任务 ${index + 1}: ${tasks[index].description}`);
      console.log(`   状态: ${result.success ? '✅' : '❌'}`);
      if (result.success) {
        console.log(`   执行时间: ${result.executionTime}ms`);
      }
    });

    console.log('\n✅ 场景 2 测试完成\n');
  });

  it('Scenario 3: 文档搜索（批量查询）', async () => {
    console.log('🎯 场景 3: 文档搜索\n');
    console.log('目标: 批量搜索不同类型的文档\n');

    const tasks = [
      {
        prompt: '找到项目中的 README 文件和文档',
        description: '查找项目文档'
      },
      {
        prompt: '搜索 LICENSE 和版权信息文件',
        description: '查找许可证文件'
      },
      {
        prompt: '查找 CHANGELOG 或更新日志文件',
        description: '查找更新日志'
      },
      {
        prompt: '搜索架构设计文档或技术规范',
        description: '查找设计文档'
      }
    ];

    console.log(`📋 任务列表: ${tasks.length} 个并行任务`);
    console.log('');

    const startTime = Date.now();

    const results = await agentPool.executeBatch(
      tasks.map(task => ({
        prompt: task.prompt,
        timeout: 20000,
        maxTokens: 1500
      }))
    );

    const executionTime = Date.now() - startTime;

    console.log(`\n⏱️  总执行时间: ${executionTime}ms`);
    console.log(`📊 成功率: ${((results.filter(r => r.success).length / results.length) * 100).toFixed(1)}%`);
    console.log('');

    // 统计找到的文件
    let totalFiles = 0;
    results.forEach((result, index) => {
      console.log(`📄 ${tasks[index].description}`);
      if (result.success && result.result) {
        // 尝试提取文件数量
        const text = result.result.text || result.result.summary || '';
        const match = text.match(/找到?\s*(\d+)\s*个?文件/);
        const count = match ? parseInt(match[1]) : 0;
        totalFiles += count;
        console.log(`   找到文件: ${count > 0 ? count : '未明确计数'}`);
      }
      console.log('');
    });

    console.log(`📈 总计找到文件: ${totalFiles > 0 ? totalFiles : '详见各任务结果'}`);
    console.log('\n✅ 场景 3 测试完成\n');
  });

  it('Scenario 4: 性能压力测试（高并发）', async () => {
    console.log('🎯 场景 4: 性能压力测试\n');
    console.log('目标: 测试系统在高并发情况下的表现\n');

    // 创建 5 个简单的搜索任务
    const tasks = Array.from({ length: 5 }, (_, i) => ({
      prompt: `搜索项目中的 JavaScript 文件（任务 ${i + 1}）`,
      description: `搜索任务 ${i + 1}`
    }));

    console.log(`📋 并发任务数: ${tasks.length}`);
    console.log('');

    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    const results = await agentPool.executeBatch(
      tasks.map(task => ({
        prompt: task.prompt,
        timeout: 15000,
        maxTokens: 1000
      }))
    );

    const executionTime = Date.now() - startTime;
    const endMemory = process.memoryUsage();
    const memoryDelta = (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024;

    console.log(`\n⏱️  性能指标:`);
    console.log(`   总执行时间: ${executionTime}ms`);
    console.log(`   平均响应时间: ${(executionTime / results.length).toFixed(2)}ms`);
    console.log(`   吞吐量: ${(results.length / (executionTime / 1000)).toFixed(2)} tasks/sec`);
    console.log(`   内存增长: ${memoryDelta.toFixed(2)} MB`);
    console.log('');

    const successCount = results.filter(r => r.success).length;
    console.log(`📊 可靠性指标:`);
    console.log(`   成功率: ${((successCount / results.length) * 100).toFixed(1)}%`);
    console.log(`   成功任务: ${successCount}/${results.length}`);
    console.log('');

    // 性能断言
    assert.ok(executionTime < 30000, '总执行时间应小于 30 秒');
    assert.ok(successCount >= results.length * 0.8, '成功率应至少 80%');

    console.log('✅ 场景 4 测试完成\n');
  });
});

console.log('\n🚀 启动 Batch Agent 场景测试...\n');
