/**
 * Agent 工具插件系统
 *
 * 允许动态注册、管理和执行自定义工具
 * 提供细粒度的权限控制和工具生命周期管理
 */

import { createAgentToolManager } from './agent-tools.js';

/**
 * 工具插件定义
 * @typedef {Object} ToolPlugin
 * @property {string} name - 工具名称（唯一）
 * @property {string} description - 工具描述
 * @property {string} type - 工具类型（read, analysis, search）
 * @property {Function} execute - 执行函数
 * @property {Object} schema - 输入参数 schema（JSON Schema）
 * @property {Object} permissions - 权限配置
 * @property {string[]} permissions.allowedPaths - 允许访问的路径
 * @property {number} permissions.maxFileSize - 最大文件大小限制
 * @property {boolean} permissions.allowNetwork - 是否允许网络访问
 */

/**
 * 工具插件注册表
 */
class ToolPluginRegistry {
  constructor() {
    this.plugins = new Map();
    this.toolManager = createAgentToolManager();
    this.pluginHooks = {
      beforeExecute: [],
      afterExecute: [],
      onError: []
    };
  }

  /**
   * 注册工具插件
   * @param {ToolPlugin} plugin - 工具插件
   * @returns {boolean} 是否成功注册
   */
  register(plugin) {
    // 验证插件定义
    if (!plugin.name || !plugin.execute) {
      console.error(`[PluginRegistry] Invalid plugin: missing name or execute function`);
      return false;
    }

    if (this.plugins.has(plugin.name)) {
      console.warn(`[PluginRegistry] Plugin "${plugin.name}" already registered, overwriting`);
    }

    // 验证权限配置
    plugin.permissions = plugin.permissions || {
      allowedPaths: ['.'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowNetwork: false
    };

    // 验证工具类型
    const validTypes = ['read', 'analysis', 'search', 'custom'];
    plugin.type = plugin.type || 'custom';
    if (!validTypes.includes(plugin.type)) {
      console.warn(`[PluginRegistry] Invalid type "${plugin.type}" for plugin "${plugin.name}", using "custom"`);
      plugin.type = 'custom';
    }

    this.plugins.set(plugin.name, plugin);
    console.log(`[PluginRegistry] Registered plugin: ${plugin.name} (type: ${plugin.type})`);

    return true;
  }

  /**
   * 注销工具插件
   * @param {string} name - 工具名称
   * @returns {boolean} 是否成功注销
   */
  unregister(name) {
    return this.plugins.delete(name);
  }

  /**
   * 获取工具插件
   * @param {string} name - 工具名称
   * @returns {ToolPlugin|null} 工具插件
   */
  get(name) {
    return this.plugins.get(name) || null;
  }

  /**
   * 检查工具是否已注册
   * @param {string} name - 工具名称
   * @returns {boolean} 是否已注册
   */
  has(name) {
    return this.plugins.has(name);
  }

  /**
   * 获取所有已注册的工具
   * @returns {Array<ToolPlugin>} 工具列表
   */
  getAll() {
    return Array.from(this.plugins.values());
  }

  /**
   * 按类型获取工具
   * @param {string} type - 工具类型
   * @returns {Array<ToolPlugin>} 工具列表
   */
  getByType(type) {
    return this.getAll().filter(plugin => plugin.type === type);
  }

  /**
   * 获取工具定义（用于 AI 工具描述）
   * @returns {Array} 工具定义列表
   */
  getToolDefinitions() {
    return this.getAll().map(plugin => ({
      name: plugin.name,
      description: plugin.description,
      input_schema: plugin.schema || {
        type: 'object',
        properties: {},
        required: []
      }
    }));
  }

  /**
   * 执行工具插件
   * @param {string} name - 工具名称
   * @param {Object} params - 执行参数
   * @param {Object} context - 执行上下文
   * @returns {Promise<Object>} 执行结果
   */
  async execute(name, params = {}, context = {}) {
    const plugin = this.get(name);

    if (!plugin) {
      return {
        success: false,
        error: `Tool "${name}" not found`
      };
    }

    try {
      // 权限检查
      const permissionCheck = this._checkPermissions(plugin, params, context);
      if (!permissionCheck.allowed) {
        return {
          success: false,
          error: `Permission denied: ${permissionCheck.reason}`
        };
      }

      // 执行前置钩子
      for (const hook of this.pluginHooks.beforeExecute) {
        const result = await hook(plugin, params, context);
        if (result === false) {
          return {
            success: false,
            error: 'Execution blocked by beforeExecute hook'
          };
        }
      }

      // 执行工具
      const startTime = Date.now();
      const result = await plugin.execute(params, context);
      const executionTime = Date.now() - startTime;

      // 添加执行元数据
      const finalResult = {
        ...result,
        _meta: {
          tool: name,
          executionTime,
          timestamp: new Date().toISOString()
        }
      };

      // 执行后置钩子
      for (const hook of this.pluginHooks.afterExecute) {
        await hook(plugin, params, finalResult, context);
      }

      return finalResult;
    } catch (error) {
      // 执行错误钩子
      for (const hook of this.pluginHooks.onError) {
        await hook(plugin, params, error, context);
      }

      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * 检查工具权限
   * @private
   */
  _checkPermissions(plugin, params, context) {
    // 检查路径权限
    if (params.filePath || params.dirPath) {
      const targetPath = params.filePath || params.dirPath;
      const isAllowed = plugin.permissions.allowedPaths.some(allowedPath => {
        return targetPath.startsWith(allowedPath) || targetPath.startsWith('.');
      });

      if (!isAllowed) {
        return {
          allowed: false,
          reason: `Path "${targetPath}" is not in allowed paths`
        };
      }
    }

    // 检查文件大小权限
    if (params.maxSize || params.maxBytes) {
      const requestedSize = params.maxSize || params.maxBytes;
      if (requestedSize > plugin.permissions.maxFileSize) {
        return {
          allowed: false,
          reason: `Requested size ${requestedSize} exceeds limit ${plugin.permissions.maxFileSize}`
        };
      }
    }

    // 检查网络权限（未来扩展）
    if (plugin.permissions.allowNetwork === false) {
      // 检查参数中是否包含 URL
      const paramsStr = JSON.stringify(params);
      if (paramsStr.includes('http://') || paramsStr.includes('https://')) {
        return {
          allowed: false,
          reason: 'Network access is not allowed for this tool'
        };
      }
    }

    return { allowed: true };
  }

  /**
   * 添加钩子
   * @param {string} hookName - 钩子名称（beforeExecute, afterExecute, onError）
   * @param {Function} hookFn - 钩子函数
   */
  addHook(hookName, hookFn) {
    if (this.pluginHooks[hookName]) {
      this.pluginHooks[hookName].push(hookFn);
    }
  }

  /**
   * 移除钩子
   * @param {string} hookName - 钩子名称
   * @param {Function} hookFn - 钩子函数
   */
  removeHook(hookName, hookFn) {
    if (this.pluginHooks[hookName]) {
      const index = this.pluginHooks[hookName].indexOf(hookFn);
      if (index !== -1) {
        this.pluginHooks[hookName].splice(index, 1);
      }
    }
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const plugins = this.getAll();
    const byType = {};

    plugins.forEach(plugin => {
      byType[plugin.type] = (byType[plugin.type] || 0) + 1;
    });

    return {
      totalPlugins: plugins.length,
      byType,
      pluginNames: plugins.map(p => p.name)
    };
  }
}

/**
 * 全局插件注册表单例
 */
let globalRegistry = null;

/**
 * 获取全局插件注册表
 * @returns {ToolPluginRegistry} 全局注册表
 */
export function getGlobalPluginRegistry() {
  if (!globalRegistry) {
    globalRegistry = new ToolPluginRegistry();
  }
  return globalRegistry;
}

/**
 * 创建工具插件注册表
 * @returns {ToolPluginRegistry} 新的注册表实例
 */
export function createPluginRegistry() {
  return new ToolPluginRegistry();
}

/**
 * 工具插件构建器
 * 提供链式 API 来创建工具插件
 */
export class ToolPluginBuilder {
  constructor(name) {
    this.plugin = {
      name,
      description: '',
      type: 'custom',
      execute: null,
      schema: null,
      permissions: {
        allowedPaths: ['.'],
        maxFileSize: 10 * 1024 * 1024,
        allowNetwork: false
      }
    };
  }

  /**
   * 设置描述
   */
  description(desc) {
    this.plugin.description = desc;
    return this;
  }

  /**
   * 设置类型
   */
  type(type) {
    this.plugin.type = type;
    return this;
  }

  /**
   * 设置执行函数
   */
  execute(fn) {
    this.plugin.execute = fn;
    return this;
  }

  /**
   * 设置参数 schema
   */
  schema(schema) {
    this.plugin.schema = schema;
    return this;
  }

  /**
   * 设置权限配置
   */
  permissions(perms) {
    this.plugin.permissions = { ...this.plugin.permissions, ...perms };
    return this;
  }

  /**
   * 设置允许的路径
   */
  allowPaths(paths) {
    this.plugin.permissions.allowedPaths = Array.isArray(paths) ? paths : [paths];
    return this;
  }

  /**
   * 设置最大文件大小
   */
  maxSize(size) {
    this.plugin.permissions.maxFileSize = size;
    return this;
  }

  /**
   * 允许网络访问
   */
  allowNetwork(allow = true) {
    this.plugin.permissions.allowNetwork = allow;
    return this;
  }

  /**
   * 构建插件
   */
  build() {
    if (!this.plugin.execute) {
      throw new Error(`Plugin "${this.plugin.name}" must have an execute function`);
    }
    return this.plugin;
  }
}

/**
 * 创建工具插件构建器
 * @param {string} name - 工具名称
 * @returns {ToolPluginBuilder} 构建器实例
 */
export function createToolPlugin(name) {
  return new ToolPluginBuilder(name);
}
