
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { safeJSONParse } from './utils/json-repair.js';

const CONFIG_DIR = path.join(os.homedir(), '.closer-code');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const HISTORY_DIR = path.join(CONFIG_DIR, 'history'); // 改为目录
const HISTORY_FILE = path.join(CONFIG_DIR, 'history.json'); // 保留用于兼容
const MEMORY_FILE = path.join(CONFIG_DIR, 'memory.json');

// 项目本地配置文件名
const PROJECT_CONFIG_FILES = [
  '.closer-code.json',
  '.closer-code/config.json',
  'closer-code.json',
  '.closer-code.local.json',
  '.closer-code.test.json'  // 用于测试
];

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
      maxTokens: parseInt(process.env.CLOSER_OPENAI_MAX_TOKENS || '4096'),
      // DeepSeek-R1 Reasoning 支持
      enableReasoning: process.env.CLOSER_DEEPSEEK_REASONING === 'true'
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
      'bash',                    // 执行 shell 命令
      'bashResult',              // 从缓存的 bash 结果中获取更多内容
      'readFile',                // 读取文件（智能分段）
      'readFileLines',           // 读取文件指定行范围
      'readFileChunk',           // 按字节读取文件（适用于 minify 文件）
      'readFileTail',            // 读取文件末尾（日志文件）
      'writeFile',               // 写入文件
      'editFile',                // 编辑文件（全文替换）
      'regionConstrainedEdit',   // 编辑文件（区域约束精确替换）
      'searchFiles',             // 搜索文件
      'searchCode',              // 搜索代码
      'listFiles',               // 列出文件
      'analyzeError',            // 分析错误
      'runTests',                // 运行测试
      'planTask',                // 规划任务
      'skillDiscover',           // 发现可用技能
      'skillLoad'                // 加载技能到对话
    ]
  },

  // Skills 配置
  skills: {
    enabled: true,              // 是否启用技能系统
    directories: {
      global: '~/.closer-code/skills',      // 全局技能目录
      project: '.closer-code/skills'        // 项目本地技能目录
    },
    resident: [                 // 常驻技能列表（始终加载）
      // 'git-status',
      // 'file-read'
    ]
  },

  // Agents 配置
  agents: {
    enabled: true,              // 是否启用 agent 系统
    maxConcurrent: 3,           // 最大并发数
    timeout: 60000,             // 超时时间（毫秒）
    cacheEnabled: true,         // 是否启用缓存
    cacheTTL: 300000,           // 缓存存活时间（5分钟）
    maxTokens: 4096,            // Agent 最大 token 数
    temperature: 0,             // Agent 温度设置（确定性输出）
    retryAttempts: 2,           // 失败重试次数
    retryDelay: 1000,           // 重试延迟（毫秒）
    tools: [                    // Agent 可用工具白名单
      'searchFiles',
      'searchCode',
      'listFiles',
      'readFile',
      'readFileLines',
      'readFileChunk'
    ]
  },

  // UI 配置
  ui: {
    theme: 'default',
    showLineNumbers: true,
    maxOutputLines: 100,
    autoScroll: true,
    // 流式更新配置（Buffer + Throttle）
    streamUpdate: {
      interval: 1000,              // 更新间隔（毫秒），默认1秒
      bufferSize: 50,              // 缓冲区大小（token数量）
      updateOnPunctuation: true    // 遇到句子结束标点时立即更新
    }
  },

  // MCP 配置
  mcp: {
    enabled: true,  // 是否启用 MCP Client
    servers: {
      // 示例：文件系统 MCP Server
      // filesystem: {
      //   enabled: false,
      //   command: 'npx',
      //   args: ['-y', '@modelcontextprotocol/server-filesystem', '/allowed/path'],
      //   env: {}
      // },

      // 示例：Git MCP Server
      // git: {
      //   enabled: false,
      //   command: 'npx',
      //   args: ['-y', '@modelcontextprotocol/server-git'],
      //   env: {}
      // },

      // 示例：PostgreSQL MCP Server
      // postgres: {
      //   enabled: false,
      //   command: 'npx',
      //   args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://user:password@localhost:5432/dbname'],
      //   env: {}
      // },

      // 示例：自定义 MCP Server
      // my-custom-server: {
      //   enabled: false,
      //   command: 'node',
      //   args: ['/path/to/custom-mcp-server.js'],
      //   env: {
      //     'CUSTOM_ENV_VAR': 'value'
      //   }
      // }
    }
  }
};

/**
 * 查找项目本地配置文件
 * @param {string} projectPath - 项目路径（默认为当前工作目录）
 * @returns {string|null} 配置文件路径，如果未找到则返回 null
 */
export function findProjectConfigFile(projectPath = null) {
  const workingDir = projectPath || process.cwd();

  for (const configFile of PROJECT_CONFIG_FILES) {
    const configPath = path.join(workingDir, configFile);
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }

  return null;
}

