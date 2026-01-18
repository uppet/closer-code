#!/usr/bin/env node
/**
 * 研究 thinking 内容的实际长度和结构
 */

import Anthropic from '@anthropic-ai/sdk';
import { loadConfig } from '../src/config.js';

async function testThinkingContent() {
  console.log('='.repeat(70));
  console.log('研究 Thinking 内容的实际结构');
  console.log('='.repeat(70));

  const config = await loadConfig();
  const apiKey = config.api?.anthropicApiKey;
  
  if (!apiKey) {
    console.error('❌ 未找到 API Key');
    return;
  }

  const client = new Anthropic({ apiKey });

  // 测试不同复杂度的任务和不同的 budget_tokens
  const testCases = [
    {
      name: '简单问题（budget: 1600）',
      budget: 1600,
      message: '2 + 2 = ?'
    },
    {
      name: '中等问题（budget: 1600）',
      budget: 1600,
      message: '解释一下什么是递归，并给出一个例子'
    },
    {
      name: '复杂问题（budget: 1600）',
      budget: 1600,
      message: '分析一下快速排序算法的时间复杂度，包括最好、最坏和平均情况'
    },
    {
      name: '复杂问题（budget: 20000）',
      budget: 20000,
      message: '分析一下快速排序算法的时间复杂度，包括最好、最坏和平均情况，并解释为什么在实际应用中它通常比其他O(n log n)算法更快'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`测试: ${testCase.name}`);
    console.log(`问题: ${testCase.message}`);
    console.log(`${'='.repeat(70)}`);

    try {
      const stream = client.messages.stream({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1000,
        messages: [{ role: 'user', content: testCase.message }],
        thinking: {
          type: 'enabled',
          budget_tokens: testCase.budget
        }
      });

      let thinkingContent = '';
      let thinkingLength = 0;
      let textContent = '';
      let signature = '';

      stream.on('thinking', (thinkingDelta, thinkingSnapshot) => {
        // thinkingDelta: 增量
        // thinkingSnapshot: 完整快照
        thinkingContent = thinkingSnapshot;
        thinkingLength = thinkingSnapshot.length;
        
        process.stdout.write('\r🤔 Thinking 长度: ' + thinkingLength);
      });

      stream.on('text', (textDelta) => {
        textContent += textDelta;
      });

      stream.on('signature', (sig) => {
        signature = sig;
      });

      const finalMessage = await stream.finalMessage();

      console.log('\n\n📊 结果统计:');
      console.log(`   Budget Tokens: ${testCase.budget}`);
      console.log(`   Thinking 长度: ${thinkingLength} 字符`);
      console.log(`   Thinking Token数 (估算): ~${Math.ceil(thinkingLength / 4)}`);
      console.log(`   文本长度: ${textContent.length} 字符`);
      console.log(`   有签名: ${signature ? '是' : '否'}`);

      // 显示thinking内容的前500字符
      console.log('\n📝 Thinking 内容预览 (前500字符):');
      console.log('─'.repeat(70));
      console.log(thinkingContent.substring(0, 500));
      if (thinkingContent.length > 500) {
        console.log('...\n(内容被截断)');
      }
      console.log('─'.repeat(70));

      // 显示完整thinking内容的统计
      const lines = thinkingContent.split('\n');
      console.log(`\n📈 Thinking 内容分析:`);
      console.log(`   总行数: ${lines.length}`);
      console.log(`   平均行长度: ${Math.ceil(thinkingLength / lines.length)} 字符`);
      
      // 分析thinking内容的结构
      const hasNumbering = /^\d+\./.test(thinkingContent);
      const hasBullets = /^[-*]/.test(thinkingContent);
      const hasHeaders = /^#+\s/.test(thinkingContent);
      
      console.log(`   包含编号列表: ${hasNumbering ? '是' : '否'}`);
      console.log(`   包含项目符号: ${hasBullets ? '是' : '否'}`);
      console.log(`   包含标题: ${hasHeaders ? '是' : '否'}`);

    } catch (error) {
      console.error(`\n❌ 错误: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('研究完成');
  console.log('='.repeat(70));
}

testThinkingContent().catch(console.error);
