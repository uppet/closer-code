#!/usr/bin/env node
/**
 * 测试 Context 限制值管理器
 *
 * 验证功能：
 * 1. 从错误中提取限制值
 * 2. 保存和加载限制值
 * 3. 更新限制值
 * 4. 获取限制值
 */

import { ContextLimitManager } from '../src/conversation/context-limit-manager.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

console.log('🔧 Context 限制值管理器测试\n');
console.log('='.repeat(80) + '\n');

// 创建临时目录用于测试
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'context-limit-test-'));
console.log(`使用临时目录: ${tempDir}\n`);

let allTestsPassed = true;

// 测试 1: 从错误中提取限制值
console.log('📋 测试 1: 从错误中提取限制值');
try {
  const manager = new ContextLimitManager(tempDir);
  
  // 测试不同格式的错误消息
  const testErrors = [
    {
      message: 'context length exceeded: 200000 tokens',
      expected: 200000
    },
    {
      message: 'maximum context length is 128000 tokens',
      expected: 128000
    },
    {
      message: 'Request exceeded limit of 8192 tokens',
      expected: 8192
    }
  ];
  
  for (const test of testErrors) {
    const extracted = manager.extractLimitFromError(test);
    console.log(`   错误: "${test.message.substring(0, 50)}..."`);
    console.log(`   提取: ${extracted} tokens (期望: ${test.expected})`);
    
    if (extracted === test.expected) {
      console.log('   ✅ 提取正确');
    } else {
      console.log('   ❌ 提取错误');
      allTestsPassed = false;
    }
  }
  
  console.log('   ✅ 从错误中提取限制值测试通过\n');

} catch (error) {
  console.error(`   ❌ 测试失败: ${error.message}\n`);
  allTestsPassed = false;
}

// 测试 2: 保存和加载限制值
console.log('📋 测试 2: 保存和加载限制值');
try {
  const manager1 = new ContextLimitManager(tempDir);
  
  // 更新限制值
  manager1.updateLimit('claude-3-5-sonnet', 200000, 'test');
  manager1.updateLimit('gpt-4', 128000, 'test');
  
  console.log('   已保存限制值到文件');
  
  // 创建新的管理器实例来测试加载
  const manager2 = new ContextLimitManager(tempDir);
  
  const limit1 = manager2.getLimit('claude-3-5-sonnet');
  const limit2 = manager2.getLimit('gpt-4');
  
  console.log(`   claude-3-5-sonnet: ${limit1} tokens`);
  console.log(`   gpt-4: ${limit2} tokens`);
  
  if (limit1 === 200000 && limit2 === 128000) {
    console.log('   ✅ 保存和加载正确');
  } else {
    console.log('   ❌ 保存和加载错误');
    allTestsPassed = false;
  }
  
  console.log('   ✅ 保存和加载限制值测试通过\n');

} catch (error) {
  console.error(`   ❌ 测试失败: ${error.message}\n`);
  allTestsPassed = false;
}

// 测试 3: 从错误中学习
console.log('📋 测试 3: 从错误中学习');
try {
  const manager = new ContextLimitManager(tempDir);
  
  // 模拟 API 错误
  const apiError = new Error('context length exceeded: 100000 tokens');
  
  const learned = manager.learnFromError(apiError, 'test-model');
  console.log(`   从错误中学习: ${learned ? '成功' : '失败'}`);
  
  if (learned) {
    const limit = manager.getLimit('test-model');
    console.log(`   test-model 限制: ${limit} tokens`);
    
    if (limit === 100000) {
      console.log('   ✅ 学习正确');
    } else {
      console.log('   ❌ 学习错误');
      allTestsPassed = false;
    }
  } else {
    console.log('   ❌ 未能从错误中学习');
    allTestsPassed = false;
  }
  
  console.log('   ✅ 从错误中学习测试通过\n');

} catch (error) {
  console.error(`   ❌ 测试失败: ${error.message}\n`);
  allTestsPassed = false;
}

