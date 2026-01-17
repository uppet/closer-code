/**
 * Workflow 测试命令
 * 用于列出和运行 workflow 测试
 */

import {
  listWorkflows,
  runWorkflowTest,
  formatTestResult,
  formatTestResults
} from '../utils/workflow-test.js';

export default async function workflowTestsCommand(args, options) {
  try {
    // 列出所有测试（无参数时）
    if (!args[0] && !options.all) {
      await listTests();
      return;
    }

    // 运行所有测试
    if (options.all) {
      await runAllTests(options);
      return;
    }

    // 运行单个测试
    const testName = args[0];
    await runSingleTest(testName, options);

  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

/**
 * 列出所有可用的 workflow 测试
 */
async function listTests() {
  const workflows = await listWorkflows();

  if (workflows.length === 0) {
    console.log('没有找到可用的 workflow 测试。');
    console.log('测试目录: test/workflows/');
    return;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`可用的 Workflow 测试`);
  console.log(`${'='.repeat(60)}\n`);

  workflows.forEach((wf, idx) => {
    console.log(`${idx + 1}. ${wf.name}`);
    if (wf.description) {
      console.log(`   ${wf.description.split('\n').join('\n   ')}`);
    }
    console.log('');
  });

  console.log(`\n使用方法:`);
  console.log(`  cloco workflow-tests <name>     - 运行单个测试`);
  console.log(`  cloco workflow-tests --all      - 运行所有测试`);
  console.log(`  cloco workflow-tests <name> --verbose  - 详细输出\n`);
}

/**
 * 运行单个测试
 */
async function runSingleTest(testName, options) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`运行 Workflow 测试: ${testName}`);
  console.log(`${'='.repeat(60)}\n`);

  const result = await runWorkflowTest(testName, options);

  console.log(formatTestResult(result, options));

  // 设置退出码
  if (!result.passed) {
    process.exit(1);
  }
}

/**
 * 运行所有测试
 */
async function runAllTests(options) {
  const workflows = await listWorkflows();

  if (workflows.length === 0) {
    console.log('没有找到可用的 workflow 测试。');
    return;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`运行所有 Workflow 测试 (${workflows.length} 个)`);
  console.log(`${'='.repeat(60)}\n`);

  const results = [];

  for (const wf of workflows) {
    const result = await runWorkflowTest(wf.name, options);
    results.push(result);

    // 单个测试结果的简短输出
    const statusIcon = result.passed ? '✅' : '❌';
    const statusText = result.passed ? '通过' : '失败';
    const durationSec = (result.duration / 1000).toFixed(2);
    console.log(`${statusIcon} ${wf.name} - ${statusText} (${durationSec}s)`);

    if (result.error) {
      console.log(`   错误: ${result.error}`);
    }
  }

  // 输出汇总
  console.log(formatTestResults(results, options));

  // 设置退出码
  const hasFailure = results.some(r => !r.passed);
  if (hasFailure) {
    process.exit(1);
  }
}
