/**
 * MCP Integration - MCP Client 集成
 *
 * 负责：
 * - MCP Servers 初始化
 * - MCP 工具获取
 * - MCP 相关配置管理
 */

import { getMCPClientManager } from '../mcp/client.js';

export class MCPIntegration {
  constructor(config) {
    this.config = config;
    this.enabled = false;
    this.tools = [];
  }

  /**
   * 初始化 MCP Servers
   */
  async initialize() {
    // 检查是否启用 MCP
    if (!this.config.mcp?.enabled) {
      console.log('[MCP] MCP Client is disabled in config');
      return;
    }

    if (!this.config.mcp?.servers || Object.keys(this.config.mcp.servers).length === 0) {
      console.log('[MCP] No MCP Servers configured');
      return;
    }

    try {
      console.log('[MCP] Initializing MCP Client...');

      const manager = getMCPClientManager();

      // 显示配置来源
      const { loadProjectConfig } = await import('../config.js');
      const projectConfig = loadProjectConfig(this.config.behavior.workingDir);
      if (Object.keys(projectConfig).length > 0) {
        console.log('[MCP] Using project-local MCP configuration');
      }

      // 连接到所有配置的 MCP Servers
      await manager.connectServers(this.config.mcp.servers);

      // 获取所有 MCP 工具
      this.tools = manager.getAllTools();
      this.enabled = true;

      console.log(`[MCP] ✓ Loaded ${this.tools.length} tools from MCP Servers`);

      // 显示工具列表
      if (this.tools.length > 0) {
        console.log('[MCP] Available MCP tools:');
        for (const tool of this.tools) {
          console.log(`  - ${tool.name} [from ${tool.serverName}]`);
        }
      }
    } catch (error) {
      console.error(`[MCP] Failed to initialize: ${error.message}`);
      console.error('[MCP] MCP features will be disabled');
      this.enabled = false;
    }
  }

  /**
   * 获取所有 MCP 工具
   * @returns {Array} MCP 工具数组
   */
  getTools() {
    return this.tools;
  }

  /**
   * 检查是否启用
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * 获取状态
   * @returns {Object} 状态对象
   */
  getState() {
    return {
      enabled: this.enabled,
      toolCount: this.tools.length,
      tools: this.tools.map(t => t.name)
    };
  }
}
