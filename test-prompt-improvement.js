#!/usr/bin/env node
/**
 * 测试系统提示词改进效果
 * 验证 AI 是否优先使用工具而不是 bash 命令
 */

import { createConversation } from './src/conversation.js';
import { getConfig } from './src/config.js';

console.log('=== 测试系统提示词改进 ===\n');

async function test() {
  const cfg = getConfig();
  const conv = await createConversation(cfg);

  // 测试场景
  const testCases = [
    {
      name: '读取文件前 10 行',
      prompt: '请读取 src/tools.js 文件的前 10 行内容',
      expectTool: 'readFileLines',
      avoidCommand: 'head -10'
    },
    {
      name: '读取文件特定行范围',
      prompt: '请读取 src/conversation.js 文件的第 50-60 行',
      expectTool: 'readFileLines',
      avoidCommand: 'sed -e'
    },
    {
      name: '读取文件末尾',
      prompt: '请查看 package.json 文件的最后 5 行',
      expectTool: 'readFileTail',
      avoidCommand: 'tail -5'
    },
    {
      name: '读取完整小文件',
      prompt: '请读取 README.md 文件的内容',
      expectTool: 'readFile',
      avoidCommand: 'cat'
    }
  ];

  console.log('测试场景：\n');
  testCases.forEach((tc, i) => {
    console.log(`${i + 1}. ${tc.name}`);
    console.log(`   期望工具: ${tc.expectTool}`);
    console.log(`   避免命令: ${tc.avoidCommand}\n`);
  });

  console.log('⚠️  注意：这只是演示测试框架');
  console.log('实际测试需要运行 AI 并检查工具调用\n');

  // 显示当前系统提示词的相关部分
  const { getSystemPrompt } = await import('./src/prompt-builder.js');
  const systemPrompt = await getSystemPrompt(cfg);

  console.log('=== 当前系统提示词（工具使用部分）===\n');
  const toolSection = systemPrompt.match(/## Tool Usage[\s\S]*?\n\n/);
  if (toolSection) {
    console.log(toolSection[0]);
  }
}

test().catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});
