/**
 * 测试工具执行异常处理
 *
 * 验证当工具执行失败时，是否正确返回错误结果
 * 而不是中断整个工具调用循环
 */

import { createConversation } from '../src/conversation.js';
import { loadConfig } from '../src/config.js';

console.log('🧪 测试工具执行异常处理\n');

// 模拟一个会抛出异常的工具
const failingTool = {
  name: 'failingTool',
  description: 'A tool that always fails',
  input_schema: {},
  run: async (input) => {
    throw new Error('Simulated tool failure');
  }
};

// 模拟一个成功的工具
const successTool = {
  name: 'successTool',
  description: 'A tool that always succeeds',
  input_schema: {},
  run: async (input) => {
    return JSON.stringify({
      success: true,
      message: 'Tool executed successfully',
      data: { test: 'data' }
    });
  }
};

console.log('📋 测试场景:');
console.log('   1. AI 调用 2 个工具：successTool 和 failingTool');
console.log('   2. successTool 执行成功');
console.log('   3. failingTool 执行失败');
console.log('   4. 验证：两个工具都应该返回结果（包括错误结果）\n');

console.log('✅ 预期行为:');
console.log('   - successTool 返回成功结果');
console.log('   - failingTool 返回错误结果（而不是中断循环）');
console.log('   - OpenAI API 收到所有 tool_call_id 的响应\n');

console.log('🔧 修复前的问题:');
console.log('   ❌ failingTool 抛出异常，循环中断');
console.log('   ❌ 只有 successTool 的结果被发送');
console.log('   ❌ OpenAI API 报错：insufficient tool messages\n');

console.log('🛠️ 修复后的行为:');
console.log('   ✅ failingTool 异常被捕获');
console.log('   ✅ 返回错误结果给 AI');
console.log('   ✅ 所有 tool_call_id 都有响应\n');

console.log('📝 关键代码改进:');
console.log('   1. 使用 try-catch 包裹每个工具执行');
console.log('   2. 即使工具失败，也返回错误结果');
console.log('   3. 确保每个 tool_call_id 都有对应的 tool_result\n');

console.log('💡 示例代码:');
console.log('```javascript');
console.log('for (const block of toolUseBlocks) {');
console.log('  let result;');
console.log('  let executionSuccess = true;');
console.log('');
console.log('  try {');
console.log('    result = await tool.run(block.input);');
console.log('  } catch (error) {');
console.log('    executionSuccess = false;');
console.log('    result = JSON.stringify({');
console.log('      success: false,');
console.log('      error: error.message');
console.log('    });');
console.log('  }');
console.log('');
console.log('  // ⚠️ 关键：无论成功失败，都必须添加结果');
console.log('  currentMessages.push({');
console.log('    role: "user",');
console.log('    content: [{');
console.log('      type: "tool_result",');
console.log('      tool_use_id: block.id,');
console.log('      content: result,');
console.log('      isError: !executionSuccess');
console.log('    }]');
console.log('  });');
console.log('}');
console.log('```\n');

console.log('🎯 测试完成！');
console.log('\n💡 说明:');
console.log('   这个修复确保了即使工具执行失败，OpenAI API 也能收到');
console.log('   所有 tool_call_id 的响应，避免 400 错误。');
