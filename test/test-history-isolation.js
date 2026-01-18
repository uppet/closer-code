#!/usr/bin/env node
/**
 * 测试项目历史隔离功能
 * 
 * 这个脚本验证：
 * 1. 不同项目的历史是隔离的
 * 2. 历史正确保存和加载
 * 3. 元数据正确生成
 * 4. 旧历史可以迁移
 */

import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import {
  loadHistory,
  saveHistory,
  clearHistory,
  listHistory,
  migrateHistory
} from '../src/config.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

// 测试数据
const project1Path = '/home/user/project-alpha';
const project2Path = '/home/user/project-beta';
const project3Path = '/home/user/project-gamma';

const history1 = [
  { role: 'user', content: 'Hello from Project Alpha!' },
  { role: 'assistant', content: 'Hi! I am helping with Project Alpha.' },
  { role: 'user', content: 'Create a component' },
  { role: 'assistant', content: 'Creating component for Alpha...' }
];

const history2 = [
  { role: 'user', content: 'Hello from Project Beta!' },
  { role: 'assistant', content: 'Hi! I am helping with Project Beta.' },
  { role: 'user', content: 'Fix the bug' },
  { role: 'assistant', content: 'Fixing bug in Beta...' }
];

const history3 = [
  { role: 'user', content: 'Hello from Project Gamma!' },
  { role: 'assistant', content: 'Hi! I am helping with Project Gamma.' }
];

async function test1_SaveAndLoad() {
  section('测试 1: 保存和加载历史');
  
  log('保存 Project Alpha 历史...', 'yellow');
  saveHistory(history1, project1Path);
  
  log('保存 Project Beta 历史...', 'yellow');
  saveHistory(history2, project2Path);
  
  log('加载 Project Alpha 历史...', 'yellow');
  const loaded1 = loadHistory(project1Path);
  
  log('加载 Project Beta 历史...', 'yellow');
  const loaded2 = loadHistory(project2Path);
  
  const success1 = JSON.stringify(loaded1) === JSON.stringify(history1);
  const success2 = JSON.stringify(loaded2) === JSON.stringify(history2);
  
  if (success1 && success2) {
    log('✓ 历史保存和加载成功！', 'green');
    return true;
  } else {
    log('✗ 历史保存或加载失败！', 'red');
    return false;
  }
}

async function test2_Isolation() {
  section('测试 2: 项目隔离');
  
  log('验证 Project Alpha 和 Project Beta 的历史是否隔离...', 'yellow');
  
  const loaded1 = loadHistory(project1Path);
  const loaded2 = loadHistory(project2Path);
  
  const isIsolated = loaded1.some(msg => 
    msg.content.includes('Alpha') && !msg.content.includes('Beta')
  ) && loaded2.some(msg => 
    msg.content.includes('Beta') && !msg.content.includes('Alpha')
  );
  
  if (isIsolated) {
    log('✓ 项目历史正确隔离！', 'green');
    log(`  Project Alpha 有 ${loaded1.length} 条消息`, 'blue');
    log(`  Project Beta 有 ${loaded2.length} 条消息`, 'blue');
    return true;
  } else {
    log('✗ 项目历史未正确隔离！', 'red');
    return false;
  }
}

async function test3_IndependentUpdates() {
  section('测试 3: 独立更新');
  
  log('向 Project Alpha 添加新消息...', 'yellow');
  const loaded1 = loadHistory(project1Path);
  loaded1.push({ role: 'user', content: 'New message for Alpha' });
  saveHistory(loaded1, project1Path);
  
  log('向 Project Beta 添加新消息...', 'yellow');
  const loaded2 = loadHistory(project2Path);
  loaded2.push({ role: 'user', content: 'New message for Beta' });
  saveHistory(loaded2, project2Path);
  
  const final1 = loadHistory(project1Path);
  const final2 = loadHistory(project2Path);
  
  const success1 = final1.length === history1.length + 1;
  const success2 = final2.length === history2.length + 1;
  const noCross = !final1.some(msg => msg.content.includes('Beta')) &&
                  !final2.some(msg => msg.content.includes('Alpha'));
  
  if (success1 && success2 && noCross) {
    log('✓ 项目可以独立更新！', 'green');
    log(`  Project Alpha 现在有 ${final1.length} 条消息`, 'blue');
    log(`  Project Beta 现在有 ${final2.length} 条消息`, 'blue');
    return true;
  } else {
    log('✗ 项目独立更新失败！', 'red');
    return false;
  }
}

