#!/usr/bin/env node
/**
 * Workflow 测试：空目录中创建文件
 *
 * 测试 writeFile 工具自动创建父目录的功能
 */

import { runWorkflow } from '../../src/utils/workflow.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 工作流定义
const workflow = {
  name: 'empty-dir-creation',
  description: '在空目录中创建多文件故事，验证自动目录创建',
  rounds: [
    {
      name: '执行任务',
      prompt: `写一个50000字的玄幻故事，要求：
1. 故事名称为《天道诀》
2. 分为10个章节，每章约5000字
3. 每个章节保存为独立的文件，格式为 chapters/chapter-01.txt 到 chapters/chapter-10.txt
4. 创建一个 README.md 文件，包含故事简介和章节列表

请立即开始创建文件，不要只是描述你要做什么。`,
      expected: '创建 chapters 目录和10个章节文件，以及 README.md'
    },
    {
      name: '验证结果',
      prompt: `请验证以下内容：
1. 使用 bash 工具运行：ls -la 检查目录结构
2. 使用 bash 工具运行：ls -la chapters/ 检查章节目录
3. 使用 readFile 工具读取 README.md 内容
4. 使用 bash 工具运行：find chapters -name "*.txt" | wc -l 统计文件数量
5. 使用 readFile 读取 chapters/chapter-01.txt 的前20行

如果所有验证都通过（目录存在、10个文件存在、README存在、文件有内容），请回复：WORKFLOW TEST AS EXPECTED
如果有任何问题，请详细说明。`,
      expected: '验证所有文件和目录都正确创建',
      acceptPhrase: 'WORKFLOW TEST AS EXPECTED'
    }
  ]
};

// 运行工作流测试
async function main() {
  console.log('🧪 Workflow 测试：空目录中创建文件\n');
  console.log('═'.repeat(60));

  // 创建临时测试目录
  const testDir = path.join(__dirname, 'temp-test-dir');
  try {
    await fs.mkdir(testDir, { recursive: true });
  } catch (error) {
    // 忽略已存在错误
  }

  console.log(`\n📁 测试目录: ${testDir}\n`);

  try {
    const result = await runWorkflow(workflow, [], {
      workflow: 'empty-dir-creation',
      dir: testDir
    });

    console.log('\n' + '═'.repeat(60));
    console.log('\n📊 测试结果:\n');

    if (result.success) {
      console.log('✅ 测试通过！');
      console.log(`\n验证结果: ${result.validation}`);
    } else {
      console.log('❌ 测试失败！');
      console.log(`\n原因: ${result.error}`);
      if (result.details) {
        console.log(`\n详情: ${result.details}`);
      }
    }

    // 显示创建的文件
    console.log('\n📁 创建的文件:');
    const files = await fs.readdir(testDir, { recursive: true });
    for (const file of files) {
      const filePath = path.join(testDir, file);
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        console.log(`  ✓ ${file} (${stat.size} bytes)`);
      } else if (stat.isDirectory()) {
        console.log(`  📂 ${file}/`);
      }
    }

    // 清理测试目录
    console.log('\n🧹 清理测试目录...');
    await fs.rm(testDir, { recursive: true, force: true });
    console.log('✅ 清理完成');

  } catch (error) {
    console.error('\n❌ 测试执行失败:', error.message);
    console.error(error.stack);

    // 保留测试目录以便调试
    console.log(`\n⚠️  测试目录保留在: ${testDir}`);
    console.log('   手动清理命令: rm -rf', testDir);
  }
}

// 运行测试
main().catch(console.error);
