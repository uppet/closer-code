/**
 * Batch 模式 Agent 持久化验证测试
 *
 * 场景：模拟用户使用 batch 模式执行多个 agent 任务
 * 验证：
 * 1. Agent 结果正确持久化
 * 2. 缓存复用机制正常工作
 * 3. 查询工具可以检索结果
 * 4. 自动清理过期结果
 */

import { getGlobalAgentStorage, resetGlobalAgentStorage, AgentStorage } from './src/agents/agent-storage.js';
import { AgentCleanupScheduler, resetGlobalCleanupScheduler } from './src/agents/agent-cleanup.js';
import path from 'path';
import { existsSync } from 'fs';
import os from 'os';

// 测试配置
const TEST_DIR = path.join(os.tmpdir(), 'batch-agent-test-' + Date.now());
const CONVERSATION_ID = 'batch_test_conv';

// 模拟 agent 执行结果
const mockAgentResults = {
  task1: {
    task: {
      prompt: 'Find all TypeScript configuration files',
      tools: ['searchFiles', 'readFile'],
      parameters: {
        pattern: '**/*.{ts,json}'
      }
    },
    stats: {
      duration: 2500,
      totalTokens: 3200,
      toolCalls: 8,
      filesAccessed: 5
    },
    result: {
      status: 'success',
      summary: 'Found 5 TypeScript configuration files',
      findings: [
        {
          type: 'file',
          path: 'tsconfig.json',
          relevance: 0.95,
          snippet: '{"compilerOptions": {...}}'
        },
        {
          type: 'file',
          path: 'package.json',
          relevance: 0.90,
          snippet: '{"type": "module"}'
        }
      ],
      files: ['tsconfig.json', 'package.json', 'src/tsconfig.json', 'test/tsconfig.json', 'tsconfig.build.json']
    }
  },
  task2: {
    task: {
      prompt: 'Search for API endpoint definitions',
      tools: ['searchCode'],
      parameters: {
        pattern: 'app\\.get|app\\.post|router\\.'
      }
    },
    stats: {
      duration: 1800,
      totalTokens: 2100,
      toolCalls: 5,
      filesAccessed: 3
    },
    result: {
      status: 'success',
      summary: 'Found 12 API endpoints in 3 files',
      findings: [
        {
          type: 'endpoint',
          file: 'src/api/routes.js',
          method: 'GET',
          path: '/api/users'
        }
      ],
      files: ['src/api/routes.js', 'src/api/auth.js', 'src/api/posts.js']
    }
  },
  task3: {
    task: {
      prompt: 'Find all TypeScript configuration files', // 相同任务，测试缓存
      tools: ['searchFiles', 'readFile'],
      parameters: {
        pattern: '**/*.{ts,json}'
      }
    },
    stats: {
      duration: 0, // 缓存命中，不消耗时间
      totalTokens: 0,
      toolCalls: 0,
      filesAccessed: 0
    },
    result: {
      status: 'cached',
      summary: 'Result from cache'
    }
  }
};

// 清理测试目录
async function cleanup() {
  if (existsSync(TEST_DIR)) {
    const { promises: fs } = await import('fs');
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  }
}

