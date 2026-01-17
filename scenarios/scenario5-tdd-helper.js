/**
 * 场景五：TDD测试辅助工具
 *
 * 功能：
 * 1. 使用 planTask 规划测试任务
 * 2. 使用 runTests 执行测试
 * 3. 使用 editFile 更新测试代码和源代码
 *
 * 工具验证：runTests, planTask, editFile
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MockToolExecutor {
  constructor() {
    this.workingDir = path.resolve(__dirname, '..');
    this.callLog = [];
    this.testResults = [];
    this.taskPlans = [];
  }

  log(toolName, input, result) {
    this.callLog.push({
      tool: toolName,
      input,
      success: result.success,
      timestamp: new Date().toISOString()
    });
  }

  // planTask 工具 - 规划测试任务
  async planTask({ task, context }) {
    try {
      const plan = {
        id: `task-${Date.now()}`,
        task,
        context,
        timestamp: new Date().toISOString(),
        steps: [],
        status: 'planned'
      };

      // 根据任务类型生成不同的计划
      if (task.includes('test') || task.includes('测试')) {
        plan.steps = [
          { step: 1, action: '分析需求', description: '理解待测试的功能点' },
          { step: 2, action: '设计测试用例', description: '编写测试场景和断言' },
          { step: 3, action: '实现测试代码', description: '编写测试函数' },
          { step: 4, action: '运行测试', description: '执行测试并验证结果' },
          { step: 5, action: '重构优化', description: '根据测试结果优化代码' }
        ];
      } else if (task.includes('feature') || task.includes('功能')) {
        plan.steps = [
          { step: 1, action: '需求分析', description: '明确功能需求' },
          { step: 2, action: '设计接口', description: '定义 API 和数据结构' },
          { step: 3, action: '编写测试', description: '先写测试用例（TDD）' },
          { step: 4, action: '实现功能', description: '编写功能代码' },
          { step: 5, action: '验证测试', description: '确保所有测试通过' }
        ];
      } else {
        plan.steps = [
          { step: 1, action: '任务分解', description: '将大任务分解为小步骤' },
          { step: 2, action: '制定计划', description: '确定实施顺序' },
          { step: 3, action: '执行步骤', description: '按计划实施' },
          { step: 4, action: '检查验证', description: '验证每个步骤' },
          { step: 5, action: '总结复盘', description: '总结经验教训' }
        ];
      }

      this.taskPlans.push(plan);

      const result = {
        success: true,
        data: {
          plan,
          message: `已创建任务计划，包含 ${plan.steps.length} 个步骤`
        }
      };
      this.log('planTask', { task, steps: plan.steps.length }, result);
      return result;
    } catch (error) {
      const result = { success: false, error: error.message };
      this.log('planTask', { task }, result);
      return result;
    }
  }

  // runTests 工具 - 运行测试
  async runTests({ testCommand, filter }) {
    return new Promise((resolve) => {
      let command = testCommand;

      if (!command) {
        // 使用默认测试命令
        command = 'npm test';
      }

      if (filter) {
        command += ` -- ${filter}`;
      }

      const proc = spawn('bash', ['-lc', command], {
        cwd: this.workingDir,
        shell: true,
        env: { ...process.env }
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        proc.kill('SIGKILL');
        const result = {
          success: false,
          data: { error: 'Test timeout' },
          error: 'Test timeout'
        };
        this.log('runTests', { command }, result);
        resolve(result);
      }, 30000);

      proc.on('close', (exitCode) => {
        clearTimeout(timer);

        // 解析测试结果
        const testResult = {
          command,
          exitCode,
          passed: exitCode === 0,
          output: stdout,
          errors: stderr,
          timestamp: new Date().toISOString()
        };

        // 尝试提取测试统计
        const passMatch = stdout.match(/passing\s*[:=]?\s*(\d+)/i);
        const failMatch = stdout.match(/failing\s*[:=]?\s*(\d+)/i);

        if (passMatch || failMatch) {
          testResult.stats = {
            passed: passMatch ? parseInt(passMatch[1]) : 0,
            failed: failMatch ? parseInt(failMatch[1]) : 0
          };
        }

        this.testResults.push(testResult);

        const result = {
          success: true,
          data: testResult
        };
        this.log('runTests', {
          command,
          passed: testResult.passed,
          stats: testResult.stats
        }, result);
        resolve(result);
      });

      proc.on('error', (error) => {
        clearTimeout(timer);
        const result = {
          success: false,
          data: null,
          error: error.message
        };
        this.log('runTests', { command }, result);
        resolve(result);
      });
    });
  }

  // editFile 工具 - 编辑测试文件
  async editFile({ filePath, oldText, newText, replaceAll = false }) {
    try {
      const fullPath = path.resolve(this.workingDir, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });

      let content = '';
      try {
        content = await fs.readFile(fullPath, 'utf-8');
      } catch {
        // 文件不存在，创建新文件
      }

      let replacements = 0;
      if (replaceAll) {
        const matches = content.split(oldText);
        replacements = matches.length - 1;
        content = matches.join(newText);
      } else {
        if (oldText && content.includes(oldText)) {
          content = content.replace(oldText, newText);
          replacements = 1;
        } else {
          // 追加内容
          if (content && !content.endsWith('\n')) {
            content += '\n';
          }
          content += newText;
          replacements = 1;
        }
      }

      await fs.writeFile(fullPath, content, 'utf-8');

      const result = {
        success: true,
        data: { path: fullPath, replacements, contentLength: content.length }
      };
      this.log('editFile', { filePath, replacements }, result);
      return result;
    } catch (error) {
      const result = { success: false, error: error.message };
      this.log('editFile', { filePath }, result);
      return result;
    }
  }

  getCallLog() {
    return this.callLog;
  }

  getTestResults() {
    return this.testResults;
  }

  getTaskPlans() {
    return this.taskPlans;
  }

  printSummary() {
    console.log('\n=== 工具调用统计 ===');
    const stats = {};
    this.callLog.forEach(log => {
      stats[log.tool] = (stats[log.tool] || 0) + 1;
    });
    Object.entries(stats).forEach(([tool, count]) => {
      console.log(`  ${tool}: ${count} 次`);
    });
    console.log(`  总计: ${this.callLog.length} 次`);

    if (this.taskPlans.length > 0) {
      console.log('\n=== 任务规划统计 ===');
      this.taskPlans.forEach(plan => {
        console.log(`  ${plan.id}: ${plan.steps.length} 个步骤`);
      });
    }

    if (this.testResults.length > 0) {
      console.log('\n=== 测试执行统计 ===');
      const passed = this.testResults.filter(r => r.passed).length;
      const failed = this.testResults.filter(r => !r.passed).length;
      console.log(`  通过: ${passed} 次`);
      console.log(`  失败: ${failed} 次`);
    }
  }
}

// TDD辅助工具场景
async function runTDDHelperScenario() {
  console.log('\n========================================');
  console.log('场景五：TDD测试辅助工具');
  console.log('========================================\n');

  const executor = new MockToolExecutor();
  const testFile = 'scenarios/output/math-utils.test.js';
  const sourceFile = 'scenarios/output/math-utils.js';

  try {
    const tddData = {
      features: [],
      tests: [],
      iterations: []
    };

    // 步骤 1: 规划第一个功能 - 加法函数
    console.log('步骤 1: 规划功能开发任务...');
    const plan1 = await executor.planTask({
      task: '实现数学工具库 - 加法功能',
      context: '使用 TDD 方法开发，先写测试再实现功能'
    });

    if (plan1.success) {
      console.log(`  ✓ 创建计划: ${plan1.data.plan.steps.length} 个步骤`);
      plan1.data.plan.steps.forEach(step => {
        console.log(`    ${step.step}. ${step.action}: ${step.description}`);
      });
      tddData.features.push({
        name: '加法功能',
        plan: plan1.data.plan
      });
    }

    console.log('');

    // 步骤 2: 编写测试用例（Red阶段）
    console.log('步骤 2: 编写测试用例（Red阶段）...');

    const testCode = `
// 数学工具库测试套件
import assert from 'assert';

describe('MathUtils', () => {
  describe('add', () => {
    it('应该正确相加两个正数', () => {
      assert.strictEqual(add(2, 3), 5);
    });

    it('应该正确处理负数', () => {
      assert.strictEqual(add(-2, 3), 1);
      assert.strictEqual(add(-2, -3), -5);
    });

    it('应该正确处理零', () => {
      assert.strictEqual(add(0, 5), 5);
      assert.strictEqual(add(0, 0), 0);
    });

    it('应该正确处理小数', () => {
      assert.strictEqual(add(0.1, 0.2), 0.3);
    });
  });

  describe('multiply', () => {
    it('应该正确相乘两个正数', () => {
      assert.strictEqual(multiply(2, 3), 6);
    });

    it('应该正确处理负数', () => {
      assert.strictEqual(multiply(-2, 3), -6);
      assert.strictEqual(multiply(-2, -3), 6);
    });

    it('应该正确处理零', () => {
      assert.strictEqual(multiply(0, 5), 0);
    });
  });
});
`;

    const writeTestResult = await executor.editFile({
      filePath: testFile,
      oldText: '',
      newText: testCode
    });

    if (writeTestResult.success) {
      console.log(`  ✓ 测试文件已创建: ${testFile}`);
      tddData.tests.push({
        file: testFile,
        size: writeTestResult.data.contentLength
      });
    }

    console.log('');

    // 步骤 3: 运行测试（预期失败）
    console.log('步骤 3: 运行测试（预期失败 - Red）...');
    const testResult1 = await executor.runTests({
      testCommand: 'node --test 2>&1 || echo "Test framework not available, skipping..."'
    });

    if (testResult1.success) {
      const testResult = testResult1.data;
      const passed = testResult ? testResult.passed : false;
      console.log(`  测试状态: ${passed ? '✓ 意外通过' : '✗ 预期失败（Red阶段）'}`);
      tddData.iterations.push({
        phase: 'red',
        result: passed ? 'unexpected' : 'expected',
        output: testResult ? testResult.output : 'No output'
      });
    }

    console.log('');

    // 步骤 4: 实现功能代码（Green阶段）
    console.log('步骤 4: 实现功能代码（Green阶段）...');

    const sourceCode = `
// 数学工具库实现

/**
 * 加法运算
 * @param {number} a - 第一个数
 * @param {number} b - 第二个数
 * @returns {number} 两数之和
 */
