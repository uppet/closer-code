/**
 * 测试 Agent Executor 功能
 * 验证 Phase 1: 基础架构
 */

import { AgentExecutor } from './src/agents/agent-executor.js';
import { AGENT_READONLY_TOOLS, AgentToolManager } from './src/agents/agent-tools.js';

async function testAgentExecutor() {
  console.log('🧪 测试 Agent Executor 功能\n');

  // 使用简单的测试配置
  const config = {
    behavior: {
      workingDir: process.cwd()
    },
    agents: {
      tools: ['searchFiles', 'searchCode', 'listFiles', 'readFile', 'readFileLines', 'readFileChunk', 'readFileTail']
    },
    ai: {
      provider: 'anthropic',
      anthropic: {
        apiKey: process.env.CLOSER_ANTHROPIC_API_KEY || '',
        model: 'claude-sonnet-4-5-20250929'
      }
    }
  };

  // 测试 1: 验证工具子集隔离
  console.log('📋 测试 1: 验证工具子集隔离');
  const toolManager = new AgentToolManager();
  const agentTools = toolManager.getAllowedTools();
  console.log('Agent 可用工具:', agentTools.join(', '));
  
  // 验证只读工具
  const allowedTools = ['searchFiles', 'searchCode', 'listFiles', 'readFile', 'readFileLines', 'readFileChunk', 'readFileTail'];
  const toolNames = agentTools;
  
  const hasOnlyAllowedTools = toolNames.every(tool => allowedTools.includes(tool));
  console.log('只读工具验证:', hasOnlyAllowedTools ? '✅ 通过' : '❌ 失败');

  // 验证没有修改工具
  const dangerousTools = ['bash', 'writeFile', 'editFile', 'regionConstrainedEdit'];
  const hasNoDangerousTools = !toolNames.some(tool => dangerousTools.includes(tool));
  console.log('危险工具排除:', hasNoDangerousTools ? '✅ 通过' : '❌ 失败');

  // 测试 2: 创建 Agent Executor
  console.log('\n📋 测试 2: 创建 Agent Executor');
  const executor = new AgentExecutor(config);
  console.log('Executor 创建:', executor ? '✅ 成功' : '❌ 失败');

  // 测试 3: 执行简单任务
  console.log('\n📋 测试 3: 执行简单搜索任务');
  
  // 检查是否有 API key
  const hasApiKey = config.ai?.anthropic?.apiKey;
  
  if (!hasApiKey) {
    console.log('⚠️  跳过测试: 未配置 API key');
    console.log('   设置 CLOSER_ANTHROPIC_API_KEY 环境变量以运行完整测试');
  } else {
    try {
      const result = await executor.executeAgent({
        prompt: '列出当前目录的所有 JavaScript 文件',
        maxTokens: 1000
      });
      
      console.log('执行结果:', result.success ? '✅ 成功' : '❌ 失败');
      if (result.success) {
        console.log('执行时间:', result.executionTime, 'ms');
        console.log('结果预览:', JSON.stringify(result.result).substring(0, 100) + '...');
      } else {
        console.log('错误:', result.error);
      }
    } catch (error) {
      console.log('❌ 错误:', error.message);
    }
  }

  // 测试 4: 验证工具白名单
  console.log('\n📋 测试 4: 验证工具白名单机制');
  const whitelistedTools = config.agents?.tools || [];
  console.log('配置的白名单工具:', whitelistedTools.join(', '));
  console.log('白名单验证:', whitelistedTools.length > 0 ? '✅ 通过' : '❌ 失败');

  // 测试 5: 超时处理
  console.log('\n📋 测试 5: 超时处理');
  try {
    const shortTimeoutConfig = {
      ...config,
      agents: {
        ...config.agents,
        timeout: 1000 // 1秒超时
      }
    };
    const timeoutExecutor = new AgentExecutor(shortTimeoutConfig);
    
    const result = await timeoutExecutor.executeAgent({
      prompt: '这是一个非常耗时的任务，应该超时',
      maxTokens: 500
    });
    
    console.log('超时测试:', !result.success ? '✅ 正确超时' : '❌ 未超时');
  } catch (error) {
    console.log('超时捕获:', error.message.includes('timeout') ? '✅ 通过' : '❌ 失败');
  }

  console.log('\n✅ 所有测试完成！');
}

// 运行测试
testAgentExecutor().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
