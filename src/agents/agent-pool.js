/**
 * Agent 池管理器
 *
 * 负责管理多个 agents 的并发执行
 * - Agent 池管理
 * - 并发限制（最多 N 个同时运行）
 * - 资源隔离
 * - 批量执行支持
 * - 性能监控
 */

import { v4 as uuidv4 } from 'uuid';
import { createAgentExecutor } from './agent-executor.js';

/**
 * Agent 池类
 */
export class AgentPool {
  constructor(config) {
    this.config = config;
    this.maxConcurrent = config.agents?.maxConcurrent || 3;
    this.timeout = config.agents?.timeout || 60000;
    
    // Agent 执行器
    this.executor = createAgentExecutor(config);
    
    // 运行中的 agents
    this.runningAgents = new Map();
    
    // 等待队列
    this.waitingQueue = [];
    
    // 性能统计
    this.stats = {
      totalExecuted: 0,
      totalSucceeded: 0,
      totalFailed: 0,
      totalTerminated: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      peakConcurrent: 0,
      lastResetTime: Date.now()
    };
  }

  /**
   * 执行单个 agent
   * @param {Object} options - Agent 配置
   * @returns {Promise<Object>} Agent 执行结果
   */
  async executeAgent(options) {
    const agentId = uuidv4();
    
    return this._addToQueue(agentId, options);
  }

  /**
   * 批量执行多个 agents
   * @param {Array} tasks - 任务数组
   * @returns {Promise<Array>} 所有执行结果
   */
  async executeBatch(tasks) {
    const agentIds = tasks.map(() => uuidv4());
    
    // 创建所有 promises
    const promises = tasks.map((task, index) => 
      this._addToQueue(agentIds[index], task)
    );
    
    // 等待所有完成
    const results = await Promise.allSettled(promises);
    
    // 转换结果格式
    return results.map((result, index) => ({
      agentId: agentIds[index],
      status: result.status,
      success: result.status === 'fulfilled',
      result: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null
    }));
  }

  /**
   * 添加 agent 到等待队列并执行
   * @param {string} agentId - Agent ID
   * @param {Object} options - Agent 配置
   * @returns {Promise<Object>} 执行结果
   * @private
   */
  async _addToQueue(agentId, options) {
    return new Promise((resolve, reject) => {
      // 添加到等待队列
      this.waitingQueue.push({
        agentId,
        options,
        resolve,
        reject,
        queuedTime: Date.now()
      });
      
      // 尝试启动
      this._tryStartNext();
    });
  }

  /**
   * 尝试启动下一个 agent
   * @private
   */
  _tryStartNext() {
    // 如果已达到并发限制，等待
    if (this.runningAgents.size >= this.maxConcurrent) {
      return;
    }
    
    // 如果没有等待的任务，返回
    if (this.waitingQueue.length === 0) {
      return;
    }
    
    // 从队列中取出下一个任务
    const task = this.waitingQueue.shift();
    
    // 启动 agent
    this._startAgent(task);
    
    // 尝试启动更多（如果还有空闲槽位）
    this._tryStartNext();
  }

  /**
   * 启动单个 agent
   * @param {Object} task - 任务对象
   * @private
   */
  async _startAgent(task) {
    const { agentId, options, resolve, reject } = task;
    
    // 更新峰值并发数
    if (this.runningAgents.size > this.stats.peakConcurrent) {
      this.stats.peakConcurrent = this.runningAgents.size;
    }
    
    // 添加到运行中的 agents
    this.runningAgents.set(agentId, {
      id: agentId,
      options,
      startTime: Date.now(),
      status: 'running'
    });
    
    try {
      // 执行 agent
      const result = await this.executor.executeAgent({
        ...options,
        agentId
      });
      
      // 从运行中移除
      this.runningAgents.delete(agentId);
      
      // 更新统计
      this._updateStats(result);
      
      // 尝试启动下一个
      this._tryStartNext();
      
      // 返回结果
      resolve(result);
      
    } catch (error) {
      // 从运行中移除
      this.runningAgents.delete(agentId);
      
      // 更新统计
      this.stats.totalFailed++;
      
      // 尝试启动下一个
      this._tryStartNext();
      
      // 返回错误
      reject(error);
    }
  }

