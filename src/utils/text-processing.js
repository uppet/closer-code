/**
 * 文本处理工具函数
 *
 * 用于处理多行文本输入中的特殊情况：
 * - 换行符标准化
 * - Unicode 字符显示宽度计算
 * - 可打印字符判断
 */

/**
 * 标准化换行符
 * 将所有换行符（\r\n, \r, \n）统一为 \n
 *
 * @param {string} text - 原始文本
 * @returns {string} 标准化后的文本
 * @example
 * normalizeLineBreaks('Hello\r\nWorld') // 'Hello\nWorld'
 * normalizeLineBreaks('Hello\rWorld')   // 'Hello\nWorld'
 * normalizeLineBreaks('Hello\nWorld')   // 'Hello\nWorld'
 */
export function normalizeLineBreaks(text) {
  if (!text) return '';
  // 先处理 \r\n，再处理剩余的 \r
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * 计算字符串的显示宽度
 * 考虑 Unicode 字符（如中文、emoji）的显示宽度
 *
 * 规则：
 * - ASCII 字符（U+0000-U+007F）：宽度 1
 * - 中文字符、日文、韩文等（CJK）：宽度 2
 * - Emoji：宽度 2（大部分）
 * - 其他字符：宽度 1
 *
 * @param {string} str - 输入字符串
 * @returns {number} 显示宽度
 * @example
 * getStringDisplayLength('Hello')     // 5
 * getStringDisplayLength('你好')      // 4
 * getStringDisplayLength('Hello你好')  // 9
 * getStringDisplayLength('😀😁')      // 4
 */
export function getStringDisplayLength(str) {
  if (!str) return 0;

  let length = 0;
  for (const char of str) {
    const code = char.codePointAt(0);

    // ASCII 字符（0-127）
    if (code < 0x80) {
      length += 1;
    }
    // CJK 统一表意文字（中文、日文、韩文）
    // 范围：U+4E00-U+9FFF, U+3400-U+4DBF
    else if (
      (code >= 0x4E00 && code <= 0x9FFF) ||
      (code >= 0x3400 && code <= 0x4DBF)
    ) {
      length += 2;
    }
    // CJK 扩展 A-F
    // 范围：U+20000-U+2EBEF（需要代理对处理）
    // Emoji 和其他符号
    // 范围：U+1F000-U+1FAFF（需要代理对处理）
    // 简化处理：所有非 ASCII 字符都算 2
    else {
      length += 2;
    }
  }

  return length;
}

/**
 * 根据显示位置获取字符索引
 * 用于将光标显示位置转换为字符串索引
 *
 * @param {string} str - 输入字符串
 * @param {number} displayCol - 显示位置（从 0 开始）
 * @returns {number} 字符索引
 * @example
 * getCharAtDisplayPosition('你好世界', 2)  // 1（第二个字符'好'）
 * getCharAtDisplayPosition('你好世界', 3)  // 1（'好'的宽度为2）
 * getCharAtDisplayPosition('你好世界', 4)  // 2（第三个字符'世'）
 */
export function getCharAtDisplayPosition(str, displayCol) {
  if (!str || displayCol <= 0) return 0;

  let currentDisplayCol = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const charWidth = getStringDisplayLength(char);

    // 如果加上当前字符会超过目标位置，返回当前索引
    if (currentDisplayCol + charWidth > displayCol) {
      return i;
    }

    currentDisplayCol += charWidth;

    // 如果正好等于目标位置，返回下一个字符的索引
    if (currentDisplayCol === displayCol) {
      return i + 1;
    }
  }

  // 超出范围，返回字符串长度
  return str.length;
}

