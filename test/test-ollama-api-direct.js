#!/usr/bin/env node
/**
 * 直接测试 Ollama API 的 Context Size 限制
 */

const config = {
  baseURL: 'http://192.168.50.92:11434',
  model: 'minimax-m2:cloud'
};

async function testOllamaContext() {
  console.log('='.repeat(80));
  console.log('直接测试 Ollama API Context Size 限制');
  console.log('='.repeat(80));
  console.log('');
  console.log(`Base URL: ${config.baseURL}`);
  console.log(`Model: ${config.model}`);
  console.log('');

  // 生成一个长消息
  const longMessage = '这是一个很长的消息。'.repeat(1000);

  // 测试不同的消息数量
  const testCases = [
    { messages: 100, description: '100 条消息' },
    { messages: 500, description: '500 条消息' },
    { messages: 1000, description: '1000 条消息' },
    { messages: 2000, description: '2000 条消息' },
    { messages: 3000, description: '3000 条消息' },
    { messages: 4000, description: '4000 条消息' },
    { messages: 5000, description: '5000 条消息' },
  ];

  for (const testCase of testCases) {
    console.log(`\n🧪 测试：${testCase.description}`);
    console.log('-'.repeat(80));

    try {
      // 构建消息数组
      const messages = [
        { role: 'system', content: 'You are a helpful assistant.' }
      ];

      for (let i = 0; i < testCase.messages; i++) {
        messages.push({
          role: 'user',
          content: `消息 #${i + 1}: ${longMessage}`
        });
        messages.push({
          role: 'assistant',
          content: `回复 #${i + 1}: OK`
        });
      }

      console.log(`   发送 ${messages.length} 条消息...`);

      // 调用 Ollama API
      const response = await fetch(`${config.baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model,
          messages: messages,
          stream: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`   ❌ HTTP 错误：${response.status} ${response.statusText}`);
        console.log(`   错误详情：${errorText}`);

        // 检查是否是 context overflow
        if (errorText.toLowerCase().includes('context') ||
            errorText.toLowerCase().includes('token') ||
            errorText.toLowerCase().includes('too large')) {
          console.log('');
          console.log('🎯 检测到 Context Size 溢出！');
          console.log(`   消息数量：${testCase.messages}`);
          console.log(`   错误详情：${errorText}`);
          return { success: true, messageCount: testCase.messages, error: errorText };
        }
        continue;
      }

      const data = await response.json();
      console.log(`   ✓ 成功！响应：${data.message?.content?.substring(0, 100) || 'N/A'}...`);

      // 检查响应中是否有 token 信息
      if (data.prompt_eval_count) {
        console.log(`   ✓ Input Tokens: ${data.prompt_eval_count}`);
      }
      if (data.eval_count) {
        console.log(`   ✓ Output Tokens: ${data.eval_count}`);
      }

    } catch (error) {
      console.log(`   ❌ 错误：${error.message}`);

      // 检查是否是 context overflow
      if (error.message.toLowerCase().includes('context') ||
          error.message.toLowerCase().includes('token') ||
          error.message.toLowerCase().includes('too large')) {
        console.log('');
        console.log('🎯 检测到 Context Size 溢出！');
        console.log(`   消息数量：${testCase.messages}`);
        console.log(`   错误详情：${error.message}`);
        return { success: true, messageCount: testCase.messages, error: error.message };
      }
    }
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('测试完成');
  console.log('='.repeat(80));
  console.log('');
  console.log('ℹ️  所有测试用例都通过了，没有触发 Context Size 溢出');
  console.log('   可能原因：');
  console.log('   1. Ollama 模型的 context size 限制非常大');
  console.log('   2. Ollama 自动截断旧消息以适应 context window');
  console.log('   3. 该模型（minimax-m2:cloud）有特殊的处理机制');

  return { success: false, messageCount: null };
}

// 运行测试
testOllamaContext()
  .then(result => {
    console.log('');
    console.log('JSON 结果：');
    console.log(JSON.stringify(result, null, 2));
    console.log('');
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('测试异常退出：', error);
    process.exit(1);
  });
