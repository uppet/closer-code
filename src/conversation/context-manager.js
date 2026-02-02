/**
 * Context 管理器
 *
 * 职责：
 * - 管理对话历史，执行压缩和重开策略
 * - 监控 token 使用情况
 * - 判断是否需要压缩或重开
 * - 执行压缩操作
 * - 触发任务重开流程
 */

import { ContextTracker } from './context-tracker.js';
import { applyCompression } from './compression-strategy.js';
import { createContextLimitManager } from './context-limit-manager.js';

/**
 * Context 管理器类
 */
export class ContextManager {
  /**
   * @param {Object} conversation - 对话实例
   * @param {Object} config - 配置对象
   */
  constructor(conversation, config) {
    this.conversation = conversation;
    this.config = config;

    // 初始化 Context 限制管理器
    this.limitManager = createContextLimitManager(config.behavior?.workingDir || process.cwd());

    // 获取或学习模型的 context 限制
    const model = config.ai?.anthropic?.model || config.ai?.openai?.model || 'unknown';
    const learnedLimit = this.limitManager.getLimit(model);
    const maxTokens = learnedLimit || config.context?.maxTokens || 200000;

    if (learnedLimit) {
      console.log(`[ContextManager] Using learned context limit for ${model}: ${maxTokens} tokens`);
    } else {
      console.log(`[ContextManager] Using configured context limit: ${maxTokens} tokens`);
    }

    // 创建 token 追踪器
    this.tracker = new ContextTracker({
      maxTokens: maxTokens,
      warningThreshold: config.context?.warningThreshold || 0.85,
      criticalThreshold: config.context?.criticalThreshold || 0.95,
      aiConfig: config
    });

    // 压缩配置
    this.compressionEnabled = config.context?.autoCompress !== false;
    this.compressionStrategy = config.context?.compressionStrategy || 'keepRecent';
    this.compressionOptions = config.context?.compressionOptions || {};

    // 重开配置
    this.resetEnabled = config.context?.autoReset !== false;
    this.resetBehavior = config.context?.resetBehavior || 'summarize';

    // 统计信息
    this.stats = {
      compressionCount: 0,
      resetCount: 0,
      totalTokensSaved: 0
    };
  }

  /**
   * 在发送消息前检查 context
   *
   * 只检查并返回建议，不执行压缩或重开操作
   * 让调用方决定是否执行
   *
   * @param {string} userMessage - 用户消息
   * @returns {Promise<Object>} 检查结果
   */
  async checkBeforeSend(userMessage) {
    // 获取当前消息历史
    const messages = this.conversation.getMessages();

    // 估算当前 token 使用
    const currentTokens = await this.tracker.estimateTokens(messages);

    // 获取使用信息
    const usageInfo = this.tracker.getUsageInfo(currentTokens);

    console.log(`[ContextManager] Current token usage: ${usageInfo.percentageDisplay} (${currentTokens}/${usageInfo.max})`);

    // 检查是否需要重开任务
    if (this.tracker.needsTaskReset(currentTokens)) {
      if (this.resetEnabled) {
        console.log('[ContextManager] Critical threshold reached, task reset recommended');
        return {
          action: 'reset',
          usageInfo,
          reason: 'critical_threshold'
        };
      } else {
        console.warn('[ContextManager] Critical threshold reached but auto-reset is disabled');
      }
    }

    // 检查是否需要压缩
    if (this.tracker.needsCompression(currentTokens)) {
      if (this.compressionEnabled) {
        console.log('[ContextManager] Warning threshold reached, compression recommended');
        return {
          action: 'compressed',
          usageInfo,
          reason: 'warning_threshold'
        };
      } else {
        console.warn('[ContextManager] Warning threshold reached but auto-compress is disabled');
      }
    }

    // 不需要压缩或重开
    return {
      action: 'none',
      usageInfo
    };
  }

  /**
   * 处理 API 错误，学习 context 限制
   *
   * @param {Error} error - API 错误
   * @returns {boolean} 是否是 context overflow 错误
   */
  handleAPIError(error) {
    const errorMessage = error.message || error.toString();

    // 检查是否是 context overflow 错误
    const isContextOverflow = /context.*exceed|maximum.*context|too.*long/i.test(errorMessage);

    if (isContextOverflow) {
      console.log('[ContextManager] Detected context overflow error');

      // 尝试从错误中学习限制值
      const model = this.config.ai?.anthropic?.model || this.config.ai?.openai?.model || 'unknown';
      const learned = this.limitManager.learnFromError(error, model);

      if (learned) {
        const newLimit = this.limitManager.getLimit(model);

        // 验证限制值是否合理
        if (newLimit < 1000) {
          console.warn(`[ContextManager] Learned limit too small (${newLimit}), ignoring`);
          return false;
        }

        if (newLimit > 1000000) {
          console.warn(`[ContextManager] Learned limit too large (${newLimit}), ignoring`);
          return false;
        }

        const oldLimit = this.tracker.maxTokens;
        this.tracker.maxTokens = newLimit;

        // 通知用户
        console.log(`[ContextManager] Updated context limit: ${oldLimit} → ${newLimit} tokens`);
        console.warn(`[ContextManager] Context limit for ${model} has been updated based on API errors`);

        return true;
      }
    }

    return false;
  }

