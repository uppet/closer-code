/**
 * Workflow 测试工具
 * 用于执行两轮对话的 workflow 测试
 */

import fs from 'fs/promises';
import path from 'path';
import { createConversation, WORKFLOW_PROMPT_PREFIX } from '../conversation.js';
import { loadConfig } from '../config.js';

/**
 * 列出所有可用的 workflow 测试
 */
export async function listWorkflows() {
  const workflowsDir = path.resolve('test/workflows');

  try {
    const entries = await fs.readdir(workflowsDir, { withFileTypes: true });
    const workflows = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const testDir = path.join(workflowsDir, entry.name);
        const promptPath = path.join(testDir, 'prompt.md');
        const expectPath = path.join(testDir, 'expect.md');

        // 检查必需的文件是否存在
        try {
          await fs.access(promptPath);
          await fs.access(expectPath);

          // 读取描述
          let description = '';
          try {
            const descPath = path.join(testDir, 'description.md');
            description = await fs.readFile(descPath, 'utf-8');
          } catch {
            // description.md 可选
          }

          workflows.push({
            name: entry.name,
            path: testDir,
            description: description.trim()
          });
        } catch {
          // 缺少必需文件，跳过
        }
      }
    }

    return workflows;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * 运行单个 workflow 测试
 * @param {string} testName - 测试名称
 * @param {Object} options - 选项
 * @returns {Object} 测试结果
 */
export async function runWorkflowTest(testName, options = {}) {
  const workflowsDir = path.resolve('test/workflows');
  const testDir = path.join(workflowsDir, testName);
  const promptPath = path.join(testDir, 'prompt.md');
  const expectPath = path.join(testDir, 'expect.md');

  // 验证测试目录存在
  try {
    await fs.access(testDir);
    await fs.access(promptPath);
    await fs.access(expectPath);
  } catch (error) {
    throw new Error(`Workflow test "${testName}" not found or incomplete`);
  }

  // 读取文件
  const prompt = await fs.readFile(promptPath, 'utf-8');
  const expect = await fs.readFile(expectPath, 'utf-8');

  // 加载配置
  const config = await loadConfig();

  // 设置工作目录为测试目录
  config.behavior.workingDir = testDir;

  // 创建对话会话（workflow 测试模式）
  const conversation = await createConversation(config, true);

  const startTime = Date.now();
  const iterations = [];

  try {
    // 第1轮：执行任务
    if (options.verbose) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`第1轮: 执行任务`);
      console.log(`${'='.repeat(60)}`);
    }

    const response1 = await conversation.sendMessage(
      WORKFLOW_PROMPT_PREFIX + '\n\n' + prompt,
      (event) => {
        if (options.verbose) {
          handleProgress(event, options);
        }
      }
    );

    iterations.push({
      round: 1,
      content: response1.content,
      toolCalls: response1.toolCalls || []
    });

    if (options.verbose) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`响应:`, response1.content);
      console.log(`${'─'.repeat(60)}`);
    }

    // 第2轮：验证结果
    if (options.verbose) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`第2轮: 验证结果`);
      console.log(`${'='.repeat(60)}`);
    }

    const response2 = await conversation.sendMessage(
      WORKFLOW_PROMPT_PREFIX + '\n\n' + expect,
      (event) => {
        if (options.verbose) {
          handleProgress(event, options);
        }
      }
    );

    iterations.push({
      round: 2,
      content: response2.content,
      toolCalls: response2.toolCalls || []
    });

    if (options.verbose) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`响应:`, response2.content);
      console.log(`${'─'.repeat(60)}`);
    }

    // 检查验收结果
    const passed = response2.content?.includes('WORKFLOW TEST AS EXPECTED');
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`\n[DEBUG] Response 2 content:`, response2.content?.substring(0, 200));
    console.log(`[DEBUG] Passed:`, passed);

    return {
      name: testName,
      passed,
      duration,
      iterations,
      error: null
    };

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.error(`[DEBUG] Error:`, error.message);
    console.error(`[DEBUG] Stack:`, error.stack);

    return {
      name: testName,
      passed: false,
      duration,
      iterations,
      error: error.message
    };
  }
}

/**
 * 处理进度事件
 */
function handleProgress(event, options) {
  switch (event.type) {
    case 'token':
      process.stdout.write(event.content);
      break;
    case 'tool_start':
      console.log(`\n[工具调用] ${event.tool}`, JSON.stringify(event.input, null, 2));
      break;
    case 'tool_complete':
      console.log(`[工具完成] ${event.tool}`);
      if (options.debug) {
        console.log(JSON.stringify(event.result, null, 2));
      }
      break;
    case 'error':
      console.error(`\n[错误]`, event.error);
      break;
  }
}

/**
 * 格式化测试结果输出
 */
export function formatTestResult(result, options = {}) {
  const { name, passed, duration, error } = result;

  if (options.json) {
    return JSON.stringify(result, null, 2);
  }

  const statusIcon = passed ? '✅' : '❌';
  const statusText = passed ? '通过' : '失败';
  const durationSec = (duration / 1000).toFixed(2);

  let output = `\n${statusIcon} ${name} - ${statusText} (${durationSec}s)`;

  if (error) {
    output += `\n   错误: ${error}`;
  }

  if (options.verbose && result.iterations) {
    result.iterations.forEach((iter, idx) => {
      output += `\n\n   第${idx + 1}轮对话:`;
      output += `\n   ${'─'.repeat(50)}`;
      output += `\n   ${iter.content.split('\n').join('\n   ')}`;

      if (iter.toolCalls && iter.toolCalls.length > 0) {
        output += `\n   工具调用: ${iter.toolCalls.join(', ')}`;
      }
    });
  }

  return output;
}

/**
 * 格式化多个测试结果
 */
export function formatTestResults(results, options = {}) {
  if (options.json) {
    return JSON.stringify(results, null, 2);
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  let output = `\n${'='.repeat(60)}`;
  output += `\nWorkflow 测试结果汇总`;
  output += `\n${'='.repeat(60)}`;
  output += `\n总计: ${total}, 通过: ${passed}, 失败: ${failed}`;
  output += `\n${'='.repeat(60)}\n`;

  results.forEach(result => {
    output += formatTestResult(result, options);
  });

  output += `\n${'='.repeat(60)}\n`;

  return output;
}
