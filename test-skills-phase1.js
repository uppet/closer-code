/**
 * Skills Phase 1 测试脚本
 *
 * 测试技能系统的核心功能
 */

import { loadConfig } from './src/config.js';
import {
  parseSkill,
  parseSkillFrontmatter,
  validateSkillFile
} from './src/skills/parser.js';
import {
  createSkillRegistry
} from './src/skills/registry.js';
import {
  createConversationState,
  buildSystemPromptWithSkills
} from './src/skills/conversation-state.js';
import {
  createSkillTools
} from './src/skills/tools.js';
import { setSkillTools } from './src/tools.js';
import path from 'path';
import os from 'os';

console.log('========================================');
console.log('Skills Phase 1 - Test Script');
console.log('========================================\n');

// 测试配置
async function testConfig() {
  console.log('📋 Testing configuration...');
  const config = loadConfig();

  console.log('  Skills enabled:', config.skills?.enabled ?? false);
  console.log('  Global directory:', config.skills?.directories?.global ?? 'not set');
  console.log('  Project directory:', config.skills?.directories?.project ?? 'not set');
  console.log('  Resident skills:', config.skills?.resident?.length ?? 0);

  if (!config.skills?.enabled) {
    console.warn('  ⚠️  Skills system is disabled in config!');
    return false;
  }

  console.log('  ✓ Configuration loaded\n');
  return true;
}

// 测试解析器
async function testParser() {
  console.log('📄 Testing parser...');
  const skillPath = path.join(os.homedir(), '.closer-code/skills/hello-world/skill.md');

  try {
    // 测试完整解析
    console.log('  Testing full parse...');
    const skill = await parseSkill(skillPath);
    console.log('  ✓ Full parse successful');
    console.log('    - Name:', skill.name);
    console.log('    - Description:', skill.description.substring(0, 50) + '...');
    console.log('    - Content length:', skill.content.length, 'chars');

    // 测试快速解析
    console.log('  Testing quick parse...');
    const frontmatter = await parseSkillFrontmatter(skillPath);
    console.log('  ✓ Quick parse successful');
    console.log('    - Name:', frontmatter.name);
    console.log('    - Description:', frontmatter.description.substring(0, 50) + '...');

    // 测试验证
    console.log('  Testing validation...');
    const isValid = await validateSkillFile(skillPath);
    console.log('  ✓ Validation:', isValid ? 'valid' : 'invalid');

    console.log('  ✓ Parser tests passed\n');
    return true;
  } catch (error) {
    console.error('  ✗ Parser test failed:', error.message);
    return false;
  }
}

// 测试注册表
async function testRegistry() {
  console.log('📚 Testing registry...');
  const config = loadConfig();

  try {
    // 创建注册表
    console.log('  Creating registry...');
    const registry = createSkillRegistry({
      globalDir: path.join(os.homedir(), '.closer-code/skills'),
      projectDir: path.join(process.cwd(), '.closer-code/skills'),
      residentSkills: config.skills?.resident || []
    });

    // 初始化
    console.log('  Initializing registry...');
    await registry.initialize();
    console.log('  ✓ Registry initialized');

    // 发现技能
    console.log('  Discovering skills...');
    const skills = await registry.discover();
    console.log('  ✓ Discovered', skills.length, 'skill(s)');
    skills.forEach(skill => {
      console.log('    -', skill.name, ':', skill.description.substring(0, 50) + '...');
    });

    // 加载技能
    if (skills.length > 0) {
      console.log('  Loading skill:', skills[0].name);
      const skill = await registry.loadByName(skills[0].name);
      if (skill) {
        console.log('  ✓ Skill loaded successfully');
        console.log('    - Content length:', skill.content.length, 'chars');
      } else {
        console.error('  ✗ Failed to load skill');
        return false;
      }
    }

    // 获取统计信息
    const stats = registry.getStats();
    console.log('  Registry stats:', JSON.stringify(stats, null, 2));

    console.log('  ✓ Registry tests passed\n');
    return registry;
  } catch (error) {
    console.error('  ✗ Registry test failed:', error.message);
    return false;
  }
}

