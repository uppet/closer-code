/**
 * Agent 工具子集管理
 *
 * 定义和管理 agent 可以使用的只读工具集
 * - 定义只读工具集：GlobTool, GrepTool, LS, View, ReadNotebook
 * - 工具白名单机制
 * - 阻止修改类工具（Bash, Edit, Replace）
 * - 支持自定义工具插件
 * - 细粒度权限控制
 */

import { getGlobalPluginRegistry } from './agent-plugin-system.js';

/**
 * Agent 允许使用的只读工具集
 */
export const AGENT_READONLY_TOOLS = [
  'searchFiles',    // GlobTool - 按文件名模式搜索
  'searchCode',     // GrepTool - 在文件内容中搜索
  'listFiles',      // LS - 列出目录
  'readFile',       // View - 读取文件内容
  'readFileLines',  // View - 按行读取文件
  'readFileChunk',  // View - 按字节范围读取文件
  'readFileTail',   // View - 读取文件末尾（日志）
  // 高级分析工具（Phase 6.2 新增）
  'codeStats',           // 代码库统计
  'dependencyAnalyzer',  // 依赖分析
  'patternSearch'        // 模式搜索
];

/**
 * Agent 禁止使用的工具（修改类工具）
 */
export const AGENT_BLOCKED_TOOLS = [
  'bash',                    // Bash - 执行命令
  'bashResult',              // BashResult - 获取 bash 结果
  'writeFile',               // 写入文件
  'editFile',                // 编辑文件
  'regionConstrainedEdit',   // 区域约束编辑
  'skillDiscover',           // 技能发现（可能修改系统状态）
  'skillLoad'                // 技能加载（可能修改系统状态）
];

/**
 * Agent 工具管理器类
 */
export class AgentToolManager {
  constructor() {
    this.allowedTools = new Set(AGENT_READONLY_TOOLS);
    this.blockedTools = new Set(AGENT_BLOCKED_TOOLS);
  }

  /**
   * 检查工具是否允许使用
   * @param {string} toolName - 工具名称
   * @returns {boolean} 是否允许
   */
  isToolAllowed(toolName) {
    return this.allowedTools.has(toolName);
  }

  /**
   * 检查工具是否被阻止
   * @param {string} toolName - 工具名称
   * @returns {boolean} 是否被阻止
   */
  isToolBlocked(toolName) {
    return this.blockedTools.has(toolName);
  }

  /**
   * 过滤工具列表，只返回允许的工具
   * @param {Array<string>} toolNames - 工具名称数组
   * @returns {Array<string>} 过滤后的工具数组
   */
  filterAllowedTools(toolNames) {
    return toolNames.filter(toolName => this.isToolAllowed(toolName));
  }

  /**
   * 获取允许的工具列表
   * @returns {Array<string>} 允许的工具列表
   */
  getAllowedTools() {
    return Array.from(this.allowedTools);
  }

  /**
   * 获取阻止的工具列表
   * @returns {Array<string>} 阻止的工具列表
   */
  getBlockedTools() {
    return Array.from(this.blockedTools);
  }

  /**
   * 添加自定义工具到白名单（谨慎使用）
   * @param {string} toolName - 工具名称
   * @param {boolean} force - 是否强制添加（即使通常被阻止）
   * @returns {boolean} 是否成功添加
   */
  addAllowedTool(toolName, force = false) {
    // 如果是被阻止的工具，需要 force 参数
    if (this.blockedTools.has(toolName) && !force) {
      console.warn(`[AgentToolManager] Warning: Attempted to add blocked tool "${toolName}" without force flag`);
      return false;
    }

    this.allowedTools.add(toolName);
    return true;
  }

  /**
   * 从白名单中移除工具
   * @param {string} toolName - 工具名称
   * @returns {boolean} 是否成功移除
   */
  removeAllowedTool(toolName) {
    return this.allowedTools.delete(toolName);
  }

  /**
   * 添加工具到黑名单
   * @param {string} toolName - 工具名称
   * @returns {boolean} 是否成功添加
   */
  addBlockedTool(toolName) {
    // 同时从白名单中移除
    this.allowedTools.delete(toolName);
    this.blockedTools.add(toolName);
    return true;
  }

