/**
 * Agent 结果缓存
 *
 * 负责缓存 agent 的执行结果，避免重复执行相同任务
 * - Agent 结果缓存
 * - 缓存失效策略
 * - 缓存命中率统计
 */

import crypto from 'crypto';

/**
 * 缓存配置
 */
const DEFAULT_CACHE_CONFIG = {
  enabled: true,          // 是否启用缓存
  ttl: 300000,           // 缓存存活时间（5分钟，单位：毫秒）
  maxSize: 100,          // 最大缓存条目数
  cleanupInterval: 60000 // 清理间隔（1分钟）
};

/**
 * 缓存条目
 */
class CacheEntry {
  constructor(key, result) {
    this.key = key;
    this.result = result;
    this.timestamp = Date.now();
    this.hitCount = 0;
    this.lastAccessTime = Date.now();
  }

  /**
   * 检查缓存是否过期
   * @param {number} ttl - 存活时间
   * @returns {boolean} 是否过期
   */
  isExpired(ttl) {
    return Date.now() - this.timestamp > ttl;
  }

  /**
   * 记录访问
   */
  recordAccess() {
    this.hitCount++;
    this.lastAccessTime = Date.now();
  }

  /**
   * 获取缓存信息
   * @returns {Object} 缓存信息
   */
  getInfo() {
    return {
      key: this.key,
      timestamp: this.timestamp,
      hitCount: this.hitCount,
      lastAccessTime: this.lastAccessTime,
      age: Date.now() - this.timestamp,
      size: JSON.stringify(this.result).length
    };
  }
}

/**
 * Agent 缓存管理器类
 */
export class AgentCacheManager {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.cache = new Map(); // key -> CacheEntry
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      expirations: 0
    };
    this.cleanupTimer = null;

    // 启动定期清理
    if (this.config.enabled) {
      this.startCleanup();
    }
  }

  /**
   * 生成缓存键
   * @param {string} prompt - 任务描述
   * @param {Object} options - 选项（如 maxTokens, timeout 等）
   * @returns {string} 缓存键
   */
  generateKey(prompt, options = {}) {
    // 将选项排序以确保一致性
    const sortedOptions = Object.keys(options)
      .sort()
      .reduce((acc, key) => {
        acc[key] = options[key];
        return acc;
      }, {});

    // 生成哈希
    const data = JSON.stringify({ prompt, options: sortedOptions });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * 检查缓存是否存在
   * @param {string} key - 缓存键
   * @returns {boolean} 是否存在
   */
  has(key) {
    if (!this.config.enabled) {
      return false;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // 检查是否过期
    if (entry.isExpired(this.config.ttl)) {
      this.cache.delete(key);
      this.stats.expirations++;
      return false;
    }

    return true;
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {Object|null} 缓存结果或 null
   */
  get(key) {
    if (!this.config.enabled) {
      return null;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // 检查是否过期
    if (entry.isExpired(this.config.ttl)) {
      this.cache.delete(key);
      this.stats.expirations++;
      this.stats.misses++;
      return null;
    }

    // 记录访问
    entry.recordAccess();
    this.stats.hits++;

    // 返回结果的副本，避免外部修改
    return JSON.parse(JSON.stringify(entry.result));
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {Object} result - 结果对象
   * @returns {boolean} 是否成功设置
   */
  set(key, result) {
    if (!this.config.enabled) {
      return false;
    }

    // 检查缓存大小限制
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const entry = new CacheEntry(key, result);
    this.cache.set(key, entry);
    return true;
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   * @returns {boolean} 是否成功删除
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear() {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      expirations: 0
    };
  }

  /**
   * 使用 LRU 策略驱逐缓存
   * @private
   */
  evictLRU() {
    let lruKey = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessTime < lruTime) {
        lruTime = entry.lastAccessTime;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
    }
  }

  /**
   * 清理过期缓存
   * @returns {number} 清理的缓存条目数
   */
  cleanup() {
    if (!this.config.enabled) {
      return 0;
    }

    let cleaned = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.isExpired(this.config.ttl)) {
        this.cache.delete(key);
        this.stats.expirations++;
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 启动定期清理
   * @private
   */
  startCleanup() {
    if (this.cleanupTimer) {
      return;
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);

    // 防止定时器阻止进程退出
    this.cleanupTimer.unref();
  }

  /**
   * 停止定期清理
   */
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? this.stats.hits / (this.stats.hits + this.stats.misses)
      : 0;

    return {
      enabled: this.config.enabled,
      size: this.cache.size,
      maxSize: this.config.maxSize,
      ttl: this.config.ttl,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: hitRate,
      evictions: this.stats.evictions,
      expirations: this.stats.expirations
    };
  }

  /**
   * 获取所有缓存键
   * @returns {Array<string>} 缓存键数组
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取所有缓存条目的信息
   * @returns {Array} 缓存条目信息列表
   */
  getEntriesInfo() {
    return Array.from(this.cache.values()).map(entry => entry.getInfo());
  }

  /**
   * 获取缓存大小（字节）
   * @returns {number} 缓存大小
   */
  getSize() {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.getInfo().size;
    }
    return totalSize;
  }

  /**
   * 检查缓存是否健康
   * @returns {Object} 健康状态
   */
  getHealth() {
    const stats = this.getStats();
    const size = this.getSize();

    return {
      healthy: stats.size < stats.maxSize && stats.hitRate > 0.3,
      usage: stats.size / stats.maxSize,
      sizeBytes: size,
      sizeFormatted: this.formatSize(size),
      ...stats
    };
  }

  /**
   * 格式化大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化的大小
   * @private
   */
  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  /**
   * 销毁缓存管理器
   */
  destroy() {
    this.stopCleanup();
    this.clear();
  }
}

/**
 * 创建 Agent 缓存管理器的工厂函数
 * @param {Object} config - 配置对象
 * @returns {AgentCacheManager} 缓存管理器实例
 */
export function createAgentCacheManager(config) {
  return new AgentCacheManager(config);
}

/**
 * 全局单例
 */
let globalCacheManager = null;

/**
 * 获取全局 Agent 缓存管理器实例
 * @param {Object} config - 配置对象（仅在首次调用时使用）
 * @returns {AgentCacheManager} 全局实例
 */
export function getGlobalAgentCacheManager(config) {
  if (!globalCacheManager) {
    globalCacheManager = new AgentCacheManager(config);
  }
  return globalCacheManager;
}
