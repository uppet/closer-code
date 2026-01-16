/**
 * 快捷操作和别名管理
 */

import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';

const SHORTCUTS_FILE = path.join(homedir(), '.closer-code/shortcuts.json');

// 默认快捷操作
const DEFAULT_SHORTCUTS = {
  // 文件操作
  'ls': { action: 'listFiles', description: '列出当前目录文件' },
  'pwd': { action: 'printWorkingDir', description: '打印当前工作目录' },
  'cat': { action: 'readFile', description: '读取文件内容' },

  // Git 操作
  'gs': { action: 'gitStatus', description: 'Git 状态' },
  'ga': { action: 'gitAdd', description: 'Git 添加文件' },
  'gc': { action: 'gitCommit', description: 'Git 提交' },
  'gp': { action: 'gitPush', description: 'Git 推送' },
  'gl': { action: 'gitLog', description: 'Git 日志' },

  // 项目操作
  'build': { action: 'runBuild', description: '运行构建' },
  'test': { action: 'runTests', description: '运行测试' },
  'clean': { action: 'cleanBuild', description: '清理构建文件' },
  'install': { action: 'installDeps', description: '安装依赖' },

  // 搜索操作
  'find': { action: 'searchCode', description: '搜索代码' },
  'grep': { action: 'searchFiles', description: '搜索文件' },

  // AI 操作
  'explain': { action: 'explainCode', description: '解释代码' },
  'fix': { action: 'fixError', description: '修复错误' },
  'refactor': { action: 'refactorCode', description: '重构代码' },
  'review': { action: 'reviewCode', description: '代码审查' },

  // 系统操作
  'env': { action: 'showEnv', description: '显示环境信息' },
  'help': { action: 'showHelp', description: '显示帮助' },
  'config': { action: 'showConfig', description: '显示配置' }
};

/**
 * 快捷操作管理器
 */
export class ShortcutManager {
  constructor() {
    this.shortcuts = {};
    this.aliases = {};
  }

  /**
   * 初始化快捷操作
   */
  async initialize() {
    await this.loadShortcuts();
  }

  /**
   * 加载快捷操作
   */
  async loadShortcuts() {
    try {
      const data = await fs.readFile(SHORTCUTS_FILE, 'utf-8');
      const custom = JSON.parse(data);

      this.shortcuts = { ...DEFAULT_SHORTCUTS, ...custom.shortcuts };
      this.aliases = custom.aliases || {};
    } catch (error) {
      // 文件不存在，使用默认
      this.shortcuts = { ...DEFAULT_SHORTCUTS };
      this.aliases = {};
    }
  }

  /**
   * 保存快捷操作
   */
  async saveShortcuts() {
    const data = {
      shortcuts: this.shortcuts,
      aliases: this.aliases
    };

    const dir = path.dirname(SHORTCUTS_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(SHORTCUTS_FILE, JSON.stringify(data, null, 2));
  }

  /**
   * 解析快捷命令
   */
  parse(input) {
    // 移除开头的斜杠（如果有）
    const cleaned = input.replace(/^\/+/, '').trim();

    // 分割命令和参数
    const parts = cleaned.split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1).join(' ');

    // 检查别名
    const actualCommand = this.aliases[command] || command;

    // 查找快捷操作
    const shortcut = this.shortcuts[actualCommand];

    if (shortcut) {
      return {
        type: 'shortcut',
        command: actualCommand,
        action: shortcut.action,
        args,
        description: shortcut.description
      };
    }

    return null;
  }

  /**
   * 添加别名
   */
  async addAlias(alias, command) {
    this.aliases[alias] = command;
    await this.saveShortcuts();
  }

  /**
   * 移除别名
   */
  async removeAlias(alias) {
    delete this.aliases[alias];
    await this.saveShortcuts();
  }

  /**
   * 添加快捷操作
   */
  async addShortcut(name, action, description) {
    this.shortcuts[name] = { action, description };
    await this.saveShortcuts();
  }

  /**
   * 移除快捷操作
   */
  async removeShortcut(name) {
    delete this.shortcuts[name];
    await this.saveShortcuts();
  }

  /**
   * 列出所有快捷操作
   */
  list() {
    return {
      shortcuts: this.shortcuts,
      aliases: this.aliases
    };
  }

  /**
   * 执行快捷操作
   */
  async execute(shortcut, toolExecutor) {
    const { action, args } = shortcut;

    switch (action) {
      case 'listFiles':
        return await toolExecutor.listFiles({
          dirPath: args || '.',
          recursive: false
        });

      case 'printWorkingDir':
        return { success: true, data: { cwd: process.cwd() } };

      case 'readFile':
        if (!args) {
          return { success: false, error: '需要指定文件路径' };
        }
        return await toolExecutor.readFile({ filePath: args });

      case 'gitStatus':
        return await toolExecutor.bash({ command: 'git status' });

      case 'gitAdd':
        return await toolExecutor.bash({ command: `git add ${args || '.'}` });

      case 'gitCommit':
        if (!args) {
          return { success: false, error: '需要指定提交信息' };
        }
        return await toolExecutor.bash({ command: `git commit -m "${args}"` });

      case 'gitPush':
        return await toolExecutor.bash({ command: 'git push' });

      case 'gitLog':
        return await toolExecutor.bash({ command: 'git log --oneline -10' });

      case 'runBuild':
        return await toolExecutor.bash({ command: 'npm run build' });

      case 'runTests':
        return await toolExecutor.runTests({});

      case 'cleanBuild':
        return await toolExecutor.bash({ command: 'rm -rf dist node_modules/.cache' });

      case 'installDeps':
        return await toolExecutor.bash({ command: 'npm install' });

      case 'searchCode':
        if (!args) {
          return { success: false, error: '需要指定搜索模式' };
        }
        return await toolExecutor.searchCode({ pattern: args });

      case 'searchFiles':
        if (!args) {
          return { success: false, error: '需要指定文件模式' };
        }
        return await toolExecutor.searchFiles({ pattern: args });

      case 'showEnv':
        return {
          success: true,
          data: {
            node: process.version,
            platform: process.platform,
            arch: process.arch,
            cwd: process.cwd()
          }
        };

      case 'showHelp':
        const help = this.list();
        return {
          success: true,
          data: {
            message: '可用快捷操作:',
            shortcuts: help.shortcuts,
            aliases: help.aliases
          }
        };

      default:
        return {
          success: false,
          error: `未知操作: ${action}`
        };
    }
  }
}

/**
 * 创建快捷操作管理器
 */
export async function createShortcutManager() {
  const manager = new ShortcutManager();
  await manager.initialize();
  return manager;
}
