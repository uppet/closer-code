#!/usr/bin/env node
/**
 * Abort Fence 机制测试
 *
 * 测试场景：
 * 1. 正常对话流程
 * 2. 对话过程中 abort
 * 3. Abort 后立即发起新对话
 * 4. 工具执行中 abort
 * 5. /clear 后 phase ID 重置
 */

import { createConversation } from './src/conversation.js';
import { getConfig } from './src/config.js';

// 模拟进度回调
function createProgressCallback() {
  const events = [];
  return {
    callback: (event) => {
      events.push({ ...event, timestamp: new Date().toISOString() });
      console.log(`[Progress] ${event.type}:`, JSON.stringify(event).substring(0, 100));
    },
    getEvents: () => events,
    clear: () => events.length = 0
  };
}

// 测试辅助函数
async function test(name, fn) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${name}`);
  console.log('='.repeat(60));

  try {
    await fn();
    console.log(`✅ PASSED: ${name}`);
    return true;
  } catch (error) {
    console.error(`❌ FAILED: ${name}`);
    console.error(`Error: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

// 延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 主测试函数
async function main() {
  const config = getConfig();
  const conversation = await createConversation(config);

  const results = [];

  // Test 1: Phase ID 管理
  results.push(await test('Phase ID Management', async () => {
    const phase1 = conversation.beginPhase();
    console.log(`Phase 1 ID: ${phase1}`);

    const phase2 = conversation.beginPhase();
    console.log(`Phase 2 ID: ${phase2}`);

    if (phase2 !== phase1 + 1) {
      throw new Error(`Phase ID should increment: ${phase1} -> ${phase2}`);
    }

    // 测试 abort 检查
    if (conversation.isAborted(phase1)) {
      throw new Error('Phase 1 should not be aborted yet');
    }

    // 设置 abort fence
    conversation.abortFence = phase1;

    if (!conversation.isAborted(phase1)) {
      throw new Error('Phase 1 should be aborted');
    }

    if (conversation.isAborted(phase2)) {
      throw new Error('Phase 2 should not be aborted (fence at phase1)');
    }

    console.log('✓ Phase ID correctly increments');
    console.log('✓ Abort fence correctly filters phases');
  }));

  // Test 2: Abort Result
  results.push(await test('Abort Result Creation', async () => {
    const result = conversation.createAbortResult('test_abort');
    console.log('Abort result:', result);

    if (!result.aborted) {
      throw new Error('Result should have aborted flag');
    }

    if (result.abortReason !== 'test_abort') {
      throw new Error('Result should have abort reason');
    }

    if (result.content !== '') {
      throw new Error('Result content should be empty');
    }

    if (result.usage.total_tokens !== 0) {
      throw new Error('Result usage should be zero');
    }

    console.log('✓ Abort result has correct structure');
  }));

  // Test 3: Clear History Resets Phase ID
  results.push(await test('Clear History Resets Phase ID', async () => {
    const phaseBeforeClear = conversation.conversationPhaseId;
    console.log(`Phase ID before clear: ${phaseBeforeClear}`);

    conversation.clearHistory();

    if (conversation.conversationPhaseId !== 0) {
      throw new Error(`Phase ID should be 0 after clear, got ${conversation.conversationPhaseId}`);
    }

    if (conversation.activePhaseId !== null) {
      throw new Error('Active phase ID should be null after clear');
    }

    if (conversation.abortFence !== null) {
      throw new Error('Abort fence should be null after clear');
    }

    console.log('✓ Clear history resets all abort state');
  }));

  // Test 4: Abort Handler Registration
  results.push(await test('Abort Handler Registration', async () => {
    let handlerExecuted = false;

    conversation.registerAbortHandler('test_handler', async () => {
      handlerExecuted = true;
      await delay(100);
      console.log('Test handler executed');
    });

    if (!conversation.pendingAbortHandlers.has('test_handler')) {
      throw new Error('Handler should be registered');
    }

    // 等待 handler 完成
    await Promise.all(Array.from(conversation.pendingAbortHandlers.values()));

    if (!handlerExecuted) {
      throw new Error('Handler should have been executed');
    }

    console.log('✓ Abort handler registration works');
  }));

  // Test 5: Abort Current Phase
  results.push(await test('Abort Current Phase', async () => {
    const phaseId = conversation.beginPhase();
    console.log(`Started phase ${phaseId}`);

    // 注册一些模拟的 abort handlers
    conversation.registerAbortHandler('handler1', async () => {
      console.log('Handler 1 cleaning up...');
      await delay(50);
    });

    conversation.registerAbortHandler('handler2', async () => {
      console.log('Handler 2 cleaning up...');
      await delay(50);
    });

    // 执行 abort
    const startTime = Date.now();
    await conversation.abortCurrentPhase();
    const duration = Date.now() - startTime;

    console.log(`Abort completed in ${duration}ms`);

    if (conversation.activePhaseId !== null) {
      throw new Error('Active phase ID should be null after abort');
    }

    if (conversation.abortFence !== phaseId) {
      throw new Error(`Abort fence should be ${phaseId}, got ${conversation.abortFence}`);
    }

    if (conversation.pendingAbortHandlers.size !== 0) {
      throw new Error('Pending handlers should be cleared after abort');
    }

    console.log('✓ Abort current phase works correctly');
  }));

  // Test 6: New Phase After Abort
  results.push(await test('New Phase After Abort', async () => {
    const oldFence = conversation.abortFence;
    const newPhase = conversation.beginPhase();

    console.log(`Old fence: ${oldFence}, New phase: ${newPhase}`);

    if (newPhase <= oldFence) {
      throw new Error(`New phase ${newPhase} should be greater than old fence ${oldFence}`);
    }

    if (conversation.isAborted(newPhase)) {
      throw new Error('New phase should not be aborted by old fence');
    }

    console.log('✓ New phase after abort works correctly');
  }));

  // Test 7: Abort Timeout
  results.push(await test('Abort Timeout Protection', async () => {
    const phaseId = conversation.beginPhase();

    // 注册一个长时间运行的 handler
    conversation.registerAbortHandler('slow_handler', async () => {
      console.log('Slow handler started (will timeout)...');
      await delay(10000); // 10秒，但超时是 5秒
    });

    const startTime = Date.now();
    await conversation.abortCurrentPhase();
    const duration = Date.now() - startTime;

    console.log(`Abort with timeout completed in ${duration}ms`);

    if (duration > 6000) {
      throw new Error(`Abort should timeout around 5000ms, took ${duration}ms`);
    }

    console.log('✓ Abort timeout protection works');
  }));

  // 总结
  console.log(`\n${'='.repeat(60)}`);
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log(`Passed: ${passed}/${total}`);

  if (passed === total) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed!');
    process.exit(1);
  }
}

// 运行测试
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
