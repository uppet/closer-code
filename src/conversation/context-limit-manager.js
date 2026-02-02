/**
 * Context 限制值管理器
 *
 * 职责：
 * - 从实际运行中学习真实的 context 限制
 * - 保存和加载限制值到 .context_limits.json
 * - 动态更新限制值
 */

import fs from 'fs';
import path from 'path';

/**
 * Context 限制管理器
 */
export class ContextLimitManager {
  constructor(workingDir) {
    this.workingDir = workingDir;
    this.limitsFile = path.join(workingDir, '.context_limits.json');
    this.limits = this.loadLimits();
  }

  /**
   * 加载限制值
   */
  loadLimits() {
    try {
      if (fs.existsSync(this.limitsFile)) {
        const data = fs.readFileSync(this.limitsFile, 'utf-8');
        const limits = JSON.parse(data);
        console.log(`[ContextLimitManager] Loaded limits from ${this.limitsFile}`);
        return limits;
      }
    } catch (error) {
      console.warn(`[ContextLimitManager] Failed to load limits: ${error.message}`);
    }
    
    // 返回默认值
    return {
      models: {},
      lastUpdated: null
    };
  }

  /**
   * 保存限制值
   */
  saveLimits() {
    try {
      this.limits.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.limitsFile, JSON.stringify(this.limits, null, 2));
      console.log(`[ContextLimitManager] Saved limits to ${this.limitsFile}`);
    } catch (error) {
      console.error(`[ContextLimitManager] Failed to save limits: ${error.message}`);
    }
  }

  /**
   * 从错误消息中提取 context 限制值
   *
   * 支持的错误格式：
   * - Anthropic: "context length exceeded: 200000 tokens"
   * - OpenAI: "maximum context length is 128000 tokens"
   * - 其他: "Request exceeded limit of 8192 tokens"
   */
  extractLimitFromError(error) {
    const errorMessage = error.message || error.toString();
    console.log(`[ContextLimitManager] Analyzing error: ${errorMessage.substring(0, 200)}...`);

    // 尝试多种模式（按优先级排序）
    const patterns = [
      // "Request exceeded limit of 8192 tokens" 格式（优先匹配）
      /limit.*of[:\s]*(\d{4,8})\s*tokens?$/i,
      /exceed.*limit.*of[:\s]*(\d{4,8})/i,
      // Anthropic 格式
      /context length exceeded[:\s]*(\d+)\s*tokens?/i,
      /maximum.*context.*length.*is[:\s]*(\d+)/i,
      /exceed.*\s*(\d+)\s*tokens?/i,
      // 通用格式
      /(\d{4,8})\s*tokens?.*exceed/i,
      /context.*\s*(\d{4,8})\s*limit/i
    ];

    for (const pattern of patterns) {
      const match = errorMessage.match(pattern);
      if (match) {
        const limit = parseInt(match[1], 10);
        console.log(`[ContextLimitManager] Extracted limit: ${limit} tokens`);
        return limit;
      }
    }

    console.warn('[ContextLimitManager] Could not extract limit from error message');
    return null;
  }

  /**
   * 获取模型的 context 限制
   *
   * @param {string} model - 模型名称
   * @returns {number|null} 限制值，如果未知则返回 null
   */
  getLimit(model) {
    if (this.limits.models[model]) {
      return this.limits.models[model].value;
    }
    return null;
  }

  /**
   * 更新模型的 context 限制
   *
   * @param {string} model - 模型名称
   * @param {number} limit - 限制值
   * @param {string} source - 来源（error/user/config）
   */
  updateLimit(model, limit, source = 'error') {
    console.log(`[ContextLimitManager] Updating limit for ${model}: ${limit} tokens (source: ${source})`);

    // 验证限制值
    if (!limit || limit < 1000 || limit > 10000000) {
      console.warn(`[ContextLimitManager] Invalid limit value: ${limit}, ignoring`);
      return false;
    }

    // 检查是否与已知值差异太大
    if (this.limits.models[model]) {
      const existingLimit = this.limits.models[model];
      const diff = Math.abs(limit - existingLimit) / existingLimit;
      
      if (diff > 0.5) {
        console.warn(`[ContextLimitManager] New limit (${limit}) differs significantly from existing (${existingLimit}), using average`);
        // 使用平均值
        limit = Math.round((limit + existingLimit) / 2);
      }
    }

    // 更新限制值
    this.limits.models[model] = {
      value: limit,
      source: source,
      updatedAt: new Date().toISOString()
    };

    // 保存到文件
    this.saveLimits();

    return true;
  }

  /**
   * 从错误中学习并更新限制
   *
   * @param {Error} error - 错误对象
   * @param {string} model - 模型名称
   * @returns {boolean} 是否成功提取并更新
   */
  learnFromError(error, model) {
    const limit = this.extractLimitFromError(error);
    if (limit) {
      return this.updateLimit(model, limit, 'error');
    }
    return false;
  }

  /**
   * 获取或估算限制值
   *
   * @param {string} model - 模型名称
   * @param {number} fallback - 回退值（默认 200000）
   * @returns {number} 限制值
   */
  getOrEstimateLimit(model, fallback = 200000) {
    const learned = this.getLimit(model);
    if (learned) {
      console.log(`[ContextLimitManager] Using learned limit for ${model}: ${learned} tokens`);
      return learned;
    }

    console.log(`[ContextLimitManager] No learned limit for ${model}, using fallback: ${fallback} tokens`);
    return fallback;
  }

  /**
   * 获取所有已知的限制
   */
  getAllLimits() {
    return { ...this.limits.models };
  }

  /**
   * 清除特定模型的限制
   */
  clearLimit(model) {
    if (this.limits.models[model]) {
      delete this.limits.models[model];
      this.saveLimits();
      console.log(`[ContextLimitManager] Cleared limit for ${model}`);
    }
  }

  /**
   * 清除所有限制
   */
  clearAllLimits() {
    this.limits.models = {};
    this.saveLimits();
    console.log('[ContextLimitManager] Cleared all limits');
  }
}

/**
 * 创建 ContextLimitManager 实例
 *
 * @param {string} workingDir - 工作目录
 * @returns {ContextLimitManager} ContextLimitManager 实例
 */
export function createContextLimitManager(workingDir) {
  return new ContextLimitManager(workingDir);
}
