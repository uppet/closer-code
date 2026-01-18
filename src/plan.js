/**
 * Plan 类 - 任务计划管理
 */

import crypto from 'crypto';

/**
 * 生成唯一ID
 */
function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Plan 状态
 */
export const PlanStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Step 状态
 */
export const StepStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Plan 类型
 */
export const PlanType = {
  COMMAND: 'command',  // /plan 命令创建
  AUTO: 'auto'        // AI 自动创建
};

/**
 * Plan 类
 */
export class Plan {
  constructor(description, type = PlanType.AUTO) {
    this.id = generateId();
    this.type = type;
    this.description = description;
    this.status = PlanStatus.PENDING;
    this.steps = [];
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
    this.metadata = {};
  }

  /**
   * 添加步骤
   */
  addStep(description) {
    const step = {
      id: generateId(),
      description,
      status: StepStatus.PENDING,
      result: null
    };
    this.steps.push(step);
    this.updatedAt = Date.now();
    return step;
  }

  /**
   * 开始执行计划
   */
  start() {
    this.status = PlanStatus.IN_PROGRESS;
    this.updatedAt = Date.now();
  }

  /**
   * 完成计划
   */
  complete() {
    this.status = PlanStatus.COMPLETED;
    this.updatedAt = Date.now();
  }

  /**
   * 标记计划失败
   */
  fail(error) {
    this.status = PlanStatus.FAILED;
    this.metadata.error = error;
    this.updatedAt = Date.now();
  }

  /**
   * 更新步骤状态
   */
  updateStep(stepId, status, result = null) {
    const step = this.steps.find(s => s.id === stepId);
    if (step) {
      step.status = status;
      if (result !== null) {
        step.result = result;
      }
      this.updatedAt = Date.now();

      // 如果所有步骤都完成，标记计划为完成
      if (this.steps.every(s => s.status === StepStatus.COMPLETED)) {
        this.complete();
      }
    }
    return step;
  }

  /**
   * 获取当前正在执行的步骤
   */
  getCurrentStep() {
    return this.steps.find(s => s.status === StepStatus.IN_PROGRESS);
  }

  /**
   * 获取下一个待执行的步骤
   */
  getNextStep() {
    return this.steps.find(s => s.status === StepStatus.PENDING);
  }

  /**
   * 获取进度信息
   */
  getProgress() {
    const total = this.steps.length;
    const completed = this.steps.filter(s => s.status === StepStatus.COMPLETED).length;
    const inProgress = this.steps.filter(s => s.status === StepStatus.IN_PROGRESS).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      inProgress,
      percentage,
      failed: this.steps.filter(s => s.status === StepStatus.FAILED).length
    };
  }

  /**
   * 获取简略的进度摘要
   */
  getSummary() {
    const progress = this.getProgress();
    const statusEmoji = {
      [PlanStatus.PENDING]: '⏳',
      [PlanStatus.IN_PROGRESS]: '⚙️',
      [PlanStatus.COMPLETED]: '✅',
      [PlanStatus.FAILED]: '❌'
    };

    return `${statusEmoji[this.status]} ${progress.completed}/${progress.total} (${progress.percentage}%)`;
  }

  /**
   * 转换为简单对象（用于序列化）
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      description: this.description,
      status: this.status,
      steps: this.steps,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata
    };
  }

  /**
   * 从简单对象创建 Plan 实例
   */
  static fromJSON(data) {
    const plan = new Plan(data.description, data.type);
    plan.id = data.id;
    plan.status = data.status;
    plan.steps = data.steps;
    plan.createdAt = data.createdAt;
    plan.updatedAt = data.updatedAt;
    plan.metadata = data.metadata || {};
    return plan;
  }
}