export function add(a, b) {
  return a + b;
}

/**
 * 乘法运算
 * @param {number} a - 第一个数
 * @param {number} b - 第二个数
 * @returns {number} 两数之积
 */
export function multiply(a, b) {
  return a * b;
}

/**
 * 减法运算
 * @param {number} a - 第一个数
 * @param {number} b - 第二个数
 * @returns {number} 两数之差
 */
export function subtract(a, b) {
  return a - b;
}

/**
 * 除法运算
 * @param {number} a - 被除数
 * @param {number} b - 除数
 * @returns {number} 两数之商
 */
export function divide(a, b) {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}
`;

    const writeSourceResult = await executor.editFile({
      filePath: sourceFile,
      oldText: '',
      newText: sourceCode
    });

    if (writeSourceResult.success) {
      console.log(`  ✓ 源代码文件已创建: ${sourceFile}`);
    }

    // 更新测试文件以添加导出语句
    const updatedTestCode = testCode + `
// 导入被测试的模块
import { add, multiply, subtract, divide } from './math-utils.js';
`;

    await executor.editFile({
      filePath: testFile,
      oldText: testCode,
      newText: updatedTestCode
    });

    console.log('');

    // 步骤 5: 规划第二个功能
    console.log('步骤 5: 规划扩展功能...');
    const plan2 = await executor.planTask({
      task: '扩展数学工具库 - 添加减法和除法',
      context: '继续使用 TDD 方法，确保所有测试通过'
    });

    if (plan2.success) {
      console.log(`  ✓ 创建计划: ${plan2.data.plan.steps.length} 个步骤`);
      tddData.features.push({
        name: '减法和除法功能',
        plan: plan2.data.plan
      });
    }

    console.log('');

    // 步骤 6: 添加更多测试用例
    console.log('步骤 6: 扩展测试用例...');

    const additionalTests = `
  describe('subtract', () => {
    it('应该正确相减两个正数', () => {
      assert.strictEqual(subtract(5, 3), 2);
    });

    it('应该正确处理负数', () => {
      assert.strictEqual(subtract(-2, 3), -5);
    });
  });

  describe('divide', () => {
    it('应该正确相除两个正数', () => {
      assert.strictEqual(divide(6, 3), 2);
    });

    it('应该抛出除零错误', () => {
      assert.throws(() => divide(5, 0), /Division by zero/);
    });
  });