/**
 * 加载项目本地配置
 * @param {string} projectPath - 项目路径（默认为当前工作目录）
 * @returns {Object} 项目本地配置，如果未找到则返回空对象
 */
export function loadProjectConfig(projectPath = null) {
  const projectConfigPath = findProjectConfigFile(projectPath);

  if (!projectConfigPath) {
    return {};
  }

  try {
    const configContent = fs.readFileSync(projectConfigPath, 'utf-8');
    
    // 使用 safeJSONParse，失败时直接退出
    const projectConfig = safeJSONParse(configContent, {
      fallback: null,
      silent: true
    });

    if (projectConfig === null) {
      // 尝试直接解析以获取更好的错误信息
      try {
        JSON.parse(configContent);
      } catch (parseError) {
        console.error(`\n❌ [FATAL ERROR] Failed to parse project config file: ${projectConfigPath}`);
        console.error(`\nJSON Parse Error: ${parseError.message}`);
        console.error(`\nPlease fix the JSON syntax error in your config file.`);
        console.error(`Common issues: missing commas, unmatched brackets, trailing commas.\n`);
        process.exit(1);
      }
    }
    
    const workingDir = projectPath || process.cwd();
    console.log(`[Config] Loaded project config from: ${projectConfigPath}`);
    console.log(`[Config] Project path: ${workingDir}`);
    return projectConfig;
  } catch (error) {
    console.warn(`[Config] Failed to load project config from ${projectConfigPath}:`, error.message);
    return {};
  }
}

/**
 * 合并配置（项目本地 > 全局 > 默认）
 * @param {Object} defaultConfig - 默认配置
 * @param {Object} globalConfig - 全局配置
 * @param {Object} projectConfig - 项目本地配置
 * @returns {Object} 合并后的配置
 */
function mergeConfigs(defaultConfig, globalConfig, projectConfig) {
  // 先合并全局配置到默认配置
  const merged = deepMerge(defaultConfig, globalConfig);
  // 再合并项目配置
  return deepMerge(merged, projectConfig);
}

// 加载配置
export function loadConfig(projectPath = null) {
  try {
    // 加载全局配置
    let globalConfig = {};
    if (fs.existsSync(CONFIG_FILE)) {
      const configContent = fs.readFileSync(CONFIG_FILE, 'utf-8');
      
      // 使用 safeJSONParse，失败时直接退出
      const parsedConfig = safeJSONParse(configContent, {
        fallback: null,
        silent: true
      });

      if (parsedConfig === null) {
        // 尝试直接解析以获取更好的错误信息
        try {
          JSON.parse(configContent);
        } catch (parseError) {
          console.error(`\n❌ [FATAL ERROR] Failed to parse global config file: ${CONFIG_FILE}`);
          console.error(`\nJSON Parse Error: ${parseError.message}`);
          console.error(`\nPlease fix the JSON syntax error in your config file.`);
          console.error(`Common issues: missing commas, unmatched brackets, trailing commas.\n`);
          process.exit(1);
        }
      }
      
      globalConfig = parsedConfig;
    }

    // 加载项目本地配置
    const projectConfig = loadProjectConfig(projectPath);

    // 合并配置
    const finalConfig = mergeConfigs(DEFAULT_CONFIG, globalConfig, projectConfig);

    // 如果加载了项目配置，显示信息
    if (Object.keys(projectConfig).length > 0) {
      console.log(`[Config] Using merged config (project + global)`);
    }

    return finalConfig;
  } catch (error) {
    console.warn('Failed to load config, using defaults:', error.message);
    return DEFAULT_CONFIG;
  }
}

// 检查配置是否存在且有效
export function hasConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return false;
    }
    const config = safeJSONParse(fs.readFileSync(CONFIG_FILE, 'utf-8'));

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
      const historyContent = fs.readFileSync(historyFile, 'utf-8');
      const history = safeJSONParse(historyContent, {
        fallback: []
      });
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
        const metaContent = fs.readFileSync(metaPath, 'utf-8');
        const meta = safeJSONParse(metaContent, {
          fallback: null
        });
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

    const oldHistoryContent = fs.readFileSync(HISTORY_FILE, 'utf-8');
    const oldHistory = safeJSONParse(oldHistoryContent, {
      fallback: []
    });
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
      const memoryContent = fs.readFileSync(MEMORY_FILE, 'utf-8');
      return safeJSONParse(memoryContent, {
        fallback: {}
      });
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

/**
 * 获取当前使用的配置文件路径
 * @returns {Object} { global, project, active }
 */
export function getConfigPaths() {
  return {
    global: CONFIG_FILE,
    project: findProjectConfigFile(),
    active: findProjectConfigFile() || CONFIG_FILE
  };
}
