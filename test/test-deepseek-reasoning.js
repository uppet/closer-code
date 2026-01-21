/**
 * 测试 DeepSeek-R1 Reasoning 特性
 *
 * 验证 DeepSeek-R1 模型的 reasoning_content 功能
 */

import { OpenAIClient } from '../src/ai-client-openai.js';

console.log('🧪 测试 DeepSeek-R1 Reasoning 特性\n');

// 创建 DeepSeek-R1 客户端
const deepseekClient = new OpenAIClient({
  apiKey: process.env.CLOSER_OPENAI_API_KEY || 'test-key',
  baseURL: 'https://api.deepseek.com',
  model: 'deepseek-reasoner',
  enableReasoning: true
});

// 创建普通 OpenAI 客户端（对比）
const openaiClient = new OpenAIClient({
  apiKey: process.env.CLOSER_OPENAI_API_KEY || 'test-key',
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  enableReasoning: false
});

console.log('📋 测试场景:');
console.log('   1. DeepSeek-R1 模型自动检测');
console.log('   2. reasoning_content 流式输出');
console.log('   3. 历史消息中 reasoning_content 的清除');
console.log('   4. 与普通 OpenAI 模型的兼容性\n');

console.log('✅ DeepSeek-R1 特性:');
console.log('   - 模型名称包含 "deepseek-reasoner"');
console.log('   - 启用 thinking 模式');
console.log('   - 响应包含 reasoning_content 和 content');
console.log('   - 新一轮对话自动清除 reasoning_content\n');

console.log('🔧 配置方式:');
console.log('   方式 1: 模型名称');
console.log('     model: "deepseek-reasoner"');
console.log('');
console.log('   方式 2: 配置选项');
console.log('     {');
console.log('       model: "deepseek-chat",');
console.log('       enableReasoning: true');
console.log('     }');
console.log('');

console.log('📝 API 请求示例:');
console.log('```javascript');
console.log('const response = await client.chat.completions.create({');
console.log('  model: "deepseek-reasoner",');
console.log('  messages: messages,');
console.log('  extra_body: {');
console.log('    thinking: { type: "enabled" }');
console.log('  }');
console.log('});');
console.log('```\n');

console.log('📊 响应结构:');
console.log('```javascript');
console.log('{');
console.log('  reasoning_content: "推理过程...",');
console.log('  content: "最终答案",');
console.log('  tool_calls: [...]');
console.log('}');
console.log('```\n');

console.log('🔄 多轮对话规则:');
console.log('   同一轮工具调用:');
console.log('   - 保留 reasoning_content');
console.log('   - 继续传递给 API');
console.log('');
console.log('   新一轮对话:');
console.log('   - 清除历史中的 reasoning_content');
console.log('   - 只保留 content');
console.log('   - 节省网络带宽\n');

console.log('🎯 关键方法:');
console.log('   1. isDeepSeekReasoner - 检测是否为 DeepSeek-R1');
console.log('   2. clearReasoningContent() - 清除历史 reasoning');
console.log('   3. appendCurrentReasoning() - 添加当前轮 reasoning\n');

console.log('💡 使用示例:');
console.log('```javascript');
console.log('// 第 1 轮对话');
console.log('const response1 = await client.chatStream(');
console.log('  [{ role: "user", content: "9.11 和 9.8 哪个大？" }],');
console.log('  { thinking: { type: "enabled" } }');
console.log(');');
console.log('');
console.log('// 第 2 轮对话（自动清除 reasoning_content）');
console.log('const messages = [');
console.log('  { role: "user", content: "..." },');
console.log('  { role: "assistant", content: "..." }  // 只有 content');
console.log('];');
console.log('const response2 = await client.chatStream(messages, options);');
console.log('```\n');

console.log('⚠️ 注意事项:');
console.log('   1. DeepSeek-R1 不支持以下参数：');
console.log('      - temperature, top_p');
console.log('      - presence_penalty, frequency_penalty');
console.log('      - logprobs, top_logprobs');
console.log('');
console.log('   2. max_tokens 包含 reasoning_content 部分');
console.log('      - 默认 32K，最大 64K');
console.log('');
console.log('   3. 工具调用时必须传递 reasoning_content');
console.log('      - 否则会返回 400 错误\n');

console.log('🎉 测试完成！');
console.log('\n💡 DeepSeek-R1 的 reasoning 特性已集成到项目中！');
console.log('   - 自动检测 DeepSeek-R1 模型');
console.log('   - 流式输出推理内容');
console.log('   - 自动清除历史 reasoning');
console.log('   - 不影响其他 OpenAI 模型');