/**
 * 判断字符是否可打印
 *
 * 可打印字符：
 * - 所有可见字符（字母、数字、符号）
 * - 空格 (0x20)
 * - 制表符 \t (0x09)
 * - 换行符 \n (0x0A)
 * - 回车符 \r (0x0D)
 *
 * 不可打印字符：
 * - null (0x00)
 * - 控制字符 (0x01-0x08, 0x0B-0x0C, 0x0E-0x1F)
 * - DEL (0x7F)
 *
 * @param {string} char - 单个字符
 * @returns {boolean} 是否可打印
 * @example
 * isPrintableChar('a')   // true
 * isPrintableChar(' ')   // true
 * isPrintableChar('\n')  // true
 * isPrintableChar('\x00') // false
 */
export function isPrintableChar(char) {
  if (!char) return false;

  const code = char.charCodeAt(0);

  // 空格
  if (code === 0x20) return true;

  // 制表符、换行符、回车符
  if (code === 0x09 || code === 0x0A || code === 0x0D) return true;

  // 可打印 ASCII 字符 (0x21-0x7E)
  if (code >= 0x21 && code <= 0x7E) return true;

  // 扩展 ASCII 和 Unicode 字符（>= 0x80）
  if (code >= 0x80) return true;

  // 控制字符（不可打印）
  return false;
}

/**
 * 过滤不可打印字符
 * 保留可打印字符和常用的特殊字符（\t, \n, \r）
 *
 * @param {string} text - 输入文本
 * @returns {string} 过滤后的文本
 * @example
 * filterPrintableChars('Hello\x00World')  // 'HelloWorld'
 * filterPrintableChars('Line1\nLine2')     // 'Line1\nLine2'
 */
export function filterPrintableChars(text) {
  if (!text) return '';

  let result = '';
  for (const char of text) {
    if (isPrintableChar(char)) {
      result += char;
    }
  }
  return result;
}

/**
 * 按显示宽度截断字符串
 * 如果字符串超过指定显示宽度，进行截断并添加省略号
 *
 * @param {string} str - 输入字符串
 * @param {number} maxWidth - 最大显示宽度
 * @param {string} ellipsis - 省略符号（默认 '...'）
 * @returns {string} 截断后的字符串
 * @example
 * truncateByDisplayWidth('你好世界', 4)      // '你好...'
 * truncateByDisplayWidth('你好世界', 5)      // '你...'
 * truncateByDisplayWidth('Hello World', 8)   // 'Hello...'
 */
export function truncateByDisplayWidth(str, maxWidth, ellipsis = '...') {
  if (!str) return '';
  if (maxWidth <= 0) return '';

  const ellipsisWidth = getStringDisplayLength(ellipsis);
  if (maxWidth <= ellipsisWidth) {
    return ''; // 无法显示省略号
  }

  const targetWidth = maxWidth - ellipsisWidth;
  let currentWidth = 0;
  let result = '';

  for (const char of str) {
    const charWidth = getStringDisplayLength(char);
    if (currentWidth + charWidth > targetWidth) {
      break;
    }
    result += char;
    currentWidth += charWidth;
  }

  // 如果整个字符串都小于目标宽度，不需要省略号
  if (currentWidth < getStringDisplayLength(str)) {
    return result + ellipsis;
  }

  return result;
}

/**
 * 将字符串按显示宽度填充到指定宽度
 *
 * @param {string} str - 输入字符串
 * @param {number} targetWidth - 目标显示宽度
 * @param {string} fillChar - 填充字符（默认空格）
 * @returns {string} 填充后的字符串
 * @example
 * padToDisplayWidth('你好', 6)      // '你好  '
 * padToDisplayWidth('Hello', 10)    // 'Hello     '
 */
export function padToDisplayWidth(str, targetWidth, fillChar = ' ') {
  if (!str) return fillChar.repeat(targetWidth);
  if (targetWidth <= 0) return str;

  const currentWidth = getStringDisplayLength(str);
  if (currentWidth >= targetWidth) return str;

  const fillWidth = targetWidth - currentWidth;
  const fillCharWidth = getStringDisplayLength(fillChar);
  const fillCount = Math.floor(fillWidth / fillCharWidth);

  return str + fillChar.repeat(fillCount);
}
