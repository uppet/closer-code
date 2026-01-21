/**
 * Plan Manager - 计划管理
 *
 * 负责：
 * - Plan 创建和执行
 * - 项目学习
 * - 步骤管理
 * - AI Planning 检测和更新
 */

import { Plan, PlanType, PlanStatus, StepStatus } from '../plan.js';
import { safeJSONParse } from '../utils/json-repair.js';

export class PlanManager {
  constructor(conversation) {
    this.conversation = conversation;
    this.currentPlan = null;
  }

  /**
   * 创建计划
   * @param {string} description - 计划描述
   * @param {string} type - 计划类型
   * @returns {Plan} 计划对象
   */
  createPlan(description, type = PlanType.AUTO) {
    const plan = new Plan(description, type);
    this.currentPlan = plan;
    return plan;
  }

  /**
   * 执行计划（/plan 命令）
   * @param {string} taskDescription - 任务描述
   * @param {Function} onProgress - 进度回调
   * @returns {Promise<Object>} 执行结果
   */
  async planAndExecute(taskDescription, onProgress) {
    try {
      // 创建计划
      const plan = this.createPlan(taskDescription, PlanType.COMMAND);

      if (typeof onProgress === 'function') {
        onProgress({
          type: 'plan_created',
          plan
        });
      }

      // 让 AI 分析任务并生成步骤
      plan.start();

      // 添加分析步骤
      const analysisStep = plan.addStep('分析任务需求');
      plan.updateStep(analysisStep.id, StepStatus.IN_PROGRESS);

      // 发送任务给 AI，让它生成执行步骤
      const prompt = `请分析以下任务，并生成详细的执行步骤列表。每个步骤应该是一个具体的、可执行的操作。

任务：${taskDescription}

请以 JSON 格式返回步骤列表，格式如下：
[
  {"description": "步骤1描述"},
  {"description": "步骤2描述"},
  ...
]

只返回 JSON，不要其他内容。`;

      const analysis = await this.conversation.sendMessage(prompt);

      // 解析 AI 返回的步骤
      let steps = [];
      try {
        // 尝试从响应中提取 JSON
        const jsonMatch = analysis.content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          steps = safeJSONParse(jsonMatch[0], {
          fallback: [{ description: taskDescription }]
        });
        }
      } catch (error) {
        console.error('Failed to parse steps:', error);
        // 如果解析失败，使用默认步骤
        steps = [{ description: taskDescription }];
      }

      plan.updateStep(analysisStep.id, StepStatus.COMPLETED);

      // 添加解析出的步骤
      steps.forEach(step => {
        plan.addStep(step.description);
      });

      if (typeof onProgress === 'function') {
        onProgress({
          type: 'plan_ready',
          plan
        });
      }

      // 逐步执行
      for (const step of plan.steps) {
        if (step.status === StepStatus.PENDING) {
          plan.updateStep(step.id, StepStatus.IN_PROGRESS);

          if (typeof onProgress === 'function') {
            onProgress({
              type: 'step_start',
              plan,
              step
            });
          }

          // 让 AI 执行这个步骤
          try {
            const result = await this.conversation.sendMessage(`执行步骤：${step.description}`);
            plan.updateStep(step.id, StepStatus.COMPLETED, result);

            if (typeof onProgress === 'function') {
              onProgress({
                type: 'step_complete',
                plan,
                step
              });
            }
          } catch (error) {
            plan.updateStep(step.id, StepStatus.FAILED, error.message);

            if (typeof onProgress === 'function') {
              onProgress({
                type: 'step_failed',
                plan,
                step,
                error
              });
            }

            // 失败后停止执行
            plan.fail(error.message);
            break;
          }
        }
      }

      return {
        success: plan.status !== PlanStatus.FAILED,
        plan
      };
    } catch (error) {
      console.error('planAndExecute error:', error);
      if (this.currentPlan) {
        this.currentPlan.fail(error.message);
      }
      throw error;
    }
  }

  /**
   * 学习项目模式（/learn 命令）
   * @returns {Promise<Object>} 学习结果
   */
  async learnProject() {
    const plan = this.createPlan('学习项目模式和代码结构', PlanType.COMMAND);
    plan.start();

    // 添加学习步骤
    const steps = [
      '读取项目配置文件 (package.json, README.md)',
      '分析源代码目录结构',
      '识别主要模块和依赖关系',
      '总结项目模式和最佳实践'
    ];

    steps.forEach(desc => plan.addStep(desc));

    // 执行学习
    for (const step of plan.steps) {
      step.status = StepStatus.IN_PROGRESS;

      try {
        // 根据步骤描述执行相应的操作
        if (step.description.includes('package.json')) {
          await this.conversation.sendMessage('读取并分析 package.json 文件');
        } else if (step.description.includes('README')) {
          await this.conversation.sendMessage('读取并分析 README.md 文件');
        } else if (step.description.includes('目录结构')) {
          await this.conversation.sendMessage('列出并分析项目的目录结构');
        } else if (step.description.includes('模块')) {
          await this.conversation.sendMessage('分析项目的主要模块和依赖关系');
        } else if (step.description.includes('总结')) {
          await this.conversation.sendMessage('总结这个项目的模式和最佳实践');
        }

        step.status = StepStatus.COMPLETED;
      } catch (error) {
        step.status = StepStatus.FAILED;
        step.result = error.message;
      }
    }

    plan.complete();

    return {
      success: true,
      plan
    };
  }

  /**
   * 检测并创建 AI Planning（自动检测）
   * @param {string} toolName - 工具名称
   * @param {Object} toolInput - 工具输入
   * @returns {Plan|null} 计划对象或 null
   */
  detectAIPlanning(toolName, toolInput) {
    // 检测是否在写入 .closer_plan/ 目录
    if (toolName === 'writeFile' && toolInput.filePath) {
      const filePath = toolInput.filePath;
      if (filePath.includes('.closer_plan/') || filePath.includes('.closer_plan\\')) {
        // 提取文件名作为任务描述
        const fileName = filePath.split('/').pop().split('\\').pop();
        const description = `AI Planning: ${fileName.replace('.md', '')}`;

        // 如果当前没有 plan，或者 plan 类型不匹配，创建新的
        if (!this.currentPlan || this.currentPlan.type !== PlanType.AUTO) {
          const plan = this.createPlan(description, PlanType.AUTO);
          plan.start();

          // 添加步骤
          plan.addStep('分析任务需求');
          plan.addStep('执行操作');
          plan.addStep('生成规划文档');

          // 标记第一个步骤为进行中
          const firstStep = plan.steps[0];
          plan.updateStep(firstStep.id, StepStatus.IN_PROGRESS);

          return plan;
        }
      }
    }

    return null;
  }

  /**
   * 更新 AI Planning 步骤
   * @param {string} toolName - 工具名称
   * @param {string} result - 工具执行结果
   * @returns {boolean} 是否更新成功
   */
  updateAIPlanningStep(toolName, result) {
    if (this.currentPlan && this.currentPlan.type === PlanType.AUTO) {
      const currentStep = this.currentPlan.getCurrentStep();
      if (currentStep) {
        // 标记当前步骤完成
        this.currentPlan.updateStep(currentStep.id, StepStatus.COMPLETED, result);

        // 开始下一个步骤
        const nextStep = this.currentPlan.getNextStep();
        if (nextStep) {
          this.currentPlan.updateStep(nextStep.id, StepStatus.IN_PROGRESS);
        } else {
          // 所有步骤完成
          this.currentPlan.complete();
        }

        return true;
      }
    }
    return false;
  }

  /**
   * 获取当前计划
   * @returns {Plan|null} 当前计划对象
   */
  getCurrentPlan() {
    return this.currentPlan;
  }

  /**
   * 获取状态
   * @returns {Object} 状态对象
   */
  getState() {
    return {
      hasPlan: !!this.currentPlan,
      planStatus: this.currentPlan?.status,
      planType: this.currentPlan?.type
    };
  }
}
