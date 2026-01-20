/**
 * Abort Fence 机制
 *
 * 用于管理对话阶段的中止，确保：
 * - 可以中止当前正在进行的对话
 * - 可以中止所有嵌套的工具调用
 * - 可以等待所有待处理的操作完成
 *
 * 核心概念：
 * - Phase（阶段）：每次对话开始时创建新的 phase ID
 * - Fence（栅栏）：设置一个 fence，所有 <= fence 的 phase 都被中止
 * - Handler（处理器）：注册待处理的 abort 操作
 */

import { logAIError } from '../logger.js';

/**
 * Abort Fence 管理器
 */
export class AbortFenceManager {
  constructor() {
    this.conversationPhaseId = 0;  // 当前对话阶段 ID（递增）
    this.activePhaseId = null;     // 当前活跃的阶段 ID
    this.abortFence = null;        // abort fence（要中止的阶段 ID）
    this.pendingAbortHandlers = new Map(); // 待处理的 abort 处理器
    this.abortTimeout = 5000;      // abort 超时时间（毫秒）
  }

  /**
   * 开始新的对话阶段
   * @returns {number} 新的阶段 ID
   */
  beginPhase() {
    this.conversationPhaseId++;
    this.activePhaseId = this.conversationPhaseId;
    console.log(`[AbortFence] Phase ${this.activePhaseId} started`);
    return this.activePhaseId;
  }

  /**
   * 检查指定阶段是否已被 abort
   * @param {number} phaseId - 要检查的阶段 ID
   * @returns {boolean} 如果阶段已被 abort 则返回 true
   */
  isAborted(phaseId) {
    const aborted = this.abortFence !== null && phaseId <= this.abortFence;
    if (aborted) {
      console.log(`[AbortFence] Phase ${phaseId} is aborted (fence: ${this.abortFence})`);
    }
    return aborted;
  }

  /**
   * 检查当前活跃阶段是否已被 abort
   * @returns {boolean} 如果当前阶段已被 abort 则返回 true
   */
  isCurrentPhaseAborted() {
    return this.activePhaseId !== null && this.isAborted(this.activePhaseId);
  }

  /**
   * 中止当前对话阶段
   * @returns {Promise<void>}
   */
  async abortCurrentPhase() {
    if (!this.activePhaseId) {
      console.log('[AbortFence] No active phase to abort');
      return;
    }

    const fence = this.activePhaseId;
    console.log(`[AbortFence] Aborting phase ${fence} and all earlier phases`);
    this.abortFence = fence;

    // 等待所有待处理的 abort 操作完成（带超时）
    try {
      const abortPromises = Array.from(this.pendingAbortHandlers.values());
      if (abortPromises.length > 0) {
        console.log(`[AbortFence] Waiting for ${abortPromises.length} abort handlers to complete...`);
        await Promise.race([
          Promise.allSettled(abortPromises),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Abort timeout')), this.abortTimeout)
          )
        ]);
      }
    } catch (error) {
      console.warn(`[AbortFence] Abort handlers timeout or error: ${error.message}`);
    } finally {
      // 清理
      this.pendingAbortHandlers.clear();
      this.activePhaseId = null;
      console.log('[AbortFence] Abort completed');
    }
  }

  /**
   * 注册 abort 处理器
   * @param {string} key - 处理器的唯一标识
   * @param {Function} handler - abort 处理函数，返回 Promise
   */
  registerAbortHandler(key, handler) {
    if (typeof handler === 'function') {
      this.pendingAbortHandlers.set(key, handler());
    }
  }

  /**
   * 清除 abort 处理器
   * @param {string} key - 处理器的唯一标识
   */
  unregisterAbortHandler(key) {
    this.pendingAbortHandlers.delete(key);
  }

  /**
   * 创建 abort 结果
   * @param {string} reason - abort 原因
   * @returns {Object} abort 结果对象
   */
  createAbortResult(reason = 'user_aborted') {
    return {
      content: '',
      toolCalls: [],
      usage: {
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0
      },
      aborted: true,
      abortReason: reason
    };
  }

  /**
   * 重置状态（用于清除历史）
   */
  reset() {
    this.conversationPhaseId = 0;
    this.activePhaseId = null;
    this.abortFence = null;
    this.pendingAbortHandlers.clear();
    console.log('[AbortFence] Fence reset');
  }

  /**
   * 获取当前状态
   * @returns {Object} 状态对象
   */
  getState() {
    return {
      conversationPhaseId: this.conversationPhaseId,
      activePhaseId: this.activePhaseId,
      abortFence: this.abortFence,
      pendingHandlers: this.pendingAbortHandlers.size
    };
  }
}
