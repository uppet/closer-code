/**
 * Skill Parser - 技能解析器
 *
 * 最小化解析原则：
 * - 只解析必需字段：name 和 description
 * - 保留完整 content 传递给 AI
 * - 使用简单的 YAML front-matter 解析
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * 解析技能文件
 * @param {string} skillPath - 技能文件路径
 * @returns {Promise<Object>} 解析后的技能对象
 */
export async function parseSkill(skillPath) {
  try {
    // 读取文件内容
    const content = await fs.readFile(skillPath, 'utf-8');

    // 提取 YAML front-matter
    const frontmatter = extractFrontmatter(content);

    // 移除 front-matter，保留完整内容
    const contentWithoutFrontmatter = removeFrontmatter(content);

    // 验证必需字段
    if (!frontmatter.name) {
      throw new Error('Missing required field: name');
    }
    if (!frontmatter.description) {
      throw new Error('Missing required field: description');
    }

    return {
      // 只解析这两个字段
      name: frontmatter.name,
      description: frontmatter.description,

      // 完整内容（AI 理解）
      content: contentWithoutFrontmatter,

      // 文件信息
      path: skillPath,
      directory: path.dirname(skillPath)
    };
  } catch (error) {
    throw new Error(`Failed to parse skill file "${skillPath}": ${error.message}`);
  }
}

/**
 * 提取 YAML front-matter（--- ... ---）
 * @param {string} content - 文件内容
 * @returns {Object} 解析后的 front-matter 对象
 */
function extractFrontmatter(content) {
  // 匹配 --- ... --- 格式
  const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
  if (!match) {
    throw new Error('Invalid skill format: missing frontmatter');
  }

  try {
    // 简单解析：只提取 name 和 description
    const yaml = match[1];
    const lines = yaml.split('\n');
    const result = {};

    for (const line of lines) {
      // 跳过空行和注释
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // 匹配 key: value 格式（支持带引号和不带引号）
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        // 移除引号（单引或双引）
        result[key] = value
          .replace(/^"|"$/g, '')
          .replace(/^'|'$/g, '')
          .trim();
      }
    }

    return result;
  } catch (error) {
    throw new Error(`Failed to parse frontmatter: ${error.message}`);
  }
}

/**
 * 移除 front-matter
 * @param {string} content - 文件内容
 * @returns {string} 移除 front-matter 后的内容
 */
function removeFrontmatter(content) {
  return content.replace(/^---\r?\n[\s\S]+?\r?\n---\r?\n?/, '');
}

/**
 * 快速解析：只读取 front-matter（用于发现技能）
 * @param {string} skillPath - 技能文件路径
 * @returns {Promise<Object>} { name, description } 或 null
 */
export async function parseSkillFrontmatter(skillPath) {
  try {
    const content = await fs.readFile(skillPath, 'utf-8');
    const frontmatter = extractFrontmatter(content);

    // 验证必需字段
    if (!frontmatter.name || !frontmatter.description) {
      return null;
    }

    return {
      name: frontmatter.name,
      description: frontmatter.description,
      path: skillPath
    };
  } catch (error) {
    // 快速解析失败不抛出错误，返回 null
    return null;
  }
}

/**
 * 验证技能文件格式
 * @param {string} skillPath - 技能文件路径
 * @returns {Promise<boolean>} 是否有效
 */
export async function validateSkillFile(skillPath) {
  try {
    const result = await parseSkillFrontmatter(skillPath);
    return result !== null;
  } catch {
    return false;
  }
}
