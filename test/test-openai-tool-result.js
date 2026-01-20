/**
 * 测试 OpenAI 工具结果消息格式修复
 *
 * 这个测试验证修复后的 _convertMessageFormat 方法
 * 是否能正确处理 tool_result 类型的消息
 */

import { OpenAIClient } from '../src/ai-client-openai.js';

// 创建测试客户端
const client = new OpenAIClient({
  apiKey: 'test-key',
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-4o'
});

console.log('🧪 测试 OpenAI 工具结果消息格式转换\n');

// 测试用例
const testCases = [
  {
    name: '测试1: 简单的 tool_result 消息',
    input: {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'call_123',
          content: 'Command executed successfully'
        }
      ]
    },
    expected: {
      role: 'tool',
      tool_call_id: 'call_123',
      content: 'Command executed successfully'
    }
  },
  {
    name: '测试2: tool_result 带对象内容',
    input: {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'call_456',
          content: { success: true, data: 'test' }
        }
      ]
    },
    expected: {
      role: 'tool',
      tool_call_id: 'call_456',
      content: '{"success":true,"data":"test"}'
    }
  },
  {
    name: '测试3: tool_use 消息（助手调用工具）',
    input: {
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: 'call_789',
          name: 'bash',
          input: { command: 'ls -la' }
        }
      ]
    },
    expected: {
      role: 'assistant',
      tool_calls: [
        {
          id: 'call_789',
          type: 'function',
          function: {
            name: 'bash',
            arguments: '{"command":"ls -la"}'
          }
        }
      ]
    }
  },
  {
    name: '测试4: 普通文本消息',
    input: {
      role: 'user',
      content: 'Hello, how are you?'
    },
    expected: {
      role: 'user',
      content: 'Hello, how are you?'
    }
  },
  {
    name: '测试5: 混合文本和 tool_use',
    input: {
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'I will execute the command:'
        },
        {
          type: 'tool_use',
          id: 'call_abc',
          name: 'bash',
          input: { command: 'pwd' }
        }
      ]
    },
    expected: {
      role: 'assistant',
      tool_calls: [
        {
          id: 'call_abc',
          type: 'function',
          function: {
            name: 'bash',
            arguments: '{"command":"pwd"}'
          }
        }
      ],
      content: 'I will execute the command:'
    }
  }
];

// 运行测试
let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  console.log(`📋 ${testCase.name}`);
  console.log(`   输入:`, JSON.stringify(testCase.input, null, 2));

  try {
    const result = client._convertMessageFormat(testCase.input);
    console.log(`   输出:`, JSON.stringify(result, null, 2));

    // 验证结果
    let isCorrect = true;

    if (testCase.expected.role !== result.role) {
      console.log(`   ❌ role 不匹配: 期望 "${testCase.expected.role}", 实际 "${result.role}"`);
      isCorrect = false;
    }

    if (testCase.expected.tool_call_id && testCase.expected.tool_call_id !== result.tool_call_id) {
      console.log(`   ❌ tool_call_id 不匹配`);
      isCorrect = false;
    }

    if (testCase.expected.content && testCase.expected.content !== result.content) {
      console.log(`   ❌ content 不匹配`);
      isCorrect = false;
    }

    if (testCase.expected.tool_calls) {
      if (!result.tool_calls || result.tool_calls.length !== testCase.expected.tool_calls.length) {
        console.log(`   ❌ tool_calls 数量不匹配`);
        isCorrect = false;
      } else {
        for (let i = 0; i < testCase.expected.tool_calls.length; i++) {
          const expected = testCase.expected.tool_calls[i];
          const actual = result.tool_calls[i];
          if (expected.id !== actual.id || expected.function.name !== actual.function.name) {
            console.log(`   ❌ tool_call[${i}] 不匹配`);
            isCorrect = false;
          }
        }
      }
    }

    if (isCorrect) {
      console.log(`   ✅ 通过\n`);
      passed++;
    } else {
      console.log(`   ❌ 失败\n`);
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ 错误: ${error.message}\n`);
    failed++;
  }
}

// 输出测试结果
console.log('='.repeat(60));
console.log(`📊 测试结果: ${passed} 通过, ${failed} 失败`);
console.log('='.repeat(60));

if (failed === 0) {
  console.log('\n✅ 所有测试通过！工具结果消息格式修复成功。');
  process.exit(0);
} else {
  console.log('\n❌ 部分测试失败，请检查代码。');
  process.exit(1);
}
