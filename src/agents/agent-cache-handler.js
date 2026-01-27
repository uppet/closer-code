/**
 * Agent Cache Handler - Agent 缓存处理辅助模块
 *
 * 提供 dispatchAgent 的缓存检查和保存功能
 */

import { getGlobalAgentStorage } from './agent-storage.js';

/**
 * 检查是否有缓存的 agent 结果
 * @param {string} conversationId - 对话 ID
 * @param {string} prompt - 任务描述
 * @param {string} workingDir - 工作目录
 * @returns {Promise<Object|null>} 缓存的结果或 null
 */
export async function checkAgentCache(conversationId, prompt, workingDir) {
  try {
    const storage = getGlobalAgentStorage({
      projectRoot: workingDir
    });
    
    const cachedAgentId = await storage.findSimilarTask(conversationId, prompt);
    
    if (cachedAgentId) {
      const cachedResult = await storage.getAgentResult(cachedAgentId);
      
      if (cachedResult) {
        return {
          agentId: cachedAgentId,
          result: {
            status: cachedResult.result?.status,
            summary: cachedResult.result?.summary,
            findings: cachedResult.result?.findings,
            files: cachedResult.result?.files
          },
          stats: {
            cached: true,
            accessCount: cachedResult.cache?.accessCount,
            lastAccessed: cachedResult.cache?.lastAccessed
          }
        };
      }
    }
    
    return null;
  } catch (error) {
    console.warn('[AgentCache] Cache check failed:', error.message);
    return null;
  }
}

/**
 * 保存 agent 结果到持久化存储
 * @param {string} conversationId - 对话 ID
 * @param {string} prompt - 任务描述
 * @param {Object} result - Agent 执行结果
 * @param {string} workingDir - 工作目录
 * @returns {Promise<string>} 保存的 agent ID
 */
export async function saveAgentResult(conversationId, prompt, result, workingDir) {
  try {
    const storage = getGlobalAgentStorage({
      projectRoot: workingDir
    });
    
    const agentId = await storage.saveAgentResult(conversationId, {
      task: {
        prompt: prompt,
        tools: result.toolsUsed || [],
        parameters: {}
      },
      stats: {
        duration: result.executionTime,
        totalTokens: result.totalTokens || 0,
        toolCalls: result.toolCalls || 0,
        filesAccessed: result.filesAccessed || 0
      },
      result: result.result
    });
    
    return agentId;
  } catch (error) {
    console.warn('[AgentCache] Failed to save result:', error.message);
    throw error;
  }
}

/**
 * 获取缓存统计信息
 * @param {string} workingDir - 工作目录
 * @returns {Promise<Object>} 缓存统计
 */
export async function getCacheStats(workingDir) {
  try {
    const storage = getGlobalAgentStorage({
      projectRoot: workingDir
    });
    
    const stats = await storage.getStats();
    
    return {
      totalAgents: stats.totalAgents,
      totalSize: stats.totalSize,
      conversations: stats.conversations,
      lastCleanup: stats.lastCleanup
    };
  } catch (error) {
    console.warn('[AgentCache] Failed to get stats:', error.message);
    return {
      totalAgents: 0,
      totalSize: 0,
      conversations: 0,
      lastCleanup: null
    };
  }
}
