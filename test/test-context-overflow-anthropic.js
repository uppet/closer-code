#!/usr/bin/env node
/**
 * 测试 Context Size 溢出（使用 Anthropic API）
 *
 * 目的：通过反复对话触发 API 的 context size 限制
 * 记录错误消息和具体的 token 数值
 */

import { setCustomConfigPath, getConfig, updateConfig } from '../src/config.js';
import { createConversation } from '../src/conversation/index.js';

// 使用用户的自定义配置
setCustomConfigPath('/home/joyer/.closer-code/test-config.json');

/**
 * 生成一个较长的提示词，增加 token 消耗
 */
function generateLongPrompt(iteration) {
  const baseText = `这是第 ${iteration} 轮对话。请详细回答以下问题：

1. 请解释什么是 JavaScript 的事件循环（Event Loop）？
2. 请详细说明 Node.js 的模块系统（CommonJS 和 ES Modules）的区别？
3. 请列举并解释 10 个常用的 Node.js 内置模块？
4. 请说明 React 的虚拟 DOM 是如何工作的？
5. 请解释 TypeScript 的泛型（Generics）概念和使用场景？

对于每个问题，请提供详细的解释、代码示例和最佳实践。

附加要求：
- 每个问题的回答至少 500 字
- 包含完整的代码示例
- 说明优缺点和适用场景
- 提供实际项目中的应用案例`;

  // 添加一些重复内容来增加 token 数量
  const padding = '\n\n' + '='.repeat(100) + '\n\n';
  const repeatedText = '请确保回答详细、准确、实用。'.repeat(10);

  return baseText + padding + repeatedText;
}

/**
 * 格式化 token 数量
 */
function formatTokens(tokens) {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(2)}M`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(2)}K`;
  }
  return tokens.toString();
}

/**
 * 运行测试
 */
