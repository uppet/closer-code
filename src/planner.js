/**
 * 任务规划和执行引擎
 */

import { createAIClient } from './ai-client.js';
import { ToolExecutor } from './tools.js';
import { loadMemory, saveMemory } from './config.js';

// 任务状态
export const TaskStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  BLOCKED: 'blocked'
};

// 步骤状态
export const StepStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped'
};

/**
 * 任务计划
 */
export class TaskPlan {
  constructor(description, steps = []) {
    this.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    this.description = description;
    this.steps = steps;
    this.status = TaskStatus.PENDING;
    this.currentStep = 0;
    this.createdAt = new Date().toISOString();
    this.startedAt = null;
    this.completedAt = null;
    this.error = null;
  }

  start() {
    this.status = TaskStatus.IN_PROGRESS;
    this.startedAt = new Date().toISOString();
  }

  complete() {
    this.status = TaskStatus.COMPLETED;
    this.completedAt = new Date().toISOString();
  }

  fail(error) {
    this.status = TaskStatus.FAILED;
    this.error = error;
    this.completedAt = new Date().toISOString();
  }

  getCurrentStep() {
    return this.steps[this.currentStep];
  }

  advanceStep() {
    this.currentStep++;
  }

  getProgress() {
    const completed = this.steps.filter(s => s.status === StepStatus.COMPLETED).length;
    return {
      completed,
      total: this.steps.length,
      percentage: this.steps.length > 0 ? (completed / this.steps.length) * 100 : 0
    };
  }
}

/**
 * 任务规划器
 */
export class TaskPlanner {
  constructor(config) {
    this.config = config;
    this._aiClientPromise = createAIClient(config);
    this.toolExecutor = new ToolExecutor(config);
    this.memory = loadMemory();
  }

  // 延迟初始化的 getter
  async getAIClient() {
    return await this._aiClientPromise;
  }

  /**
   * 为用户请求创建任务计划
   */
  async planTask(userRequest, context = {}) {
    const systemPrompt = `You are an expert software developer and task planner.
When given a user request, break it down into clear, actionable steps.

Guidelines:
- Break complex tasks into smaller, verifiable steps
- Each step should have a clear description and expected outcome
- Consider dependencies between steps
- Include validation steps to verify success
- Estimate which steps might need human confirmation

Output format: Return a JSON object with:
{
  "description": "Brief description of the overall task",
  "steps": [
    {
      "description": "What this step does",
      "action": "tool_name",
      "input": { ...tool_input },
      "expectedResult": "What success looks like",
      "requiresConfirmation": false,
      "dependencies": []
    }
  ]
}`;

    const messages = [
      {
        role: 'user',
        content: `Create a task plan for: ${userRequest}

${context ? `Additional context:\n${context}` : ''}

Consider the available tools: bash, readFile, writeFile, editFile, searchFiles, searchCode, listFiles, runTests

Respond with only the JSON plan, no additional text.`
      }
    ];

    try {
      const aiClient = await this.getAIClient();
      const response = await aiClient.chat(messages, { systemPrompt });
      const text = response.content.find(c => c.type === 'text')?.text || '{}';
      const planData = JSON.parse(text);

      return new TaskPlan(planData.description, planData.steps);
    } catch (error) {
      console.error('Failed to create plan:', error.message);
      throw error;
    }
  }

  /**
   * 执行任务计划
   */
  async executePlan(plan, onProgress = null) {
    plan.start();

    if (onProgress) {
      onProgress({ type: 'plan_started', plan });
    }

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];

      // 检查依赖
      if (step.dependencies) {
        for (const depIndex of step.dependencies) {
          const depStep = plan.steps[depIndex];
          if (depStep.status !== StepStatus.COMPLETED) {
            step.status = StepStatus.BLOCKED;
            plan.status = TaskStatus.BLOCKED;
            if (onProgress) {
              onProgress({ type: 'step_blocked', step, dependency: depIndex });
            }
            return plan;
          }
        }
      }

      // 执行步骤
      step.status = StepStatus.IN_PROGRESS;
      if (onProgress) {
        onProgress({ type: 'step_started', step, progress: plan.getProgress() });
      }

      try {
        const result = await this.executeStep(step);

        if (result.success) {
          step.status = StepStatus.COMPLETED;
          step.result = result.data;

          if (onProgress) {
            onProgress({ type: 'step_completed', step, result, progress: plan.getProgress() });
          }
        } else {
          step.status = StepStatus.FAILED;
          step.error = result.error;

          if (onProgress) {
            onProgress({ type: 'step_failed', step, error: result.error });
          }

          // 根据配置决定是否继续
          if (this.config.behavior.maxRetries > 0) {
            // 可以在这里添加重试逻辑
          }
          plan.fail(result.error);
          return plan;
        }
      } catch (error) {
        step.status = StepStatus.FAILED;
        step.error = error.message;

        if (onProgress) {
          onProgress({ type: 'step_failed', step, error: error.message });
        }

        plan.fail(error.message);
        return plan;
      }

