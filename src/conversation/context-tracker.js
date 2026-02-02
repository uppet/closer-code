/**
 * Context Token 追踪器
 *
 * 职责：
 * - 实时追踪对话历史的 token 使用量
 * - 计算/估算消息的 token 数
 * - 预测下一条消息的可能 token 数
 * - 检测是否接近 context 限制
 */

import { createAIClient } from '../ai-client.js';

/**
 * Token 追踪器类
 */
export class ContextTracker {
  /**
   * @param {Object} config - 配置对象
   * @param {number} config.maxTokens - 模型的最大 token 限制
   * @param {number} config.warningThreshold - 警告阈值（默认 0.85，即 85%）
   * @param {number} config.criticalThreshold - 危险阈值（默认 0.95，即 95%）
   * @param {Object} config.aiConfig - AI 配置（用于调用 countTokens API）
   */
  constructor(config) {
    // 验证 maxTokens
    this.maxTokens = config.maxTokens || 200000;
    if (this.maxTokens <= 0 || this.maxTokens > 10000000) {
      throw new Error(`Invalid maxTokens: ${this.maxTokens}. Must be between 1 and 10,000,000`);
    }
    
    // 验证阈值
    this.warningThreshold = config.warningThreshold || 0.85;
    if (this.warningThreshold < 0 || this.warningThreshold > 1) {
      throw new Error(`Invalid warningThreshold: ${this.warningThreshold}. Must be between 0 and 1`);
    }
    
    this.criticalThreshold = config.criticalThreshold || 0.95;
    if (this.criticalThreshold < 0 || this.criticalThreshold > 1) {
      throw new Error(`Invalid criticalThreshold: ${this.criticalThreshold}. Must be between 0 and 1`);
    }
    
    // 验证阈值关系
    if (this.criticalThreshold <= this.warningThreshold) {
      throw new Error(`criticalThreshold (${this.criticalThreshold}) must be greater than warningThreshold (${this.warningThreshold})`);
    }

    this.aiConfig = config.aiConfig;

    // 缓存 token 计算结果（避免重复计算）
    this.tokenCache = new Map();
    this.cacheAccessOrder = []; // 记录访问顺序，用于 LRU
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * 估算消息的 token 数（同步版本，用于快速测试）
   */
  estimateTokensSync(messages) {
    if (!messages || messages.length === 0) {
      return 0;
    }
    return this._estimateTokensLocally(messages);
  }

  /**
   * 估算消息的 token 数
   * 优先使用 API 的 countTokens，降级使用本地估算
   *
   * @param {Array} messages - 消息数组
   * @param {boolean} useCache - 是否使用缓存（默认 true）
   * @returns {Promise<number>} 估算的 token 数
   */
  async estimateTokens(messages, useCache = true) {
    if (!messages || messages.length === 0) {
      return 0;
    }

    // 生成缓存键
    const cacheKey = this._generateCacheKey(messages);
    if (useCache && this.tokenCache.has(cacheKey)) {
      // 更新访问顺序（LRU）
      const idx = this.cacheAccessOrder.indexOf(cacheKey);
      if (idx > -1) {
        this.cacheAccessOrder.splice(idx, 1);
      }
      this.cacheAccessOrder.push(cacheKey);
      
      this.cacheHits++;
      return this.tokenCache.get(cacheKey);
    }

    this.cacheMisses++;

    let tokenCount;

    try {
      // 优先使用 API 的 countTokens（如果可用）
      if (this.aiConfig && this._shouldUseAPICounting(messages)) {
        tokenCount = await this._countTokensWithAPI(messages);
      } else {
        // 降级使用本地估算
        tokenCount = this._estimateTokensLocally(messages);
      }

      // 缓存结果
      if (useCache) {
        this.tokenCache.set(cacheKey, tokenCount);
        this.cacheAccessOrder.push(cacheKey);

        // LRU: 删除最久未使用的
        if (this.tokenCache.size > 100) {
          const lruKey = this.cacheAccessOrder.shift();
          this.tokenCache.delete(lruKey);
        }
      }

      return tokenCount;
    } catch (error) {
      console.warn('[ContextTracker] Token counting failed, using fallback:', error.message);
      // 降级使用本地估算
      return this._estimateTokensLocally(messages);
    }
  }

  /**
   * 检查是否需要压缩（达到警告阈值）
   *
   * @param {number} currentTokens - 当前 token 数
   * @returns {boolean} 是否需要压缩
   */
  needsCompression(currentTokens) {
    const threshold = this.maxTokens * this.warningThreshold;
    return currentTokens >= threshold;
  }

  /**
   * 检查是否需要重开任务（达到危险阈值）
   *
   * @param {number} currentTokens - 当前 token 数
   * @returns {boolean} 是否需要重开任务
   */
  needsTaskReset(currentTokens) {
    const threshold = this.maxTokens * this.criticalThreshold;
    return currentTokens >= threshold;
  }

  /**
   * 获取当前使用率
   *
   * @param {number} currentTokens - 当前 token 数
   * @returns {Object} 使用率信息
   */
  getUsageInfo(currentTokens) {
    const percentage = currentTokens / this.maxTokens;
    return {
      current: currentTokens,
      max: this.maxTokens,
      percentage: percentage,
      percentageDisplay: `${(percentage * 100).toFixed(1)}%`,
      remaining: this.maxTokens - currentTokens,
      warningThreshold: this.warningThreshold,
      criticalThreshold: this.criticalThreshold,
      needsCompression: this.needsCompression(currentTokens),
      needsTaskReset: this.needsTaskReset(currentTokens)
    };
  }

  /**
   * 预测下一条消息的 token 数
   *
   * @param {string} message - 消息内容
   * @returns {number} 预估的 token 数
   */
  predictNextTokens(message) {
    // 简单估算：中文字符约 2-3 tokens，英文字符约 0.25 tokens
    const chineseChars = (message.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishChars = message.length - chineseChars;
    return Math.ceil(chineseChars * 2.5 + englishChars * 0.25);
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.tokenCache.clear();
    this.cacheAccessOrder = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.tokenCache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: this.cacheHits + this.cacheMisses > 0
        ? this.cacheHits / (this.cacheHits + this.cacheMisses)
        : 0
    };
  }

  // ========== 私有方法 ==========

  /**
   * 生成缓存键（改进版，使用双哈希降低冲突概率）
   */
  _generateCacheKey(messages) {
    // 使用简单的哈希算法（兼容 ES 模块）
    // 包含完整消息内容、角色、顺序
    // 不包含 metadata 等不影响 token 的字段
    const content = messages.map(m => JSON.stringify({
      role: m.role,
      content: m.content
    })).join('|||');
    
    // 使用双哈希降低冲突概率
    let hash1 = 2166136261; // FNV-1a prime 1
    let hash2 = 314159265;  // FNV-1a prime 2
    
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash1 = Math.imul(hash1 ^ char, 16777619);
      hash2 = Math.imul(hash2 ^ char, 2654435761);
    }
    
    // 组合两个哈希值（64 位 hex 字符串）
    const part1 = (hash1 >>> 0).toString(16).padStart(8, '0');
    const part2 = (hash2 >>> 0).toString(16).padStart(8, '0');
    
    return part1 + part2;
  }