// 测试会话状态
async function testConversationState(registry) {
  console.log('💬 Testing conversation state...');

  try {
    const state = createConversationState();

    // 加载技能
    console.log('  Loading skill into conversation...');
    const skill = await registry.loadByName('hello-world');
    if (skill) {
      state.addSkill(skill);
      console.log('  ✓ Skill added to conversation');

      // 检查状态
      console.log('  Active skills:', state.getActiveSkills().length);
      console.log('  Has skill:', state.hasSkill('hello-world'));

      // 获取摘要
      const summary = state.getSkillsSummary();
      console.log('  Skills summary:', JSON.stringify(summary, null, 2));

      // 构建 System Prompt
      console.log('  Building System Prompt with skills...');
      const basePrompt = 'You are a helpful assistant.';
      const enhancedPrompt = buildSystemPromptWithSkills(basePrompt, state.getActiveSkills());
      console.log('  ✓ System Prompt built');
      console.log('    - Base length:', basePrompt.length);
      console.log('    - Enhanced length:', enhancedPrompt.length);
      console.log('    - Added:', enhancedPrompt.length - basePrompt.length, 'chars');
    }

    console.log('  ✓ Conversation state tests passed\n');
    return state;
  } catch (error) {
    console.error('  ✗ Conversation state test failed:', error.message);
    return false;
  }
}

// 测试工具
async function testTools(registry, state) {
  console.log('🔧 Testing tools...');

  try {
    // 创建工具
    console.log('  Creating skill tools...');
    const tools = createSkillTools(registry, state);
    console.log('  ✓ Created', tools.length, 'tool(s)');

    // 注册工具
    console.log('  Registering tools...');
    setSkillTools(tools);
    console.log('  ✓ Tools registered');

    // 测试工具定义
    console.log('  Tool definitions:');
    tools.forEach(tool => {
      console.log('    -', tool.name);
    });

    console.log('  ✓ Tools tests passed\n');
    return true;
  } catch (error) {
    console.error('  ✗ Tools test failed:', error.message);
    return false;
  }
}

// 主测试函数
async function main() {
  const results = {
    config: false,
    parser: false,
    registry: false,
    conversationState: false,
    tools: false
  };

  try {
    // 测试配置
    results.config = await testConfig();
    if (!results.config) {
      console.error('❌ Configuration test failed. Aborting.');
      process.exit(1);
    }

    // 测试解析器
    results.parser = await testParser();
    if (!results.parser) {
      console.error('❌ Parser test failed. Aborting.');
      process.exit(1);
    }

    // 测试注册表
    const registry = await testRegistry();
    results.registry = !!registry;
    if (!results.registry) {
      console.error('❌ Registry test failed. Aborting.');
      process.exit(1);
    }

    // 测试会话状态
    const state = await testConversationState(registry);
    results.conversationState = !!state;
    if (!results.conversationState) {
      console.error('❌ Conversation state test failed. Aborting.');
      process.exit(1);
    }

    // 测试工具
    results.tools = await testTools(registry, state);
    if (!results.tools) {
      console.error('❌ Tools test failed. Aborting.');
      process.exit(1);
    }

    // 总结
    console.log('========================================');
    console.log('✅ All tests passed!');
    console.log('========================================\n');
    console.log('Test Results:');
    console.log('  - Config:', results.config ? '✓' : '✗');
    console.log('  - Parser:', results.parser ? '✓' : '✗');
    console.log('  - Registry:', results.registry ? '✓' : '✗');
    console.log('  - Conversation State:', results.conversationState ? '✓' : '✗');
    console.log('  - Tools:', results.tools ? '✓' : '✗');
    console.log();

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
main();
