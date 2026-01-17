#!/usr/bin/env node
/**
 * 历史管理命令
 * 
 * 用法:
 *   node history.js list              - 列出所有项目的历史
 *   node history.js show <path>       - 显示指定项目的历史
 *   node history.js clear <path>      - 清除指定项目的历史
 *   node history.js export <path>     - 导出指定项目的历史
 *   node history.js migrate           - 迁移旧的历史文件
 */

import {
  loadHistory,
  saveHistory,
  clearHistory,
  listHistory,
  migrateHistory
} from '../config.js';
import fs from 'fs';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatMessage(msg, index) {
  const role = msg.role || 'unknown';
  const content = msg.content || '';
  const preview = typeof content === 'string' 
    ? content.substring(0, 60) + (content.length > 60 ? '...' : '')
    : '[Non-text content]';
  
  return `${index + 1}. [${role}] ${preview}`;
}

async function cmdList() {
  log('\n📚 所有项目历史\n', 'cyan');
  
  const projects = listHistory();
  
  if (projects.length === 0) {
    log('  没有找到任何项目历史', 'yellow');
    return;
  }
  
  // 按最后更新时间排序
  projects.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
  
  projects.forEach((p, i) => {
    log(`\n${i + 1}. ${p.projectPath}`, 'green');
    log(`   消息数: ${p.messageCount}`, 'blue');
    log(`   最后更新: ${new Date(p.lastUpdated).toLocaleString('zh-CN')}`, 'blue');
  });
  
  log(`\n共 ${projects.length} 个项目\n`, 'cyan');
}

async function cmdShow(projectPath) {
  if (!projectPath) {
    log('错误: 请指定项目路径', 'red');
    log('用法: node history.js show <project-path>', 'yellow');
    return;
  }
  
  log(`\n📖 项目历史: ${projectPath}\n`, 'cyan');
  
  const history = loadHistory(projectPath);
  
  if (history.length === 0) {
    log('  该项目没有历史记录', 'yellow');
    return;
  }
  
  log(`共 ${history.length} 条消息:\n`, 'blue');
  
  history.forEach((msg, i) => {
    log(formatMessage(msg, i), 'reset');
  });
  
  log('\n', 'reset');
}

async function cmdClear(projectPath) {
  if (!projectPath) {
    log('错误: 请指定项目路径', 'red');
    log('用法: node history.js clear <project-path>', 'yellow');
    return;
  }
  
  log(`\n⚠️  确定要清除项目历史吗: ${projectPath}?`, 'yellow');
  log('这将删除该项目的所有对话历史，且无法恢复。\n', 'yellow');
  
  // 在实际使用中，这里可以添加确认逻辑
  clearHistory(projectPath);
  
  log('✓ 项目历史已清除\n', 'green');
}

async function cmdExport(projectPath) {
  if (!projectPath) {
    log('错误: 请指定项目路径', 'red');
    log('用法: node history.js export <project-path>', 'yellow');
    return;
  }
  
  const history = loadHistory(projectPath);
  
  if (history.length === 0) {
    log(`项目 ${projectPath} 没有历史记录`, 'yellow');
    return;
  }
  
  // 生成导出文件名
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const exportFile = `history-export-${timestamp}.json`;
  
  try {
    fs.writeFileSync(exportFile, JSON.stringify(history, null, 2));
    log(`\n✓ 历史已导出到: ${exportFile}`, 'green');
    log(`  共 ${history.length} 条消息\n`, 'blue');
  } catch (error) {
    log(`\n✗ 导出失败: ${error.message}\n`, 'red');
  }
}

async function cmdMigrate() {
  log('\n🔄 开始迁移旧的历史文件...\n', 'cyan');
  
  migrateHistory();
  
  log('\n✓ 迁移完成\n', 'green');
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const param = args[1];
  
  log('\n' + '='.repeat(60), 'cyan');
  log('  项目历史管理工具', 'cyan');
  log('='.repeat(60) + '\n', 'cyan');
  
  switch (command) {
    case 'list':
      await cmdList();
      break;
    case 'show':
      await cmdShow(param);
      break;
    case 'clear':
      await cmdClear(param);
      break;
    case 'export':
      await cmdExport(param);
      break;
    case 'migrate':
      await cmdMigrate();
      break;
    case 'help':
    case '--help':
    case '-h':
      log('用法: node history.js <command> [options]\n', 'cyan');
      log('命令:', 'yellow');
      log('  list              列出所有项目的历史', 'blue');
      log('  show <path>       显示指定项目的历史', 'blue');
      log('  clear <path>      清除指定项目的历史', 'blue');
      log('  export <path>     导出指定项目的历史', 'blue');
      log('  migrate           迁移旧的历史文件', 'blue');
      log('  help              显示此帮助信息\n', 'blue');
      break;
    default:
      log('错误: 未知命令', 'red');
      log('使用 "node history.js help" 查看帮助\n', 'yellow');
      process.exit(1);
  }
}

main().catch(error => {
  log(`\n✗ 错误: ${error.message}\n`, 'red');
  console.error(error);
  process.exit(1);
});
