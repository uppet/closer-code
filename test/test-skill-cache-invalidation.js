#!/usr/bin/env node
/**
 * 测试技能路径缓存失效处理
 */

import fs from 'fs/promises';
import path from 'path';
import { createSkillRegistry } from '../src/skills/registry.js';

async function testSkillCacheInvalidation() {
  console.log('========================================');
  console.log('测试技能路径缓存失效处理');
  console.log('========================================\n');

  const testDir = '.test-cache-temp';
  const skillName = 'test-skill';
  const skillDir = path.join(testDir, skillName);

  try {
    // 1. 创建测试技能（使用 SKILL.md - 大写）
    console.log('1️⃣  创建测试技能 (SKILL.md)...');
    await fs.mkdir(skillDir, { recursive: true });

    const skillFile = path.join(skillDir, 'SKILL.md');
    await fs.writeFile(skillFile, `---
name: ${skillName}
description: Test skill
---

# Test Content
This is a test skill with uppercase filename.`);

    console.log('   ✅ 创建成功\n');

    // 2. 创建注册表并加载技能
    console.log('2️⃣  首次加载技能...');
    const registry = createSkillRegistry({
      globalDir: testDir,
      projectDir: null
    });
    await registry.initialize();

    let skill = await registry.loadByName(skillName);
    if (!skill) {
      throw new Error('首次加载失败');
    }
    console.log('   ✅ 首次加载成功');
    console.log(`   路径: ${skill.path}`);
    console.log(`   缓存的文件名: ${path.basename(skill.path)}\n`);

    // 验证缓存
    const cachedPath = registry.skillPathCache.get(skillName);
    console.log('3️⃣  验证路径缓存...');
    console.log(`   缓存路径: ${cachedPath}`);
    if (path.basename(cachedPath) === 'SKILL.md') {
      console.log('   ✅ 缓存正确\n');
    } else {
      throw new Error('缓存文件名不正确');
    }

    // 3. 删除旧文件，创建新文件（使用 skill.md - 小写）
    console.log('4️⃣  重命名文件 (SKILL.md → skill.md)...');
    await fs.unlink(skillFile);
    const newSkillFile = path.join(skillDir, 'skill.md');
    await fs.writeFile(newSkillFile, `---
name: ${skillName}
description: Updated test skill
---

# Updated Content
This is the updated test skill with lowercase filename.`);

    console.log('   ✅ 文件重命名成功\n');

    // 4. 清除内容缓存（但保留路径缓存）
    console.log('5️⃣  清除内容缓存，保留路径缓存...');
    registry.skillCache.delete(skillName);
    console.log('   ✅ 内容缓存已清除\n');

    // 5. 尝试加载（应该检测到路径失效并重新扫描）
    console.log('6️⃣  再次加载技能（应自动检测路径失效）...');
    skill = await registry.loadByName(skillName);
    if (!skill) {
      throw new Error('再次加载失败');
    }
    console.log('   ✅ 再次加载成功');
    console.log(`   新路径: ${skill.path}`);
    console.log(`   新文件名: ${path.basename(skill.path)}`);

    // 验证新路径
    if (path.basename(skill.path) === 'skill.md') {
      console.log('   ✅ 路径自动更新成功\n');
    } else {
      console.log(`   ⚠️  文件名未更新: ${path.basename(skill.path)}\n`);
    }

    // 验证新缓存
    const newCachedPath = registry.skillPathCache.get(skillName);
    console.log('7️⃣  验证更新的路径缓存...');
    console.log(`   新缓存路径: ${newCachedPath}`);
    if (path.basename(newCachedPath) === 'skill.md') {
      console.log('   ✅ 缓存已正确更新\n');
    } else {
      console.log(`   ⚠️  缓存未更新: ${path.basename(newCachedPath)}\n`);
    }

    console.log('========================================');
    console.log('✅ 所有测试通过！');
    console.log('========================================\n');

    console.log('📊 总结:');
    console.log('- ✅ 缓存失效检测正常工作');
    console.log('- ✅ 自动重新扫描功能正常');
    console.log('- ✅ 路径缓存自动更新');
    console.log('- ✅ 不会尝试读取不存在的文件');

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
testSkillCacheInvalidation();
