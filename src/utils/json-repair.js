/**
 * 使用 jsonrepair 的增强 JSON 解析工具
 * 专门用于处理 OpenAI API 返回的不完整 JSON
 */

import { jsonrepair } from 'jsonrepair';

/**
 * 安全的 JSON 解析，使用 jsonrepair 自动修复损坏的 JSON
 * @param {string} text - 要解析的 JSON 字符串
 * @param {object} options - 配置选项
 * @param {any} options.fallback - 解析失败时的返回值（默认: null）
 * @param {boolean} options.silent - 是否隐藏错误日志（默认: false）
 * @returns {object|null} 解析结果或 fallback 值
 */
export function safeJSONParse(text, options = {}) {
  const {
    fallback = null,
    silent = false
  } = options;

  // 如果不是字符串，直接返回
  if (typeof text !== 'string') {
    if (typeof text === 'object') {
      return text;
    }
    return fallback;
  }

  // 尝试直接解析（快速路径）
  try {
    return JSON.parse(text);
  } catch (directError) {
    // 使用 jsonrepair 修复
    try {
      const repaired = jsonrepair(text);
      return JSON.parse(repaired);
    } catch (repairError) {
      if (!silent) {
        console.error('[JSON Parse Error]: Cannot repair JSON');
        console.error('[Repair error]:', repairError.message);
      }
      return fallback;
    }
  }
}

/**
 * 流式 JSON 解析器（使用 jsonrepair）
 * 用于处理流式返回的 JSON 数据
 */
export class StreamingJSONParser {
  constructor(options = {}) {
    this.buffer = '';
    this.options = {
      fallback: null,
      silent: false,
      ...options
    };
  }

  /**
   * 添加数据块
   * @param {string} chunk - 数据块
   * @returns {object|null} 如果解析成功返回对象，否则返回 null
   */
  addChunk(chunk) {
    this.buffer += chunk;

    // 检查是否可能是完整的JSON（括号匹配）
    if (!this.isLikelyCompleteJSON(this.buffer)) {
      return null;
    }

    // 尝试解析
    const result = safeJSONParse(this.buffer, { ...this.options, silent: true });
    
    // 如果解析成功，清空缓冲区
    if (result !== null) {
      this.buffer = '';
      return result;
    }

    return null;
  }

  /**
   * 检查字符串是否可能是完整的JSON
   * @param {string} text - 要检查的文本
   * @returns {boolean} 是否可能是完整的JSON
   */
  isLikelyCompleteJSON(text) {
    const trimmed = text.trim();
    if (!trimmed) return false;

    const firstChar = trimmed[0];
    if (firstChar !== '{' && firstChar !== '[') return false;

    // 计算括号
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;

    for (const char of trimmed) {
      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;
      }
    }

    return !inString && braceCount === 0 && bracketCount === 0;
  }

  /**
   * 重置解析器
   */
  reset() {
    this.buffer = '';
  }

  /**
   * 获取当前缓冲区内容
   */
  getBuffer() {
    return this.buffer;
  }
}