async function runTest() {
  console.log('='.repeat(80));
  console.log('Context Size 溢出测试（使用 Anthropic API）');
  console.log('='.repeat(80));
  console.log('');

  try {
    // 加载配置
    console.log('📋 加载配置...');
    let config = getConfig();

    // 临时修改为使用 Anthropic provider
    console.log('🔄 切换到 Anthropic provider...');
    config = updateConfig({
      ai: {
        provider: 'anthropic',
        anthropic: {
          ...config.ai.anthropic,
          model: 'claude-sonnet-4-5-20251129', // 使用配置中的模型
          maxTokens: 8192
        }
      }
    });

    console.log(`✓ AI Provider: ${config.ai.provider}`);
    console.log(`✓ Model: ${config.ai.anthropic.model}`);
    console.log(`✓ Max Tokens: ${config.ai.anthropic.maxTokens}`);
    console.log(`✓ Base URL: ${config.ai.anthropic.baseURL}`);
    console.log('');

    // 创建对话会话
    console.log('💬 创建对话会话...');
    const conversation = await createConversation(config, false, false);
    console.log('✓ 对话会话已创建');
    console.log('');

    // 测试参数
    const maxIterations = 50; // 最多尝试 50 轮
    let iteration = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let overflowError = null;

    console.log('🚀 开始多轮对话测试...');
    console.log(`   目标：触发 context size 溢出`);
    console.log(`   最大迭代次数：${maxIterations}`);
    console.log('');
    console.log('-'.repeat(80));
    console.log('');

    // 循环发送消息
    for (let i = 1; i <= maxIterations; i++) {
      iteration = i;

      try {
        console.log(`\n📝 [第 ${i} 轮] 发送消息...`);

        // 生成提示词
        const prompt = generateLongPrompt(i);
        const promptLength = prompt.length;
        console.log(`   提示词长度：${promptLength} 字符`);

        // 发送消息
        const response = await conversation.sendMessage(prompt, null);

        // 记录 token 使用情况
        const inputTokens = response.usage?.input_tokens || 0;
        const outputTokens = response.usage?.output_tokens || 0;
        const totalTokens = response.usage?.total_tokens || 0;

        totalInputTokens += inputTokens;
        totalOutputTokens += outputTokens;

        console.log(`   ✓ Input Tokens:  ${formatTokens(inputTokens)} (${inputTokens})`);
        console.log(`   ✓ Output Tokens: ${formatTokens(outputTokens)} (${outputTokens})`);
        console.log(`   ✓ Total Tokens:  ${formatTokens(totalTokens)} (${totalTokens})`);
        console.log(`   ✓ 累计 Input:   ${formatTokens(totalInputTokens)} (${totalInputTokens})`);
        console.log(`   ✓ 累计 Output:  ${formatTokens(totalOutputTokens)} (${totalOutputTokens})`);

        // 检查是否接近限制（假设 200K token 限制）
        if (totalTokens > 180000) {
          console.log(`   ⚠️  警告：接近 context size 限制 (180K/200K)`);
        }

        // 短暂延迟，避免 API 速率限制
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        // 检查是否是 context overflow 错误
        const errorMessage = error.message || '';
        const errorType = error.type || error.code || '';

        console.log(`   ❌ 错误发生在第 ${i} 轮`);
        console.log(`   错误类型：${errorType}`);
        console.log(`   错误消息：${errorMessage}`);
        console.log('');

        // 判断是否是 context overflow
        const isContextOverflow =
          errorMessage.toLowerCase().includes('context') ||
          errorMessage.toLowerCase().includes('token') &&
          (errorMessage.toLowerCase().includes('exceed') ||
           errorMessage.toLowerCase().includes('too large') ||
           errorMessage.toLowerCase().includes('maximum') ||
           errorMessage.toLowerCase().includes('limit')) ||
          errorType.toLowerCase().includes('context') ||
          errorType.toLowerCase().includes('token');

        if (isContextOverflow) {
          overflowError = {
            iteration: i,
            errorType,
            errorMessage,
            totalInputTokens,
            totalOutputTokens,
            accumulatedTokens: totalInputTokens + totalOutputTokens
          };
          console.log('🎯 检测到 Context Size 溢出错误！');
          break;
        } else {
          console.log('⚠️  其他错误，继续测试...');
          console.log(`   错误详情：${error.message}`);
          // 如果是其他错误，等待后继续
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('测试结果');
    console.log('='.repeat(80));
    console.log('');
    console.log(`📊 统计信息：`);
    console.log(`   完成轮数：${iteration}`);
    console.log(`   累计 Input Tokens：  ${formatTokens(totalInputTokens)} (${totalInputTokens})`);
    console.log(`   累计 Output Tokens： ${formatTokens(totalOutputTokens)} (${totalOutputTokens})`);
    console.log(`   累计总 Tokens：     ${formatTokens(totalInputTokens + totalOutputTokens)}`);
    console.log('');

    if (overflowError) {
      console.log(`🎯 Context Size 溢出详情：`);
      console.log(`   发生轮数：${overflowError.iteration}`);
      console.log(`   错误类型：${overflowError.errorType}`);
      console.log(`   错误消息：${overflowError.errorMessage}`);
      console.log(`   当时累计 Tokens：`);
      console.log(`     - Input:  ${formatTokens(overflowError.totalInputTokens)} (${overflowError.totalInputTokens})`);
      console.log(`     - Output: ${formatTokens(overflowError.totalOutputTokens)} (${overflowError.totalOutputTokens})`);
      console.log(`     - Total:  ${formatTokens(overflowError.accumulatedTokens)} (${overflowError.accumulatedTokens})`);
      console.log('');
      console.log('✅ 成功触发 Context Size 溢出！');
    } else {
      console.log('ℹ️  未触发 Context Size 溢出（已达到最大迭代次数）');
      console.log('   可能原因：');
      console.log('   1. API 的 context size 限制较大');
      console.log('   2. 历史消息被自动截断');
      console.log('   3. 需要更多轮次才能触发');
    }

    console.log('');

    // 清理资源
    console.log('🧹 清理资源...');
    await conversation.cleanup();
    console.log('✓ 清理完成');
    console.log('');

    // 返回测试结果
    return {
      success: !!overflowError,
      iteration,
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
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

    // 输出 JSON 格式结果（方便解析）
    console.log('JSON 结果：');
    console.log(JSON.stringify(result, null, 2));
    console.log('');

    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('测试异常退出：', error);
    process.exit(1);
  });