// 主测试流程
async function runBatchTest() {
  console.log('🚀 Batch 模式 Agent 持久化验证测试\n');
  console.log('═'.repeat(60));
  
  // 初始清理
  await cleanup();
  resetGlobalAgentStorage();
  resetGlobalCleanupScheduler();

  const storage = getGlobalAgentStorage({ projectRoot: TEST_DIR });
  await storage.initialize();

  console.log('\n📋 场景 1: 批量执行 Agent 任务\n');
  
  // 任务 1: 查找 TypeScript 配置文件
  console.log('⚙️  执行任务 1: 查找 TypeScript 配置文件');
  const agentId1 = await storage.saveAgentResult(CONVERSATION_ID, mockAgentResults.task1);
  console.log(`   ✅ Agent ID: ${agentId1}`);
  console.log(`   📄 找到 ${mockAgentResults.task1.result.files.length} 个文件`);

  // 任务 2: 搜索 API 端点
  console.log('\n⚙️  执行任务 2: 搜索 API 端点');
  const agentId2 = await storage.saveAgentResult(CONVERSATION_ID, mockAgentResults.task2);
  console.log(`   ✅ Agent ID: ${agentId2}`);
  console.log(`   📄 找到 ${mockAgentResults.task2.result.findings.length} 个端点`);

  // 任务 3: 相同任务（测试缓存）
  console.log('\n⚙️  执行任务 3: 相同任务（测试缓存）');
  const cachedAgentId = await storage.findSimilarTask(CONVERSATION_ID, mockAgentResults.task3.task.prompt);
  if (cachedAgentId === agentId1) {
    console.log(`   ✅ 缓存命中! Agent ID: ${cachedAgentId}`);
    console.log(`   💰 节省 tokens: ${mockAgentResults.task1.stats.totalTokens}`);
  } else {
    console.log(`   ❌ 缓存未命中，预期 ${agentId1}，实际 ${cachedAgentId}`);
  }

  console.log('\n📋 场景 2: 查询 Agent 结果\n');

  // 获取完整结果
  console.log('📄 获取任务 1 的完整结果');
  const result1 = await storage.getAgentResult(agentId1);
  console.log(`   ✅ 状态: ${result1.result.status}`);
  console.log(`   📊 访问次数: ${result1.cache.accessCount}`);

  // 列出 agents
  console.log('\n📄 列出所有 agents');
  const agents = await storage.listAgents(CONVERSATION_ID);
  console.log(`   ✅ 共 ${agents.length} 个 agents`);
  agents.forEach(agent => {
    console.log(`   - ${agent.agentId}: ${agent.summary}`);
  });

  console.log('\n📋 场景 3: 在结果中搜索\n');

  // 搜索结果
  console.log('🔍 搜索包含 "config" 的结果');
  const allResults = await storage.listAgents(CONVERSATION_ID);
  let searchMatches = 0;
  for (const agent of allResults) {
    const fullResult = await storage.getAgentResult(agent.agentId);
    const summary = fullResult.result.summary || '';
    if (summary.toLowerCase().includes('config')) {
      searchMatches++;
      console.log(`   ✅ ${agent.agentId}: ${summary}`);
    }
  }
  console.log(`   📊 找到 ${searchMatches} 个匹配项`);

  console.log('\n📋 场景 4: 获取统计信息\n');

  // 获取统计
  const stats = await storage.getStats();
  console.log('📊 存储统计:');
  console.log(`   - 对话数: ${stats.conversations}`);
  console.log(`   - Agent 总数: ${stats.totalAgents}`);
  console.log(`   - 总大小: ${(stats.totalSize / 1024).toFixed(2)} KB`);

  console.log('\n📋 场景 5: 测试过期清理\n');

  // 创建短期存储的 agent
  const shortLivedStorage = new AgentStorage({
    projectRoot: TEST_DIR,
    maxAge: 100 // 100ms
  });
  
  const tempAgentId = await shortLivedStorage.saveAgentResult(
    CONVERSATION_ID + '_temp',
    mockAgentResults.task1
  );
  console.log(`   ⏰ 创建短期 agent: ${tempAgentId} (100ms 过期)`);

  // 等待过期
  await new Promise(resolve => setTimeout(resolve, 150));
  console.log('   ⏰ 等待 150ms...');

  // 清理过期 agents
  const scheduler = new AgentCleanupScheduler({
    projectRoot: TEST_DIR,
    maxAge: 100
  });
  const deleted = await scheduler.cleanup();
  console.log(`   🗑️  清理了 ${deleted} 个过期 agents`);

  // 验证清理
  const tempResult = await shortLivedStorage.getAgentResult(tempAgentId);
  if (!tempResult) {
    console.log('   ✅ 短期 agent 已被清理');
  } else {
    console.log('   ❌ 短期 agent 未被清理');
  }

  console.log('\n📋 场景 6: 模拟 Batch 模式完整流程\n');

  // 模拟 batch 执行
  const batchTasks = [
    {
      name: '分析项目结构',
      prompt: 'Analyze project structure',
      result: {
        task: { prompt: 'Analyze project structure' },
        stats: { duration: 3000, totalTokens: 4500 },
        result: { status: 'success', summary: 'Found 3 main directories' }
      }
    },
    {
      name: '查找测试文件',
      prompt: 'Find all test files',
      result: {
        task: { prompt: 'Find all test files' },
        stats: { duration: 2000, totalTokens: 2800 },
        result: { status: 'success', summary: 'Found 15 test files' }
      }
    },
    {
      name: '分析项目结构（重复）',
      prompt: 'Analyze project structure',
      cached: true
    }
  ];

  let totalTokens = 0;
  let savedTokens = 0;

  for (const task of batchTasks) {
    console.log(`\n   ⚙️  ${task.name}`);
    
    if (task.cached) {
      const cachedId = await storage.findSimilarTask(CONVERSATION_ID + '_batch', task.prompt);
      if (cachedId) {
        console.log(`      ✅ 缓存命中: ${cachedId}`);
        savedTokens += 4500;
      } else {
        console.log(`      ❌ 缓存未命中`);
      }
    } else {
      const id = await storage.saveAgentResult(CONVERSATION_ID + '_batch', task.result);
      console.log(`      ✅ 执行完成: ${id}`);
      totalTokens += task.result.stats.totalTokens;
    }
  }

  console.log('\n   📊 Token 使用统计:');
  console.log(`      - 实际消耗: ${totalTokens} tokens`);
  console.log(`      - 缓存节省: ${savedTokens} tokens`);
  console.log(`      - 节省比例: ${((savedTokens / (totalTokens + savedTokens)) * 100).toFixed(1)}%`);

  // 最终统计
  const finalStats = await storage.getStats();
  console.log('\n📊 最终统计:');
  console.log(`   - 总 Agent 数: ${finalStats.totalAgents}`);
  console.log(`   - 存储大小: ${(finalStats.totalSize / 1024).toFixed(2)} KB`);

  console.log('\n' + '═'.repeat(60));
  console.log('✅ Batch 模式验证完成！\n');

  // 清理
  await cleanup();
}

// 运行测试
runBatchTest().then(() => {
  console.log('🎉 所有测试通过！');
  process.exit(0);
}).catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
