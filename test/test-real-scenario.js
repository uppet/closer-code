#!/usr/bin/env node
/**
 * 真实场景测试：模拟在不同项目中使用AI助手
 * 
 * 这个测试模拟以下场景：
 * 1. 在项目A中对话
 * 2. 切换到项目B对话
 * 3. 回到项目A，验证历史是否正确
 * 4. 验证两个项目的上下文不会混淆
 */

import {
  loadHistory,
  saveHistory,
  clearHistory
} from '../src/config.js';
import path from 'path';

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
  console.log('\n' + '='.repeat(70));
  log(title, 'cyan');
  console.log('='.repeat(70));
}

// 模拟项目路径
const projectA = path.join(process.cwd(), 'test-projects', 'project-a');
const projectB = path.join(process.cwd(), 'test-projects', 'project-b');

async function simulateConversation(projectPath, projectName, conversations) {
  log(`\n📍 在项目 ${projectName} 中开始对话...`, 'yellow');
  log(`   路径: ${projectPath}`, 'blue');
  
  // 加载现有历史
  let history = loadHistory(projectPath);
  log(`   加载了 ${history.length} 条历史消息`, 'blue');
  
  // 模拟对话
  for (const conv of conversations) {
    log(`\n   用户: ${conv.user}`, 'cyan');
    history.push({ role: 'user', content: conv.user });
    
    log(`   助手: ${conv.assistant}`, 'green');
    history.push({ role: 'assistant', content: conv.assistant });
  }
  
  // 保存历史
  saveHistory(history, projectPath);
  log(`\n   ✓ 保存了 ${history.length} 条消息到项目历史`, 'green');
}

async function main() {
  console.log('\n' + '█'.repeat(70));
  log('  真实场景测试：多项目上下文隔离', 'cyan');
  console.log('█'.repeat(70));
  
  section('场景 1: 在项目 A 中开发 React 组件');
  
  await simulateConversation(projectA, 'A', [
    {
      user: '帮我创建一个 Button 组件',
      assistant: '好的，我来创建一个 Button 组件。首先让我看看项目结构...'
    },
    {
      user: '添加 onClick 处理',
      assistant: '我在组件中添加了 onClick 属性支持...'
    },
    {
      user: '现在添加样式',
      assistant: '我为 Button 组件添加了 CSS 样式...'
    }
  ]);
  
  section('场景 2: 切换到项目 B 开发 Node.js API');
  
  await simulateConversation(projectB, 'B', [
    {
      user: '创建一个 Express 服务器',
      assistant: '好的，我来创建 Express 服务器。首先初始化项目...'
    },
    {
      user: '添加用户认证路由',
      assistant: '我添加了 /api/auth 路由和 JWT 认证...'
    },
    {
      user: '现在添加数据库连接',
      assistant: '我配置了 MongoDB 连接和 Mongoose 模型...'
    }
  ]);
  
  section('场景 3: 回到项目 A 继续开发');
  
  const historyA = loadHistory(projectA);
  log(`\n📍 回到项目 A`, 'yellow');
  log(`   路径: ${projectA}`, 'blue');
  log(`   找到 ${historyA.length} 条历史消息`, 'blue');
  
  // 验证历史内容
  const hasReactContext = historyA.some(msg => 
    msg.content.includes('Button') || 
    msg.content.includes('React') ||
    msg.content.includes('组件')
  );
  
  const hasNodeContext = historyA.some(msg => 
    msg.content.includes('Express') || 
    msg.content.includes('API') ||
    msg.content.includes('MongoDB')
  );
  
  log('\n   验证上下文:', 'yellow');
  log(`   - 包含 React/组件相关内容: ${hasReactContext ? '✓' : '✗'}`, hasReactContext ? 'green' : 'red');
  log(`   - 包含 Node.js/API 相关内容: ${hasNodeContext ? '✗ (不应该有)' : '✓ (正确隔离)'}`, hasNodeContext ? 'red' : 'green');
  
  await simulateConversation(projectA, 'A', [
    {
      user: '继续添加 Button 的 hover 效果',
      assistant: '好的，我在 CSS 中添加了 :hover 伪类...'
    }
  ]);
  
  section('场景 4: 再次切换到项目 B');
  
  const historyB = loadHistory(projectB);
  log(`\n📍 切换到项目 B`, 'yellow');
  log(`   路径: ${projectB}`, 'blue');
  log(`   找到 ${historyB.length} 条历史消息`, 'blue');
  
  // 验证历史内容
  const hasNodeContextB = historyB.some(msg => 
    msg.content.includes('Express') || 
    msg.content.includes('API') ||
    msg.content.includes('MongoDB')
  );
  
  const hasReactContextB = historyB.some(msg => 
    msg.content.includes('Button') || 
    msg.content.includes('React') ||
    msg.content.includes('hover')
  );
  
  log('\n   验证上下文:', 'yellow');
  log(`   - 包含 Node.js/API 相关内容: ${hasNodeContextB ? '✓' : '✗'}`, hasNodeContextB ? 'green' : 'red');
  log(`   - 包含 React/Button 相关内容: ${hasReactContextB ? '✗ (不应该有)' : '✓ (正确隔离)'}`, hasReactContextB ? 'red' : 'green');
  
  section('场景 5: 清除项目 A 的历史');
  
  log(`\n🗑️  清除项目 A 的历史...`, 'yellow');
  clearHistory(projectA);
  
  const historyAAfterClear = loadHistory(projectA);
  const historyBAfterClear = loadHistory(projectB);
  
  log(`   项目 A 历史消息数: ${historyAAfterClear.length}`, historyAAfterClear.length === 0 ? 'green' : 'red');
  log(`   项目 B 历史消息数: ${historyBAfterClear.length} (应该保持不变)`, 'blue');
  
  section('测试结果');
  
  const tests = [
    { name: '项目 A 保存历史', pass: historyA.length > 0 },
    { name: '项目 B 保存历史', pass: historyB.length > 0 },
    { name: '项目 A 有 React 上下文', pass: hasReactContext },
    { name: '项目 A 没有 Node.js 上下文', pass: !hasNodeContext },
    { name: '项目 B 有 Node.js 上下文', pass: hasNodeContextB },
    { name: '项目 B 没有 React 上下文', pass: !hasReactContextB },
    { name: '清除项目 A 不影响项目 B', pass: historyAAfterClear.length === 0 && historyBAfterClear.length > 0 }
  ];
  
  tests.forEach(test => {
    const icon = test.pass ? '✓' : '✗';
    const color = test.pass ? 'green' : 'red';
    log(`  ${icon} ${test.name}`, color);
  });
  
  const passed = tests.filter(t => t.pass).length;
  const total = tests.length;
  
  console.log('\n' + '='.repeat(70));
  
  if (passed === total) {
    log(`🎉 所有场景测试通过！(${passed}/${total})`, 'green');
    log('\n✨ 项目历史隔离功能工作正常，不同项目的上下文完全独立！', 'green');
  } else {
    log(`⚠️  部分场景测试失败 (${passed}/${total} 通过)`, 'yellow');
  }
  
  console.log('='.repeat(70) + '\n');
  
  // 清理测试数据
  log('🧹 清理测试数据...', 'yellow');
  clearHistory(projectA);
  clearHistory(projectB);
  log('✓ 清理完成', 'green');
  
  return passed === total ? 0 : 1;
}

main().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  log(`\n✗ 测试失败: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