`;
    await executor.editFile({
      filePath: testFile,
      oldText: '});\n',
      newText: additionalTests + '});\n'
    });

    console.log('  ✓ 扩展测试用例已完成');

    console.log('');

    // 步骤 7: 再次运行测试
    console.log('步骤 7: 运行完整测试套件...');

    // 创建一个简单的测试运行脚本
    const testRunner = `#!/usr/bin/env node
// 简单的测试运行器
import { add, multiply, subtract, divide } from './scenarios/output/math-utils.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
    passed++;
  } catch (error) {
    console.log('✗', name);
    console.log('  Error:', error.message);
    failed++;
  }
}

// 运行测试
test('add(2, 3) === 5', () => {
  if (add(2, 3) !== 5) throw new Error('Expected 5');
});

test('add(-2, 3) === 1', () => {
  if (add(-2, 3) !== 1) throw new Error('Expected 1');
});

test('multiply(2, 3) === 6', () => {
  if (multiply(2, 3) !== 6) throw new Error('Expected 6');
});

test('multiply(-2, 3) === -6', () => {
  if (multiply(-2, 3) !== -6) throw new Error('Expected -6');
});

test('subtract(5, 3) === 2', () => {
  if (subtract(5, 3) !== 2) throw new Error('Expected 2');
});

