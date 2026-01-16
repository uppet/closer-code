import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.closer-code');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const HISTORY_FILE = path.join(CONFIG_DIR, 'history.json');
const MEMORY_FILE = path.join(CONFIG_DIR, 'memory.json');

// 默认配置
const DEFAULT_CONFIG = {
  // AI 提供商配置
  ai: {
    provider: 'anthropic', // 'anthropic' | 'openai' | 'ollama'
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      baseURL: 'https://api.anthropic.com',
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 8192
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseURL: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      maxTokens: 4096
    },
    ollama: {
      baseURL: 'http://localhost:11434',
      model: 'llama3.1',
      maxTokens: 4096
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

// 加载对话历史
export function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    }
  } catch (error) {
    console.warn('Failed to load history:', error.message);
  }
  return [];
}

// 保存对话历史
export function saveHistory(history) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    // 只保留最近 100 条
    const trimmed = history.slice(-100);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2));
  } catch (error) {
    console.error('Failed to save history:', error.message);
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
