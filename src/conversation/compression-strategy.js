/**
 * Context 压缩策略
 *
 * 职责：
 * - 定义不同的压缩算法
 * - 保留重要信息，删除冗余内容
 * - 支持多种压缩策略
 */

/**
 * 压缩策略基类
 */
export class CompressionStrategy {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * 应用压缩策略
   *
   * @param {Array} messages - 消息数组
   * @returns {Array} 压缩后的消息数组
   */
  apply(messages) {
    throw new Error('Subclasses must implement apply() method');
  }

  /**
   * 生成压缩摘要信息
   *
   * @param {number} originalCount - 原始消息数量
   * @param {number} newCount - 压缩后消息数量
   * @returns {string} 摘要信息
   */
  generateSummary(originalCount, newCount) {
    const removed = originalCount - newCount;
    const percentage = ((removed / originalCount) * 100).toFixed(1);
    return `已删除 ${removed} 条旧消息（${percentage}%），保留最近 ${newCount} 条消息。`;
  }
}

/**
 * 策略1：保留最近 N 条消息
 */
export class KeepRecentStrategy extends CompressionStrategy {
  constructor(options = {}) {
    super(options);
    this.count = options.count || 50;
  }

  apply(messages) {
    // 保留最后 N 条消息
    return messages.slice(-this.count);
  }

  generateSummary(originalCount) {
    const kept = Math.min(this.count, originalCount);
    const removed = originalCount - kept;
    return `保留最近 ${kept} 条消息，删除了 ${removed} 条旧消息。`;
  }
}

/**
 * 策略2：保留重要消息
 * 保留包含以下内容的消息：
 * - 工具调用
 * - 错误信息
 * - 用户的关键指令
 * - 最近的消息
 */
export class KeepImportantStrategy extends CompressionStrategy {
  constructor(options = {}) {
    super(options);
    this.preserveToolCalls = options.preserveToolCalls !== false;
    this.preserveErrors = options.preserveErrors !== false;
    this.recentCount = options.recentCount || 20;
  }

  apply(messages) {
    // 使用索引来跟踪保留的消息，避免对象引用问题
    const importantIndices = new Set();
    const recentIndices = new Set();

    // 倒序遍历消息，标记重要消息和最近消息
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];

      // 检查是否是重要消息
      if (this._isImportant(message)) {
        importantIndices.add(i);
      }

      // 保留最近的消息
      if (recentIndices.size < this.recentCount) {
        recentIndices.add(i);
      }
    }

    // 合并重要消息和最近消息的索引（去重）
    const combinedIndices = new Set([...importantIndices, ...recentIndices]);

    // 按索引顺序排序，确保原始顺序
    const sortedIndices = Array.from(combinedIndices).sort((a, b) => a - b);

    // 根据索引构建结果
    const result = sortedIndices.map(idx => messages[idx]);

    return result;
  }

  /**
   * 判断消息是否重要
   */
  _isImportant(message) {
    // 保留错误消息
    if (this.preserveErrors && message.role === 'error') {
      return true;
    }

    const content = message.content;

    // 保留包含工具调用的消息
    if (this.preserveToolCalls) {
      if (Array.isArray(content)) {
        return content.some(block => block.type === 'tool_use');
      }
      if (typeof content === 'string' && content.includes('tool_use')) {
        return true;
      }
    }

    // 保留用户消息
    if (message.role === 'user') {
      // 检查是否是关键指令（以 / 开头）
      if (typeof content === 'string' && content.trim().startsWith('/')) {
        return true;
      }
    }

    return false;
  }

  generateSummary(originalCount, newCount) {
    const removed = originalCount - newCount;
    return `保留 ${newCount} 条重要消息（工具调用、错误、最近消息），删除了 ${removed} 条消息。`;
  }
}

/**
 * 策略3：滑动窗口
 * 保留最近 N 条消息，但确保保留至少一条系统消息
 */