  /**
   * 压缩对话历史
   *
   * @param {Object} usageInfo - 使用信息
   * @returns {Promise<Object>} 压缩结果
   */
  async compressHistory(usageInfo) {
    const messages = this.conversation.getMessages();
    const originalCount = messages.length;

    console.log(`[ContextManager] Compressing ${originalCount} messages using strategy: ${this.compressionStrategy}`);

    // 备份原始消息（用于错误恢复）
    const originalMessages = [...messages];

    try {
      // 应用压缩策略
      const result = applyCompression(messages, this.compressionStrategy, this.compressionOptions);

      // 更新对话历史
      this.conversation.setMessages(result.messages);

      // 保存压缩后的历史
      if (!this.conversation.testMode) {
        const { saveHistory } = await import('../config.js');
        saveHistory(result.messages);
        console.log('[ContextManager] Compressed history saved');
      }

      // 重新计算压缩后的 token（修复统计信息）
      const compressedTokens = await this.tracker.estimateTokens(result.messages);
      const tokensSaved = usageInfo.current - compressedTokens;

      // 更新统计
      this.stats.compressionCount++;
      this.stats.totalTokensSaved += tokensSaved;

      console.log(`[ContextManager] Compression complete: ${result.summary}, saved ${tokensSaved} tokens`);

      return {
        action: 'compressed',
        summary: result.summary,
        originalCount,
        newCount: result.newCount,
        removed: originalCount - result.newCount,
        tokensSaved,
        strategy: this.compressionStrategy,
        usageInfo
      };
    } catch (error) {
      // 回滚到原始消息
      this.conversation.setMessages(originalMessages);
      console.error('[ContextManager] Compression failed, rolled back:', error.message);
      throw error;
    }
  }

  /**
   * 重开任务（内部版本，不添加系统消息）
   *
   * @param {Object} usageInfo - 使用信息
   * @returns {Promise<Object>} 重开结果
   */
  async resetTaskInternal(usageInfo) {
    const messages = this.conversation.getMessages();
    const originalMessages = [...messages]; // 备份
    const originalCount = messages.length;

    console.log(`[ContextManager] Resetting task (internal) with ${originalCount} messages`);

    try {
      // 压缩历史到最小（保留最近 20 条消息）
      const compressionResult = applyCompression(messages, 'keepRecent', { count: 20 });

      // 更新对话历史
      this.conversation.setMessages(compressionResult.messages);

      // 保存压缩后的历史
      if (!this.conversation.testMode) {
        const { saveHistory } = await import('../config.js');
        saveHistory(compressionResult.messages);
        console.log('[ContextManager] Reset history saved');
      }

      // 更新统计
      this.stats.resetCount++;

      console.log(`[ContextManager] Task reset complete: kept ${compressionResult.newCount} recent messages`);

      return {
        action: 'reset',
        kept: compressionResult.newCount,
        removed: originalCount - compressionResult.newCount,
        usageInfo
      };
    } catch (error) {
      // 回滚到原始消息
      this.conversation.setMessages(originalMessages);
      console.error('[ContextManager] Reset failed, rolled back:', error.message);
      throw error;
    }
  }

  /**
   * 重开任务
   *
   * @param {string} userMessage - 用户消息
   * @param {Object} usageInfo - 使用信息
   * @returns {Promise<Object>} 重开结果
   */
  async resetTask(userMessage, usageInfo) {
    const messages = this.conversation.getMessages();
    const originalMessages = [...messages]; // 备份
    const originalCount = messages.length;

    console.log(`[ContextManager] Resetting task with ${originalCount} messages using behavior: ${this.resetBehavior}`);

    try {
      // 生成任务摘要
      const summary = await this.generateTaskSummary(messages, userMessage);

      // 压缩历史到最小（保留最近 20 条消息）
      const compressionResult = applyCompression(messages, 'keepRecent', { count: 20 });

      // 更新对话历史
      this.conversation.setMessages(compressionResult.messages);

      // 添加系统消息说明重开
      const resetMessage = {
        role: 'system',
        content: this._formatResetMessage(summary, compressionResult, usageInfo)
      };

      this.conversation.addMessage(resetMessage);

      // 保存压缩后的历史
      if (!this.conversation.testMode) {
        const { saveHistory } = await import('../config.js');
        saveHistory(this.conversation.getMessages());
      }

      // 更新统计
      this.stats.resetCount++;

      console.log(`[ContextManager] Task reset complete: kept ${compressionResult.newCount} recent messages`);

      return {
        action: 'reset',
        summary: summary.text,
        kept: compressionResult.newCount,
        removed: originalCount - compressionResult.newCount,
        behavior: this.resetBehavior,
        usageInfo
      };
    } catch (error) {
      // 回滚到原始消息
      this.conversation.setMessages(originalMessages);
      console.error('[ContextManager] Reset failed, rolled back:', error.message);
      throw error;
    }
  }