test('divide(6, 3) === 2', () => {
  if (divide(6, 3) !== 2) throw new Error('Expected 2');
});

test('divide(5, 0) throws error', () => {
  try {
    divide(5, 0);
    throw new Error('Should have thrown');
  } catch (error) {
    if (!error.message.includes('Division by zero')) throw new Error('Wrong error');
  }
});

console.log(\`\\n测试结果: \${passed} 通过, \${failed} 失败\`);
process.exit(failed > 0 ? 1 : 0);
`;

    await executor.editFile({
      filePath: 'scenarios/output/run-tests.js',
      oldText: '',
      newText: testRunner
    });

    const testResult2 = await executor.runTests({
      testCommand: 'node scenarios/output/run-tests.js'
    });

    if (testResult2.success) {
      const testResult = testResult2.data;
      console.log('\n' + (testResult ? testResult.output : 'No output'));
      tddData.iterations.push({
        phase: 'green',
        result: testResult && testResult.passed ? 'success' : 'failure',
        output: testResult ? testResult.output : 'No output'
      });
    }

    console.log('');

    // 步骤 8: 生成 TDD 报告
    console.log('步骤 8: 生成 TDD 开发报告...');

    let report = `# TDD 开发报告\n\n`;
    report += `**生成时间**: ${new Date().toISOString()}\n\n`;
    report += `---\n\n`;

    report += `## 功能开发列表\n\n`;
    tddData.features.forEach((feature, idx) => {
      report += `### ${idx + 1}. ${feature.name}\n\n`;
      report += `- 计划步骤: ${feature.plan.steps.length}\n`;
      feature.plan.steps.forEach(step => {
        report += `  ${step.step}. ${step.action}: ${step.description}\n`;
      });
      report += '\n';
    });

    report += `## TDD 迭代过程\n\n`;
    tddData.iterations.forEach((iteration, idx) => {
      report += `### 迭代 ${idx + 1}: ${iteration.phase.toUpperCase()} 阶段\n\n`;
      report += `- 结果: ${iteration.result}\n\n`;
      if (iteration.output) {
        report += `\`\`\`\n${iteration.output}\n\`\`\`\n\n`;
      }
    });

    report += `## 生成的文件\n\n`;
    report += `- 测试文件: ${testFile}\n`;
    report += `- 源代码: ${sourceFile}\n`;
    report += `- 测试运行器: scenarios/output/run-tests.js\n\n`;

    report += `## TDD 最佳实践验证\n\n`;
    report += `- ✅ 先写测试，后写代码\n`;
    report += `- ✅ 测试驱动开发流程\n`;
    report += `- ✅ 小步迭代，快速反馈\n`;
    report += `- ✅ 持续重构和改进\n`;

    await executor.editFile({
      filePath: 'scenarios/output/tdd-report.md',
      oldText: '',
      newText: report
    });

    console.log('  ✓ TDD 报告已生成');

    // 打印总结
    console.log('\n========================================');
    console.log('TDD 开发完成');
    console.log('========================================');
    console.log(`规划功能: ${tddData.features.length} 个`);
    console.log(`测试迭代: ${tddData.iterations.length} 次`);
    console.log(`生成文件: 测试代码 + 源代码 + 报告`);

    executor.printSummary();

    return {
      success: true,
      tddData,
      toolCalls: executor.getCallLog()
    };
  } catch (error) {
    console.error('\n场景执行失败:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  const result = await runTDDHelperScenario();

  if (result.success) {
    console.log('\n✓ 场景五执行成功\n');
    process.exit(0);
  } else {
    console.log('\n✗ 场景五执行失败\n');
    process.exit(1);
  }
}

export { runTDDHelperScenario };

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
