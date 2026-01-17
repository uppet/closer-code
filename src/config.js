import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const CONFIG_DIR = path.join(os.homedir(), '.closer-code');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const HISTORY_DIR = path.join(CONFIG_DIR, 'history'); // 改为目录
const HISTORY_FILE = path.join(CONFIG_DIR, 'history.json'); // 保留用于兼容
const MEMORY_FILE = path.join(CONFIG_DIR, 'memory.json');

// 默认配置
const DEFAULT_CONFIG = {
  // AI 提供商配置
  ai: {
    provider: process.env.CLOSER_AI_PROVIDER || 'anthropic', // 'anthropic' | 'openai' | 'ollama'
    anthropic: {
      apiKey: process.env.CLOSER_ANTHROPIC_API_KEY || '',
      baseURL: process.env.CLOSER_ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
      model: process.env.CLOSER_ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
      maxTokens: parseInt(process.env.CLOSER_ANTHROPIC_MAX_TOKENS || '8192')
    },
    openai: {
      apiKey: process.env.CLOSER_OPENAI_API_KEY || '',
      baseURL: process.env.CLOSER_OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.CLOSER_OPENAI_MODEL || 'gpt-4o',
      maxTokens: parseInt(process.env.CLOSER_OPENAI_MAX_TOKENS || '4096')
    },
    ollama: {
      baseURL: process.env.CLOSER_OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.CLOSER_OLLAMA_MODEL || 'llama3.1',
      maxTokens: parseInt(process.env.CLOSER_OLLAMA_MAX_TOKENS || '4096')
    }
  },

  // 行为配置
  behavior: {
    autoPlan: true,           // 自动规划任务
    autoExecute: false,       // 自动执行低风险操作
    confirmDestructive: true, // 危险操作需要确认
    maxRetries: 3,            // 失败重试次数
    timeout: 30000,           // 操作超时时间
    workingDir: process.cwd() // 默认工作目录
  },

  // 工具配置
  tools: {
    enabled: [
      'bash',           // 执行 shell 命令
      'readFile',       // 读取文件
      'writeFile',      // 写入文件
      'editFile',       // 编辑文件
      'searchFiles',    // 搜索文件
      'searchCode',     // 搜索代码
      'listFiles',      // 列出文件
      'analyzeError',   // 分析错误
      'runTests',       // 运行测试
      'planTask'        // 规划任务
    ]
  },

  // UI 配置
  ui: {
    theme: 'default',
    showLineNumbers: true,
    maxOutputLines: 100,
    autoScroll: true
  }
};

// 加载配置
export function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return { ...DEFAULT_CONFIG, ...config };
    }
  } catch (error) {
    console.warn('Failed to load config, using defaults:', error.message);
  }
  return DEFAULT_CONFIG;
}

// 检查配置是否存在且有效
export function hasConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return false;
    }
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));

    // 检查是否有有效的 API Key
    const provider = config.ai?.provider || 'anthropic';
    const apiKey = config.ai?.[provider]?.apiKey;

    return !!apiKey;
  } catch (error) {
    return false;
  }
}

// 保存配置
export function saveConfig(config) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Failed to save config:', error.message);
    throw error;
  }
}

/**
 * 生成项目历史文件的路径
 * @param {string} projectPath - 项目路径
 * @returns {string} 历史文件路径
 */
function getProjectHistoryPath(projectPath) {
  // 规范化路径并生成唯一标识符
  const normalizedPath = path.normalize(projectPath);
  // 使用路径的哈希作为文件名前缀，避免特殊字符问题
  const hash = crypto.createHash('md5').update(normalizedPath).digest('hex');
  // 提取目录名作为文件名后缀，便于人类查阅
  const dirName = path.basename(normalizedPath);
  // 清理目录名中的特殊字符
  const cleanDirName = dirName.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(HISTORY_DIR, `${hash}-${cleanDirName}.json`);
}

/**
 * 生成项目历史文件的元数据路径
 * @param {string} projectPath - 项目路径
 * @returns {string} 元数据文件路径
 */
function getProjectMetaPath(projectPath) {
  const normalizedPath = path.normalize(projectPath);
  const hash = crypto.createHash('md5').update(normalizedPath).digest('hex');
  const dirName = path.basename(normalizedPath);
  const cleanDirName = dirName.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(HISTORY_DIR, `${hash}-${cleanDirName}.meta.json`);
}

/**
 * 加载对话历史（基于项目隔离）
 * @param {string} projectPath - 项目路径（可选，默认使用当前工作目录）
 * @returns {Array} 历史消息数组
 */
