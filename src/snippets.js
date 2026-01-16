/**
 * 代码片段管理
 */

import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';

const SNIPPETS_DIR = path.join(homedir(), '.closer-code/snippets');

/**
 * 代码片段
 */
export class CodeSnippet {
  constructor(name, content, language = 'text', tags = []) {
    this.name = name;
    this.content = content;
    this.language = language;
    this.tags = tags;
    this.createdAt = new Date().toISOString();
    this.usedCount = 0;
  }

  incrementUsage() {
    this.usedCount++;
    this.lastUsed = new Date().toISOString();
  }
}

/**
 * 代码片段管理器
 */
export class SnippetManager {
  constructor() {
    this.snippets = new Map();
  }

  /**
   * 初始化
   */
  async initialize() {
    await this.loadSnippets();
  }

  /**
   * 加载所有代码片段
   */
  async loadSnippets() {
    try {
      await fs.mkdir(SNIPPETS_DIR, { recursive: true });

      const files = await fs.readdir(SNIPPETS_DIR);

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(SNIPPETS_DIR, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(content);

            const snippet = Object.assign(new CodeSnippet(), data);
            this.snippets.set(data.name, snippet);
          } catch (error) {
            console.warn(`Failed to load snippet ${file}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load snippets:', error.message);
    }
  }

  /**
   * 保存代码片段
   */
  async saveSnippet(snippet) {
    const filePath = path.join(SNIPPETS_DIR, `${snippet.name}.json`);

    await fs.mkdir(SNIPPETS_DIR, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(snippet, null, 2));

    this.snippets.set(snippet.name, snippet);
  }

  /**
   * 创建新代码片段
   */
  async create(name, content, language = 'text', tags = []) {
    if (this.snippets.has(name)) {
      throw new Error(`Snippet "${name}" already exists`);
    }

    const snippet = new CodeSnippet(name, content, language, tags);
    await this.saveSnippet(snippet);

    return snippet;
  }

  /**
   * 获取代码片段
   */
  get(name) {
    const snippet = this.snippets.get(name);

    if (snippet) {
      snippet.incrementUsage();
      this.saveSnippet(snippet); // 更新使用统计
    }

    return snippet;
  }

  /**
   * 搜索代码片段
   */
  search(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    for (const [name, snippet] of this.snippets) {
      // 搜索名称
      if (name.toLowerCase().includes(lowerQuery)) {
        results.push(snippet);
        continue;
      }

      // 搜索标签
      if (snippet.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
        results.push(snippet);
        continue;
      }

      // 搜索内容
      if (snippet.content.toLowerCase().includes(lowerQuery)) {
        results.push(snippet);
      }
    }

    return results;
  }

  /**
   * 按标签搜索
   */
  getByTag(tag) {
    const results = [];

    for (const snippet of this.snippets.values()) {
      if (snippet.tags.includes(tag)) {
        results.push(snippet);
      }
    }

    return results;
  }

  /**
   * 按语言搜索
   */
  getByLanguage(language) {
    const results = [];

    for (const snippet of this.snippets.values()) {
      if (snippet.language === language) {
        results.push(snippet);
      }
    }

    return results;
  }

  /**
   * 列出所有代码片段
   */
  list() {
    return Array.from(this.snippets.values());
  }

  /**
   * 删除代码片段
   */
  async delete(name) {
    if (!this.snippets.has(name)) {
      return false;
    }

    const filePath = path.join(SNIPPETS_DIR, `${name}.json`);
    await fs.unlink(filePath);

    this.snippets.delete(name);
    return true;
  }

  /**
   * 更新代码片段
   */
  async update(name, updates) {
    const snippet = this.snippets.get(name);

    if (!snippet) {
      throw new Error(`Snippet "${name}" not found`);
    }

    Object.assign(snippet, updates);
    await this.saveSnippet(snippet);

    return snippet;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const stats = {
      total: this.snippets.size,
      byLanguage: {},
      mostUsed: [],
      recentlyUsed: []
    };

    // 按语言统计
    for (const snippet of this.snippets.values()) {
      stats.byLanguage[snippet.language] = (stats.byLanguage[snippet.language] || 0) + 1;
    }

    // 最常用
    stats.mostUsed = Array.from(this.snippets.values())
      .sort((a, b) => b.usedCount - a.usedCount)
      .slice(0, 10);

    // 最近使用
    stats.recentlyUsed = Array.from(this.snippets.values())
      .filter(s => s.lastUsed)
      .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
      .slice(0, 10);

    return stats;
  }

  /**
   * 导出代码片段
   */
  async export(name) {
    const snippet = this.snippets.get(name);

    if (!snippet) {
      throw new Error(`Snippet "${name}" not found`);
    }

    return {
      name: snippet.name,
      content: snippet.content,
      language: snippet.language,
      tags: snippet.tags
    };
  }

  /**
   * 导入代码片段
   */
  async import(data) {
    const { name, content, language = 'text', tags = [] } = data;

    if (this.snippets.has(name)) {
      throw new Error(`Snippet "${name}" already exists`);
    }

    const snippet = new CodeSnippet(name, content, language, tags);
    await this.saveSnippet(snippet);

    return snippet;
  }
}

/**
 * 创建代码片段管理器
 */
export async function createSnippetManager() {
  const manager = new SnippetManager();
  await manager.initialize();
  return manager;
}

/**
 * 预定义代码片段模板
 */
export const SNIPPET_TEMPLATES = {
  // React 组件
  'react-component': {
    content: `import React from 'react';

export function {{name}}({{props}}) {
  return (
    <div>
      {/* Component content */}
    </div>
  );
}

export default {{name}};`,
    language: 'jsx',
    tags: ['react', 'component']
  },

  // React Hook
  'react-hook': {
    content: `import { useState, useEffect } from 'react';

export function use{{name}}() {
  const [state, setState] = useState(null);

  useEffect(() => {
    // Effect logic
  }, []);

  return state;
}`,
    language: 'jsx',
    tags: ['react', 'hook']
  },

  // Express 路由
  'express-route': {
    content: `import express from 'express';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Handle GET request
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    // Handle POST request
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;`,
    language: 'javascript',
    tags: ['express', 'route', 'api']
  },

  // Node.js 模块
  'node-module': {
    content: `/**
 * {{description}}
 */

export function {{functionName}}({{params}}) {
  // Implementation
  return {{returnValue}};
}

export default {{functionName}};`,
    language: 'javascript',
    tags: ['node', 'module']
  },

  // Python 函数
  'python-function': {
    content: `def {{function_name}}({{params}}):
    """
    {{description}}
    """
    # Implementation
    return {{return_value}}`,
    language: 'python',
    tags: ['python', 'function']
  },

  // Git Commit
  'git-commit': {
    content: `git add .
git commit -m "{{message}}"
git push`,
    language: 'bash',
    tags: ['git', 'commit']
  },

  // NPM Package
  'npm-package': {
    content: `{
  "name": "{{package-name}}",
  "version": "1.0.0",
  "description": "{{description}}",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js",
    "test": "node --test"
  },
  "keywords": [],
  "author": "",
  "license": "MIT"
}`,
    language: 'json',
    tags: ['npm', 'package']
  }
};

/**
 * 从模板创建代码片段
 */
export async function createFromTemplate(templateName, name, variables = {}) {
  const template = SNIPPET_TEMPLATES[templateName];

  if (!template) {
    throw new Error(`Template "${templateName}" not found`);
  }

  let content = template.content;

  // 替换变量
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    content = content.replace(regex, value);
  }

  const manager = await createSnippetManager();
  return await manager.create(name, content, template.language, template.tags);
}
