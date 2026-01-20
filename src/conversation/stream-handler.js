/**
 * Stream Handler - 流式响应处理
 *
 * 负责：
 * - Buffer + Throttle 策略
 * - Token 累积
 * - 更新策略（时间间隔、缓冲区大小、标点符号）
 */

export class StreamHandler {
  constructor(config = {}) {
    this.streamUpdate = {
      lastUpdateTime: 0,
      queuedTokens: [],
      interval: config.interval || 1000, // 默认1秒
      bufferSize: config.bufferSize || 50, // 缓冲区大小
      updateOnPunctuation: config.updateOnPunctuation !== false // 默认启用标点更新
    };
  }

  /**
   * 重置流式更新状态
   */
  reset() {
    this.streamUpdate.lastUpdateTime = 0;
    this.streamUpdate.queuedTokens = [];
  }

  /**
   * 处理文本 token
   * @param {string} delta - 增量文本
   * @param {Function} onProgress - 进度回调
   * @returns {boolean} 是否已更新
   */
  handleTextToken(delta, onProgress) {
    if (typeof onProgress !== 'function') {
      return false;
    }

    const now = Date.now();
    const timeSinceLastUpdate = now - this.streamUpdate.lastUpdateTime;

    // 累积 token
    this.streamUpdate.queuedTokens.push(delta);
    const combinedContent = this.streamUpdate.queuedTokens.join('');

    // 检查是否应该更新（满足任一条件）
    const shouldUpdate =
      timeSinceLastUpdate >= this.streamUpdate.interval || // 条件1: 时间间隔
      this.streamUpdate.queuedTokens.length >= this.streamUpdate.bufferSize || // 条件2: 缓冲区满
      (this.streamUpdate.updateOnPunctuation && /[.!?。！？]\s*$/.test(combinedContent)); // 条件3: 句子结束

    if (shouldUpdate) {
      onProgress({
        type: 'token',
        content: combinedContent
      });

      this.streamUpdate.queuedTokens = [];
      this.streamUpdate.lastUpdateTime = now;
      return true;
    }

    return false;
  }

  /**
   * 发送剩余的 tokens
   * @param {Function} onProgress - 进度回调
   */
  flush(onProgress) {
    if (this.streamUpdate.queuedTokens.length > 0 && typeof onProgress === 'function') {
      const remainingContent = this.streamUpdate.queuedTokens.join('');
      onProgress({
        type: 'token',
        content: remainingContent
      });
      this.streamUpdate.queuedTokens = [];
    }
  }

  /**
   * 处理流式事件
   * @param {Object} chunk - 流式事件对象
   * @param {Function} onProgress - 进度回调
   * @param {number} phaseId - 当前阶段 ID（用于 abort 检查）
   * @param {Function} isAborted - abort 检查函数
   * @returns {boolean} 如果被 abort 则返回 true
   */
  handleStreamEvent(chunk, onProgress, phaseId, isAborted) {
    // 每个 chunk 都检查 abort
    if (isAborted && isAborted(phaseId)) {
      throw new Error('Stream aborted');
    }

    switch (chunk.type) {
      case 'thinking':
        if (typeof onProgress === 'function') {
          onProgress({
            type: 'thinking',
            delta: chunk.delta,
            snapshot: chunk.snapshot
          });
        }
        break;

      case 'signature':
        if (typeof onProgress === 'function') {
          onProgress({
            type: 'thinking_signature',
            signature: chunk.signature
          });
        }
        break;

      case 'reasoning':
        // DeepSeek-R1 的推理内容
        if (typeof onProgress === 'function') {
          onProgress({
            type: 'reasoning',
            delta: chunk.delta,
            snapshot: chunk.snapshot
          });
        }
        break;

      case 'text':
        // 流式文本 - 使用 Buffer + Throttle 策略
        this.handleTextToken(chunk.delta, onProgress);
        break;

      case 'content_block_start':
        // 检测到工具调用块开始
        if (chunk.blockType === 'tool_use' && typeof onProgress === 'function') {
          onProgress({
            type: 'tool_use_start',
            toolName: chunk.block.name,
            toolId: chunk.block.id
          });
        }
        break;
    }

    return false;
  }

  /**
   * 获取配置
   * @returns {Object} 配置对象
   */
  getConfig() {
    return { ...this.streamUpdate };
  }
}
