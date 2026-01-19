/**
 * MCP Client 管理器
 * 
 * 负责连接到外部 MCP Servers 并管理工具调用
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { logger } from '../logger.js';

/**
 * MCP Client 管理器类
 */
export class MCPClientManager {
  constructor() {
    // 存储所有连接的 MCP clients
    this.clients = new Map();
    // 存储所有 MCP 工具 { serverName: { toolName: toolSchema } }
    this.tools = new Map();
    // 存储服务器配置
    this.serverConfigs = new Map();
  }

  /**
   * 连接到一个 MCP Server
   * @param {string} name - 服务器名称
   * @param {Object} config - 服务器配置
   * @returns {Promise<Array>} 返回可用的工具列表
   */
  async connectServer(name, config) {
    try {
      logger.debug(`连接到 MCP Server: ${name}`);

      const client = new Client(
        {
          name: `closer-code-mcp-client-${name}`,
          version: '1.0.0'
        },
        {
          capabilities: {}
        }
      );

      // 创建 stdio transport
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env: {
          ...process.env,
          ...(config.env || {})
        }
      });

      // 连接
      await client.connect(transport);

      // 存储 client 和配置
      this.clients.set(name, client);
      this.serverConfigs.set(name, config);

      // 获取可用工具
      const toolsResponse = await client.listTools();
      const tools = toolsResponse.tools || [];

      // 存储工具
      this.tools.set(name, new Map());
      for (const tool of tools) {
        this.tools.get(name).set(tool.name, tool);
      }

      logger.info(`✓ 已连接到 MCP Server: ${name} (${tools.length} 个工具)`);

      return tools;
    } catch (error) {
      logger.error(`✗ 连接 MCP Server 失败: ${name} - ${error.message}`);
      throw error;
    }
  }

  /**
   * 批量连接多个 MCP Servers
   * @param {Object} serversConfig - 服务器配置对象 { name: config }
   */
  async connectServers(serversConfig) {
    const connectionPromises = [];

    for (const [name, config] of Object.entries(serversConfig)) {
      if (config.enabled !== false) {
        connectionPromises.push(
          this.connectServer(name, config).catch(err => {
            logger.warn(`跳过 MCP Server ${name}: ${err.message}`);
            return null;
          })
        );
      }
    }

    const results = await Promise.all(connectionPromises);
    const connected = results.filter(r => r !== null);

    logger.info(`MCP Servers 连接完成: ${connected.length} 个服务器成功连接`);

    return connected;
  }

  /**
   * 调用 MCP 工具
   * @param {string} serverName - 服务器名称
   * @param {string} toolName - 工具名称
   * @param {Object} args - 工具参数
   * @returns {Promise<Object>} 工具执行结果
   */
  async callTool(serverName, toolName, args) {
    const client = this.clients.get(serverName);

    if (!client) {
      throw new Error(`MCP Server '${serverName}' 未连接`);
    }

    try {
      logger.debug(`调用 MCP 工具: ${serverName}.${toolName}`);

      const result = await client.callTool({
        name: toolName,
        arguments: args
      });

      // 提取文本内容
      if (result.content && result.content.length > 0) {
        const textContent = result.content
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join('\n');

        return {
          success: true,
          server: serverName,
          tool: toolName,
          content: textContent,
          raw: result
        };
      }

      return {
        success: true,
        server: serverName,
        tool: toolName,
        content: '',
        raw: result
      };
    } catch (error) {
      logger.error(`MCP 工具调用失败: ${serverName}.${toolName} - ${error.message}`);

      return {
        success: false,
        server: serverName,
        tool: toolName,
        error: error.message
      };
    }
  }

  /**
   * 获取所有可用的 MCP 工具（扁平化列表）
   * @returns {Array} 工具列表 [{ name, description, inputSchema, serverName }]
   */
  getAllTools() {
    const allTools = [];

    for (const [serverName, toolsMap] of this.tools) {
      for (const [toolName, toolSchema] of toolsMap) {
        allTools.push({
          name: `${serverName}_${toolName}`, // 唯一名称
          originalName: toolName,
          serverName,
          description: toolSchema.description,
          inputSchema: toolSchema.inputSchema
        });
      }
    }

    return allTools;
  }

  /**
   * 根据 toolName 获取工具所属的服务器
   * @param {string} fullToolName - 完整工具名称 (server_tool)
   * @returns {Object} { serverName, toolName, toolSchema }
   */
  getToolInfo(fullToolName) {
    const match = fullToolName.match(/^([a-zA-Z0-9_-]+)_([a-zA-Z0-9_-]+)$/);

    if (!match) {
      return null;
    }

    const [, serverName, toolName] = match;
    const toolsMap = this.tools.get(serverName);

    if (!toolsMap) {
      return null;
    }

    const toolSchema = toolsMap.get(toolName);

    if (!toolSchema) {
      return null;
    }

    return {
      serverName,
      toolName,
      toolSchema
    };
  }

  /**
   * 断开所有连接
   */
  async disconnectAll() {
    logger.debug('断开所有 MCP Servers 连接...');

    for (const [name, client] of this.clients) {
      try {
        await client.close();
        logger.debug(`✓ 已断开: ${name}`);
      } catch (error) {
        logger.warn(`断开 ${name} 时出错: ${error.message}`);
      }
    }

    this.clients.clear();
    this.tools.clear();
    this.serverConfigs.clear();
  }

  /**
   * 获取连接状态
   * @returns {Object} 连接状态信息
   */
  getStatus() {
    const status = {
      connectedServers: Array.from(this.clients.keys()),
      totalTools: 0,
      servers: {}
    };

    for (const [serverName, toolsMap] of this.tools) {
      const toolCount = toolsMap.size;
      status.totalTools += toolCount;
      status.servers[serverName] = {
        connected: this.clients.has(serverName),
        toolCount
      };
    }

    return status;
  }
}

/**
 * 单例实例
 */
let mcpClientManager = null;

/**
 * 获取 MCP Client Manager 单例
 * @returns {MCPClientManager}
 */
export function getMCPClientManager() {
  if (!mcpClientManager) {
    mcpClientManager = new MCPClientManager();
  }
  return mcpClientManager;
}
