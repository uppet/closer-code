#!/usr/bin/env node
/**
 * Abort Fence 机制实践示例
 *
 * 这个示例展示了如何在实际场景中使用 Abort Fence 机制
 */

import { createConversation } from '../src/conversation.js';
import { getConfig } from '../src/config.js';

/**
 * 示例 1: 简单的 abort 检查
 */
async function example1_SimpleAbortCheck() {
  console.log('\n=== Example 1: Simple Abort Check ===\n');

  const config = getConfig();
  // 禁用 MCP 以避免初始化延迟
  config.mcp.enabled = false;
  const conversation = await createConversation(config);

  // 开始一个对话阶段
  const phaseId = conversation.beginPhase();
  console.log(`Started phase ${phaseId}`);

  // 模拟一些处理
  console.log('Processing...');

  // 检查是否被 abort
  if (conversation.isAborted(phaseId)) {
    console.log('Phase was aborted!');
    return conversation.createAbortResult();
  }

  console.log('Processing completed successfully');
  return { success: true, data: 'some result' };
}

/**
 * 示例 2: 在工具执行中使用 abort 检查
 */
async function example2_ToolWithAbortCheck() {
  console.log('\n=== Example 2: Tool With Abort Check ===\n');

  const config = getConfig();
  config.mcp.enabled = false;
  const conversation = await createConversation(config);

  // 模拟一个长时间运行的工具
  async function longRunningTool(conversation) {
    const phaseId = conversation.activePhaseId;

    // 执行前检查
    if (conversation.isAborted(phaseId)) {
      return {
        success: false,
        aborted: true,
        error: 'Tool execution aborted before start'
      };
    }

    console.log('Tool started...');

    // 模拟长时间操作
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));

      // 每次迭代都检查 abort
      if (conversation.isAborted(phaseId)) {
        console.log('Tool aborted during execution!');
        return {
          success: false,
          aborted: true,
          error: 'Tool execution aborted by user',
          progress: `${i * 20}%`
        };
      }

      console.log(`Tool progress: ${(i + 1) * 20}%`);
    }

    console.log('Tool completed successfully');
    return {
      success: true,
      data: 'tool result'
    };
  }

  // 场景 1: 正常完成
  console.log('Scenario 1: Normal completion');
  const phase1 = conversation.beginPhase();
  const result1 = await longRunningTool(conversation);
  console.log('Result:', result1);

  // 场景 2: 中途 abort
  console.log('\nScenario 2: Abort during execution');
  const phase2 = conversation.beginPhase();

  // 启动工具，但不等待
  const toolPromise = longRunningTool(conversation);

  // 1.2 秒后 abort
  setTimeout(async () => {
    console.log('\n[User presses Ctrl+C]');
    await conversation.abortCurrentPhase();
    console.log('Abort completed\n');
  }, 1200);

  const result2 = await toolPromise;
  console.log('Result:', result2);
}

/**
 * 示例 3: 注册 abort handlers
 */
async function example3_AbortHandlers() {
  console.log('\n=== Example 3: Abort Handlers ===\n');

  const config = getConfig();
  config.mcp.enabled = false;
  const conversation = await createConversation(config);

  const phaseId = conversation.beginPhase();
  console.log(`Started phase ${phaseId}`);

  // 注册一些 abort handlers
  conversation.registerAbortHandler('cleanup-file', async () => {
    console.log('🔧 Cleaning up temporary files...');
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('✓ Temporary files cleaned up');
  });

  conversation.registerAbortHandler('close-connection', async () => {
    console.log('🔧 Closing network connection...');
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('✓ Connection closed');
  });

  conversation.registerAbortHandler('save-state', async () => {
    console.log('🔧 Saving current state...');
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('✓ State saved');
  });

  console.log('Handlers registered');

  // 模拟一些工作
  await new Promise(resolve => setTimeout(resolve, 500));

  // 执行 abort
  console.log('\n[User presses Ctrl+C]');
  await conversation.abortCurrentPhase();
  console.log('\n✓ All handlers completed');
}

