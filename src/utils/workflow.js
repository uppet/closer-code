/**
 * Workflow 自动化执行引擎
 * 支持多轮对话迭代和验收标准验证
 */

import fs from 'fs/promises';
import path from 'path';
import { createConversation } from '../conversation.js';
import { validateExpect } from './validator.js';
import { showSuccess, showError, showInfo, showWarning } from './cli.js';

/**
 * 解析 workflow 路径
 */
function resolveWorkflowPath(workflowPath) {
  // 如果是绝对路径，直接使用
  if (path.isAbsolute(workflowPath)) {
    return workflowPath;
  }

  // 尝试相对于当前工作目录
  const relativeToCwd = path.resolve(process.cwd(), workflowPath);

  // 尝试相对于项目根目录的 workflow 目录
  const relativeToProject = path.resolve(process.cwd(), 'workflow', workflowPath);

  // 检查哪个路径存在
  return relativeToCwd; // 优先使用用户提供的路径
}

/**
 * 加载 workflow 案例
 */
async function loadWorkflowCase(workflowDir) {
  const promptPath = path.join(workflowDir, 'prompt.md');
  const expectPath = path.join(workflowDir, 'expect.md');

  let prompt, expect;

  try {
    prompt = await fs.readFile(promptPath, 'utf-8');
  } catch (error) {
    throw new Error(`无法读取 prompt.md: ${error.message}`);
  }

  try {
    expect = await fs.readFile(expectPath, 'utf-8');
  } catch (error) {
    throw new Error(`无法读取 expect.md: ${error.message}`);
  }

  return { prompt: prompt.trim(), expect: expect.trim(), workflowDir };
}

/**
 * 处理进度事件
 */
function handleProgress(event, options) {
  if (!options.verbose && !options.debug) {
    return;
  }

  switch (event.type) {
    case 'token':
      // 流式输出 token（仅在 debug 模式）
      if (options.debug) {
        process.stdout.write(event.token);
      }
      break;
    case 'tool_start':
      showInfo(`⚡ 执行工具: ${event.tool}`);
      break;
    case 'tool_complete':
      if (event.error) {
        showError(`工具 ${event.tool} 失败: ${event.error}`);
      } else {
        showSuccess(`工具 ${event.tool} 完成`);
      }
      break;
    case 'error':
      showError(`错误: ${event.error}`);
      break;
  }
}

/**
 * 运行 workflow
 */
export async function runWorkflow(workflowPath, args, options) {
  const workflowDir = resolveWorkflowPath(workflowPath);

  showInfo(`🎯 开始执行 workflow: ${workflowPath}`);

  // 1. 加载案例
  let caseData;
  try {
    caseData = await loadWorkflowCase(workflowDir);
    console.log(`\n📝 需求:\n${caseData.prompt}\n`);
    console.log(`✅ 验收标准:\n${caseData.expect}\n`);
  } catch (error) {
    showError(error.message);
    return {
      success: false,
      error: error.message
    };
  }

  // 2. 初始化配置
  const maxIterations = parseInt(options.maxIterations) || 5;
  console.log(`🔄 最大迭代次数: ${maxIterations}\n`);

  // 3. 创建对话会话
  let conversation;
  try {
    conversation = await createConversation();
  } catch (error) {
    showError(`创建对话失败: ${error.message}`);
    return {
      success: false,
      error: `Failed to create conversation: ${error.message}`
    };
  }

  // 4. 迭代执行
  let lastValidationResult = null;

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`第 ${iteration}/${maxIterations} 轮`);
    console.log('='.repeat(50));

    // 构造用户消息
    let userMessage;
    if (iteration === 1) {
      // 第一轮：发送原始需求
      userMessage = caseData.prompt;
    } else {
      // 后续轮：告知 AI 继续改进
      userMessage = `请继续改进。当前未满足验收标准：\n${caseData.expect}\n\n上次验证结果：${lastValidationResult?.reason || '请检查并改进'}`;
    }

    // 发送到 AI
    let response;
    try {
      console.log(`\n📤 发送消息到 AI...`);

      response = await conversation.sendMessage(userMessage, {
        onProgress: (event) => handleProgress(event, options)
      });

      // 显示 AI 响应摘要
      const content = response.content || '';
      const preview = content.length > 200 ? content.substring(0, 200) + '...' : content;
      console.log(`\n🤖 AI 响应:\n${preview}\n`);

    } catch (error) {
      showError(`AI 交互失败: ${error.message}`);

      return {
        success: false,
        iterations: iteration,
        error: `AI interaction failed: ${error.message}`,
        lastValidation: lastValidationResult
      };
    }

    // 5. 验证结果
    try {
      console.log(`\n🔍 验证验收标准...`);

      lastValidationResult = await validateExpect(
        caseData.expect,
        workflowDir,
        options.verbose
      );

      if (lastValidationResult.passed) {
        console.log(`\n${'='.repeat(50)}`);
        showSuccess(`✅ 验收标准已满足！`);
        console.log(`📊 总迭代次数: ${iteration}`);

        if (lastValidationResult.details) {
          console.log(`\n验证详情:`);
          lastValidationResult.details.forEach(detail => {
            console.log(`  ✓ ${detail.check}`);
          });
        }

        return {
          success: true,
          iterations: iteration,
          validation: lastValidationResult,
          response: response
        };
      } else {
        showWarning(`验证未通过: ${lastValidationResult.reason}`);

        if (lastValidationResult.details && options.verbose) {
          console.log(`\n验证详情:`);
          lastValidationResult.details.forEach(detail => {
            console.log(`  ${detail.passed ? '✓' : '✗'} ${detail.check}: ${detail.reason}`);
          });
        }
      }

    } catch (error) {
      showError(`验证失败: ${error.message}`);

      // 验证失败不应中断整个流程，记录后继续
      lastValidationResult = {
        passed: false,
        reason: `Validation error: ${error.message}`
      };
    }
  }

  // 达到最大迭代次数
  console.log(`\n${'='.repeat(50)}`);
  showError(`❌ 达到最大迭代次数 (${maxIterations})，任务未完成`);

  if (lastValidationResult) {
    console.log(`\n最后验证结果: ${lastValidationResult.reason}`);
  }

  return {
    success: false,
    iterations: maxIterations,
    reason: 'Max iterations reached',
    lastValidation: lastValidationResult
  };
}

/**
 * 列出可用的 workflow 案例
 */
export async function listWorkflows() {
  const workflowDir = path.resolve(process.cwd(), 'workflow');

  try {
    const entries = await fs.readdir(workflowDir, { withFileTypes: true });
    const workflows = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const casePath = path.join(workflowDir, entry.name);
        const promptPath = path.join(casePath, 'prompt.md');
        const expectPath = path.join(casePath, 'expect.md');

        try {
          await fs.access(promptPath);
          await fs.access(expectPath);

          workflows.push({
            name: entry.name,
            path: casePath
          });
        } catch {
          // 缺少必要文件，跳过
        }
      }
    }

    return workflows;
  } catch (error) {
    // workflow 目录不存在
    return [];
  }
}