export class SlidingWindowStrategy extends CompressionStrategy {
  constructor(options = {}) {
    super(options);
    this.count = options.count || 50;
    this.preserveSystem = options.preserveSystem !== false;
  }

  apply(messages) {
    // 检查是否有系统消息
    const systemMessage = messages.find(m => m.role === 'system');

    // 获取最近 N 条消息
    const recent = messages.slice(-this.count);

    // 如果需要保留系统消息且存在
    if (this.preserveSystem && systemMessage && !recent.includes(systemMessage)) {
      // 将系统消息插入到开头
      return [systemMessage, ...recent];
    }

    return recent;
  }

  generateSummary(originalCount) {
    const kept = Math.min(this.count, originalCount);
    return `使用滑动窗口策略，保留最近 ${kept} 条消息。`;
  }
}

/**
 * 策略4：智能压缩（基于 token 数量）
 * 根据消息的 token 数量进行压缩，确保总 token 数不超过限制
 */
export class SmartTokenStrategy extends CompressionStrategy {
  constructor(options = {}) {
    super(options);
    this.maxTokens = options.maxTokens || 100000;
    this.targetTokens = options.targetTokens || 80000; // 目标 token 数（留有余量）
    this.tokenEstimator = options.tokenEstimator || ((msg) => {
      // 默认的 token 估算器
      const content = msg.content || '';
      const length = typeof content === 'string' ? content.length : JSON.stringify(content).length;
      return Math.ceil(length / 4); // 粗略估算：4 字符 ≈ 1 token
    });
  }

  apply(messages) {
    // 从后往前遍历，累计 token 直到达到目标
    const result = [];
    let totalTokens = 0;

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const tokens = this.tokenEstimator(message);

      if (totalTokens + tokens <= this.targetTokens) {
        result.unshift(message);
        totalTokens += tokens;
      } else {
        // 如果添加这条消息会超过限制，停止添加
        break;
      }
    }

    // 确保至少保留一条消息
    if (result.length === 0 && messages.length > 0) {
      result.push(messages[messages.length - 1]);
    }

    return result;
  }

  generateSummary(originalCount, newCount) {
    return `智能压缩：从 ${originalCount} 条消息压缩到 ${newCount} 条（基于 token 数量）。`;
  }
}

/**
 * 策略工厂
 */
export class CompressionStrategyFactory {
  /**
   * 创建压缩策略实例
   *
   * @param {string} type - 策略类型
   * @param {Object} options - 策略选项
   * @returns {CompressionStrategy} 策略实例
   */
  static create(type, options = {}) {
    switch (type) {
      case 'keepRecent':
        return new KeepRecentStrategy(options);
      case 'keepImportant':
        return new KeepImportantStrategy(options);
      case 'slidingWindow':
        return new SlidingWindowStrategy(options);
      case 'smartToken':
        return new SmartTokenStrategy(options);
      default:
        console.warn(`[CompressionStrategy] Unknown strategy: ${type}, using keepRecent`);
        return new KeepRecentStrategy(options);
    }
  }

  /**
   * 获取所有可用的策略类型
   */
  static getAvailableStrategies() {
    return ['keepRecent', 'keepImportant', 'slidingWindow', 'smartToken'];
  }
}

/**
 * 应用压缩策略（便捷函数）
 *
 * @param {Array} messages - 消息数组
 * @param {string} strategy - 策略类型
 * @param {Object} options - 策略选项
 * @returns {Object} { messages: Array, summary: string }
 */
export function applyCompression(messages, strategy = 'keepRecent', options = {}) {
  const strategyInstance = CompressionStrategyFactory.create(strategy, options);
  const compressed = strategyInstance.apply(messages);

  return {
    messages: compressed,
    summary: strategyInstance.generateSummary(messages.length, compressed.length),
    originalCount: messages.length,
    newCount: compressed.length,
    strategy: strategy
  };
}