  /**
   * 更新性能统计
   * @param {Object} result - 执行结果
   * @private
   */
  _updateStats(result) {
    this.stats.totalExecuted++;
    
    if (result.success) {
      this.stats.totalSucceeded++;
    } else {
      this.stats.totalFailed++;
    }
    
    if (result.executionTime) {
      this.stats.totalExecutionTime += result.executionTime;
      this.stats.averageExecutionTime = 
        this.stats.totalExecutionTime / this.stats.totalExecuted;
    }
  }

  /**
   * 获取 agent 状态
   * @param {string} agentId - Agent ID
   * @returns {Object|null} Agent 状态
   */
  getAgentStatus(agentId) {
    // 检查运行中的 agents
    const running = this.runningAgents.get(agentId);
    if (running) {
      return {
        ...running,
        executionTime: Date.now() - running.startTime
      };
    }
    
    // 检查执行器中的历史记录
    return this.executor.getAgentStatus(agentId);
  }

  /**
   * 列出所有运行中的 agents
   * @returns {Array} Agent 列表
   */
  listRunningAgents() {
    return Array.from(this.runningAgents.values()).map(agent => ({
      id: agent.id,
      status: agent.status,
      prompt: agent.options.prompt?.substring(0, 100) + 
              (agent.options.prompt?.length > 100 ? '...' : ''),
      startTime: agent.startTime,
      executionTime: Date.now() - agent.startTime
    }));
  }

  /**
   * 列出等待队列中的 agents
   * @returns {Array} 等待队列
   */
  listWaitingAgents() {
    return this.waitingQueue.map(task => ({
      id: task.agentId,
      prompt: task.options.prompt?.substring(0, 100) +
              (task.options.prompt?.length > 100 ? '...' : ''),
      queuedTime: task.queuedTime
    }));
  }

  /**
   * 终止一个 agent
   * @param {string} agentId - Agent ID
   * @returns {boolean} 是否成功终止
   */
  terminateAgent(agentId) {
    // 检查运行中的 agents
    const running = this.runningAgents.get(agentId);
    if (running) {
      this.runningAgents.delete(agentId);
      this.stats.totalTerminated++;
      this._tryStartNext();
      return true;
    }
    
    // 检查等待队列
    const waitingIndex = this.waitingQueue.findIndex(
      task => task.agentId === agentId
    );
    if (waitingIndex !== -1) {
      const task = this.waitingQueue[waitingIndex];
      this.waitingQueue.splice(waitingIndex, 1);
      task.reject(new Error('Agent terminated before start'));
      return true;
    }
    
    // 检查执行器中的历史记录
    return this.executor.terminateAgent(agentId);
  }

  /**
   * 获取性能统计
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.lastResetTime,
      currentlyRunning: this.runningAgents.size,
      currentlyWaiting: this.waitingQueue.length,
      successRate: this.stats.totalExecuted > 0 
        ? (this.stats.totalSucceeded / this.stats.totalExecuted * 100).toFixed(2) + '%'
        : 'N/A'
    };
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalExecuted: 0,
      totalSucceeded: 0,
      totalFailed: 0,
      totalTerminated: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      peakConcurrent: 0,
      lastResetTime: Date.now()
    };
  }

  /**
   * 清理已完成的 agents
   */
  cleanup() {
    this.executor.cleanupCompletedAgents();
  }

  /**
   * 获取池状态
   * @returns {Object} 池状态
   */
  getPoolStatus() {
    return {
      maxConcurrent: this.maxConcurrent,
      currentlyRunning: this.runningAgents.size,
      currentlyWaiting: this.waitingQueue.length,
      availableSlots: this.maxConcurrent - this.runningAgents.size,
      stats: this.getStats()
    };
  }
}

/**
 * 全局 Agent Pool 实例
 */
let globalAgentPool = null;

/**
 * 获取全局 Agent Pool 实例
 * @param {Object} config - 配置对象
 * @returns {AgentPool} Agent Pool 实例
 */
export function getGlobalAgentPool(config) {
  if (!globalAgentPool) {
    globalAgentPool = new AgentPool(config);
  }
  return globalAgentPool;
}

/**
 * 创建 Agent Pool 的工厂函数
 * @param {Object} config - 配置对象
 * @returns {AgentPool} Agent Pool 实例
 */
export function createAgentPool(config) {
  return new AgentPool(config);
}
