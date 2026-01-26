#!/usr/bin/env node
/**
 * 测试潜在技能提示功能
 */

import { getConfig } from './src/config.js';
import { getSystemPrompt } from './src/prompt-builder.js';
import { createSkillRegistry } from './src/skills/index.js';

async function testPotentialSkills() {
  console.log('========================================');
  console.log('测试潜在技能提示功能');
  console.log('========================================\n');

  try {
    // 1. 加载配置
    console.log('1️⃣  加载配置...');
    const config = await getConfig();
    console.log('   ✅ 配置加载成功\n');

    // 2. 创建技能注册表
    console.log('2️⃣  创建技能注册表...');
    const registry = createSkillRegistry({
      globalDir: `${process.env.HOME}/.closer-code/skills`,
      projectDir: '.closer-code/skills'
    });
    await registry.initialize();
    console.log('   ✅ 注册表初始化成功\n');

    // 3. 获取潜在可用技能
    console.log('3️⃣  获取潜在可用技能...');
    const potentialSkills = await registry.discover();
    console.log(`   发现 ${potentialSkills.length} 个潜在技能:`);
    potentialSkills.forEach(s => {
      console.log(`   - ${s.name}: ${s.description.substring(0, 60)}...`);
    });
    console.log();

    // 4. 构建系统提示（包含潜在技能）
    console.log('4️⃣  构建系统提示...');
    const systemPrompt = await getSystemPrompt(config, false, [], potentialSkills);
    console.log('   ✅ 系统提示构建成功\n');

    // 5. 检查系统提示中的潜在技能部分
    console.log('5️⃣  验证系统提示内容...');

    if (systemPrompt.includes('## 📚 Available Skills (Potential)')) {
      console.log('   ✅ 找到"潜在可用技能"部分');
    } else {
      console.log('   ❌ 未找到"潜在可用技能"部分');
      return;
    }

    // 检查每个技能是否在系统提示中
    let allSkillsFound = true;
    for (const skill of potentialSkills) {
      if (systemPrompt.includes(`**${skill.name}**`)) {
        console.log(`   ✅ 找到技能: ${skill.name}`);
      } else {
        console.log(`   ❌ 未找到技能: ${skill.name}`);
        allSkillsFound = false;
      }

      if (systemPrompt.includes(skill.description)) {
        console.log(`   ✅ 找到描述: ${skill.name}`);
      } else {
        console.log(`   ❌ 未找到描述: ${skill.name}`);
        allSkillsFound = false;
      }
    }

    if (!allSkillsFound) {
      console.log('\n   ❌ 部分技能未在系统提示中找到');
      return;
    }

    console.log();
    console.log('6️⃣  系统提示中的"潜在可用技能"部分:');
    console.log('---');

    // 提取并显示潜在技能部分
    const potentialSkillsStart = systemPrompt.indexOf('## 📚 Available Skills (Potential)');
    const potentialSkillsEnd = systemPrompt.indexOf('## 📍 Current Context', potentialSkillsStart);

    if (potentialSkillsStart !== -1 && potentialSkillsEnd !== -1) {
      const potentialSkillsSection = systemPrompt.substring(potentialSkillsStart, potentialSkillsEnd);
      console.log(potentialSkillsSection);
    } else {
      console.log('   ❌ 无法提取潜在技能部分');
      return;
    }

    console.log('---\n');

    console.log('========================================');
    console.log('✅ 所有测试通过！');
    console.log('========================================\n');

    console.log('📊 总结:');
    console.log(`- ✅ 发现 ${potentialSkills.length} 个潜在技能`);
    console.log('- ✅ 所有技能都包含在系统提示中');
    console.log('- ✅ AI 现在可以在启动时知道有哪些技能可用');
    console.log('- ✅ AI 可以根据用户需求直接调用 skillLoad');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
testPotentialSkills();
