#!/usr/bin/env node

/**
 * Agent 压力测试（100+ 并发）
 * 
 * 测试目标：
 * - 验证系统在高并发下的稳定性
 * - 检测内存泄漏
 * - 测试资源限制
 * - 验证错误恢复机制
 */

import { AgentPool } from './src/agents/agent-pool.js';
import { AgentStorage } from './src/agents/agent-storage.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES 模块兼容
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 测试配置
const CONFIG = {
  concurrentAgents: 100,        // 并发 agent 数量
  maxConcurrent: 10,            // Pool 最大并发数
  timeout: 30000,               // 超时时间
  testTasks: [
    { prompt: '搜索 package.json 文件' },
    { prompt: '查找 README 文档' },
    { prompt: '搜索配置文件' },
    { prompt: '查找测试文件' },
    { prompt: '搜索源代码目录' }
  ]
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 内存使用统计
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024),           // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024),   // MB
    external: Math.round(usage.external / 1024 / 1024)    // MB
  };
}

// 创建测试任务
function createTestTasks(count) {
  const tasks = [];
  for (let i = 0; i < count; i++) {
    const taskTemplate = CONFIG.testTasks[i % CONFIG.testTasks.length];
    tasks.push({
      ...taskTemplate,
      prompt: `${taskTemplate.prompt} (任务 ${i + 1})`
    });
  }
  return tasks;
}

// 执行压力测试
async function runStressTest() {
  log('\n══════════════════════════════════════════════════', 'cyan');
  log('🧪 Agent 压力测试（100+ 并发）', 'cyan');
  log('══════════════════════════════════════════════════\n', 'cyan');

  // 初始化
  const storage = new AgentStorage({
    storageDir: path.join(__dirname, '.closer', 'agents')
  });

  const pool = new AgentPool({
    maxConcurrent: CONFIG.maxConcurrent,
    timeout: CONFIG.timeout,
    storage
  });

  // 记录初始内存
  const initialMemory = getMemoryUsage();
  log(`📊 初始内存使用:`, 'blue');
  log(`   RSS: ${initialMemory.rss} MB`, 'blue');
  log(`   Heap: ${initialMemory.heapUsed} MB / ${initialMemory.heapTotal} MB\n`, 'blue');

  // 创建测试任务
  const tasks = createTestTasks(CONFIG.concurrentAgents);
  log(`📋 创建 ${tasks.length} 个测试任务\n`, 'blue');

  // 执行测试
  log('🚀 开始执行压力测试...\n', 'yellow');
  const startTime = Date.now();

  try {
    // 批量执行任务
    const results = await Promise.allSettled(
      tasks.map((task, index) => 
        pool.executeAgent({
          ...task,
          agentId: `stress_test_${Date.now()}_${index}`
        })
      )
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    // 统计结果
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const successRate = ((successful / results.length) * 100).toFixed(1);

    // 记录结束内存
    const finalMemory = getMemoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

    log('\n══════════════════════════════════════════════════', 'cyan');
    log('📊 测试结果统计', 'cyan');
    log('══════════════════════════════════════════════════\n', 'cyan');

    log(`✅ 成功: ${successful} 个`, 'green');
    log(`❌ 失败: ${failed} 个`, failed > 0 ? 'red' : 'green');
    log(`📈 成功率: ${successRate}%\n`, successRate >= 95 ? 'green' : 'yellow');

    log(`⏱️  总耗时: ${duration} ms`, 'blue');
    log(`⏱️  平均耗时: ${(duration / tasks.length).toFixed(2)} ms/任务\n`, 'blue');

    log(`📊 最终内存使用:`, 'blue');
    log(`   RSS: ${finalMemory.rss} MB (+${finalMemory.rss - initialMemory.rss} MB)`, 'blue');
    log(`   Heap: ${finalMemory.heapUsed} MB / ${finalMemory.heapTotal} MB (+${memoryIncrease} MB)\n`, 'blue');

    // Pool 统计
    const poolStats = pool.getStats();
    log(`📊 Agent Pool 统计:`, 'blue');
    log(`   总执行数: ${poolStats.totalExecuted}`, 'blue');
    log(`   成功数: ${poolStats.totalSucceeded}`, 'blue');
    log(`   失败数: ${poolStats.totalFailed}`, 'blue');
    log(`   成功率: ${poolStats.successRate}`, 'blue');

    // 验证结果
    log('\n══════════════════════════════════════════════════', 'cyan');
    log('✅ 验证结果', 'cyan');
    log('══════════════════════════════════════════════════\n', 'cyan');

    const checks = [
      {
        name: '成功率 >= 90%',
        pass: parseFloat(successRate) >= 90,
        critical: true
      },
      {
        name: '平均耗时 < 1000ms',
        pass: duration / tasks.length < 1000,
        critical: true
      },
      {
        name: '内存增长 < 100 MB',
        pass: memoryIncrease < 100,
        critical: true
      },
      {
        name: '无内存泄漏',
        pass: memoryIncrease < 50,
        critical: false
      }
    ];

    let allPassed = true;
    checks.forEach(check => {
      const icon = check.pass ? '✅' : '❌';
      const color = check.pass ? 'green' : 'red';
      log(`${icon} ${check.name}`, color);
      if (!check.pass && check.critical) {
        allPassed = false;
      }
    });

    log('\n══════════════════════════════════════════════════', 'cyan');
    if (allPassed) {
      log('🎉 压力测试通过！系统稳定可靠。\n', 'green');
    } else {
      log('⚠️  压力测试未完全通过，需要优化。\n', 'yellow');
    }

  } catch (error) {
    log('\n❌ 测试执行失败:', 'red');
    log(error.message, 'red');
  }

  // 清理
  const deletedCount = await storage.cleanupExpiredAgents();
  log(`🧹 清理完成，删除了 ${deletedCount} 个过期 agent\n`, 'blue');
}

// 运行测试
runStressTest().catch(error => {
  log(`\n❌ 测试失败: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
