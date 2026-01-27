/**
 * Agent Storage - Agent 结果持久化存储管理器
 *
 * 负责将 agent 执行结果保存到文件系统，支持：
 * - 按对话隔离存储
 * - 自动过期清理
 * - 任务相似度检测
 * - 索引管理
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { existsSync } from 'fs';

/**
 * Agent 存储管理器
 */
export class AgentStorage {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.storageDir = path.join(this.projectRoot, '.agents_works');
    this.maxAge = options.maxAge || 7 * 24 * 60 * 60 * 1000; // 7天
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
  }

  /**
   * 初始化存储目录
   */
  async initialize() {
    if (!existsSync(this.storageDir)) {
      await fs.mkdir(this.storageDir, { recursive: true });
    }
    
    // 初始化索引文件
    const indexPath = path.join(this.storageDir, '.index');
    if (!existsSync(indexPath)) {
      await fs.writeFile(indexPath, JSON.stringify({
        version: 1,
        lastCleanup: Date.now(),
        conversations: {}
      }, null, 2));
    }
  }

  /**
   * 生成 agent ID
   * @param {string} taskPrompt - 任务描述
   * @returns {string} agent ID
   */
  generateAgentId(taskPrompt) {
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(taskPrompt).digest('hex').substring(0, 8);
    return `agent_${timestamp}_${hash}`;
  }

  /**
   * 保存 agent 执行结果
   * @param {string} conversationId - 对话 ID
   * @param {Object} agentResult - agent 执行结果
   * @returns {Promise<string>} agent ID
   */
  async saveAgentResult(conversationId, agentResult) {
    await this.initialize();

    // 验证输入
    if (!conversationId || !agentResult) {
      throw new Error('conversationId and agentResult are required');
    }

    // 创建对话目录
    const conversationDir = path.join(this.storageDir, conversationId);
    if (!existsSync(conversationDir)) {
      await fs.mkdir(conversationDir, { recursive: true });
    }

    // 生成 agent ID
    const agentId = this.generateAgentId(agentResult.task?.prompt || 'unknown');

    // 构建结果对象
    const result = {
      agentId,
      conversationId,
      taskId: this.generateTaskId(agentResult.task?.prompt || 'unknown'),
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      task: agentResult.task || {},
      stats: agentResult.stats || {},
      result: agentResult.result || {},
      cache: {
        lastAccessed: Date.now(),
        accessCount: 0,
        expiresAt: Date.now() + this.maxAge
      }
    };

    // 检查文件大小
    const resultJson = JSON.stringify(result, null, 2);
    const resultSize = Buffer.byteLength(resultJson, 'utf8');
    
    if (resultSize > this.maxFileSize) {
      throw new Error(`Agent result size (${resultSize} bytes) exceeds maximum allowed size (${this.maxFileSize} bytes)`);
    }

    // 写入结果文件
    const resultPath = path.join(conversationDir, `${agentId}.json`);
    await fs.writeFile(resultPath, resultJson, 'utf8');

    // 更新索引
    await this.updateIndex(conversationId, agentId);

    // 更新元数据
    await this.updateMetadata(conversationDir);

    return agentId;
  }

  /**
   * 获取 agent 结果
   * @param {string} agentId - agent ID
   * @returns {Promise<Object|null>} agent 结果
   */
  async getAgentResult(agentId) {
    await this.initialize();

    // 搜索所有对话目录
    const conversations = await this.listConversations();
    
    for (const conversationId of conversations) {
      const resultPath = path.join(this.storageDir, conversationId, `${agentId}.json`);
      
      if (existsSync(resultPath)) {
        // 读取结果
        const content = await fs.readFile(resultPath, 'utf8');
        const result = JSON.parse(content);

        // 检查是否过期
        if (Date.now() > result.cache.expiresAt) {
          await this.deleteAgentResult(conversationId, agentId);
          return null;
        }

        // 更新访问信息
        result.cache.lastAccessed = Date.now();
        result.cache.accessCount = (result.cache.accessCount || 0) + 1;
        
        await fs.writeFile(resultPath, JSON.stringify(result, null, 2), 'utf8');

        return result;
      }
    }

    return null;
  }

  /**
   * 列出对话的所有 agents
   * @param {string} conversationId - 对话 ID
   * @returns {Promise<Array>} agent 列表
   */
  async listAgents(conversationId) {
    await this.initialize();

    const indexPath = path.join(this.storageDir, '.index');
    const indexContent = await fs.readFile(indexPath, 'utf8');
    const index = JSON.parse(indexContent);

    const conversationData = index.conversations[conversationId];
    if (!conversationData) {
      return [];
    }

    // 返回 agent 信息（不包含完整结果）
    const agents = [];
    for (const agentId of conversationData.agents || []) {
      const result = await this.getAgentResult(agentId);
      if (result) {
        agents.push({
          agentId: result.agentId,
          taskId: result.taskId,
          timestamp: result.timestamp,
          createdAt: result.createdAt,
          status: result.result?.status,
          summary: result.result?.summary,
          accessCount: result.cache?.accessCount,
          lastAccessed: result.cache?.lastAccessed
        });
      }
    }

    return agents;
  }

  /**
   * 清理过期 agents
   * @returns {Promise<number>} 删除的 agent 数量
   */
  async cleanupExpiredAgents() {
    await this.initialize();

    let deletedCount = 0;
    const conversations = await this.listConversations();

    for (const conversationId of conversations) {
      const conversationDir = path.join(this.storageDir, conversationId);
      
      // 直接读取目录中的 agent 文件，避免通过 getAgentResult（它会自动删除过期文件）
      const files = await fs.readdir(conversationDir);
      const agentFiles = files.filter(f => f.startsWith('agent_') && f.endsWith('.json'));
      
      for (const agentFile of agentFiles) {
        const agentId = agentFile.replace('.json', '');
        const resultPath = path.join(conversationDir, agentFile);
        
        try {
          const content = await fs.readFile(resultPath, 'utf8');
          const result = JSON.parse(content);
          
          // 检查是否过期（基于 lastAccessed）
          if (Date.now() > result.cache.lastAccessed + this.maxAge) {
            await this.deleteAgentResult(conversationId, agentId);
            deletedCount++;
          }
        } catch (error) {
          // 文件损坏，直接删除
          await fs.unlink(resultPath).catch(() => {});
          deletedCount++;
        }
      }
    }

    // 更新索引中的清理时间
    const indexPath = path.join(this.storageDir, '.index');
    const indexContent = await fs.readFile(indexPath, 'utf8');
    const index = JSON.parse(indexContent);
    index.lastCleanup = Date.now();
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf8');

    return deletedCount;
  }

  /**
   * 检查是否有相似任务的结果（缓存）
   * @param {string} conversationId - 对话 ID
   * @param {string} taskPrompt - 任务描述
   * @returns {Promise<string|null>} 缓存的 agent ID
   */
  async findSimilarTask(conversationId, taskPrompt) {
    await this.initialize();

    const taskId = this.generateTaskId(taskPrompt);
    const agents = await this.listAgents(conversationId);

    for (const agent of agents) {
      if (agent.taskId === taskId) {
        // 检查是否过期
        const result = await this.getAgentResult(agent.agentId);
        if (result && Date.now() <= result.cache.expiresAt) {
          return agent.agentId;
        }
      }
    }

    return null;
  }

  /**
   * 删除 agent 结果
   * @param {string} conversationId - 对话 ID
   * @param {string} agentId - agent ID
   */
  async deleteAgentResult(conversationId, agentId) {
    const resultPath = path.join(this.storageDir, conversationId, `${agentId}.json`);
    
    if (existsSync(resultPath)) {
      await fs.unlink(resultPath);
    }

    // 更新索引
    const indexPath = path.join(this.storageDir, '.index');
    const indexContent = await fs.readFile(indexPath, 'utf8');
    const index = JSON.parse(indexContent);

    if (index.conversations[conversationId]) {
      const agents = index.conversations[conversationId].agents || [];
      const indexToRemove = agents.indexOf(agentId);
      
      if (indexToRemove > -1) {
        agents.splice(indexToRemove, 1);
      }

      // 如果没有 agents 了，删除对话记录
      if (agents.length === 0) {
        delete index.conversations[conversationId];
        
        // 删除对话目录
        const conversationDir = path.join(this.storageDir, conversationId);
        if (existsSync(conversationDir)) {
          await fs.rmdir(conversationDir, { recursive: true });
        }
      } else {
        index.conversations[conversationId].agents = agents;
      }
    }

    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf8');
  }

  /**
   * 列出所有对话
   * @returns {Promise<Array<string>>} 对话 ID 列表
   */
  async listConversations() {
    await this.initialize();

    const indexPath = path.join(this.storageDir, '.index');
    const indexContent = await fs.readFile(indexPath, 'utf8');
    const index = JSON.parse(indexContent);

    return Object.keys(index.conversations || {});
  }

  /**
   * 生成任务 ID
   * @param {string} taskPrompt - 任务描述
   * @returns {string} 任务 ID
   */
  generateTaskId(taskPrompt) {
    return crypto.createHash('md5').update(taskPrompt).digest('hex');
  }

  /**
   * 更新索引
   * @param {string} conversationId - 对话 ID
   * @param {string} agentId - agent ID
   */
  async updateIndex(conversationId, agentId) {
    const indexPath = path.join(this.storageDir, '.index');
    const indexContent = await fs.readFile(indexPath, 'utf8');
    const index = JSON.parse(indexContent);

    if (!index.conversations[conversationId]) {
      index.conversations[conversationId] = {
        agentCount: 0,
        lastAccessed: Date.now(),
        agents: []
      };
    }

    const conversation = index.conversations[conversationId];
    
    // 避免重复添加
    if (!conversation.agents.includes(agentId)) {
      conversation.agents.push(agentId);
      conversation.agentCount = conversation.agents.length;
    }
    
    conversation.lastAccessed = Date.now();

    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf8');
  }

  /**
   * 更新元数据
   * @param {string} conversationDir - 对话目录
   */
  async updateMetadata(conversationDir) {
    const metadataPath = path.join(conversationDir, '.metadata');
    
    const metadata = {
      lastUpdated: new Date().toISOString(),
      agentCount: (await fs.readdir(conversationDir))
        .filter(f => f.startsWith('agent_') && f.endsWith('.json'))
        .length
    };

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
  }

  /**
   * 获取存储统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStats() {
    await this.initialize();

    const indexPath = path.join(this.storageDir, '.index');
    const indexContent = await fs.readFile(indexPath, 'utf8');
    const index = JSON.parse(indexContent);

    let totalAgents = 0;
    let totalSize = 0;

    for (const conversationId of Object.keys(index.conversations || {})) {
      const conversation = index.conversations[conversationId];
      totalAgents += conversation.agentCount || 0;

      // 计算大小
      const conversationDir = path.join(this.storageDir, conversationId);
      if (existsSync(conversationDir)) {
        const files = await fs.readdir(conversationDir);
        for (const file of files) {
          if (file.startsWith('agent_') && file.endsWith('.json')) {
            const filePath = path.join(conversationDir, file);
            const stats = await fs.stat(filePath);
            totalSize += stats.size;
          }
        }
      }
    }

    return {
      conversations: Object.keys(index.conversations || {}).length,
      totalAgents,
      totalSize,
      lastCleanup: index.lastCleanup,
      storageDir: this.storageDir
    };
  }
}

/**
 * 获取全局 Agent Storage 实例
 * @param {Object} options - 配置选项
 * @returns {AgentStorage} Agent Storage 实例
 */
let globalStorage = null;

export function getGlobalAgentStorage(options = {}) {
  if (!globalStorage) {
    globalStorage = new AgentStorage(options);
  }
  return globalStorage;
}

/**
 * 重置全局 Agent Storage 实例（用于测试）
 */
export function resetGlobalAgentStorage() {
  globalStorage = null;
}
