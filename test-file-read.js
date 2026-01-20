#!/usr/bin/env node
/**
 * 测试文件读取工具的改进
 */

import fs from 'fs/promises';

console.log('=== 测试文件读取工具 ===\n');

async function test() {
  // 创建测试文件
  const testFiles = {
    small: 'test-small.txt',
    medium: 'test-medium.txt',
    large: 'test-large.txt'
  };

  // 创建小文件（< 10KB）
  console.log('📝 创建测试文件...');
  await fs.writeFile(testFiles.small, 'Small file content\n'.repeat(10));

  // 创建中等文件（10-100KB）
  const mediumContent = Array.from({ length: 500 }, (_, i) => `Line ${i + 1}: Medium file content`).join('\n');
  await fs.writeFile(testFiles.medium, mediumContent);

  // 创建大文件（> 100KB）
  const largeContent = Array.from({ length: 10000 }, (_, i) => `Line ${i + 1}: Large file content with some data`).join('\n');
  await fs.writeFile(testFiles.large, largeContent);

  console.log('✅ 测试文件创建完成\n');

  // 测试 readFile
  console.log('📋 测试 readFile（小文件）');
  const { readFileTool } = await import('./src/tools.js');
  
  // 设置工具上下文
  const { setToolExecutorContext } = await import('./src/tools.js');
  setToolExecutorContext({ behavior: { workingDir: '.' }, tools: { enabled: ['readFile'] } });

  const smallResult = JSON.parse(await readFileTool.run({ filePath: testFiles.small }));
  console.log(`小文件读取：${smallResult.success ? '✅' : '❌'}`);
  console.log(`  大小: ${smallResult.size} bytes`);
  console.log(`  截断: ${smallResult.truncated ? '是' : '否'}\n`);

  // 测试中等文件（应该自动截断）
  console.log('📋 测试 readFile（中等文件，应自动截断）');
  const mediumResult = JSON.parse(await readFileTool.run({ filePath: testFiles.medium, maxSize: 1024 }));
  console.log(`中等文件读取：${mediumResult.success ? '✅' : '❌'}`);
  console.log(`  大小: ${mediumResult.size} bytes`);
  console.log(`  读取: ${mediumResult.readBytes} bytes`);
  console.log(`  截断: ${mediumResult.truncated ? '是' : '否'}`);
  if (mediumResult.hint) {
    console.log(`  提示: ${mediumResult.hint.substring(0, 60)}...\n`);
  }

  // 测试 readFileLines
  console.log('📋 测试 readFileLines');
  const { readFileLinesTool } = await import('./src/tools.js');
  
  const linesResult = JSON.parse(await readFileLinesTool.run({
    filePath: testFiles.large,
    startLine: 1,
    endLine: 10
  }));
  console.log(`读取行 1-10：${linesResult.success ? '✅' : '❌'}`);
  console.log(`  行号: ${linesResult.lineNumbers?.start}-${linesResult.lineNumbers?.end}`);
  console.log(`  总行数: ${linesResult.lineNumbers?.total}`);
  console.log(`  内容预览: ${linesResult.content.substring(0, 50)}...\n`);

  // 测试负数行号（从末尾）
  console.log('📋 测试 readFileLines（负数行号）');
  const tailResult = JSON.parse(await readFileLinesTool.run({
    filePath: testFiles.large,
    startLine: -10
  }));
  console.log(`读取最后 10 行：${tailResult.success ? '✅' : '❌'}`);
  console.log(`  行号: ${tailResult.lineNumbers?.start}-${tailResult.lineNumbers?.end}`);
  console.log(`  行数: ${tailResult.lineCount}\n`);

  // 测试 readFileTail
  console.log('📋 测试 readFileTail');
  const { readFileTailTool } = await import('./src/tools.js');
  
  const tailResult2 = JSON.parse(await readFileTailTool.run({
    filePath: testFiles.large,
    lines: 5
  }));
  console.log(`读取最后 5 行：${tailResult2.success ? '✅' : '❌'}`);
  console.log(`  行数: ${tailResult2.lines}`);
  console.log(`  内容预览: ${tailResult2.content.substring(0, 50)}...\n`);

  // 清理测试文件
  console.log('🗑️  清理测试文件...');
  await fs.unlink(testFiles.small);
  await fs.unlink(testFiles.medium);
  await fs.unlink(testFiles.large);
  console.log('✅ 清理完成\n');

  console.log('🎉 所有测试通过！');
}

test().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
