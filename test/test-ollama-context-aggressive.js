#!/usr/bin/env node
/**
 * 测试 Ollama Context Size 限制（激进版本）
 *
 * 目的：快速注入大量消息，触发 Ollama 的 context size 限制
 * 记录错误消息和响应内容
 */

import { setCustomConfigPath, getConfig } from '../src/config.js';
import { createConversation } from '../src/conversation/index.js';

// 使用用户的自定义配置
setCustomConfigPath('/home/joyer/.closer-code/test-config.json');

/**
 * 生成一个长消息
 */
function generateLongMessage(index) {
  return `消息 #${index}

${'这是一个很长的消息，用于增加 token 消耗。'.repeat(50)}

## 重复内容

${'ABC'.repeat(200)}

${'='.repeat(100)}
`;
}

/**
 * 运行测试
 */
async function runTest() {
  console.log('='.repeat(80));
  console.log('Ollama Context Size 限制测试（激进版本）');
  console.log('='.repeat(80));
  console.log('');

  try {
    // 加载配置
    console.log('📋 加载配置...');
    const config = getConfig();
    console.log(`✓ Provider: ${config.ai.provider}`);
    console.log(`✓ Model: ${config.ai.ollama.model}`);
    console.log(`✓ Base URL: ${config.ai.ollama.baseURL}`);
    console.log('');

    // 创建对话会话
    console.log('💬 创建对话会话...');
    const conversation = await createConversation(config, false, false);
    console.log('✓ 对话会话已创建');
    console.log('');

    // 激进策略：每次批量注入 100 条消息
    const batchSize = 100;
    const maxBatches = 20; // 最多 20 批，共 2000 条消息

    console.log('🚀 开始激进测试...');
    console.log(`   每批消息数：${batchSize}`);
    console.log(`   最大批次数：${maxBatches}`);
    console.log('');
    console.log('-'.repeat(80));
    console.log('');

    let totalMessages = 0;
    let overflowError = null;

    for (let batch = 0; batch < maxBatches; batch++) {
      console.log(`\n📦 [批次 ${batch + 1}/${maxBatches}] 注入 ${batchSize} 条消息...`);

      // 注入消息
      for (let i = 0; i < batchSize; i++) {
        const message = generateLongMessage(totalMessages + i + 1);

        conversation.messages.push({
          role: 'user',
          content: message
        });

        conversation.messages.push({
          role: 'assistant',
          content: `回复消息 #${totalMessages + i + 1}。${'OK'.repeat(100)}`
        });
      }

      totalMessages += batchSize * 2;
      console.log(`   ✓ 已注入 ${totalMessages} 条消息`);

      // 尝试发送测试消息
      try {
        console.log(`   🧪 测试发送消息...`);
        const testPrompt = `测试 #${batch + 1}：回复"OK"`;
        const response = await conversation.sendMessage(testPrompt, (progress) => {
          // 打印进度
          if (progress.type === 'tool_start') {
            console.log(`      [工具] ${progress.tool}`);
          }
        });

        // 打印响应信息
        console.log(`   ✓ 响应内容长度：${response.content?.length || 0} 字符`);
        console.log(`   ✓ 响应内容预览：${response.content?.substring(0, 100) || 'N/A'}...`);
        console.log(`   ✓ Token 使用：Input=${response.usage?.input_tokens || 0}, Output=${response.usage?.output_tokens || 0}`);

        // 如果响应内容为空或异常，可能是达到限制
        if (!response.content || response.content.length < 10) {
          console.log(`   ⚠️  响应内容异常短，可能接近限制`);
        }

        // 短暂延迟
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        const errorMessage = error.message || '';
        const errorType = error.type || error.code || '';

        console.log(`   ❌ 错误：`);
        console.log(`      类型：${errorType || 'N/A'}`);
        console.log(`      消息：${errorMessage}`);

        // 判断是否是 context overflow
        const isContextOverflow =
          errorMessage.toLowerCase().includes('context') ||
          errorMessage.toLowerCase().includes('token') &&
          (errorMessage.toLowerCase().includes('exceed') ||
           errorMessage.toLowerCase().includes('too large') ||
           errorMessage.toLowerCase().includes('maximum') ||
           errorMessage.toLowerCase().includes('limit')) ||
          errorMessage.toLowerCase().includes('context length') ||
          errorMessage.toLowerCase().includes('max context');

        if (isContextOverflow) {
          overflowError = {
            messageCount: totalMessages,
            errorType,
            errorMessage
          };
          console.log('');
          console.log('🎯 检测到 Context Size 溢出错误！');
          break;
        } else {
          console.log(`   ⚠️  其他错误：${error.name}`);
          // 其他错误也记录，但继续测试
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // 如果触发溢出，退出
      if (overflowError) {
        break;
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('测试结果');
    console.log('='.repeat(80));
    console.log('');
    console.log(`📊 统计信息：`);
    console.log(`   注入消息数：${totalMessages}`);
    console.log('');

    if (overflowError) {
      console.log(`🎯 Context Size 溢出详情：`);
      console.log(`   消息数量：${overflowError.messageCount}`);
      console.log(`   错误类型：${overflowError.errorType}`);
      console.log(`   错误消息：${overflowError.errorMessage}`);
      console.log('');
      console.log('✅ 成功触发 Context Size 溢出！');
    } else {
      console.log('ℹ️  未触发 Context Size 溢出');
      console.log('   可能原因：');
      console.log('   1. Ollama 模型的 context size 限制很大（>200K tokens）');
      console.log('   2. Ollama 自动处理了 context 超限（截断旧消息）');
      console.log('   3. 需要更多消息才能触发');
      console.log('');
      console.log('💡 建议：');
      console.log('   1. 检查 Ollama 模型的文档，了解其 context size 限制');
      console.log('   2. 使用 Ollama API 的 /show endpoint 查看模型信息');
      console.log('   3. 手动测试：直接调用 Ollama API，传入大量消息');
    }

    console.log('');

    // 清理资源
    console.log('🧹 清理资源...');
    await conversation.cleanup();
    console.log('✓ 清理完成');
    console.log('');

    return {
      success: !!overflowError,
      messageCount: totalMessages,
      overflowError
    };

  } catch (error) {
    console.error('');
    console.error('❌ 测试失败：');
    console.error(`   ${error.message}`);
    console.error('');
    console.error('详细错误信息：');
    console.error(error);
    throw error;
  }
}

// 运行测试
runTest()
  .then(result => {
    console.log('='.repeat(80));
    console.log('测试完成');
    console.log('='.repeat(80));
    console.log('');

    // 输出 JSON 格式结果
    console.log('JSON 结果：');
    console.log(JSON.stringify(result, null, 2));
    console.log('');

    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('测试异常退出：', error);
    process.exit(1);
  });
