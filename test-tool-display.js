#!/usr/bin/env node
/**
 * 测试工具执行双行显示功能
 */

import { generateToolSummary } from './src/tools.js';

console.log('=== 测试工具执行双行显示 ===\n');

// 测试用例
const testCases = [
  {
    name: 'Bash 命令',
    tool: 'bash',
    input: { command: 'npm run build:main --minify' },
    result: { success: true, exitCode: 0 }
  },
  {
    name: 'Bash 命令失败',
    tool: 'bash',
    input: { command: 'invalid-command' },
    result: { success: false, error: 'command not found' }
  },
  {
    name: '读取小文件',
    tool: 'readFile',
    input: { filePath: '/path/to/package.json' },
    result: { success: true, size: 1024 }
  },
  {
    name: '读取大文件（截断）',
    tool: 'readFile',
    input: { filePath: '/path/to/large-file.js' },
    result: { success: true, size: 1024000, truncated: true }
  },
  {
    name: '写入文件',
    tool: 'writeFile',
    input: { filePath: '/path/to/new-file.js' },
    result: { success: true, size: 2048 }
  },
  {
    name: '编辑文件',
    tool: 'editFile',
    input: { filePath: '/path/to/app.js' },
    result: { success: true, replacements: 3 }
  },
  {
    name: '区域编辑',
    tool: 'regionConstrainedEdit',
    input: { filePath: '/path/to/app.js' },
    result: { success: true, replacements: 1, region: { begin: 10, end: 20 } }
  },
  {
    name: '搜索文件',
    tool: 'searchFiles',
    input: { pattern: '**/*.js' },
    result: { success: true, count: 42 }
  },
  {
    name: '列出目录',
    tool: 'listFiles',
    input: { dirPath: '/src' },
    result: { success: true, files: [{ name: 'app.js' }, { name: 'utils.js' }] }
  }
];

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  console.log(`\n📋 ${testCase.name}`);
  console.log(`工具: ${testCase.tool}`);

  try {
    const { summary, detailInfo } = generateToolSummary(
      testCase.tool,
      testCase.input,
      testCase.result
    );

    console.log(`\n第一行（摘要）:`);
    console.log(`  ${summary}`);
    console.log(`\n第二行（详细信息）:`);
    console.log(`  ${detailInfo}`);

    // 验证返回值
    if (!summary || typeof summary !== 'string') {
      console.log(`\n❌ 失败：summary 无效`);
      failed++;
      continue;
    }

    if (!detailInfo || typeof detailInfo !== 'string') {
      console.log(`\n❌ 失败：detailInfo 无效`);
      failed++;
      continue;
    }

    // 验证特定工具的详细信息
    if (testCase.tool === 'bash') {
      if (!detailInfo.includes(testCase.input.command.substring(0, 20))) {
        console.log(`\n⚠️  警告：bash 命令可能被截断`);
      }
    }

    console.log(`\n✅ 通过`);
    passed++;
  } catch (error) {
    console.log(`\n❌ 失败：${error.message}`);
    failed++;
  }
}

// 总结
console.log('\n' + '='.repeat(60));
console.log(`\n测试结果：`);
console.log(`✅ 通过: ${passed}/${testCases.length}`);
console.log(`❌ 失败: ${failed}/${testCases.length}`);

if (failed === 0) {
  console.log('\n🎉 所有测试通过！\n');
  process.exit(0);
} else {
  console.log('\n⚠️  部分测试失败\n');
  process.exit(1);
}