  /**
   * 验证工具调用是否安全
   * @param {string} toolName - 工具名称
   * @param {Object} toolInput - 工具输入参数
   * @returns {Object} { allowed: boolean, reason: string }
   */
  validateToolCall(toolName, toolInput = {}) {
    // 检查是否在黑名单中
    if (this.isToolBlocked(toolName)) {
      return {
        allowed: false,
        reason: `Tool "${toolName}" is blocked for agents. Agents cannot modify files or execute commands.`
      };
    }

    // 检查是否在白名单中
    if (!this.isToolAllowed(toolName)) {
      return {
        allowed: false,
        reason: `Tool "${toolName}" is not in the agent's allowed tools list.`
      };
    }

    // 额外的安全检查（针对特定工具）
    if (toolName === 'readFile' || toolName === 'readFileLines' || toolName === 'readFileChunk') {
      // 检查是否尝试读取敏感文件
      const filePath = toolInput.filePath || '';
      if (this._isSensitiveFile(filePath)) {
        return {
          allowed: false,
          reason: `Access to sensitive file "${filePath}" is blocked.`
        };
      }
    }

    return {
      allowed: true,
      reason: null
    };
  }

  /**
   * 检查是否是敏感文件
   * @param {string} filePath - 文件路径
   * @returns {boolean} 是否是敏感文件
   * @private
   */
  _isSensitiveFile(filePath) {
    const sensitivePatterns = [
      '.env',
      '.git',
      'node_modules/.cache',
      '/etc/',
      '/proc/',
      '/sys/'
    ];

    return sensitivePatterns.some(pattern => filePath.includes(pattern));
  }

  /**
   * 获取工具白名单的摘要信息
   * @returns {Object} 摘要信息
   */
  getSummary() {
    return {
      allowed: this.getAllowedTools(),
      blocked: this.getBlockedTools(),
      totalAllowed: this.allowedTools.size,
      totalBlocked: this.blockedTools.size
    };
  }
}

/**
 * 创建 Agent Tool Manager 的工厂函数
 * @returns {AgentToolManager} Agent Tool Manager 实例
 */
export function createAgentToolManager() {
  return new AgentToolManager();
}

/**
 * 全局单例
 */
let globalToolManager = null;

/**
 * 获取全局 Agent Tool Manager 实例
 * @returns {AgentToolManager} 全局实例
 */
export function getGlobalAgentToolManager() {
  if (!globalToolManager) {
    globalToolManager = new AgentToolManager();
  }
  return globalToolManager;
}

/**
 * 细粒度权限控制配置
 * Phase 6.2 新增：支持基于参数的权限控制
 */
export class AgentPermissionConfig {
  constructor() {
    // 工具级别的权限规则
    this.toolPermissions = new Map();
    
    // 默认权限配置
    this.defaultPermissions = {
      maxFileSize: 10 * 1024 * 1024,  // 10MB
      maxReadLines: 10000,            // 最多读取行数
      allowedPaths: ['.'],            // 允许访问的路径
      deniedPaths: [                  // 禁止访问的路径
        '.git',
        'node_modules',
        '.env',
        '/etc/',
        '/proc/',
        '/sys/'
      ]
    };
  }

  /**
   * 设置工具级别的权限
   * @param {string} toolName - 工具名称
   * @param {Object} permissions - 权限配置
   */
  setToolPermission(toolName, permissions) {
    this.toolPermissions.set(toolName, {
      ...this.defaultPermissions,
      ...permissions
    });
  }

  /**
   * 获取工具的权限配置
   * @param {string} toolName - 工具名称
   * @returns {Object} 权限配置
   */
  getToolPermission(toolName) {
    return this.toolPermissions.get(toolName) || this.defaultPermissions;
  }

