#!/usr/bin/env node
/**
 * 测试全局 cloco.md 配置功能
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createConversation } from '../src/conversation.js';
import { loadConfig } from '../src/config.js';

async function testGlobalCloco() {
  console.log('='.repeat(70));
  console.log('测试全局 cloco.md 配置功能');
  console.log('='.repeat(70));

  // 1. 检查全局配置文件是否存在
  const homeDir = os.homedir();
  const globalClocoPath = path.join(homeDir, '.closer-code', 'cloco.md');

  console.log('\n1️⃣ 检查全局配置文件');
  console.log(`   路径: ${globalClocoPath}`);

  try {
    const globalContent = await fs.readFile(globalClocoPath, 'utf-8');
    console.log(`   ✅ 全局配置文件存在 (${globalContent.length} 字符)`);
    console.log(`   📄 内容预览:\n${globalContent.split('\n').slice(0, 5).join('\n')}...`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('   ⚠️  全局配置文件不存在（这是正常的）');
    } else {
      console.log(`   ❌ 读取失败: ${error.message}`);
    }
  }

  // 2. 检查项目配置文件
  const projectClocoPath = path.join(process.cwd(), 'cloco.md');

  console.log('\n2️⃣ 检查项目配置文件');
  console.log(`   路径: ${projectClocoPath}`);

  try {
    const projectContent = await fs.readFile(projectClocoPath, 'utf-8');
    console.log(`   ✅ 项目配置文件存在 (${projectContent.length} 字符)`);
    console.log(`   📄 内容预览:\n${projectContent.split('\n').slice(0, 5).join('\n')}...`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('   ⚠️  项目配置文件不存在（这是正常的）');
    } else {
      console.log(`   ❌ 读取失败: ${error.message}`);
    }
  }

  // 3. 测试配置加载
  console.log('\n3️⃣ 测试配置加载');

  try {
    const config = await loadConfig();
    console.log('   ✅ 配置加载成功');
    console.log(`   📋 工作目录: ${config.behavior.workingDir}`);
  } catch (error) {
    console.log(`   ❌ 配置加载失败: ${error.message}`);
    return;
  }

  // 4. 测试对话初始化
  console.log('\n4️⃣ 测试对话初始化');

  try {
    const conversation = await createConversation(await loadConfig(), false);
    console.log('   ✅ 对话初始化成功');

    // 检查系统提示词
    const systemPrompt = conversation.systemPrompt;
    console.log(`   📝 系统提示词长度: ${systemPrompt.length} 字符`);

    // 检查是否包含全局配置
    if (systemPrompt.includes('Global Behavior Guidelines')) {
      console.log('   ✅ 系统提示词包含全局行为规范');
    } else {
      console.log('   ℹ️  系统提示词未包含全局行为规范（可能文件不存在）');
    }

    // 检查是否包含项目配置
    if (systemPrompt.includes('Project Behavior Guidelines')) {
      console.log('   ✅ 系统提示词包含项目行为规范');
    } else {
      console.log('   ℹ️  系统提示词未包含项目行为规范（可能文件不存在）');
    }

    // 显示系统提示词的关键部分
    console.log('\n5️⃣ 系统提示词关键部分:');
    const lines = systemPrompt.split('\n');
    let inGuidelines = false;
    let guidelineCount = 0;

    for (let i = 0; i < lines.length && guidelineCount < 10; i++) {
      const line = lines[i];
      if (line.includes('Behavior Guidelines')) {
        inGuidelines = true;
      }
      if (inGuidelines) {
        console.log(`   ${line}`);
        guidelineCount++;
        if (line.trim() === '' && guidelineCount > 3) {
          break;
        }
      }
    }

  } catch (error) {
    console.log(`   ❌ 对话初始化失败: ${error.message}`);
    console.log(`   📋 错误堆栈: ${error.stack}`);
    return;
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ 测试完成');
  console.log('='.repeat(70));
}

// 运行测试
testGlobalCloco().catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});