export function loadHistory(projectPath = null) {
  try {
    const workingDir = projectPath || process.cwd();
    const historyFile = getProjectHistoryPath(workingDir);

    if (fs.existsSync(historyFile)) {
      const history = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
      console.log(`[History] Loaded ${history.length} messages for project: ${workingDir}`);
      return history;
    } else {
      console.log(`[History] No history found for project: ${workingDir}`);
    }
  } catch (error) {
    console.warn('Failed to load history:', error.message);
  }
  return [];
}

/**
 * 保存对话历史（基于项目隔离）
 * @param {Array} history - 历史消息数组
 * @param {string} projectPath - 项目路径（可选，默认使用当前工作目录）
 */
export function saveHistory(history, projectPath = null) {
  try {
    const workingDir = projectPath || process.cwd();
    
    // 确保历史目录存在
    if (!fs.existsSync(HISTORY_DIR)) {
      fs.mkdirSync(HISTORY_DIR, { recursive: true });
    }

    const historyFile = getProjectHistoryPath(workingDir);
    const metaFile = getProjectMetaPath(workingDir);

    // 只保留最近 100 条消息
    const trimmed = history.slice(-100);

    // 保存历史
    fs.writeFileSync(historyFile, JSON.stringify(trimmed, null, 2));

    // 保存元数据（用于调试和管理）
    const meta = {
      projectPath: workingDir,
      messageCount: trimmed.length,
      lastUpdated: new Date().toISOString(),
      lastMessage: trimmed[trimmed.length - 1]?.timestamp || null
    };
    fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));

    console.log(`[History] Saved ${trimmed.length} messages for project: ${workingDir}`);
  } catch (error) {
    console.error('Failed to save history:', error.message);
  }
}

/**
 * 清除指定项目的历史
 * @param {string} projectPath - 项目路径（可选，默认使用当前工作目录）
 */
export function clearHistory(projectPath = null) {
  try {
    const workingDir = projectPath || process.cwd();
    const historyFile = getProjectHistoryPath(workingDir);
    const metaFile = getProjectMetaPath(workingDir);

    if (fs.existsSync(historyFile)) {
      fs.unlinkSync(historyFile);
    }
    if (fs.existsSync(metaFile)) {
      fs.unlinkSync(metaFile);
    }

    console.log(`[History] Cleared history for project: ${workingDir}`);
  } catch (error) {
    console.error('Failed to clear history:', error.message);
  }
}

/**
 * 列出所有项目的历史
 * @returns {Array} 项目历史列表
 */
export function listHistory() {
  try {
    if (!fs.existsSync(HISTORY_DIR)) {
      return [];
    }

    const files = fs.readdirSync(HISTORY_DIR)
      .filter(file => file.endsWith('.meta.json'));

    const projects = files.map(file => {
      const metaPath = path.join(HISTORY_DIR, file);
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        return {
          projectPath: meta.projectPath,
          messageCount: meta.messageCount,
          lastUpdated: meta.lastUpdated
        };
      } catch (error) {
        return null;
      }
    }).filter(Boolean);

    return projects;
  } catch (error) {
    console.error('Failed to list history:', error.message);
    return [];
  }
}

/**
 * 迁移旧的历史文件到新的项目隔离结构
 */
export function migrateHistory() {
  try {
    if (!fs.existsSync(HISTORY_FILE)) {
      console.log('[Migration] No old history file found, skipping migration.');
      return;
    }

    console.log('[Migration] Starting history migration...');

    const oldHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    console.log(`[Migration] Found ${oldHistory.length} messages in old history file.`);

    // 备份旧文件
    const backupFile = HISTORY_FILE + '.backup';
    fs.copyFileSync(HISTORY_FILE, backupFile);
    console.log(`[Migration] Backup created at: ${backupFile}`);

    // 将旧历史保存到当前项目
    saveHistory(oldHistory);
    console.log('[Migration] Old history migrated to current project.');

    // 删除旧文件（可选，这里保留备份）
    // fs.unlinkSync(HISTORY_FILE);
    console.log('[Migration] Migration completed. Old file preserved for safety.');
  } catch (error) {
    console.error('Failed to migrate history:', error.message);
  }
}

// 加载记忆（项目知识）
export function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf-8'));
    }
  } catch (error) {
    console.warn('Failed to load memory:', error.message);
  }
  return { projects: {}, patterns: {}, lessons: [] };
}

// 保存记忆
export function saveMemory(memory) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
  } catch (error) {
    console.error('Failed to save memory:', error.message);
  }
}

// 获取当前配置
export function getConfig() {
  return loadConfig();
}

// 更新配置
export function updateConfig(updates) {
  const config = loadConfig();
  const newConfig = deepMerge(config, updates);
  saveConfig(newConfig);
  return newConfig;
}

// 深度合并对象
function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
