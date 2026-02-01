#!/usr/bin/env node
/**
 * 测试 Context Size 溢出（使用 Ollama Provider - WSL 连接 Windows）
 *
 * 目的：通过反复对话触发 Ollama API 的 context size 限制
 * 记录错误消息和具体的 token 数值
 */

import { setCustomConfigPath, getConfig } from '../src/config.js';
import { createConversation } from '../src/conversation/index.js';

// 使用 WSL 连接 Windows 的配置
setCustomConfigPath('/home/joyer/.closer-code/test-config-wsl.json');

/**
 * 生成一个长消息（约 1000 tokens）
 */
function generateLongMessage(index) {
  return `消息 #${index}

这是一个包含大量内容的消息，用于增加 token 消耗。

## JavaScript 事件循环详解

JavaScript 是单线程的，但通过事件循环可以实现异步操作。事件循环是 JavaScript 实现异步的核心机制。

### 工作原理

1. **调用栈（Call Stack）**：JavaScript 执行代码的地方，后进先出（LIFO）。
2. **任务队列（Task Queue）**：存储待执行的任务，先进先出（FIFO）。
3. **微任务队列（Microtask Queue）**：优先级高于任务队列。

### Node.js 模块系统

Node.js 支持 CommonJS 和 ES Modules 两种模块系统。

#### CommonJS

\`\`\`javascript
// 导入
const fs = require('fs');

// 导出
module.exports = { myFunction };
\`\`\`

#### ES Modules

\`\`\`javascript
// 导入
import fs from 'fs';

// 导出
export function myFunction() {}
\`\`\`

### 常用 Node.js 内置模块

1. **fs**：文件系统操作
2. **path**：路径处理
3. **http**：HTTP 服务器
4. **events**：事件发射器
5. **stream**：流处理
6. **buffer**：二进制数据
7. **crypto**：加密功能
8. **os**：操作系统信息
9. **util**：实用工具
10. **child_process**：子进程管理

### React 虚拟 DOM

React 使用虚拟 DOM 来提高性能：

1. 创建虚拟 DOM 树
2. 比较新旧虚拟 DOM（Diff 算法）
3. 计算最小变更
4. 只更新实际 DOM 的必要部分

### TypeScript 泛型

泛型允许在定义时不指定具体类型：

\`\`\`typescript
function identity<T>(arg: T): T {
  return arg;
}

const num = identity<number>(42);
const str = identity<string>("hello");
\`\`\`

重复内容 ${'，'.repeat(100)}，确保消息足够长。

${'='.repeat(50)}
第 ${index} 条消息结束
${'='.repeat(50)}`;
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
 * 估算消息的 token 数量（粗略估计：1 token ≈ 4 字符）
 */
function estimateTokens(message) {
  return Math.ceil(message.length / 4);
}

/**
 * 运行测试
 */
async function runTest() {
  console.log('='.repeat(80));
  console.log('Context Size 溢出测试（使用 Ollama Provider - WSL 连接 Windows）');
  console.log('='.repeat(80));
  console.log('');

  try {
    // 加载配置
    console.log('📋 加载配置...');
    const config = getConfig();

    console.log(`✓ AI Provider: ${config.ai.provider}`);
    console.log(`✓ Model: ${config.ai.ollama.model}`);
    console.log(`✓ Max Tokens: ${config.ai.ollama.maxTokens}`);
    console.log(`✓ Base URL: ${config.ai.ollama.baseURL}`);
    console.log('');

    // 检查 Ollama 是否配置
    if (config.ai.provider !== 'ollama') {
      console.error('❌ 配置错误：provider 不是 ollama');
      console.error(`   当前 provider: ${config.ai.provider}`);
      process.exit(1);
    }

    // 创建对话会话
    console.log('💬 创建对话会话...');
    const conversation = await createConversation(config, false, false);
    console.log('✓ 对话会话已创建');
    console.log('');

    // 目标：注入约 180K-200K tokens 的历史消息
    // 每条消息约 1000 tokens
    // 需要约 180-200 条消息
    const targetTokens = 190000;
    const tokensPerMessage = 1000;
    const messageCount = Math.ceil(targetTokens / tokensPerMessage);

    console.log('🚀 开始注入历史消息...');
    console.log(`   目标 token 数量：${formatTokens(targetTokens)} (${targetTokens})`);
    console.log(`   每条消息约：${tokensPerMessage} tokens`);
    console.log(`   需要消息数：${messageCount}`);
    console.log('');
    console.log('-'.repeat(80));
    console.log('');

    let totalTokens = 0;
    let overflowError = null;
    let actualMessageCount = 0;
    let errorMessage = null;

    // 批量注入消息
    const batchSize = 20; // 每批 20 条消息
    for (let batch = 0; batch < Math.ceil(messageCount / batchSize); batch++) {
      const startIdx = batch * batchSize;
      const endIdx = Math.min(startIdx + batchSize, messageCount);
      const count = endIdx - startIdx;

      console.log(`\n📦 [批次 ${batch + 1}] 注入消息 ${startIdx + 1}-${endIdx}...`);

      for (let i = startIdx; i < endIdx; i++) {
        const message = generateLongMessage(i + 1);
        const estimatedTokens = estimateTokens(message);

        // 注入用户消息
        conversation.messages.push({
          role: 'user',
          content: message
        });

        // 注入助手回复（模拟对话）
        conversation.messages.push({
          role: 'assistant',
          content: `收到消息 #${i + 1}。我已理解您关于事件循环、模块系统、React、TypeScript 等主题的问题。${'详细回复内容省略。'.repeat(10)}`
        });

        totalTokens += estimatedTokens * 2; // 用户消息 + 助手回复
        actualMessageCount += 2;
      }

      console.log(`   ✓ 已注入 ${actualMessageCount} 条消息`);
      console.log(`   ✓ 估计累计 tokens：${formatTokens(totalTokens)} (${totalTokens})`);

      // 尝试发送一条测试消息，检查是否触发 overflow
      try {
        console.log(`   🧪 测试发送消息...`);
        const testPrompt = '测试消息：请回复"OK"';
        const response = await conversation.sendMessage(testPrompt, null);

        const inputTokens = response.usage?.input_tokens || 0;
        const outputTokens = response.usage?.output_tokens || 0;
        const totalResponseTokens = inputTokens + outputTokens;

        console.log(`   ✓ 成功！Input: ${formatTokens(inputTokens)}, Output: ${formatTokens(outputTokens)}`);
        console.log(`   ✓ 实际总 tokens：${formatTokens(totalResponseTokens)} (${totalResponseTokens})`);

        // 更新实际 token 数量
        totalTokens = totalResponseTokens;

        // 检查是否接近限制
        if (totalTokens > 180000) {
          console.log(`   ⚠️  警告：接近 context size 限制 (180K/200K)`);
        }

        // 短暂延迟
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        errorMessage = error.message || '';
        const errorType = error.type || error.code || '';

        console.log(`   ❌ 错误：`);
        console.log(`      类型：${errorType || 'N/A'}`);
        console.log(`      消息：${errorMessage.substring(0, 300)}${errorMessage.length > 300 ? '...' : ''}`);

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

        // 判断是否是连接错误
        const isConnectionError =
          errorMessage.toLowerCase().includes('fetch failed') ||
          errorMessage.toLowerCase().includes('connection') ||
          errorMessage.toLowerCase().includes('econnrefused') ||
          errorMessage.toLowerCase().includes('ollama');

        if (isContextOverflow) {
          overflowError = {
            messageCount: actualMessageCount,
            errorType,
            errorMessage,
            estimatedTokens: totalTokens
          };
          console.log('');
          console.log('🎯 检测到 Context Size 溢出错误！');
          break;
        } else if (isConnectionError) {
          console.log('');
          console.log('⚠️  检测到连接错误，停止测试');
          console.log('');
          console.log('📝 排查步骤：');
          console.log('');
          console.log('1. 在 Windows PowerShell 中检查 Ollama 是否运行：');
          console.log('   ollama list');
          console.log('');
          console.log('2. 在 Windows PowerShell 中设置允许外部访问：');
          console.log('   $env:OLLAMA_HOST="0.0.0.0:11434"');
          console.log('   ollama serve');
          console.log('');
          console.log('3. 在 Windows PowerShell 中检查端口监听：');
          console.log('   netstat -an | findstr 11434');
          console.log('');
          console.log('4. 在 Windows PowerShell 中测试 API：');
          console.log('   curl http://localhost:11434/api/tags');
          console.log('');
          console.log('5. 在 WSL 中测试连接：');
          console.log(`   curl http://10.255.255.254:11434/api/tags`);
          console.log('');
          break;
        } else {
          console.log(`   ⚠️  其他错误，继续测试...`);
          // 如果是其他错误，等待后继续
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // 如果已经触发 overflow 或连接错误，退出
      if (overflowError || errorMessage?.toLowerCase().includes('connection') || errorMessage?.toLowerCase().includes('fetch failed')) {
        break;
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('测试结果');
    console.log('='.repeat(80));
    console.log('');
    console.log(`📊 统计信息：`);
    console.log(`   注入消息数：${actualMessageCount}`);
    console.log(`   估计总 Tokens：${formatTokens(totalTokens)} (${totalTokens})`);
    console.log('');

    if (overflowError) {
      console.log(`🎯 Context Size 溢出详情：`);
      console.log(`   消息数量：${overflowError.messageCount}`);
      console.log(`   错误类型：${overflowError.errorType}`);
      console.log(`   错误消息：${overflowError.errorMessage}`);
      console.log(`   估计 Tokens：${formatTokens(overflowError.estimatedTokens)} (${overflowError.estimatedTokens})`);
      console.log('');
      console.log('✅ 成功触发 Context Size 溢出！');
    } else {
      console.log('ℹ️  测试结束');
      console.log('   可能原因：');
      console.log('   1. API 的 context size 限制较大');
      console.log('   2. 遇到连接错误');
      console.log('   3. 需要更多消息才能触发');
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
      messageCount: actualMessageCount,
      totalTokens,
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
