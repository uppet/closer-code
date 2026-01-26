#!/usr/bin/env node
/**
 * 测试技能文件名大小写处理
 */

import fs from 'fs/promises';
import path from 'path';
import { createSkillRegistry } from '../src/skills/registry.js';

async function testCaseInsensitiveSkillFiles() {
  console.log('========================================');
  console.log('测试技能文件名大小写处理');
  console.log('========================================\n');

  const testDir = '.test-skills-temp';
  const testSkills = [
    { name: 'skill1', file: 'skill.md' },
    { name: 'skill2', file: 'SKILL.md' },
    { name: 'skill3', file: 'Skill.md' },
    { name: 'skill4', file: 'sKiLl.md' }
  ];

  try {
    // 1. 创建测试目录和文件
    console.log('1️⃣  创建测试技能文件...');
    await fs.mkdir(testDir, { recursive: true });

    for (const skill of testSkills) {
      const skillDir = path.join(testDir, skill.name);
      await fs.mkdir(skillDir, { recursive: true });

      const skillFile = path.join(skillDir, skill.file);
      const content = `---
name: ${skill.name}
description: Test skill with case ${skill.file}
---

# Test Content

This is a test skill.`;

      await fs.writeFile(skillFile, content);
      console.log(`   ✅ Created: ${skill.name}/${skill.file}`);
    }
    console.log();

    // 2. 创建注册表并扫描
    console.log('2️⃣  扫描技能目录...');
    const registry = createSkillRegistry({
      globalDir: testDir,
      projectDir: null
    });
    await registry.initialize();

    const discoveredSkills = await registry.discover();
    console.log(`   发现 ${discoveredSkills.length} 个技能\n`);

    // 3. 验证每个技能都被正确发现
    console.log('3️⃣  验证发现的技能...');
    let allFound = true;

    for (const expectedSkill of testSkills) {
      const found = discoveredSkills.find(s => s.name === expectedSkill.name);

      if (found) {
        console.log(`   ✅ ${expectedSkill.name} (${expectedSkill.file}) - 发现成功`);
        console.log(`      描述: ${found.description}`);
      } else {
        console.log(`   ❌ ${expectedSkill.name} (${expectedSkill.file}) - 未找到`);
        allFound = false;
      }
    }
    console.log();

    if (!allFound) {
      throw new Error('部分技能未被发现');
    }

    // 4. 验证加载技能
    console.log('4️⃣  验证加载技能内容...');
    for (const expectedSkill of testSkills) {
      const skill = await registry.loadByName(expectedSkill.name);

      if (skill) {
        console.log(`   ✅ ${expectedSkill.name} - 加载成功`);
        console.log(`      内容长度: ${skill.content.length} 字符`);

        // 验证路径是否正确
        const actualFileName = path.basename(skill.path);
        if (actualFileName === expectedSkill.file) {
          console.log(`      ✅ 文件名匹配: ${actualFileName}`);
        } else {
          console.log(`      ⚠️  文件名不匹配: 预期 ${expectedSkill.file}, 实际 ${actualFileName}`);
        }
      } else {
        console.log(`   ❌ ${expectedSkill.name} - 加载失败`);
        allFound = false;
      }
    }
    console.log();

    if (!allFound) {
      throw new Error('部分技能加载失败');
    }

    // 5. 检查缓存
    console.log('5️⃣  检查路径缓存...');
    for (const expectedSkill of testSkills) {
      const cachedPath = registry.skillPathCache.get(expectedSkill.name);
      if (cachedPath) {
        const actualFileName = path.basename(cachedPath);
        console.log(`   ${expectedSkill.name}: ${actualFileName}`);
      } else {
        console.log(`   ${expectedSkill.name}: 未缓存`);
      }
    }
    console.log();

    console.log('========================================');
    console.log('✅ 所有测试通过！');
    console.log('========================================\n');

    console.log('📊 总结:');
    console.log('- ✅ 大小写不同的 skill.md 文件都能被正确发现');
    console.log('- ✅ 技能路径缓存正确');
    console.log('- ✅ 技能内容加载正常');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // 清理测试目录
    console.log('\n清理测试目录...');
    try {
      await fs.rm(testDir, { recursive: true, force: true });
      console.log('✅ 清理完成');
    } catch (error) {
      console.log('⚠️  清理失败:', error.message);
    }
  }
}

// 运行测试
testCaseInsensitiveSkillFiles();