  /**
   * 判断是否应该使用 API counting
   * 只有在消息数量较少（<10）且内容较短时才使用 API
   */
  _shouldUseAPICounting(messages) {
    const totalLength = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
    return messages.length < 10 && totalLength < 50000; // 50KB
  }

  /**
   * 使用 API 计算 token 数
   */
  async _countTokensWithAPI(messages) {
    try {
      const client = await createAIClient(this.aiConfig);

      // 只计算输入消息的 token
      const countResult = await client.countTokens ?
        await client.countTokens(messages)
        : null;

      if (countResult && countResult.input_tokens !== undefined) {
        return countResult.input_tokens;
      }

      // 如果 countTokens 不可用，降级使用本地估算
      return this._estimateTokensLocally(messages);
    } catch (error) {
      console.warn('[ContextTracker] API counting failed:', error.message);
      return this._estimateTokensLocally(messages);
    }
  }

  /**
   * 本地估算 token 数（降级方案）
   * 使用启发式算法：
   * - 中文字符：约 2-3 tokens
   * - 英文字符：约 0.25 tokens（按单词计算）
   * - 代码/特殊字符：约 0.5 tokens
   */
  _estimateTokensLocally(messages) {
    let totalTokens = 0;

    for (const message of messages) {
      const content = message.content || '';

      // 处理字符串内容
      if (typeof content === 'string') {
        totalTokens += this._estimateStringTokens(content);
      }
      // 处理数组内容（例如 tool use）
      else if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'text') {
            totalTokens += this._estimateStringTokens(block.text || '');
          } else if (block.type === 'tool_use') {
            // tool_use 的 token 估算（改进版）
            // 工具名: ~10 tokens
            const toolNameTokens = 10;
            
            // 参数: 根据类型估算
            let inputTokens;
            if (block.input && typeof block.input === 'object') {
              inputTokens = this._estimateStringTokens(
                JSON.stringify(block.input),
                'json'
              );
            } else {
              inputTokens = this._estimateStringTokens(
                String(block.input || ''),
                'text'
              );
            }
            
            // overhead: ~20 tokens（括号、逗号等）
            totalTokens += toolNameTokens + inputTokens + 20;
          }
        }
      }
      // 处理对象内容
      else if (typeof content === 'object') {
        totalTokens += this._estimateStringTokens(JSON.stringify(content));
      }
    }

    return totalTokens;
  }

  /**
   * 估算字符串的 token 数（改进版）
   */
  _estimateStringTokens(text, contentType = 'text') {
    if (!text) return 0;

    // 根据内容类型使用不同的估算策略
    if (contentType === 'code') {
      // 代码：通常 1 字符 ≈ 0.3-0.5 tokens
      return Math.ceil(text.length * 0.4);
    } else if (contentType === 'json') {
      // JSON：结构化数据，约 1 字符 ≈ 0.35 tokens
      return Math.ceil(text.length * 0.35);
    } else {
      // 普通文本
      const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
      const englishChars = text.length - chineseChars;
      return Math.ceil(chineseChars * 2.5 + englishChars * 0.25);
    }
  }
}

/**
 * 创建 ContextTracker 实例
 *
 * @param {Object} config - 配置
 * @returns {ContextTracker} ContextTracker 实例
 */
export function createContextTracker(config) {
  return new ContextTracker(config);
}
