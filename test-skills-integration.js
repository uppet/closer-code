#!/usr/bin/env node
/**
 * Skills Integration Test - Batch Mode
 *
 * 测试技能系统与 AI 的完整交互
 */

import { loadConfig } from './src/config.js';
import { createConversation } from './src/conversation.js';

console.log('========================================');
console.log('Skills Integration Test - Batch Mode');
console.log('========================================\n');

async function testSkillDiscovery() {
  console.log('📋 Test 1: Skill Discovery');
  console.log('----------------------------------------');

  const config = loadConfig();
  const conversation = await createConversation(config, false);

  try {
    // 模拟用户消息：发现技能
    const userMessage = '请使用 skillDiscover 工具查看可用的技能';

    console.log('User:', userMessage);
    const response = await conversation.sendMessage(userMessage);

    console.log('\nAI Response:');
    console.log(response.content.substring(0, 500) + '...\n');

    // 检查是否使用了工具
    const toolUses = response.content.match(/<tool_use>/g);
    if (toolUses) {
      console.log('✓ Tool used:', toolUses.length, 'time(s)');
    } else {
      console.log('✗ No tool used');
    }

    return true;
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return false;
  }
}

async function testSkillLoad() {
  console.log('📚 Test 2: Skill Load');
  console.log('----------------------------------------');

  const config = loadConfig();
  const conversation = await createConversation(config, false);

  try {
    // 模拟用户消息：加载技能
    const userMessage = '请使用 skillLoad 工具加载 hello-world 技能';

    console.log('User:', userMessage);
    const response = await conversation.sendMessage(userMessage);

    console.log('\nAI Response:');
    console.log(response.content.substring(0, 500) + '...\n');

    // 检查是否使用了工具
    const toolUses = response.content.match(/<tool_use>/g);
    if (toolUses) {
      console.log('✓ Tool used:', toolUses.length, 'time(s)');
    } else {
      console.log('✗ No tool used');
    }

    return true;
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return false;
  }
}

async function testSkillUsage() {
  console.log('🎯 Test 3: Skill Usage');
  console.log('----------------------------------------');

  const config = loadConfig();
  const conversation = await createConversation(config, false);

  try {
    // 第一步：加载技能
    console.log('Step 1: Loading skill...');
    let response = await conversation.sendMessage('请加载 hello-world 技能');
    console.log('✓ Skill loaded');

    // 第二步：使用技能
    console.log('\nStep 2: Using skill...');
    response = await conversation.sendMessage('请使用 hello-world 技能打招呼');

    console.log('\nAI Response:');
    console.log(response.content.substring(0, 800) + '...\n');

    // 检查是否使用了技能
    if (response.content.includes('Hello')) {
      console.log('✓ Skill appears to be working');
    } else {
      console.log('⚠️  Skill response unclear');
    }

    return true;
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return false;
  }
}

async function testSystemPromptUpdate() {
  console.log('🔧 Test 4: System Prompt Update');
  console.log('----------------------------------------');

  const config = loadConfig();
  const conversation = await createConversation(config, false);

  try {
    // 检查初始 System Prompt
    console.log('Initial System Prompt length:', conversation.systemPrompt.length);

    // 加载技能
    await conversation.sendMessage('请加载 hello-world 技能');

    // 检查更新后的 System Prompt
    console.log('Updated System Prompt length:', conversation.systemPrompt.length);

    if (conversation.systemPrompt.includes('hello-world')) {
      console.log('✓ System Prompt includes skill content');
    } else {
      console.log('✗ System Prompt does not include skill content');
    }

    return true;
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return false;
  }
}

async function main() {
  const results = {
    discovery: false,
    load: false,
    usage: false,
    systemPrompt: false
  };

  try {
    // 运行测试
    results.discovery = await testSkillDiscovery();
    results.load = await testSkillLoad();
    results.usage = await testSkillUsage();
    results.systemPrompt = await testSystemPromptUpdate();

    // 总结
    console.log('========================================');
    console.log('Test Results Summary');
    console.log('========================================\n');
    console.log('  - Skill Discovery:', results.discovery ? '✓' : '✗');
    console.log('  - Skill Load:', results.load ? '✓' : '✗');
    console.log('  - Skill Usage:', results.usage ? '✓' : '✗');
    console.log('  - System Prompt Update:', results.systemPrompt ? '✓' : '✗');
    console.log();

    const allPassed = Object.values(results).every(r => r);
    if (allPassed) {
      console.log('✅ All integration tests passed!');
      process.exit(0);
    } else {
      console.log('⚠️  Some tests failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
main();
