/**
 * 增强的 JSON 解析工具
 * 用于处理 OpenAI 流式返回的不完整 JSON
 */

/**
 * 安全的 JSON 解析，支持自动修复常见的 JSON 错误
 * @param {string} text - 要解析的 JSON 字符串
 * @param {object} options - 配置选项
 * @param {boolean} options.repair - 是否尝试修复损坏的 JSON（默认: true）
 * @param {any} options.fallback - 解析失败时的返回值（默认: null）
 * @param {boolean} options.silent - 是否隐藏错误日志（默认: false）
 * @returns {object|null} 解析结果或 fallback 值
 */
function safeJSONParse(text, options = {}) {
  const {
    repair = true,
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

  // 尝试直接解析
  try {
    return JSON.parse(text);
  } catch (directError) {
    // 如果不需要修复，直接返回 fallback
    if (!repair) {
      if (!silent) {
        console.error('[JSON Parse Error]:', directError.message);
      }
      return fallback;
    }

    // 尝试修复
    const repaired = tryRepairJSON(text);
    if (repaired === null) {
      if (!silent) {
        console.error('[JSON Parse Error]: Cannot repair JSON');
        console.error('[Original text]:', text.substring(0, 200));
      }
      return fallback;
    }

    try {
      return JSON.parse(repaired);
    } catch (repairError) {
      if (!silent) {
        console.error('[JSON Repair Error]:', repairError.message);
        console.error('[Repaired text]:', repaired.substring(0, 200));
      }
      return fallback;
    }
  }
}

/**
 * 尝试修复常见的 JSON 错误
 * @param {string} text - 损坏的 JSON 字符串
 * @returns {string|null} 修复后的 JSON 字符串，如果无法修复则返回 null
 */
function tryRepairJSON(text) {
  let repaired = text.trim();

  // 1. 修复不完整的对象（缺少闭合括号）
  const openBraces = (repaired.match(/{/g) || []).length;
  const closeBraces = (repaired.match(/}/g) || []).length;
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/\]/g) || []).length;

  // 添加缺失的闭合括号
  if (openBraces > closeBraces) {
    repaired += '}'.repeat(openBraces - closeBraces);
  }
  if (openBrackets > closeBrackets) {
    repaired += ']'.repeat(openBrackets - closeBrackets);
  }

  // 2. 修复不完整的字符串（缺少闭合引号）
  // 检查未闭合的字符串
  const lines = repaired.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const quoteCount = (line.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      // 奇数个引号，可能缺少闭合引号
      if (!line.trim().endsWith(',') && !line.trim().endsWith('}')) {
        lines[i] = line + '"';
      }
    }
  }
  repaired = lines.join('\n');

  // 3. 修复尾随逗号（在对象或数组的末尾）
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

  // 4. 移除 JavaScript 注释
  repaired = repaired.replace(/\/\*[\s\S]*?\*\//g, '');
  repaired = repaired.replace(/\/\/.*/g, '');

  // 5. 修复未引用的键名和值
  // 先修复键名
  repaired = repaired.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
  // 修复未引用的简单值（字母、数字、下划线组成的值）
  repaired = repaired.replace(/:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)([,\s}\]])/g, ': "$1"$2');

  // 6. 修复单引号字符串为双引号
  repaired = repaired.replace(/'([^']*)'/g, '"$1"');

  // 7. 移除控制字符
  repaired = repaired.replace(/[\x00-\x1F\x7F]/g, '');

  return repaired;
}

/**
 * 流式 JSON 解析器
 * 用于处理流式返回的 JSON 数据
 */
class StreamingJSONParser {
  constructor(options = {}) {
    this.buffer = '';
    this.options = {
      repair: true,
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
    const trimmed = this.buffer.trim();
    if (!this.isLikelyCompleteJSON(trimmed)) {
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
    // 空字符串不完整
    if (!text) return false;

    // 必须以 { 或 [ 开头
    const firstChar = text.trim()[0];
    if (firstChar !== '{' && firstChar !== '[') return false;

    // 计算括号
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;

    for (const char of text) {
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

    // 如果还在字符串中，说明不完整
    if (inString) return false;

    // 括号应该平衡
    return braceCount === 0 && bracketCount === 0;
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

export {
  safeJSONParse,
  tryRepairJSON,
  StreamingJSONParser
};
