/**
 * Agent 系统完整测试套件
 * 
 * 运行所有关键测试并生成报告
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tests = [
  {
    name: '持久化验证测试',
    file: 'test-persistence-verification.js',
    timeout: 30000,
    critical: true
  },
  {
    name: 'Agent Storage 测试',
    file: 'test-agent-storage.js',
    timeout: 60000,
    critical: true
  },
  {
    name: 'Agent Pool 测试',
    file: 'test-agent-pool.js',
    timeout: 60000,
    critical: true
  },
  {
    name: 'Agent Cleanup 测试',
    file: 'test-agent-cleanup.js',
    timeout: 60000,
    critical: true
  },
  {
    name: 'Batch 场景测试',
    file: 'test-batch-scenario.js',
    timeout: 120000,
    critical: true
  }
];

function runTest(test) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 运行: ${test.name}`);
  console.log(`📄 文件: ${test.file}`);
  console.log(`⏱️  超时: ${test.timeout}ms`);
  console.log(`${'='.repeat(70)}`);

  try {
    const startTime = Date.now();
    const output = execSync(`node ${test.file}`, {
      cwd: __dirname,
      encoding: 'utf-8',
      timeout: test.timeout / 1000,
      stdio: 'pipe'
    });
    const endTime = Date.now();
    const duration = endTime - startTime;

    // 检查输出中是否包含成功标志
    const hasSuccess = output.includes('✅') || output.includes('通过');
    const hasFailure = output.includes('❌') || output.includes('失败') || output.includes('Error');

    if (hasFailure && !hasSuccess) {
      return {
        name: test.name,
        status: 'FAILED',
        duration,
        output: output.substring(0, 500)
      };
    }

    return {
      name: test.name,
      status: 'PASSED',
      duration,
      output: output.substring(0, 500)
    };
  } catch (error) {
    return {
      name: test.name,
      status: 'ERROR',
      duration: 0,
      output: error.message.substring(0, 500)
    };
  }
}

function main() {
  console.log('\n' + '🚀'.repeat(35));
  console.log('Agent 系统完整测试套件');
  console.log('🚀'.repeat(35));

  const results = [];
  const startTime = Date.now();

  for (const test of tests) {
    const result = runTest(test);
    results.push(result);
  }

  const totalTime = Date.now() - startTime;

  // 生成报告
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 测试报告');
  console.log('='.repeat(70));

  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  const errors = results.filter(r => r.status === 'ERROR').length;

  console.log(`\n总测试数: ${results.length}`);
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`⚠️  错误: ${errors}`);
  console.log(`⏱️  总耗时: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}秒)`);

  const successRate = ((passed / results.length) * 100).toFixed(1);
  console.log(`📈 成功率: ${successRate}%`);

  console.log('\n' + '-'.repeat(70));
  console.log('详细结果:');
  console.log('-'.repeat(70));

  for (const result of results) {
    const icon = result.status === 'PASSED' ? '✅' : (result.status === 'FAILED' ? '❌' : '⚠️');
    console.log(`\n${icon} ${result.name}`);
    console.log(`   状态: ${result.status}`);
    console.log(`   耗时: ${result.duration}ms`);
    
    if (result.output) {
      const preview = result.output.substring(0, 200);
      console.log(`   输出: ${preview}${result.output.length > 200 ? '...' : ''}`);
    }
  }

  // 关键测试检查
  const criticalTests = results.filter(r => tests.find(t => t.name === r.name)?.critical);
  const criticalPassed = criticalTests.filter(r => r.status === 'PASSED').length;

  console.log('\n' + '='.repeat(70));
  console.log('关键测试状态:');
  console.log('='.repeat(70));
  console.log(`\n关键测试通过: ${criticalPassed}/${criticalTests.length}`);

  if (criticalPassed === criticalTests.length) {
    console.log('\n🎉 所有关键测试通过！Agent 系统运行正常。\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  部分关键测试失败，请检查输出。\n');
    process.exit(1);
  }
}

main();