/**
 * 示例 4: Abort 后发起新对话
 */
async function example4_NewConversationAfterAbort() {
  console.log('\n=== Example 4: New Conversation After Abort ===\n');

  const config = getConfig();
  config.mcp.enabled = false;
  const conversation = await createConversation(config);

  // 第一个对话
  console.log('First conversation:');
  const phase1 = conversation.beginPhase();
  console.log(`  Phase ID: ${phase1}`);

  // Abort 第一个对话
  console.log('\n[User presses Ctrl+C]');
  await conversation.abortCurrentPhase();
  console.log(`  Abort fence set to: ${conversation.abortFence}`);

  // 立即发起新对话
  console.log('\nSecond conversation (immediately after abort):');
  const phase2 = conversation.beginPhase();
  console.log(`  Phase ID: ${phase2}`);
  console.log(`  Is aborted: ${conversation.isAborted(phase2)}`);

  if (!conversation.isAborted(phase2)) {
    console.log('  ✓ New conversation is NOT affected by old abort');
  }
}

/**
 * 示例 5: 完整的对话流程（带 abort）
 */
async function example5_FullConversationFlow() {
  console.log('\n=== Example 5: Full Conversation Flow ===\n');

  const config = getConfig();
  config.mcp.enabled = false;
  const conversation = await createConversation(config);

  // 模拟发送消息
  async function sendMessage(text, onProgress) {
    const phaseId = conversation.beginPhase();
    console.log(`\n[Phase ${phaseId}] User: ${text}`);

    onProgress?.({ type: 'start', phaseId });

    // 模拟 AI 处理
    const steps = [
      'Analyzing request...',
      'Generating response...',
      'Formatting output...'
    ];

    for (const step of steps) {
      // 检查 abort
      if (conversation.isAborted(phaseId)) {
        console.log(`\n[Phase ${phaseId}] ❌ Aborted`);
        onProgress?.({ type: 'aborted', phaseId });
        return conversation.createAbortResult('aborted_during_processing');
      }

      console.log(`[Phase ${phaseId}] ${step}`);
      onProgress?.({ type: 'progress', step, phaseId });
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n[Phase ${phaseId}] ✅ Completed`);
    onProgress?.({ type: 'complete', phaseId });

    return {
      content: 'Response from AI',
      usage: { input_tokens: 10, output_tokens: 20 },
      aborted: false
    };
  }

  // 场景 1: 正常完成
  console.log('--- Scenario 1: Normal completion ---');
  const result1 = await sendMessage('Hello', (event) => {
    console.log(`  [Event: ${event.type}]`);
  });
  console.log('Result:', result1);

  // 场景 2: 中途 abort
  console.log('\n--- Scenario 2: Abort during processing ---');
  const messagePromise = sendMessage('Tell me a long story', (event) => {
    console.log(`  [Event: ${event.type}]`);
  });

  // 1.2 秒后 abort
  setTimeout(async () => {
    console.log('\n[User presses Ctrl+C]');
    await conversation.abortCurrentPhase();
  }, 1200);

  const result2 = await messagePromise;
  console.log('Result:', result2);

  // 场景 3: Abort 后的新消息
  console.log('\n--- Scenario 3: New message after abort ---');
  const result3 = await sendMessage('How are you?', (event) => {
    console.log(`  [Event: ${event.type}]`);
  });
  console.log('Result:', result3);
}

/**
 * 主函数
 */
async function main() {
  try {
    await example1_SimpleAbortCheck();
    await example2_ToolWithAbortCheck();
    await example3_AbortHandlers();
    await example4_NewConversationAfterAbort();
    await example5_FullConversationFlow();

    console.log('\n✅ All examples completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  example1_SimpleAbortCheck,
  example2_ToolWithAbortCheck,
  example3_AbortHandlers,
  example4_NewConversationAfterAbort,
  example5_FullConversationFlow
};
