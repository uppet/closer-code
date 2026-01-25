/**
 * 测试 bashResult 工具
 */

import { bashTool, bashResultTool } from './src/tools.js';
import { bashResultCache } from './src/bash-result-cache.js';
import { setToolExecutorContext } from './src/tools.js';
import { getConfig } from './src/config.js';

async function testBashResult() {
  console.log('=== 测试 bashResult 工具 ===');

  // 设置工具上下文
  const config = getConfig();
  setToolExecutorContext(config);

  try {
    // 第 1 步：执行一个会产生大输出的命令
    console.log('\n第 1 步：执行 ls -R /usr/bin');
    
    const result1 = await bashTool.run({ command: 'ls -R /usr/bin' });
    const parsed1 = JSON.parse(result1);
    
    console.log('结果：');
    console.log('  success:', parsed1.success);
    console.log('  truncated:', parsed1.truncated);
    console.log('  result_id:', parsed1.result_id);
    console.log('  totalLines:', parsed1.totalLines);
    console.log('  totalSize:', parsed1.totalSize, 'bytes');
    console.log('  stdout length:', parsed1.stdout.split('\n').length, 'lines');
    
    if (!parsed1.result_id) {
      console.log('\n输出不够大，尝试另一个命令...');
      
      // 尝试一个更大的命令
      console.log('\n第 1b 步：执行 find /usr -type f | head -1000');
      const result1b = await bashTool.run({ command: 'find /usr -type f 2>/dev/null | head -1000' });
      const parsed1b = JSON.parse(result1b);
      
      console.log('结果：');
      console.log('  success:', parsed1b.success);
      console.log('  truncated:', parsed1b.truncated);
      console.log('  result_id:', parsed1b.result_id);
      console.log('  totalLines:', parsed1b.totalLines);
      
      if (!parsed1b.result_id) {
        console.log('\n仍然没有 result_id，测试终止');
        return;
      }
      
      var result_id = parsed1b.result_id;
      var totalLines = parsed1b.totalLines;
    } else {
      var result_id = parsed1.result_id;
      var totalLines = parsed1.totalLines;
    }
    
    // 第 2 步：测试 head 模式
    console.log('\n第 2 步：测试 head 模式');
    const result2 = await bashResultTool.run({
      result_id: result_id,
      action: 'head',
      lines: 50
    });
    const parsed2 = JSON.parse(result2);
    console.log('结果：');
    console.log('  success:', parsed2.success);
    console.log('  action:', parsed2.action);
    console.log('  lines:', parsed2.lines);
    console.log('  totalLines:', parsed2.totalLines);
    console.log('  stdout length:', parsed2.stdout.split('\n').length, 'lines');
    
    // 第 3 步：测试 tail 模式
    console.log('\n第 3 步：测试 tail 模式');
    const result3 = await bashResultTool.run({
      result_id: result_id,
      action: 'tail',
      lines: 50
    });
    const parsed3 = JSON.parse(result3);
    console.log('结果：');
    console.log('  success:', parsed3.success);
    console.log('  action:', parsed3.action);
    console.log('  lines:', parsed3.lines);
    console.log('  totalLines:', parsed3.totalLines);
    console.log('  stdout length:', parsed3.stdout.split('\n').length, 'lines');
    
    // 第 4 步：测试 lineRange 模式
    console.log('\n第 4 步：测试 lineRange 模式（第 100-200 行）');
    const result4 = await bashResultTool.run({
      result_id: result_id,
      action: 'lineRange',
      startLine: 100,
      endLine: 200
    });
    const parsed4 = JSON.parse(result4);
    console.log('结果：');
    console.log('  success:', parsed4.success);
    console.log('  action:', parsed4.action);
    console.log('  startLine:', parsed4.startLine);
    console.log('  endLine:', parsed4.endLine);
    console.log('  lineCount:', parsed4.lineCount);
    console.log('  totalLines:', parsed4.totalLines);
    console.log('  stdout length:', parsed4.stdout.split('\n').length, 'lines');
    
    // 第 5 步：测试 grep 模式
    console.log('\n第 5 步：测试 grep 模式（搜索 .so）');
    const result5 = await bashResultTool.run({
      result_id: result_id,
      action: 'grep',
      pattern: '\\.so$'
    });
    const parsed5 = JSON.parse(result5);
    console.log('结果：');
    console.log('  success:', parsed5.success);
    console.log('  action:', parsed5.action);
    console.log('  pattern:', parsed5.pattern);
    console.log('  matchCount:', parsed5.matchCount);
    console.log('  stdout length:', parsed5.stdout.split('\n').length, 'lines');
    
    // 第 6 步：测试 full 模式
    console.log('\n第 6 步：测试 full 模式');
    const result6 = await bashResultTool.run({
      result_id: result_id,
      action: 'full'
    });
    const parsed6 = JSON.parse(result6);
    console.log('结果：');
    console.log('  success:', parsed6.success);
    console.log('  action:', parsed6.action);
    console.log('  stdout length:', parsed6.stdout.split('\n').length, 'lines');
    console.log('  stderr length:', parsed6.stderr.split('\n').length, 'lines');
    
    // 第 7 步：测试错误处理（无效的 result_id）
    console.log('\n第 7 步：测试错误处理（无效的 result_id）');
    const result7 = await bashResultTool.run({
      result_id: 'res_invalid_123',
      action: 'head'
    });
    const parsed7 = JSON.parse(result7);
    console.log('结果：');
    console.log('  success:', parsed7.success);
    console.log('  error:', parsed7.error);
    console.log('  expired:', parsed7.expired);
    console.log('  hint:', parsed7.hint);
    console.log('  suggestion:', parsed7.suggestion);
    
    // 第 8 步：测试缓存统计
    console.log('\n第 8 步：缓存统计');
    const stats = bashResultCache.getStats();
    console.log('缓存统计：');
    console.log('  当前缓存数量:', stats.size);
    console.log('  最大缓存数量:', stats.maxSize);
    console.log('  过期时间:', (stats.maxAge / 60000).toFixed(1), '分钟');
    
    console.log('\n所有测试完成！');
    
  } catch (error) {
    console.error('\n测试失败：', error.message);
    console.error(error.stack);
  }
}

testBashResult().catch(console.error);