// 测试 4: 获取或估算限制值
console.log('📋 测试 4: 获取或估算限制值');
try {
  const manager = new ContextLimitManager(tempDir);
  
  // 先设置一个已知限制
  manager.updateLimit('known-model', 50000, 'test');
  
  // 测试已知的模型
  const knownLimit = manager.getOrEstimateLimit('known-model', 100000);
  console.log(`   已知模型: ${knownLimit} tokens (期望: 50000)`);
  
  if (knownLimit !== 50000) {
    console.log('   ❌ 应返回已知的限制值');
    allTestsPassed = false;
  }
  
  // 测试未知的模型
  const unknownLimit = manager.getOrEstimateLimit('unknown-model', 100000);
  console.log(`   未知模型: ${unknownLimit} tokens (期望: 100000)`);
  
  if (unknownLimit !== 100000) {
    console.log('   ❌ 应返回回退值');
    allTestsPassed = false;
  }
  
  console.log('   ✅ 获取或估算限制值测试通过\n');

} catch (error) {
  console.error(`   ❌ 测试失败: ${error.message}\n`);
  allTestsPassed = false;
}

// 测试 5: 限制值验证
console.log('📋 测试 5: 限制值验证');
try {
  const manager = new ContextLimitManager(tempDir);
  
  // 测试无效值
  const invalid1 = manager.updateLimit('test', 100); // 太小
  const invalid2 = manager.updateLimit('test', 999999999); // 太大
  
  console.log(`   拒绝太小值: ${!invalid1 ? '✅' : '❌'}`);
  console.log(`   拒绝太大值: ${!invalid2 ? '✅' : '❌'}`);
  
  if (!invalid1 && !invalid2) {
    console.log('   ✅ 限制值验证正确');
  } else {
    console.log('   ❌ 限制值验证错误');
    allTestsPassed = false;
  }
  
  console.log('   ✅ 限制值验证测试通过\n');

} catch (error) {
  console.error(`   ❌ 测试失败: ${error.message}\n`);
  allTestsPassed = false;
}

// 测试 6: 清除限制值
console.log('📋 测试 6: 清除限制值');
try {
  const manager = new ContextLimitManager(tempDir);
  
  // 设置限制值
  manager.updateLimit('to-clear', 100000, 'test');
  console.log(`   设置限制: ${manager.getLimit('to-clear')} tokens`);
  
  // 清除限制值
  manager.clearLimit('to-clear');
  const cleared = manager.getLimit('to-clear');
  
  console.log(`   清除后: ${cleared === null ? 'null' : cleared + ' tokens'}`);
  
  if (cleared === null) {
    console.log('   ✅ 清除成功');
  } else {
    console.log('   ❌ 清除失败');
    allTestsPassed = false;
  }
  
  console.log('   ✅ 清除限制值测试通过\n');

} catch (error) {
  console.error(`   ❌ 测试失败: ${error.message}\n`);
  allTestsPassed = false;
}

// 清理临时文件
try {
  const limitsFile = path.join(tempDir, '.context_limits.json');
  if (fs.existsSync(limitsFile)) {
    fs.unlinkSync(limitsFile);
  }
  fs.rmdirSync(tempDir);
  console.log(`✅ 清理临时文件: ${tempDir}\n`);
} catch (error) {
  console.warn(`⚠️  清理临时文件失败: ${error.message}\n`);
}

// 输出测试结果
console.log('='.repeat(80));
console.log('测试结果');
console.log('='.repeat(80) + '\n');

if (allTestsPassed) {
  console.log('✅ 所有测试通过！\n');
  
  console.log('📊 功能验证:');
  console.log('  ✅ 从错误中提取限制值');
  console.log('  ✅ 保存和加载限制值');
  console.log('  ✅ 从错误中学习');
  console.log('  ✅ 获取或估算限制值');
  console.log('  ✅ 限制值验证');
  console.log('  ✅ 清除限制值\n');
  
  console.log('🎯 核心特性:');
  console.log('  • 自动从 API 错误中学习真实限制');
  console.log('  • 持久化保存到 .context_limits.json');
  console.log('  • 支持多种模型的限制值');
  console.log('  • 提供回退值机制');
  console.log('  • 验证限制值的有效性\n');
  
  process.exit(0);
} else {
  console.log('❌ 部分测试失败\n');
  console.log('请查看上面的详细错误信息');
  console.log('');
  
  process.exit(1);
}
