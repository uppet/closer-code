/**
 * Agent Cleanup Scheduler - Agent 结果自动清理调度器
 *
 * 负责定期清理过期的 agent 结果文件
 */

import { getGlobalAgentStorage } from './agent-storage.js';

/**
 * Agent 清理调度器
 */
export class AgentCleanupScheduler {
  constructor(options = {}) {
    this.cleanupInterval = options.cleanupInterval || 24 * 60 * 60 * 1000; // 每天清理一次
    this.maxAge = options.maxAge || 7 * 24 * 60 * 60 * 1000; // 7天过期
    this.projectRoot = options.projectRoot || process.cwd();
    this.intervalId = null;
    this.isRunning = false;
  }

  /**
   * 启动定期清理任务
   */
  start() {
    if (this.isRunning) {
      console.warn('[AgentCleanup] Cleanup scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log(`[AgentCleanup] Starting cleanup scheduler (interval: ${this.cleanupInterval}ms)`);

    // 立即执行一次清理
    this.cleanup().catch(error => {
      console.error('[AgentCleanup] Initial cleanup failed:', error);
    });

    // 设置定期清理
    this.intervalId = setInterval(() => {
      this.cleanup().catch(error => {
        console.error('[AgentCleanup] Scheduled cleanup failed:', error);
      });
    }, this.cleanupInterval);
  }

  /**
   * 停止定期清理任务
   */
  stop() {
    if (!this.isRunning) {
      console.warn('[AgentCleanup] Cleanup scheduler is not running');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('[AgentCleanup] Cleanup scheduler stopped');
  }

  /**
   * 执行清理
   * @returns {Promise<number>} 删除的 agent 数量
   */
  async cleanup() {
    const startTime = Date.now();
    console.log('[AgentCleanup] Starting cleanup...');

    try {
      const storage = getGlobalAgentStorage({ 
        projectRoot: this.projectRoot,
        maxAge: this.maxAge
      });
      const deleted = await storage.cleanupExpiredAgents();

      const duration = Date.now() - startTime;
      
      if (deleted > 0) {
        console.log(`[AgentCleanup] Deleted ${deleted} expired agent results (${duration}ms)`);
      } else {
        console.log(`[AgentCleanup] No expired agents found (${duration}ms)`);
      }

      return deleted;
    } catch (error) {
      console.error('[AgentCleanup] Cleanup failed:', error);
      throw error;
    }
  }

  /**
   * 手动触发清理（用于测试）
   * @returns {Promise<number>} 删除的 agent 数量
   */
  async forceCleanup() {
    console.log('[AgentCleanup] Force cleanup triggered');
    return await this.cleanup();
  }

  /**
   * 获取清理统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStats() {
    const storage = getGlobalAgentStorage({ projectRoot: this.projectRoot });
    const stats = await storage.getStats();

    return {
      ...stats,
      cleanupInterval: this.cleanupInterval,
      maxAge: this.maxAge,
      isRunning: this.isRunning
    };
  }
}

/**
 * 全局清理调度器实例
 */
let globalScheduler = null;

/**
 * 获取全局清理调度器
 * @param {Object} options - 配置选项
 * @returns {AgentCleanupScheduler} 清理调度器实例
 */
export function getGlobalCleanupScheduler(options = {}) {
  if (!globalScheduler) {
    globalScheduler = new AgentCleanupScheduler(options);
  }
  return globalScheduler;
}

/**
 * 启动全局清理调度器
 * @param {Object} options - 配置选项
 * @returns {AgentCleanupScheduler} 清理调度器实例
 */
export function startCleanupScheduler(options = {}) {
  const scheduler = getGlobalCleanupScheduler(options);
  scheduler.start();
  return scheduler;
}

/**
 * 停止全局清理调度器
 */
export function stopCleanupScheduler() {
  if (globalScheduler) {
    globalScheduler.stop();
  }
}

/**
 * 重置全局清理调度器（用于测试）
 */
export function resetGlobalCleanupScheduler() {
  if (globalScheduler) {
    globalScheduler.stop();
  }
  globalScheduler = null;
}
