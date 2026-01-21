/**
 * OpenAI 客户端测试脚本
 *
 * 用法：
 * 1. 设置环境变量: export CLOSER_OPENAI_API_KEY=your_key
 * 2. 运行测试: node test/test-openai-client.js
 */

import { OpenAIClient } from '../src/ai-client-openai.js';

// 测试配置
const config = {
  apiKey: process.env.CLOSER_OPENAI_API_KEY || 'sk-test',
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  maxTokens: 1000
};

async function testBasicChat() {
  console.log('\n🧪 测试 1: 基础对话');
  console.log('─'.repeat(50));

  try {
    const client = new OpenAIClient(config);
    const messages = [
      { role: 'user', content: 'Say "Hello, OpenAI!" in a creative way.' }
    ];

    const response = await client.chat(messages, {
      temperature: 0.7
    });

    console.log('✅ 成功!');
    console.log('响应:', JSON.stringify(response, null, 2));
    return true;
  } catch (error) {
    console.error('❌ 失败:', error.message);
    return false;
  }
}

async function testToolCalling() {
  console.log('\n🧪 测试 2: 工具调用');
  console.log('─'.repeat(50));

  try {
    const { z } = await import('zod');
    const { tool } = await import('@openai/agents');

    const client = new OpenAIClient(config);

    // 定义一个简单的工具
    const getWeatherTool = tool({
      name: 'get_weather',
      description: 'Get the weather for a given city',
      parameters: z.object({
        city: z.string().describe('The name of the city')
      }),
      execute: async (input) => {
        return `The weather in ${input.city} is sunny and 25°C`;
      }
    });

    const messages = [
      { role: 'user', content: 'What is the weather in Tokyo?' }
    ];

    const response = await client.chatWithTools(
      messages,
      [getWeatherTool],
      { temperature: 0.7 }
    );

    console.log('✅ 成功!');
    console.log('响应:', JSON.stringify(response, null, 2));
    return true;
  } catch (error) {
    console.error('❌ 失败:', error.message);
    console.error('详情:', error.cause || error);
    return false;
  }
}

async function testStreaming() {
  console.log('\n🧪 测试 3: 流式响应');
  console.log('─'.repeat(50));

  try {
    const client = new OpenAIClient(config);
    const messages = [
      { role: 'user', content: 'Count from 1 to 10 slowly.' }
    ];

    console.log('流式输出: ');
    await client.chatStream(messages, { temperature: 0.7 }, (chunk) => {
      if (chunk.type === 'text') {
        process.stdout.write(chunk.delta);
      }
    });

    console.log('\n✅ 成功!');
    return true;
  } catch (error) {
    console.error('\n❌ 失败:', error.message);
    console.error('详情:', error.cause || error);
    return false;
  }
}

async function main() {
  console.log('🚀 OpenAI 客户端测试');
  console.log('═'.repeat(50));

  // 检查 API key
  if (!process.env.CLOSER_OPENAI_API_KEY || process.env.CLOSER_OPENAI_API_KEY === 'sk-test') {
    console.warn('\n⚠️  警告: 未设置 CLOSER_OPENAI_API_KEY 环境变量');
    console.warn('请设置: export CLOSER_OPENAI_API_KEY=your_key');
    console.warn('继续运行测试（预期会失败）...\n');
  }

  const results = {
    basicChat: false,
    toolCalling: false,
    streaming: false
  };

  // 运行测试
  results.basicChat = await testBasicChat();
  results.toolCalling = await testToolCalling();
  results.streaming = await testStreaming();

  // 总结
  console.log('\n' + '═'.repeat(50));
  console.log('📊 测试结果总结:');
  console.log('─'.repeat(50));
  console.log(`基础对话: ${results.basicChat ? '✅ 通过' : '❌ 失败'}`);
  console.log(`工具调用: ${results.toolCalling ? '✅ 通过' : '❌ 失败'}`);
  console.log(`流式响应: ${results.streaming ? '✅ 通过' : '❌ 失败'}`);

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;

  console.log(`\n总计: ${passed}/${total} 测试通过`);

  if (passed === total) {
    console.log('🎉 所有测试通过!');
  } else {
    console.log('⚠️  部分测试失败，请检查配置和网络连接');
  }
}

main().catch(console.error);
