/**
 * 测试 docs-tidy 技能
 */

import { loadConfig } from './src/config.js';
import { createSkillRegistry } from './src/skills/registry.js';
import { createConversationState } from './src/skills/conversation-state.js';
import path from 'path';
import os from 'os';

async function testDocsTidySkill() {
  console.log('========================================');
  console.log('测试 docs-tidy 技能');
  console.log('========================================\n');

  const config = loadConfig();

  // 创建技能注册表
  const registry = createSkillRegistry({
    globalDir: path.join(os.homedir(), '.closer-code/skills'),
    projectDir: path.join(process.cwd(), '.closer-code/skills'),
    residentSkills: []
  });

  await registry.initialize();

  // 发现技能
  console.log('📚 发现技能...');
  const skills = await registry.discover();
  
  console.log(`✓ 发现 ${skills.length} 个技能:\n`);
  skills.forEach(skill => {
    console.log(`  - ${skill.name}`);
    console.log(`    ${skill.description.substring(0, 60)}...`);
    console.log();
  });

  // 检查 docs-tidy 技能
  const docsTidySkill = skills.find(s => s.name === 'docs-tidy');
  
  if (docsTidySkill) {
    console.log('✅ docs-tidy 技能已成功创建！\n');
    
    // 加载完整技能
    const fullSkill = await registry.loadByName('docs-tidy');
    
    console.log('📄 技能详情:');
    console.log(`  名称: ${fullSkill.name}`);
    console.log(`  描述: ${fullSkill.description}`);
    console.log(`  内容长度: ${fullSkill.content.length} 字符`);
    console.log(`  路径: ${fullSkill.path}`);
    console.log();
    
    // 显示技能内容预览
    console.log('📖 内容预览:');
    console.log(fullSkill.content.substring(0, 500) + '...\n');
    
    // 创建会话状态并添加技能
    const state = createConversationState();
    state.addSkill(fullSkill);
    
    console.log('✅ 技能已添加到会话状态\n');
    console.log('========================================');
    console.log('✅ 测试完成！技能已就绪。');
    console.log('========================================\n');
    
    console.log('🚀 使用方法:');
    console.log('  1. 启动 Closer Code: node src/closer-cli.jsx');
    console.log('  2. 说: "请加载 docs-tidy 技能"');
    console.log('  3. 说: "请使用 docs-tidy 技能分析 docs 目录"\n');
    
  } else {
    console.log('❌ 未找到 docs-tidy 技能');
    console.log('请检查文件是否存在于: .closer-code/skills/docs-tidy/skill.md');
  }
}

testDocsTidySkill().catch(console.error);
