#!/usr/bin/env node
/**
 * 测试 Abort 后发起新对话
 *
 * 验证修复后可以在 abort 后立即发起新对话
 */

import { createConversation } from './src/conversation.js';
import { getConfig } from './src/config.js';

async function test() {
  console.log('Testing abort and new conversation flow...\n');

  const config = getConfig();
  config.mcp.enabled = false; // 禁用 MCP 加快测试

  const conversation = await createConversation(config);

  // 测试 1: 开始一个对话
  console.log('Test 1: Start a conversation');
  const phase1 = conversation.beginPhase();
  conversation.isProcessing = true; // 模拟正在处理
  console.log(`  Phase 1 ID: ${phase1}`);
  console.log(`  isProcessing: ${conversation.isProcessing}`);
  console.log(`  ✓ Conversation started\n`);

  // 测试 2: Abort 对话
  console.log('Test 2: Abort the conversation');
  await conversation.abortCurrentPhase();
  console.log(`  isProcessing after abort: ${conversation.isProcessing}`);
  console.log(`  activePhaseId: ${conversation.activePhaseId}`);
  console.log(`  abortFence: ${conversation.abortFence}`);

  if (!conversation.isProcessing) {
    console.log(`  ✓ isProcessing reset to false\n`);
  } else {
    console.log(`  ❌ ERROR: isProcessing is still true!\n`);
    process.exit(1);
  }

  // 测试 3: 尝试发起新对话（应该成功）
  console.log('Test 3: Start a new conversation after abort');
  let phase2;
  try {
    phase2 = conversation.beginPhase();
    console.log(`  Phase 2 ID: ${phase2}`);
    console.log(`  isProcessing: ${conversation.isProcessing}`);
    console.log(`  ✓ New conversation started successfully\n`);
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}\n`);
    process.exit(1);
  }

  // 测试 4: 检查新对话不受旧 abort 影响
  console.log('Test 4: Check new conversation is not affected by old abort');
  const isAborted = conversation.isAborted(phase2);
  console.log(`  Is phase 2 aborted: ${isAborted}`);

  if (!isAborted) {
    console.log(`  ✓ New conversation is not aborted\n`);
  } else {
    console.log(`  ❌ ERROR: New conversation should not be aborted!\n`);
    process.exit(1);
  }

  console.log('✅ All tests passed!');
  console.log('\nAbort and new conversation flow is working correctly.');
  console.log('The isProcessing reset issue has been fixed.');
}

test().catch(error => {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
