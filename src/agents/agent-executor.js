/**
 * Agent 执行器
 *
 * 负责管理和执行 agent 实例
 * - Agent 实例管理
 * - 工具子集隔离
 * - 执行上下文管理
 * - Phase 6.2: 支持高级工具和插件系统
 */

import { v4 as uuidv4 } from 'uuid';
import { createAgentClient } from './agent-client.js';
import { initializeAdvancedTools, getGlobalPermissionConfig } from './agent-tools.js';
import { getGlobalPluginRegistry } from './agent-plugin-system.js';

/**
 * Agent 执行器类
 */
export class AgentExecutor {
  constructor(config) {
    this.config = config;
    this.agents = new Map(); // 存储运行中的 agents
    this.workingDir = config.behavior?.workingDir || process.cwd();
    this.agentClient = createAgentClient(config);
    this.permissionConfig = getGlobalPermissionConfig();
    this.pluginRegistry = getGlobalPluginRegistry();
    this.advancedToolsInitialized = false;
  }

  /**
   * 确保高级工具已初始化
   * Phase 6.2: 延迟初始化高级工具
   */
  async _ensureAdvancedToolsInitialized() {
    if (!this.advancedToolsInitialized) {
      await initializeAdvancedTools();
      this.advancedToolsInitialized = true;
    }
  }

  /**
   * 创建并执行一个新的 agent
   * @param {Object} options - Agent 配置
   * @returns {Promise<Object>} Agent 执行结果
   */
  async executeAgent(options) {
    // Phase 6.2: 确保高级工具已初始化
    await this._ensureAdvancedToolsInitialized();

    const {
      prompt,           // 任务描述
      agentId = uuidv4(), // Agent ID（可选，默认自动生成）
      timeout = 60000,  // 超时时间（默认 60 秒）
      maxTokens = 4096  // 最大 token 数（默认 4K）
    } = options;

    // 创建 agent 实例
    const agent = {
      id: agentId,
      prompt,
      status: 'running',
      startTime: Date.now(),
      timeout,
      maxTokens,
      result: null,
      error: null
    };

    // 存储到运行中的 agents
    this.agents.set(agentId, agent);

    try {
      // 执行 agent 任务
      const result = await this._executeAgentTask(agent);

      agent.status = 'completed';
      agent.result = result;
      agent.endTime = Date.now();

      return {
        success: true,
        agentId: agent.id,
        result: result,
        executionTime: agent.endTime - agent.startTime
      };
    } catch (error) {
      agent.status = 'failed';
      agent.error = error.message;
      agent.endTime = Date.now();

      return {
        success: false,
        agentId: agent.id,
        error: error.message,
        executionTime: agent.endTime - agent.startTime
      };
    } finally {
      // 清理完成的 agent（可选，也可以保留用于调试）
      // this.agents.delete(agentId);
    }
  }

  /**
   * 执行 agent 任务（内部方法）
   * @param {Object} agent - Agent 实例
   * @returns {Promise<Object>} 执行结果
   * @private
   */
  async _executeAgentTask(agent) {
    // 使用 Agent Client 执行实际的 AI 调用
    const executionResult = await this.agentClient.execute({
      prompt: agent.prompt,
      maxTokens: agent.maxTokens,
      timeout: agent.timeout
    });

    if (!executionResult.success) {
      throw new Error(executionResult.error);
    }

    return executionResult.result;
  }

  /**
   * 获取 agent 状态
   * @param {string} agentId - Agent ID
   * @returns {Object|null} Agent 状态
   */
  getAgentStatus(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return null;
    }

    return {
      id: agent.id,
      status: agent.status,
      prompt: agent.prompt,
      startTime: agent.startTime,
      endTime: agent.endTime,
      executionTime: agent.endTime ? agent.endTime - agent.startTime : null,
      result: agent.result,
      error: agent.error
    };
  }

  /**
   * 列出所有运行中的 agents
   * @returns {Array} Agent 列表
   */
  listAgents() {
    return Array.from(this.agents.values()).map(agent => ({
      id: agent.id,
      status: agent.status,
      prompt: agent.prompt.substring(0, 100) + (agent.prompt.length > 100 ? '...' : ''),
      startTime: agent.startTime,
      executionTime: agent.endTime ? agent.endTime - agent.startTime : Date.now() - agent.startTime
    }));
  }

  /**
   * 终止一个 agent
   * @param {string} agentId - Agent ID
   * @returns {boolean} 是否成功终止
   */
  terminateAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    if (agent.status === 'running') {
      agent.status = 'terminated';
      agent.endTime = Date.now();
      return true;
    }

    return false;
  }

  /**
   * 清理已完成的 agents
   */
  cleanupCompletedAgents() {
    for (const [agentId, agent] of this.agents.entries()) {
      if (agent.status !== 'running') {
        this.agents.delete(agentId);
      }
    }
  }
}

/**
 * 创建 Agent 执行器的工厂函数
 * @param {Object} config - 配置对象
 * @returns {AgentExecutor} Agent 执行器实例
 */
export function createAgentExecutor(config) {
  return new AgentExecutor(config);
}