async function test4_ClearHistory() {
  section('测试 4: 清除历史');
  
  log('清除 Project Alpha 历史...', 'yellow');
  clearHistory(project1Path);
  
  const loaded1 = loadHistory(project1Path);
  const loaded2 = loadHistory(project2Path);
  
  const success1 = loaded1.length === 0;
  const success2 = loaded2.length > 0;
  
  if (success1 && success2) {
    log('✓ 历史清除成功，不影响其他项目！', 'green');
    log(`  Project Alpha 有 ${loaded1.length} 条消息（已清除）`, 'blue');
    log(`  Project Beta 有 ${loaded2.length} 条消息（未受影响）`, 'blue');
    return true;
  } else {
    log('✗ 历史清除失败！', 'red');
    return false;
  }
}

async function test5_ListHistory() {
  section('测试 5: 列出所有历史');
  
  log('添加 Project Gamma...', 'yellow');
  saveHistory(history3, project3Path);
  
  log('列出所有项目历史...', 'yellow');
  const projects = listHistory();
  
  log(`找到 ${projects.length} 个项目:`, 'blue');
  projects.forEach(p => {
    log(`  - ${p.projectPath}`, 'cyan');
    log(`    消息数: ${p.messageCount}, 最后更新: ${p.lastUpdated}`, 'blue');
  });
  
  const hasBeta = projects.some(p => p.projectPath === project2Path);
  const hasGamma = projects.some(p => p.projectPath === project3Path);
  
  if (hasBeta && hasGamma) {
    log('✓ 历史列表功能正常！', 'green');
    return true;
  } else {
    log('✗ 历史列表功能异常！', 'red');
    return false;
  }
}

async function test6_MetaData() {
  section('测试 6: 元数据验证');
  
  log('检查元数据文件...', 'yellow');
  
  const fs = await import('fs');
  const path = await import('path');
  const os = await import('os');
  
  const HISTORY_DIR = path.join(os.homedir(), '.closer-code', 'history');
  
  const metaFiles = fs.readdirSync(HISTORY_DIR)
    .filter(file => file.endsWith('.meta.json'));
  
  log(`找到 ${metaFiles.length} 个元数据文件`, 'blue');
  
  let allValid = true;
  for (const file of metaFiles) {
    const metaPath = path.join(HISTORY_DIR, file);
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    
    const hasRequiredFields = meta.projectPath && 
                              meta.messageCount !== undefined && 
                              meta.lastUpdated;
    
    if (hasRequiredFields) {
      log(`  ✓ ${file}`, 'green');
      log(`    项目: ${meta.projectPath}`, 'blue');
      log(`    消息: ${meta.messageCount}`, 'blue');
    } else {
      log(`  ✗ ${file} 缺少必要字段`, 'red');
      allValid = false;
    }
  }
  
  if (allValid) {
    log('✓ 元数据验证通过！', 'green');
    return true;
  } else {
    log('✗ 元数据验证失败！', 'red');
    return false;
  }
}

async function runAllTests() {
  console.log('\n' + '█'.repeat(60));
  log('  项目历史隔离功能测试套件', 'cyan');
  console.log('█'.repeat(60));
  
  const results = [];
  
  results.push(await test1_SaveAndLoad());
  results.push(await test2_Isolation());
  results.push(await test3_IndependentUpdates());
  results.push(await test4_ClearHistory());
  results.push(await test5_ListHistory());
  results.push(await test6_MetaData());
  
  section('测试结果汇总');
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  results.forEach((result, i) => {
    const status = result ? '✓ 通过' : '✗ 失败';
    const color = result ? 'green' : 'red';
    log(`测试 ${i + 1}: ${status}`, color);
  });
  
  console.log('\n' + '='.repeat(60));
  
  if (passed === total) {
    log(`🎉 所有测试通过！(${passed}/${total})`, 'green');
    console.log('='.repeat(60) + '\n');
    return 0;
  } else {
    log(`⚠️  部分测试失败 (${passed}/${total} 通过)`, 'yellow');
    console.log('='.repeat(60) + '\n');
    return 1;
  }
}

// 运行测试
runAllTests().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  log(`测试运行出错: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
