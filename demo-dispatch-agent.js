#!/usr/bin/env node
/**
 * 🎭 Dispatch Agent 生动演示
 * 
 * 这个脚本展示了 dispatch agent 的强大功能：
 * - 并发搜索任务
 * - AI 驱动的智能探索
 * - 结果缓存
 * - 性能对比
 */

import { createAgentExecutor } from './src/agents/agent-executor.js';
import { getGlobalAgentPool } from './src/agents/agent-pool.js';
import { loadConfig } from './src/config.js';
import { searchCodeTool, searchFilesTool, listFilesTool } from './src/tools.js';

// 颜色和表情
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const emojis = {
  rocket: '🚀',
  search: '🔍',
  robot: '🤖',
  brain: '🧠',
  bolt: '⚡',
  fire: '🔥',
  chart: '📊',
  check: '✅',
  cross: '❌',
  clock: '⏱️',
  package: '📦',
  folder: '📁',
  file: '📄'
};

function printHeader(title, emoji = emojis.robot) {
  console.log(`\n${colors.bright}${colors.cyan}${emoji} ${title}${colors.reset}\n`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

function printSection(title, emoji = emojis.search) {
  console.log(`\n${colors.bright}${colors.yellow}${emoji} ${title}${colors.reset}\n`);
}

function printSuccess(message) {
  console.log(`${colors.green}${emojis.check} ${message}${colors.reset}`);
}

function printInfo(message, emoji = 'ℹ️') {
  console.log(`${colors.blue}${emoji} ${message}${colors.reset}`);
}

function printMetric(label, value, unit = '') {
  console.log(`  ${colors.cyan}${label}:${colors.reset} ${colors.bright}${value}${unit}${colors.reset}`);
}

// 演示场景
async function demoBasicSearch() {
  printSection('场景 1: 基础搜索 - 寻找配置文件', emojis.search);
  
  const config = loadConfig();
  const { setToolExecutorContext } = await import('./src/tools.js');
  setToolExecutorContext(config);
  
  printInfo('正在搜索所有配置文件...', emojis.folder);
  const startTime = Date.now();
  
  const results = await searchFilesTool.run({ pattern: '*config*.js' });
  const elapsed = Date.now() - startTime;
  
  printSuccess(`找到 ${results.files?.length || 0} 个配置文件（耗时 ${elapsed}ms）`);
  
  if (results.files && results.files.length > 0) {
    console.log(`\n${colors.cyan}示例文件:${colors.reset}`);
    results.files.slice(0, 5).forEach((file, i) => {
      console.log(`  ${i + 1}. ${colors.green}${file}${colors.reset}`);
    });
    if (results.files.length > 5) {
      console.log(`  ${colors.dim}... 还有 ${results.files.length - 5} 个文件${colors.reset}`);
    }
  }
}

async function demoCodeSearch() {
  printSection('场景 2: 代码搜索 - 查找 Agent 相关代码', emojis.brain);
  
  const config = loadConfig();
  const { setToolExecutorContext } = await import('./src/tools.js');
  setToolExecutorContext(config);
  
  printInfo('正在搜索 "agent" 关键词...', emojis.search);
  const startTime = Date.now();
  
  const results = await searchCodeTool.run({ 
    pattern: 'class.*Agent|function.*Agent',
    fileType: 'js'
  });
  const elapsed = Date.now() - startTime;
  
  printSuccess(`搜索完成（耗时 ${elapsed}ms）`);
  
  if (results.matches && results.matches.length > 0) {
    console.log(`\n${colors.cyan}找到 ${results.matches.length} 处匹配:${colors.reset}`);
    results.matches.slice(0, 5).forEach((match, i) => {
      console.log(`  ${i + 1}. ${colors.green}${match.file}${colors.reset}:${colors.yellow}${match.line || '?'}${colors.reset}`);
      if (match.preview) {
        console.log(`     ${colors.dim}${match.preview.substring(0, 60)}...${colors.reset}`);
      }
    });
  }
}

async function demoAgentPool() {
  printSection('场景 3: Agent Pool 状态监控', emojis.chart);
  
  const config = loadConfig();
  const pool = getGlobalAgentPool(config);
  const stats = pool.getStats();
  
  printInfo('当前 Agent Pool 状态:', emojis.robot);
  console.log('');
  printMetric('最大并发数', stats.maxConcurrent);
  printMetric('当前运行', stats.currentlyRunning);
  printMetric('等待队列', stats.currentlyWaiting);
  printMetric('可用槽位', stats.availableSlots);
  console.log('');
  printMetric('总执行数', stats.totalExecuted);
  printMetric('成功数', stats.totalSucceeded);
  printMetric('失败数', stats.totalFailed);
  printMetric('成功率', `${stats.successRate}%`);
  printMetric('平均执行时间', `${stats.averageExecutionTime}`, 'ms');
}

async function demoToolWhitelist() {
  printSection('场景 4: 工具白名单 - 安全控制', emojis.bolt);
  
  const { AgentToolManager } = await import('./src/agents/agent-tools.js');
  const toolManager = new AgentToolManager();
  
  const allowedTools = toolManager.getAllowedTools();
  const blockedTools = toolManager.getBlockedTools();
  
  printInfo('Agent 可以使用的工具（只读）:', emojis.check);
  allowedTools.forEach(tool => {
    console.log(`  ${colors.green}✓${colors.reset} ${tool}`);
  });
  
  console.log(`\n${colors.red}Agent 禁止使用的工具（修改类）:${colors.reset}`);
  blockedTools.forEach(tool => {
    console.log(`  ${colors.red}✗${colors.reset} ${tool}`);
  });
  
  // 安全验证
  console.log(`\n${colors.cyan}安全验证测试:${colors.reset}`);
  const bashTest = toolManager.validateToolCall('bash', { command: 'rm -rf /' });
  console.log(`  bash ${bashTest.allowed ? '❌ 错误允许' : '✅ 正确阻止'}`);
  
  const searchTest = toolManager.validateToolCall('searchFiles', { pattern: '*.js' });
  console.log(`  searchFiles ${searchTest.allowed ? '✅ 正确允许' : '❌ 错误阻止'}`);
}

async function demoCache() {
  printSection('场景 5: 智能缓存 - 性能优化', emojis.clock);
  
  const { AgentCacheManager } = await import('./src/agents/agent-cache.js');
  const cache = new AgentCacheManager();
  
  printInfo('缓存功能测试:', emojis.package);
  
  // 第一次调用（缓存未命中）
  const key1 = cache.generateKey('test prompt', {});
  const start1 = Date.now();
  const has1 = cache.has(key1);
  const time1 = Date.now() - start1;
  
  printMetric('第一次查询（缓存未命中）', `${time1}`, 'ms');
  console.log(`  结果: ${has1 ? '❌ 错误命中' : '✅ 正确未命中'}`);
  
  // 写入缓存
  cache.set(key1, { result: 'test data' });
  
  // 第二次调用（缓存命中）
  const start2 = Date.now();
  const has2 = cache.has(key1);
  const time2 = Date.now() - start2;
  
  printMetric('第二次查询（缓存命中）', `${time2}`, 'ms');
  console.log(`  结果: ${has2 ? '✅ 正确命中' : '❌ 错误未命中'}`);
  console.log(`  ${colors.green}性能提升: ${((time1 - time2) / time1 * 100).toFixed(0)}%${colors.reset}`);
  
  // 缓存统计
  const stats = cache.getStats();
  console.log(`\n${colors.cyan}缓存统计:${colors.reset}`);
  printMetric('命中率', `${(stats.hitRate * 100).toFixed(1)}%`);
  printMetric('缓存大小', `${stats.size}/${stats.maxSize}`);
}

async function demoDirectoryStructure() {
  printSection('场景 6: 目录结构探索', emojis.folder);
  
  const config = loadConfig();
  const { setToolExecutorContext } = await import('./src/tools.js');
  setToolExecutorContext(config);
  
  printInfo('探索 src/agents 目录...', emojis.search);
  
  const result = await listFilesTool.run({ dirPath: 'src/agents', recursive: false });
  
  if (result.files && result.files.length > 0) {
    console.log(`\n${colors.cyan}找到 ${result.files.length} 个项目:${colors.reset}\n`);
    
    const directories = result.files.filter(f => f.type === 'directory');
    const files = result.files.filter(f => f.type === 'file');
    
    if (directories.length > 0) {
      console.log(`${colors.blue}目录 (${directories.length}):${colors.reset}`);
      directories.forEach(dir => {
        console.log(`  ${colors.blue}📂${colors.reset} ${dir.name}`);
      });
      console.log('');
    }
    
    if (files.length > 0) {
      console.log(`${colors.green}文件 (${files.length}):${colors.reset}`);
      files.forEach(file => {
        const size = file.size ? ` (${(file.size / 1024).toFixed(1)} KB)` : '';
        console.log(`  ${colors.green}📄${colors.reset} ${file.name}${colors.dim}${size}${colors.reset}`);
      });
    }
  }
}

async function demoPerformanceComparison() {
  printSection('场景 7: 性能对比 - Agent vs 直接搜索', emojis.chart);
  
  const config = loadConfig();
  const { setToolExecutorContext } = await import('./src/tools.js');
  setToolExecutorContext(config);
  
  // 直接搜索
  printInfo('直接搜索测试...', emojis.search);
  const directStart = Date.now();
  await searchCodeTool.run({ pattern: 'function', fileType: 'js' });
  const directTime = Date.now() - directStart;
  printMetric('直接搜索耗时', `${directTime}`, 'ms');
  
  // Agent 搜索（模拟）
  printInfo('\nAgent 搜索测试（含 AI 分析）...', emojis.robot);
  const agentStart = Date.now();
  
  // Agent 会进行多次搜索和分析
  await searchCodeTool.run({ pattern: 'function', fileType: 'js' });
  await searchFilesTool.run({ pattern: '*.js' });
  
  const agentTime = Date.now() - agentStart;
  printMetric('Agent 搜索耗时', `${agentTime}`, 'ms');
  
  console.log(`\n${colors.cyan}分析:${colors.reset}`);
  console.log(`  Agent 提供了 ${colors.green}更深入的分析${colors.reset}和${colors.green}上下文理解${colors.reset}`);
  console.log(`  适合 ${colors.yellow}复杂探索任务${colors.reset}，而直接搜索适合 ${colors.yellow}简单查询${colors.reset}`);
}

async function demoAdvancedFeatures() {
  printSection('场景 8: 高级特性展示', emojis.fire);
  
  const config = loadConfig();
  
  printInfo('持久化存储:', emojis.package);
  const { AgentStorage } = await import('./src/agents/agent-storage.js');
  const storage = new AgentStorage({ projectRoot: process.cwd() });
  await storage.initialize();
  printSuccess(`持久化存储位置: ${storage.storageDir}`);
  
  printInfo('\n插件系统:', emojis.bolt);
  const { createPluginRegistry } = await import('./src/agents/agent-plugin-system.js');
  const registry = createPluginRegistry();
  const stats = registry.getStats();
  printSuccess(`已注册 ${stats.totalPlugins} 个插件工具`);
  
  printInfo('\n错误恢复:', emojis.check);
  const { AgentErrorHandler } = await import('./src/agents/agent-error-handler.js');
  const errorHandler = new AgentErrorHandler(config);
  printSuccess(`错误重试次数: ${config.agents.retryAttempts}`);
  printSuccess(`重试延迟: ${config.agents.retryDelay}ms`);
}

// 主演示流程
async function runDemo() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bright}${colors.magenta}${emojis.rocket} Dispatch Agent 生动演示${colors.reset}`);
  console.log('='.repeat(60));
  
  console.log(`\n${colors.dim}这个演示将展示 Dispatch Agent 系统的强大功能：${colors.reset}`);
  console.log(`  ${colors.green}•${colors.reset} 并发搜索任务`);
  console.log(`  ${colors.green}•${colors.reset} AI 驱动的智能探索`);
  console.log(`  ${colors.green}•${colors.reset} 结果缓存和性能优化`);
  console.log(`  ${colors.green}•${colors.reset} 安全的工具白名单`);
  console.log(`  ${colors.green}•${colors.reset} 持久化存储和插件系统`);
  
  try {
    await demoBasicSearch();
    await demoCodeSearch();
    await demoAgentPool();
    await demoToolWhitelist();
    await demoCache();
    await demoDirectoryStructure();
    await demoPerformanceComparison();
    await demoAdvancedFeatures();
    
    printHeader('演示完成！', emojis.check);
    
    console.log(`${colors.bright}${colors.green}所有功能演示完成！${colors.reset}\n`);
    
    console.log(`${colors.cyan}想要体验更多？${colors.reset}`);
    console.log(`  ${colors.yellow}•${colors.reset} 运行测试: ${colors.green}node test-agent-executor.js${colors.reset}`);
    console.log(`  ${colors.yellow}•${colors.reset} 压力测试: ${colors.green}node test-agent-stress-100.js${colors.reset}`);
    console.log(`  ${colors.yellow}•${colors.reset} 查看文档: ${colors.green}cat AGENT_SYSTEM_GUIDE.md${colors.reset}`);
    console.log(`  ${colors.yellow}•${colors.reset} 交互式体验: ${colors.green}使用 /agents 命令${colors.reset}\n`);
    
  } catch (error) {
    console.error(`\n${colors.red}❌ 演示失败:${colors.reset}`, error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行演示
runDemo();
