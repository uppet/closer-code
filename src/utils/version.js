/**
 * 版本信息工具
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 获取包版本号
 * @returns {string} 版本号
 */
export function getVersion() {
  try {
    const packagePath = join(__dirname, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    return packageJson.version || '1.0.0';
  } catch (error) {
    return '1.0.0';
  }
}

/**
 * 显示版本信息
 */
export function showVersion() {
  const version = getVersion();
  console.log(`cloco v${version}`);
  console.log('AI 编程助理 - 通过对话完成编码、调试和任务规划');
}
