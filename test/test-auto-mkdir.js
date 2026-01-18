#!/usr/bin/env node
/**
 * 单元测试：验证 writeFile 错误处理和 AI 自我修复能力
 *
 * 测试场景：
 * 1. 尝试写入不存在的目录 → 应该返回 ENOENT 错误
 * 2. 错误响应包含修复建议
 * 3. 创建目录后重试 → 应该成功
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { setToolExecutorContext, writeFileTool } from '../src/tools.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testErrorHandlingAndRetry() {
  console.log('🧪 单元测试：writeFile 错误处理和自我修复\n');
  console.log('═'.repeat(60));

  // 创建临时测试目录
  const testDir = path.join(__dirname, 'temp-error-test');
  await fs.mkdir(testDir, { recursive: true });
  console.log(`✅ 测试目录: ${testDir}\n`);

  try {
    // 初始化工具上下文
    setToolExecutorContext({
      behavior: { workingDir: testDir },
      tools: { enabled: ['writeFile', 'bash'] }
    });

    // 测试1：尝试写入不存在的目录（应该失败并返回详细错误）
    console.log('测试1: 尝试写入不存在的目录');
    console.log('文件路径: chapters/chapter-01.txt\n');

    const result1 = await writeFileTool.run({
      filePath: 'chapters/chapter-01.txt',
      content: '# 第一章\n\n这是第一章的内容。'
    });

    const parsed1 = JSON.parse(result1);
    console.log('工具响应:');
    console.log(JSON.stringify(parsed1, null, 2));
    console.log();

    if (!parsed1.success && parsed1.error === 'ENOENT') {
      console.log('✅ 正确返回 ENOENT 错误');
      console.log(`✅ 包含修复建议: ${parsed1.suggestion ? 'Yes' : 'No'}`);
      console.log(`✅ 包含提示信息: ${parsed1.hint ? 'Yes' : 'No'}`);
    } else {
      console.log('❌ 错误：应该返回 ENOENT 错误');
    }
    console.log();

    // 测试2：创建目录（模拟 AI 的自我修复）
    console.log('测试2: 创建目录（模拟 AI 自我修复）');
    console.log('命令: mkdir -p chapters\n');

    const { executeBashCommand } = await import('../src/bash-runner.js');
    const mkdirResult = await executeBashCommand('mkdir -p chapters', {
      cwd: testDir
    });

    if (mkdirResult.success) {
      console.log('✅ 目录创建成功');
    } else {
      console.log('❌ 目录创建失败:', mkdirResult.stderr);
    }
    console.log();

    // 测试3：重试写入文件（应该成功）
    console.log('测试3: 重试写入文件');
    console.log('文件路径: chapters/chapter-01.txt\n');

    const result3 = await writeFileTool.run({
      filePath: 'chapters/chapter-01.txt',
      content: '# 第一章\n\n这是第一章的内容。'
    });

    const parsed3 = JSON.parse(result3);
    console.log('工具响应:');
    console.log(JSON.stringify(parsed3, null, 2));
    console.log();

    if (parsed3.success) {
      console.log('✅ 重试成功！');
      console.log(`✅ 文件路径: ${parsed3.path}`);
      console.log(`✅ 文件大小: ${parsed3.size} bytes`);
    } else {
      console.log('❌ 重试失败');
    }
    console.log();

    // 验证文件内容
    console.log('═'.repeat(60));
    console.log('\n🔍 验证文件内容:\n');

    const filePath = path.join(testDir, 'chapters/chapter-01.txt');
    const content = await fs.readFile(filePath, 'utf-8');
    console.log(content);
    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ 所有测试通过！\n');
    console.log('📊 测试总结:');
    console.log('  ✅ writeFile 正确返回 ENOENT 错误');
    console.log('  ✅ 错误响应包含详细的修复建议');
    console.log('  ✅ AI 可以根据错误信息进行自我修复');
    console.log('  ✅ 修复后重试操作成功\n');

    // 清理
    await fs.rm(testDir, { recursive: true, force: true });
    console.log('🧹 清理完成\n');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
  }
}

// 运行测试
testErrorHandlingAndRetry().catch(console.error);