      plan.advanceStep();
    }

    plan.complete();

    if (onProgress) {
      onProgress({ type: 'plan_completed', plan });
    }

    // 保存到记忆
    this.saveToMemory(plan);

    return plan;
  }

  /**
   * 执行单个步骤
   */
  async executeStep(step) {
    if (step.action === 'plan') {
      // 子计划，递归执行
      const subPlan = await this.planTask(step.description, step.input?.context);
      return { success: true, data: { plan: subPlan } };
    }

    if (!this.toolExecutor.isToolEnabled(step.action)) {
      return { success: false, error: `Tool '${step.action}' is not enabled` };
    }

    return await this.toolExecutor.execute(step.action, step.input || {});
  }

  /**
   * 保存计划到记忆
   */
  saveToMemory(plan) {
    if (!this.memory.projects) {
      this.memory.projects = {};
    }

    const projectKey = this.config.behavior.workingDir || 'default';
    if (!this.memory.projects[projectKey]) {
      this.memory.projects[projectKey] = {
        plans: [],
        patterns: {},
        lessons: []
      };
    }

    this.memory.projects[projectKey].plans.push({
      id: plan.id,
      description: plan.description,
      status: plan.status,
      stepCount: plan.steps.length,
      createdAt: plan.createdAt
    });

    saveMemory(this.memory);
  }

  /**
   * 从项目中学习模式
   */
  async learnFromProject() {
    const systemPrompt = `Analyze the codebase and identify patterns, conventions, and best practices.

Focus on:
- Project structure and organization
- Naming conventions
- Common patterns used
- Dependencies and their purposes
- Testing approach
- Build and deployment setup

Respond with a JSON object describing the patterns found.`;

    // 读取关键文件
    const files = ['package.json', 'README.md', '.gitignore', 'tsconfig.json'];

    const context = [];
    for (const file of files) {
      try {
        const result = await this.toolExecutor.readFile({ filePath: file });
        if (result.success) {
          context.push(`=== ${file} ===\n${result.data.content}`);
        }
      } catch (error) {
        // 文件可能不存在
      }
    }

    const messages = [
      {
        role: 'user',
        content: `Analyze this project:\n\n${context.join('\n\n')}`
      }
    ];

    try {
      const aiClient = await this.getAIClient();
      const response = await aiClient.chat(messages, { systemPrompt });
      const text = response.content.find(c => c.type === 'text')?.text || '{}';
      const patterns = JSON.parse(text);

      const projectKey = this.config.behavior.workingDir || 'default';
      if (!this.memory.projects[projectKey]) {
        this.memory.projects[projectKey] = { plans: [], patterns: {}, lessons: [] };
      }

      this.memory.projects[projectKey].patterns = patterns;
      saveMemory(this.memory);

      return patterns;
    } catch (error) {
      console.error('Failed to learn from project:', error.message);
      return null;
    }
  }
}

/**
 * 问题诊断器
 */
export class ProblemDiagnoser {
  constructor(config) {
    this.config = config;
    this._aiClientPromise = createAIClient(config);
    this.toolExecutor = new ToolExecutor(config);
  }

  // 延迟初始化的 getter
  async getAIClient() {
    return await this._aiClientPromise;
  }

  /**
   * 诊断错误
   */
  async diagnose(error, context = {}) {
    const systemPrompt = `You are an expert debugger. Analyze errors and provide:
1. Root cause analysis
2. Specific solutions
3. Prevention strategies
4. Related code to check

Be concise and actionable.`;

    // 收集上下文信息
    const contextInfo = await this.gatherContext(context);

    const messages = [
      {
        role: 'user',
        content: `Diagnose this error:

${error}

${contextInfo ? `\nContext:\n${contextInfo}` : ''}`
      }
    ];

    const aiClient = await this.getAIClient();
    const response = await aiClient.chat(messages, { systemPrompt });
    return response.content.find(c => c.type === 'text')?.text;
  }

  /**
   * 收集诊断上下文
   */
  async gatherContext(context) {
    const info = [];

    // 添加环境信息
    info.push(`Node.js: ${process.version}`);
    info.push(`Platform: ${process.platform}`);
    info.push(`CWD: ${process.cwd()}`);

    // 添加项目信息
    try {
      const packageResult = await this.toolExecutor.readFile({ filePath: 'package.json' });
      if (packageResult.success) {
        const pkg = JSON.parse(packageResult.data.content);
        info.push(`Project: ${pkg.name} v${pkg.version}`);
        info.push(`Dependencies: ${Object.keys(pkg.dependencies || {}).length}`);
      }
    } catch (error) {
      // 忽略
    }

    return info.join('\n');
  }
}
