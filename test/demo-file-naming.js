#!/usr/bin/env node
/**
 * 演示改进后的文件命名
 * 
 * 文件名格式: {md5-hash}-{directory-name}.json
 * 例如: 06aecb89a562f1a6038cca327538315e-project-beta.json
 */

import {
  loadHistory,
  saveHistory,
  listHistory,
  clearHistory
} from '../src/config.js';
import path from 'path';
import crypto from 'crypto';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

console.log('\n' + '='.repeat(70));
log('  改进后的文件命名演示', 'cyan');
console.log('='.repeat(70) + '\n');

// 测试项目路径
const testProjects = [
  path.join(process.cwd(), 'test-projects', 'my-awesome-app'),
  path.join(process.cwd(), 'test-projects', 'api-server'),
  path.join(process.cwd(), 'test-projects', 'frontend-v2'),
  path.join(process.cwd(), 'test-projects', 'data.processor'),
];

log('📝 创建测试项目历史...\n', 'yellow');

// 为每个项目创建一些历史
testProjects.forEach((projectPath, i) => {
  const history = [
    { role: 'user', content: `项目 ${i + 1} 的第一条消息` },
    { role: 'assistant', content: `收到！正在处理项目 ${i + 1}` }
  ];
  saveHistory(history, projectPath);
  log(`✓ 已创建: ${path.basename(projectPath)}`, 'green');
});

log('\n📂 历史文件命名示例:\n', 'cyan');

// 列出所有项目
const projects = listHistory();

projects.forEach((p, i) => {
  const dirName = path.basename(p.projectPath);
  log(`${i + 1}. 项目: ${dirName}`, 'blue');
  log(`   完整路径: ${p.projectPath}`, 'reset');
  log(`   消息数: ${p.messageCount}`, 'green');
  log(`   最后更新: ${new Date(p.lastUpdated).toLocaleString('zh-CN')}`, 'reset');
  
  // 显示对应的文件名
  const hash = crypto.createHash('md5').update(p.projectPath).digest('hex');
  const cleanDirName = dirName.replace(/[^a-zA-Z0-9_-]/g, '_');
  log(`   文件名: ${hash}-${cleanDirName}.json`, 'magenta');
  log('', 'reset');
});

console.log('='.repeat(70));
log('✨ 文件命名优势:', 'cyan');
console.log('='.repeat(70));
log('1. 哈希值前缀 - 确保文件名唯一性', 'green');
log('2. 目录名后缀 - 便于人类识别和查阅', 'green');
log('3. 特殊字符处理 - 避免文件系统问题', 'green');
log('4. 示例对比:', 'yellow');
log('   ❌ 旧: 06aecb89a562f1a6038cca327538315e.json', 'red');
log('   ✅ 新: 06aecb89a562f1a6038cca327538315e-my-awesome-app.json', 'green');
console.log('='.repeat(70) + '\n');

// 清理测试数据
log('🧹 清理测试数据...\n', 'yellow');
testProjects.forEach(projectPath => {
  clearHistory(projectPath);
});

log('✓ 清理完成', 'green');
log('\n演示结束！\n', 'cyan');