  /**
   * 生成任务摘要
   *
   * @param {Array} messages - 消息数组
   * @param {string} currentTask - 当前任务描述
   * @returns {Promise<Object>} 摘要对象
   */
  async generateTaskSummary(messages, currentTask = null) {
    try {
      // 提取关键信息
      const keyInfo = this.extractKeyInformation(messages);

      // 生成摘要文本
      const summary = {
        text: `【任务摘要】\n\n${keyInfo}\n\n【当前状态】\n准备继续处理新的请求。`,
        keyPoints: keyInfo,
        messageCount: messages.length
      };

      return summary;
    } catch (error) {
      console.warn('[ContextManager] Failed to generate task summary, using fallback:', error.message);
      
      // 降级到简单摘要
      return {
        text: '任务已重开，准备继续处理新的请求。',
        keyPoints: '',
        messageCount: messages.length
      };
    }
  }

  /**
   * 提取关键信息
   *
   * @param {Array} messages - 消息数组
   * @returns {string} 关键信息文本
   */
  extractKeyInformation(messages) {
    const info = [];

    // 提取最近的工作目录
    const recentMessages = messages.slice(-10);
    for (const msg of recentMessages) {
      if (msg.role === 'system' && msg.content) {
        const match = msg.content.match(/Current directory: (.+)/);
        if (match) {
          info.push(`工作目录: ${match[1]}`);
          break;
        }
      }
    }

    // 提取最近执行的工具调用
    const recentToolCalls = [];
    for (let i = messages.length - 1; i >= Math.max(0, messages.length - 20); i--) {
      const msg = messages[i];
      if (msg.content && Array.isArray(msg.content)) {
        const toolUses = msg.content.filter(block => block.type === 'tool_use');
        recentToolCalls.push(...toolUses.map(t => t.name));
      }
    }

    if (recentToolCalls.length > 0) {
      const uniqueTools = [...new Set(recentToolCalls)];
      info.push(`最近使用的工具: ${uniqueTools.slice(0, 5).join(', ')}${uniqueTools.length > 5 ? '...' : ''}`);
    }

    // 提取最近的错误
    const recentErrors = [];
    for (let i = messages.length - 1; i >= Math.max(0, messages.length - 20); i--) {
      const msg = messages[i];
      if (msg.role === 'error') {
        recentErrors.push(msg.content?.slice(0, 100));
      }
    }

    if (recentErrors.length > 0) {
      info.push(`最近的错误: ${recentErrors.length} 个`);
    }

    return info.length > 0 ? info.join('\n') : '无特殊信息';
  }

  /**
   * 格式化重开消息
   */
  _formatResetMessage(summary, compressionResult, usageInfo) {
    return `🔄 对话已重开

${summary.text}

压缩策略: ${compressionResult.strategy}
保留消息: ${compressionResult.newCount} 条
删除消息: ${compressionResult.removed} 条
Token 使用: ${usageInfo.percentageDisplay}

请继续您的对话。`;
  }

  /**
   * 手动触发压缩
   *
   * @param {string} strategy - 压缩策略（可选，使用配置的默认策略）
   * @returns {Promise<Object>} 压缩结果
   */
  async manualCompress(strategy = null) {
    const messages = this.conversation.getMessages();
    const originalMessages = [...messages]; // 备份
    const currentTokens = await this.tracker.estimateTokens(messages);
    const usageInfo = this.tracker.getUsageInfo(currentTokens);

    try {
      const compressionStrategy = strategy || this.compressionStrategy;
      const result = applyCompression(messages, compressionStrategy, this.compressionOptions);

      this.conversation.setMessages(result.messages);

      // 保存压缩后的历史
      if (!this.conversation.testMode) {
        const { saveHistory } = await import('../config.js');
        saveHistory(result.messages);
      }

      // 重新计算压缩后的 token
      const compressedTokens = await this.tracker.estimateTokens(result.messages);
      const tokensSaved = currentTokens - compressedTokens;

      this.stats.compressionCount++;
      this.stats.totalTokensSaved += tokensSaved;

      return {
        action: 'compressed',
        summary: result.summary,
        originalCount: result.originalCount,
        newCount: result.newCount,
        tokensSaved,
        strategy: compressionStrategy,
        usageInfo
      };
    } catch (error) {
      // 回滚到原始消息
      this.conversation.setMessages(originalMessages);
      console.error('[ContextManager] Manual compression failed, rolled back:', error.message);
      throw error;
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      cacheStats: this.tracker.getCacheStats()
    };
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      compressionCount: 0,
      resetCount: 0,
      totalTokensSaved: 0
    };
    this.tracker.clearCache();
  }
}

/**
 * 创建 ContextManager 实例
 *
 * @param {Object} conversation - 对话实例
 * @param {Object} config - 配置对象
 * @returns {ContextManager} ContextManager 实例
 */
export function createContextManager(conversation, config) {
  return new ContextManager(conversation, config);
}
