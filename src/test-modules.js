#!/usr/bin/env node
/**
 * 简单的模块验证测试
 */

import { getConfig, saveConfig } from './config.js';
import { createAIClient, checkConfig } from './ai-client.js';
import { ToolExecutor } from './tools.js';

async function testConfig() {
  console.log('🔧 测试配置模块...');
  try {
    const config = getConfig();
    console.log('✅ 配置加载成功');
    console.log(`   - 提供商: ${config.ai.provider}`);
    console.log(`   - 工作目录: ${config.behavior.workingDir}`);
    console.log(`   - 启用工具: ${config.tools.enabled.length}个`);
    return true;
  } catch (error) {
    console.log('❌ 配置测试失败:', error.message);
    return false;
  }
}

async function testAIClient() {
  console.log('\n🤖 测试 AI 客户端...');
  try {
    const config = getConfig();
    checkConfig(config);

    const client = createAIClient(config);
    console.log('✅ AI 客户端创建成功');
    console.log(`   - 类型: ${config.ai.provider}`);
    return true;
  } catch (error) {
    console.log('⚠️  AI 客户端测试:', error.message);
    console.log('   提示: 请运行 npm run setup 配置 API 密钥');
    return false;
  }
}

async function testToolExecutor() {
  console.log('\n🔨 测试工具执行器...');
  try {
    const config = getConfig();
    const executor = new ToolExecutor(config);

    // 测试 listFiles 工具
    const result = await executor.listFiles({ dirPath: '.' });

    if (result.success) {
      console.log('✅ 工具执行器正常');
      console.log(`   - 找到 ${result.data.files.length} 个文件`);
      return true;
    } else {
      console.log('❌ 工具执行失败:', result.error);
      return false;
    }
  } catch (error) {
    console.log('❌ 工具执行器测试失败:', error.message);
    return false;
  }
}

async function testBashRunner() {
  console.log('\n💻 测试 Bash 执行器...');
  try {
    const { executeBashCommand } = await import('./bash-runner.js');
    const result = await executeBashCommand('echo "Hello from Closer Code!"');

    if (result.success) {
      console.log('✅ Bash 执行器正常');
      console.log(`   - 输出: ${result.stdout.trim()}`);
      return true;
    } else {
      console.log('❌ Bash 执行失败');
      console.log(`   - stderr: ${result.stderr}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Bash 执行器测试失败:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Closer Code 模块测试\n');
  console.log('═'.repeat(50));

  const results = {
    config: await testConfig(),
    aiClient: await testAIClient(),
    toolExecutor: await testToolExecutor(),
    bashRunner: await testBashRunner()
  };

  console.log('\n' + '═'.repeat(50));
  console.log('\n📊 测试结果汇总:');

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;

  for (const [name, result] of Object.entries(results)) {
    const status = result ? '✅ 通过' : '❌ 失败';
    console.log(`   ${status} - ${name}`);
  }

  console.log(`\n总计: ${passed}/${total} 通过`);

  if (passed === total) {
    console.log('\n🎉 所有测试通过！你可以运行 npm start 启动 Closer Code');
  } else {
    console.log('\n⚠️  部分测试失败，请检查配置');
  }
}

runTests().catch(console.error);
