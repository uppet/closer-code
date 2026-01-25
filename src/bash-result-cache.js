/**
 * Bash Result Cache - 缓存 bash 命令结果
 *
 * 用于缓存大输出的 bash 命令结果，允许 AI 使用 bashResult 工具
 * 获取更多内容，而不需要重新执行命令。
 *
 * 特点：
 * - 10 分钟过期（AI 任务有时需要思考）
 * - LRU 淘汰策略
 * - 最多缓存 100 个结果
 */

/**
 * Bash 结果缓存管理器
 */
export class BashResultCache {
  constructor() {
    this.cache = new Map();  // key: result_id, value: {result, timestamp}
    this.maxSize = 100;      // 最多缓存 100 个结果
    this.maxAge = 600000;    // 10 分钟过期（AI 任务有时需要思考）
  }

  /**
   * 生成唯一的 result_id
   * 格式: res_<timestamp>_<random>
   * 例如: res_1705901234567_abc123xyz
   * @returns {string} result_id
   */
  generateResultId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `res_${timestamp}_${random}`;
  }

  /**
   * 存储结果到缓存
   * @param {string} result_id - 结果 ID
   * @param {Object} result - bash 命令结果
   */
  set(result_id, result) {
    // LRU：如果满了，删除最旧的
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(result_id, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * 从缓存获取结果
   * @param {string} result_id - 结果 ID
   * @returns {Object|null} 缓存的对象 {result, timestamp} 或 null
   */
  get(result_id) {
    const cached = this.cache.get(result_id);
    
    if (!cached) return null;
    
    // 检查是否过期
    if (Date.now() - cached.timestamp > this.maxAge) {
      this.cache.delete(result_id);
      return null;
    }
    
    return cached;
  }

  /**
   * 检查 result_id 是否存在且未过期
   * @param {string} result_id - 结果 ID
   * @returns {boolean} 是否存在
   */
  has(result_id) {
    const cached = this.cache.get(result_id);
    if (!cached) return false;
    
    // 检查是否过期
    if (Date.now() - cached.timestamp > this.maxAge) {
      this.cache.delete(result_id);
      return false;
    }
    
    return true;
  }

  /**
   * 清除所有缓存
   */
  clear() {
    this.cache.clear();
  }

  /**
   * 获取缓存统计
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      maxAge: this.maxAge,
      maxAgeMinutes: this.maxAge / 60000
    };
  }

  /**
   * 删除指定的 result_id
   * @param {string} result_id - 结果 ID
   * @returns {boolean} 是否删除成功
   */
  delete(result_id) {
    return this.cache.delete(result_id);
  }

  /**
   * 清理过期的缓存
   * @returns {number} 清理的数量
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.maxAge) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}

/**
 * 全局缓存实例
 */
export const bashResultCache = new BashResultCache();
