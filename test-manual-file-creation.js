#!/usr/bin/env node
/**
 * 手动测试：在空目录中创建文件
 *
 * 验证 writeFile 工具自动创建父目录的功能
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { getConfig } from './src/config.js';
import { createConversation } from './src/conversation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testEmptyDirCreation() {
  console.log('🧪 测试：在空目录中创建文件\n');
  console.log('═'.repeat(60));

  // 创建临时测试目录
  const testDir = path.join(__dirname, 'temp-test-creation');
  try {
    await fs.mkdir(testDir, { recursive: true });
    console.log(`✅ 创建测试目录: ${testDir}\n`);
  } catch (error) {
    console.log('⚠️  测试目录已存在\n');
  }

  try {
    // 修改配置的工作目录
    const config = getConfig();
    config.behavior.workingDir = testDir;

    console.log('📝 任务: 创建一个多章节的玄幻故事\n');
    console.log('要求：');
    console.log('  1. 故事名称：《天道诀》');
    console.log('  2. 分为3个章节（简化测试）');
    console.log('  3. 章节保存为 chapters/chapter-01.txt 到 chapters/chapter-03.txt');
    console.log('  4. 创建 README.md 文件');
    console.log('\n' + '─'.repeat(60) + '\n');

    // 创建对话
    const conversation = await createConversation(config, false);

    // 发送任务
    const prompt = `写一个玄幻故事，要求：
1. 故事名称为《天道诀》
2. 分为3个章节（简化测试）
3. 每个章节保存为独立的文件，格式为 chapters/chapter-01.txt 到 chapters/chapter-03.txt
4. 创建一个 README.md 文件，包含故事简介和章节列表

请立即使用 writeFile 工具创建这些文件。`;

    console.log('🤖 AI 正在处理...\n');

    const response = await conversation.sendMessage(prompt, (progress) => {
      if (progress.type === 'tool_start') {
        console.log(`⚡ 执行工具: ${progress.tool}`);
      } else if (progress.type === 'tool_complete') {
        const result = progress.result;
        if (result.success) {
          console.log(`   ✅ 成功: ${result.path || 'OK'}`);
        } else {
          console.log(`   ❌ 失败: ${result.error || 'Unknown error'}`);
        }
      }
    });

    console.log('\n' + '─'.repeat(60));
    console.log('\n📄 AI 响应:\n');
    console.log(response.content);
    console.log('\n' + '═'.repeat(60));

    // 验证结果
    console.log('\n🔍 验证结果:\n');

    // 检查目录结构
    const testDirExists = await fs.access(testDir).then(() => true).catch(() => false);
    console.log(`  ${testDirExists ? '✅' : '❌'} 测试目录存在`);

    // 检查 chapters 目录
    const chaptersDir = path.join(testDir, 'chapters');
    const chaptersDirExists = await fs.access(chaptersDir).then(() => true).catch(() => false);
    console.log(`  ${chaptersDirExists ? '✅' : '❌'} chapters/ 目录被自动创建`);

    // 检查文件
    const expectedFiles = [
      'README.md',
      'chapters/chapter-01.txt',
      'chapters/chapter-02.txt',
      'chapters/chapter-03.txt'
    ];

    for (const file of expectedFiles) {
      const filePath = path.join(testDir, file);
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      if (exists) {
        const stat = await fs.stat(filePath);
        console.log(`  ✅ ${file} (${stat.size} bytes)`);
      } else {
        console.log(`  ❌ ${file} (不存在)`);
      }
    }

    console.log('\n' + '═'.repeat(60));

    // 读取 README.md 内容
    const readmePath = path.join(testDir, 'README.md');
    try {
      const readmeContent = await fs.readFile(readmePath, 'utf-8');
      console.log('\n📖 README.md 内容预览:\n');
      console.log(readmeContent.split('\n').slice(0, 10).join('\n'));
      console.log('\n... (内容已截断)\n');
    } catch (error) {
      console.log('\n⚠️  无法读取 README.md\n');
    }

    // 读取第一章内容
    const chapter1Path = path.join(testDir, 'chapters/chapter-01.txt');
    try {
      const chapter1Content = await fs.readFile(chapter1Path, 'utf-8');
      console.log('📖 第一章内容预览:\n');
      console.log(chapter1Content.split('\n').slice(0, 15).join('\n'));
      console.log('\n... (内容已截断)\n');
    } catch (error) {
      console.log('\n⚠️  无法读取 chapter-01.txt\n');
    }

    // 询问是否清理
    console.log('═'.repeat(60));
    console.log('\n✅ 测试完成！');
    console.log(`\n测试目录: ${testDir}`);
    console.log('是否保留测试目录以便检查？(按 Ctrl+C 取消清理)\n');

    // 延迟清理
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🧹 清理测试目录...');
    await fs.rm(testDir, { recursive: true, force: true });
    console.log('✅ 清理完成\n');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
    console.log(`\n⚠️  测试目录保留在: ${testDir}`);
  }
}

// 运行测试
testEmptyDirCreation().catch(console.error);
