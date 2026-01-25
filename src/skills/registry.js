/**
 * Skill Registry - 技能注册表
 *
 * 管理技能的发现、加载和缓存
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { parseSkill, parseSkillFrontmatter } from './parser.js';

/**
 * 技能注册表类
 */
export class SkillRegistry {
  constructor(config = {}) {
    // 技能目录配置
    this.globalDir = config.globalDir || path.join(os.homedir(), '.closer-code', 'skills');
    this.projectDir = config.projectDir || null;

    // 常驻技能列表
    this.residentSkills = config.residentSkills || [];

    // 缓存
    this.skillCache = new Map(); // name -> skill object
    this.discoveryCache = new Map(); // query -> skills list
    this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存

    // 初始化标志
    this.initialized = false;
  }

  /**
   * 初始化技能注册表
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // 确保全局技能目录存在
      await this.ensureDirectory(this.globalDir);

      // 如果有项目本地目录，确保存在
      if (this.projectDir) {
        await this.ensureDirectory(this.projectDir);
      }

      // 预加载常驻技能
      if (this.residentSkills.length > 0) {
        await this.loadResidentSkills();
      }

      this.initialized = true;
      console.log('[Skills] Registry initialized');
    } catch (error) {
      console.error('[Skills] Failed to initialize registry:', error.message);
      throw error;
    }
  }

  /**
   * 确保目录存在
   */
  async ensureDirectory(dir) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * 发现可用的技能
   * @param {Object} options - 选项 { query, category }
   * @returns {Promise<Array>} 技能列表 [{ name, description }]
   */
  async discover(options = {}) {
    await this.initialize();

    const { query = '', category = '' } = options;

    // 生成缓存键
    const cacheKey = JSON.stringify({ query, category });

    // 检查缓存
    if (this.discoveryCache.has(cacheKey)) {
      const cached = this.discoveryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.skills;
      }
    }

    try {
      // 扫描技能目录
      const allSkills = await this.scanSkillDirectories();

      // 过滤和排序
      let filtered = allSkills;

      // 按关键词过滤
      if (query) {
        const lowerQuery = query.toLowerCase();
        filtered = filtered.filter(skill =>
          skill.name.toLowerCase().includes(lowerQuery) ||
          skill.description.toLowerCase().includes(lowerQuery)
        );
      }

      // 按分类过滤（如果 front-matter 中有 category 字段）
      if (category) {
        // 这里需要完整加载才能获取 category，暂时跳过
        // TODO: 实现 category 过滤
      }

      // 更新缓存
      this.discoveryCache.set(cacheKey, {
        skills: filtered,
        timestamp: Date.now()
      });

      return filtered;
    } catch (error) {
      console.error('[Skills] Failed to discover skills:', error.message);
      return [];
    }
  }

  /**
   * 扫描技能目录
   * @returns {Promise<Array>} 技能列表
   */
  async scanSkillDirectories() {
    const skills = [];

    // 扫描全局技能目录
    const globalSkills = await this.scanDirectory(this.globalDir);
    skills.push(...globalSkills);

    // 扫描项目本地技能目录（优先级更高）
    if (this.projectDir) {
      const projectSkills = await this.scanDirectory(this.projectDir);
      skills.push(...projectSkills);
    }

    // 去重：项目本地优先
    const uniqueSkills = this.deduplicateSkills(skills);

    return uniqueSkills;
  }

  /**
   * 扫描单个目录
   * @param {string} dir - 目录路径
   * @returns {Promise<Array>} 技能列表
   */
  async scanDirectory(dir) {
    const skills = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const skillDir = path.join(dir, entry.name);
        
        // 读取目录内容，使用正则表达式忽略大小写匹配 skill.md
        try {
          const skillEntries = await fs.readdir(skillDir);
          
          // 使用正则表达式匹配（忽略大小写）
          const skillFileRegex = /^skill\.md$/i;
          const skillFileName = skillEntries.find(name => skillFileRegex.test(name));
          
          if (!skillFileName) {
            continue;
          }
          
          const skillFile = path.join(skillDir, skillFileName);
          
          // 快速解析 front-matter
          const skillInfo = await parseSkillFrontmatter(skillFile);
          if (skillInfo) {
            skills.push({
              ...skillInfo,
              source: dir // 记录来源，用于去重
            });
          }
        } catch {
          // 目录不存在或解析失败，跳过
          continue;
        }
      }
    } catch (error) {
      // 目录不存在或无法读取，返回空数组
      return [];
    }

    return skills;
  }

  /**
   * 去重技能（项目本地优先）
   * @param {Array} skills - 技能列表
   * @returns {Array} 去重后的技能列表
   */
  deduplicateSkills(skills) {
    const skillMap = new Map();

    for (const skill of skills) {
      const existing = skillMap.get(skill.name);

      // 如果不存在，或者项目本地优先
      if (!existing || skill.source === this.projectDir) {
        skillMap.set(skill.name, skill);
      }
    }

    return Array.from(skillMap.values());
  }

  /**
   * 通过名称加载技能
   * @param {string} name - 技能名称
   * @returns {Promise<Object|null>} 技能对象或 null
   */
  async loadByName(name) {
    await this.initialize();

    // 检查缓存
    if (this.skillCache.has(name)) {
      return this.skillCache.get(name);
    }

    try {
      // 发现技能以获取路径
      const skills = await this.discover();
      const skillInfo = skills.find(s => s.name === name);

      if (!skillInfo) {
        return null;
      }

      // 完整加载技能
      const skill = await parseSkill(skillInfo.path);

      // 缓存
      this.skillCache.set(name, skill);

      return skill;
    } catch (error) {
      console.error(`[Skills] Failed to load skill "${name}":`, error.message);
      return null;
    }
  }

  /**
   * 加载常驻技能
   */
  async loadResidentSkills() {
    console.log(`[Skills] Loading ${this.residentSkills.length} resident skills...`);

    for (const name of this.residentSkills) {
      const skill = await this.loadByName(name);
      if (skill) {
        console.log(`[Skills] ✓ Loaded resident skill: ${name}`);
      } else {
        console.warn(`[Skills] ✗ Failed to load resident skill: ${name}`);
      }
    }
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.skillCache.clear();
    this.discoveryCache.clear();
    console.log('[Skills] Cache cleared');
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      initialized: this.initialized,
      cachedSkills: this.skillCache.size,
      discoveryCacheSize: this.discoveryCache.size,
      globalDir: this.globalDir,
      projectDir: this.projectDir,
      residentSkills: this.residentSkills.length
    };
  }
}

/**
 * 创建全局技能注册表实例
 * @param {Object} config - 配置
 * @returns {SkillRegistry} 注册表实例
 */
export function createSkillRegistry(config) {
  return new SkillRegistry(config);
}
