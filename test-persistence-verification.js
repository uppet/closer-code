/**
 * Agent 持久化功能验证
 * 
 * 快速验证持久化系统是否正常工作
 */

import { getGlobalAgentStorage } from './src/agents/agent-storage.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testPersistence() {
  console.log('🧪 验证 Agent 持久化功能\n');

  const workingDir = __dirname;
  const storage = getGlobalAgentStorage({ projectRoot: workingDir });
  const testConversationId = `test_verify_${Date.now()}`;

  try {
    // 测试 1: 保存结果
    console.log('📋 测试 1: 保存 Agent 结果');
    const agentId = await storage.saveAgentResult(testConversationId, {
      task: {
        prompt: '测试任务',
        tools: ['searchFiles'],
        parameters: {}
      },
      stats: {
        duration: 1000,
        totalTokens: 500,
        toolCalls: 5,
        filesAccessed: 3
      },
      result: {
        status: 'success',
        summary: '测试成功',
        findings: [],
        files: ['test.js']
      }
    });
    console.log(`✅ 保存成功: ${agentId}`);

    // 测试 2: 读取结果
    console.log('\n📋 测试 2: 读取 Agent 结果');
    const result = await storage.getAgentResult(agentId);
    console.log(`✅ 读取成功: ${result.result.summary}`);

    // 测试 3: 查找相似任务
    console.log('\n📋 测试 3: 查找相似任务');
    const similarAgentId = await storage.findSimilarTask(testConversationId, '测试任务');
    console.log(`✅ 查找成功: ${similarAgentId === agentId ? '找到相同任务' : '未找到'}`);

    // 测试 4: 列出 agents
    console.log('\n📋 测试 4: 列出 Agents');
    const agents = await storage.listAgents(testConversationId);
    console.log(`✅ 列出成功: ${agents.length} 个 agents`);

    // 测试 5: 获取统计
    console.log('\n📋 测试 5: 获取统计信息');
    const stats = await storage.getStats();
    console.log(`✅ 统计成功:`);
    console.log(`   - 总 Agent 数: ${stats.totalAgents}`);
    console.log(`   - 总大小: ${(stats.totalSize / 1024).toFixed(2)} KB`);
    console.log(`   - 对话数: ${stats.conversations}`);

    // 测试 6: 删除 agent
    console.log('\n📋 测试 6: 删除 Agent');
    await storage.deleteAgentResult(testConversationId, agentId);
    const deletedResult = await storage.getAgentResult(agentId);
    console.log(`✅ 删除成功: ${deletedResult === null ? '已删除' : '仍存在'}`);

    console.log('\n✅ 所有测试通过！');
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
testPersistence();