  /**
   * 检查参数是否违反权限限制
   * @param {string} toolName - 工具名称
   * @param {Object} params - 工具参数
   * @returns {Object} { allowed: boolean, reason: string }
   */
  checkPermission(toolName, params) {
    const perms = this.getToolPermission(toolName);

    // 检查路径权限
    const pathToCheck = params.filePath || params.dirPath || params.path;
    if (pathToCheck) {
      // 检查是否在禁止路径中
      const isDenied = perms.deniedPaths.some(denied => 
        pathToCheck.includes(denied)
      );
      if (isDenied) {
        return {
          allowed: false,
          reason: `Access to "${pathToCheck}" is denied by security policy`
        };
      }

      // 检查是否在允许路径中
      const isAllowed = perms.allowedPaths.some(allowed =>
        pathToCheck.startsWith(allowed) || pathToCheck.startsWith('.')
      );
      if (!isAllowed) {
        return {
          allowed: false,
          reason: `Path "${pathToCheck}" is not in allowed paths`
        };
      }
    }

    // 检查文件大小限制
    const requestedSize = params.maxSize || params.maxBytes || params.bytes;
    if (requestedSize && requestedSize > perms.maxFileSize) {
      return {
        allowed: false,
        reason: `Requested size ${requestedSize} exceeds limit ${perms.maxFileSize}`
      };
    }

    // 检查读取行数限制
    if (params.maxLines && params.maxLines > perms.maxReadLines) {
      return {
        allowed: false,
        reason: `Requested maxLines ${params.maxLines} exceeds limit ${perms.maxReadLines}`
      };
    }

    return { allowed: true };
  }

  /**
   * 获取权限摘要
   * @returns {Object} 权限摘要
   */
  getSummary() {
    return {
      defaultPermissions: this.defaultPermissions,
      toolPermissions: Object.fromEntries(this.toolPermissions),
      totalToolPermissions: this.toolPermissions.size
    };
  }
}

/**
 * 全局权限配置单例
 */
let globalPermissionConfig = null;

/**
 * 获取全局权限配置
 * @returns {AgentPermissionConfig} 全局权限配置
 */
export function getGlobalPermissionConfig() {
  if (!globalPermissionConfig) {
    globalPermissionConfig = new AgentPermissionConfig();
    
    // 设置默认工具权限
    globalPermissionConfig.setToolPermission('readFile', {
      maxFileSize: 5 * 1024 * 1024  // 5MB
    });
    globalPermissionConfig.setToolPermission('readFileLines', {
      maxReadLines: 5000
    });
    globalPermissionConfig.setToolPermission('searchCode', {
      maxFileSize: 10 * 1024 * 1024  // 10MB
    });
  }
  return globalPermissionConfig;
}

/**
 * 初始化高级工具插件
 * Phase 6.2: 注册高级分析工具到插件系统
 */
export async function initializeAdvancedTools() {
  const { createAdvancedAgentTools } = await import('./agent-advanced-tools.js');
  const registry = getGlobalPluginRegistry();
  
  const tools = createAdvancedAgentTools();
  
  for (const tool of tools) {
    registry.register({
      name: tool.name,
      description: tool.description,
      type: 'analysis',
      execute: (params) => tool.execute(params),
      schema: {
        type: 'object',
        properties: {
          dirPath: { type: 'string', description: 'Directory path to analyze' },
          pattern: { type: 'string', description: 'Pattern to search for' }
        }
      },
      permissions: {
        allowedPaths: ['.'],
        maxFileSize: 50 * 1024 * 1024,  // 50MB for analysis
        allowNetwork: false
      }
    });
  }
  
  console.log(`[AgentTools] Initialized ${tools.length} advanced tools`);
}

/**
 * 获取所有可用的工具（包括内置和插件）
 * @returns {Array<string>} 工具名称列表
 */
export function getAllAvailableTools() {
  const registry = getGlobalPluginRegistry();
  const builtinTools = AGENT_READONLY_TOOLS;
  const pluginTools = registry.getAll().map(p => p.name);
  
  return [...new Set([...builtinTools, ...pluginTools])];
}

/**
 * 获取完整的工具定义（用于 AI 工具描述）
 * @returns {Array} 工具定义列表
 */
export function getCompleteToolDefinitions() {
  const registry = getGlobalPluginRegistry();
  const builtinTools = AGENT_READONLY_TOOLS.map(name => ({
    name,
    type: 'builtin'
  }));
  const pluginTools = registry.getToolDefinitions();
  
  return [...builtinTools, ...pluginTools];
}
