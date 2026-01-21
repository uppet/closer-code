
/**
 * 输入历史记录管理器
 * 
 * 功能：
 * - 保存用户输入历史
 * - 支持上下箭头导航
 * - 支持持久化存储
 * - 支持搜索历史记录
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const HISTORY_DIR = path.join(os.homedir(), '.closer-code');
const HISTORY_FILE = path.join(HISTORY_DIR, 'closer-input-history');
const MAX_HISTORY_SIZE = 1000;
const MAX_MEMORY_SIZE = 100; // 内存中保留的最近记录数

export class InputHistory {
  constructor(options = {}) {
    this.maxSize = options.maxSize || MAX_MEMORY_SIZE;
    this.history = [];
    this.currentIndex = -1;
    this.temporaryInput = ''; // 用户在浏览历史时的临时输入
    this.searchQuery = ''; // 搜索查询
    this.searchResults = []; // 搜索结果
    this.searchIndex = -1; // 搜索结果索引
    this.isSearching = false; // 是否处于搜索模式
  }

  /**
   * 初始化：从文件加载历史记录
   */
  async load() {
    try {
      const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
      const allHistory = JSON.parse(data);
      
      // 只加载最近的记录到内存
      this.history = allHistory.slice(-this.maxSize);
      
      console.log(`[History] Loaded ${this.history.length} entries from ${HISTORY_FILE}`);
      return this.history.length;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('[History] Failed to load history:', error.message);
      }
      this.history = [];
      return 0;
    }
  }

  /**
   * 保存历史记录到文件
   */
  async save() {
    try {
      // 确保目录存在
      if (!fs.existsSync(HISTORY_DIR)) {
        fs.mkdirSync(HISTORY_DIR, { recursive: true });
      }

      // 读取现有历史
      let allHistory = [];
      try {
        const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
        allHistory = JSON.parse(data);
      } catch (e) {
        // 文件不存在或无法解析，使用空数组
      }

      // 合并内存中的历史记录（去重）
      const historySet = new Set([...allHistory, ...this.history]);
      allHistory = Array.from(historySet);

      // 限制总大小
      if (allHistory.length > MAX_HISTORY_SIZE) {
        allHistory = allHistory.slice(-MAX_HISTORY_SIZE);
      }

      // 保存到文件
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(allHistory, null, 2), 'utf-8');
      
      console.log(`[History] Saved ${allHistory.length} entries to ${HISTORY_FILE}`);
      return true;
    } catch (error) {
      console.error('[History] Failed to save history:', error.message);
      return false;
    }
  }

  /**
   * 添加新的输入到历史记录
   */
  add(input) {
    // 过滤空输入和重复输入
    const trimmed = input.trim();
    if (!trimmed) {
      return false;
    }

    // 不重复添加最后一条记录
    if (this.history.length > 0 && this.history[this.history.length - 1] === trimmed) {
      return false;
    }

    // 添加到历史记录
    this.history.push(trimmed);

    // 限制内存中的历史记录数量
    if (this.history.length > this.maxSize) {
      this.history.shift();
    }

    // 重置导航状态
    this.resetNavigation();

    // 自动保存（防抖）
    this.debouncedSave();

    return true;
  }

  /**
   * 导航历史记录
   * @param {string} direction - 'up' 或 'down'
   * @param {string} currentInput - 当前输入框的内容
   * @returns {string|null} - 应该显示的内容，null 表示不改变
   */
  navigate(direction, currentInput = '') {
    // 如果历史记录为空，返回null
    if (this.history.length === 0) {
      return null;
    }

    // 如果是第一次向上导航，保存当前输入
    if (direction === 'up' && this.currentIndex === -1) {
      this.temporaryInput = currentInput;
      this.currentIndex = this.history.length - 1;
      return this.history[this.currentIndex];
    }

    // 向上导航（更早的记录）
    if (direction === 'up') {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        return this.history[this.currentIndex];
      }
      return this.history[this.currentIndex]; // 已经是最早的记录
    }

    // 向下导航（更近的记录）
    if (direction === 'down') {
      if (this.currentIndex < this.history.length - 1) {
        this.currentIndex++;
        return this.history[this.currentIndex];
      } else {
        // 已经是最后一条，返回临时输入
        this.currentIndex = -1;
        return this.temporaryInput;
      }
    }

    return null;
  }

  /**
   * 重置导航状态
   */
  resetNavigation() {
    this.currentIndex = -1;
    this.temporaryInput = '';
    this.isSearching = false;
    this.searchQuery = '';
    this.searchResults = [];
    this.searchIndex = -1;
  }

  /**
   * 开始搜索历史记录
   * @param {string} query - 搜索关键词
   * @returns {string|null} - 第一条匹配结果
   */
  search(query) {
    if (!query || query.trim() === '') {
      this.isSearching = false;
      this.searchQuery = '';
      this.searchResults = [];
      this.searchIndex = -1;
      return null;
    }

    this.searchQuery = query.toLowerCase();
    this.isSearching = true;

    // 搜索包含关键词的历史记录（从新到旧）
    this.searchResults = this.history.filter(item => 
      item.toLowerCase().includes(this.searchQuery)
    );

    if (this.searchResults.length > 0) {
      this.searchIndex = 0;
      return this.searchResults[0];
    }

    return null;
  }

  /**
   * 在搜索结果中导航
   * @param {string} direction - 'next' 或 'prev'
   * @returns {string|null} - 下一条或上一条搜索结果
   */
  navigateSearch(direction) {
    if (!this.isSearching || this.searchResults.length === 0) {
      return null;
    }

    if (direction === 'next') {
      // 下一个结果（更早的记录）
      this.searchIndex = (this.searchIndex + 1) % this.searchResults.length;
    } else if (direction === 'prev') {
      // 上一个结果（更近的记录）
      this.searchIndex = (this.searchIndex - 1 + this.searchResults.length) % this.searchResults.length;
    }

    return this.searchResults[this.searchIndex];
  }

  /**
   * 获取当前搜索状态
   */
  getSearchStatus() {
    if (!this.isSearching) {
      return null;
    }

    return {
      query: this.searchQuery,
      total: this.searchResults.length,
      current: this.searchIndex + 1,
      result: this.searchResults[this.searchIndex] || null
    };
  }

  /**
   * 清空历史记录
   */
  clear() {
    this.history = [];
    this.resetNavigation();
    
    // 也删除文件
    try {
      fs.unlinkSync(HISTORY_FILE);
      console.log('[History] History file deleted');
    } catch (error) {
      // 文件不存在，忽略
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      total: this.history.length,
      currentIndex: this.currentIndex,
      isSearching: this.isSearching,
      searchResults: this.searchResults.length
    };
  }

  /**
   * 防抖保存（避免频繁写入文件）
   */
  debouncedSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.save();
      this.saveTimeout = null;
    }, 1000); // 1秒后保存
  }

  /**
   * 销毁：保存历史记录并清理
   */
  async destroy() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    await this.save();
  }

  /**
   * 导出历史记录
   */
  export() {
    return {
      history: this.history,
      stats: this.getStats()
    };
  }

  /**
   * 导入历史记录
   */
  import(data) {
    if (Array.isArray(data.history)) {
      this.history = data.history.slice(-this.maxSize);
      this.resetNavigation();
      return true;
    }
    return false;
  }
}

/**
 * 创建历史记录管理器实例
 */
export function createHistoryManager(options = {}) {
  const history = new InputHistory(options);
  
  // 自动加载历史记录
  history.load().catch(err => {
    console.error('[History] Failed to initialize:', err);
  });

  return history;
}

/**
 * 获取历史记录文件路径
 */
export function getHistoryFilePath() {
  return HISTORY_FILE;
}
