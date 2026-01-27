/**
 * Agent Result Handler - 处理持久化存储的 Agent 结果
 *
 * 提供 agentResultTool 的辅助函数，支持从持久化存储读取 agent 结果
 */

import { getGlobalAgentStorage } from './agent-storage.js';

/**
 * 处理持久化存储的 agent 结果
 * @param {Object} input - 工具输入参数
 * @param {string} workingDir - 工作目录
 * @returns {Promise<string>} JSON 字符串结果
 */
export async function handleStoredAgentResult(input, workingDir) {
  const storage = getGlobalAgentStorage({ projectRoot: workingDir });
  const agentResult = await storage.getAgentResult(input.agent_id);

  if (!agentResult) {
    return JSON.stringify({
      success: false,
      error: `Agent ${input.agent_id} not found or expired`,
      hint: 'Agent results expire after 7 days of no access'
    });
  }

  switch (input.action) {
    case 'full':
      return JSON.stringify({
        success: true,
        source: 'storage',
        ...agentResult
      });

    case 'summary':
      return JSON.stringify({
        success: true,
        source: 'storage',
        agent_id: agentResult.agentId,
        task: agentResult.task?.prompt,
        status: agentResult.result?.status,
        summary: agentResult.result?.summary,
        timestamp: agentResult.timestamp,
        createdAt: agentResult.createdAt,
        accessCount: agentResult.cache?.accessCount,
        lastAccessed: agentResult.cache?.lastAccessed
      });

    case 'search':
      if (!input.pattern) {
        return JSON.stringify({
          success: false,
          error: 'pattern parameter is required for search action'
        });
      }

      const searchResults = searchInAgentResult(agentResult, input.pattern, input.maxResults || 50);
      return JSON.stringify({
        success: true,
        source: 'storage',
        agent_id: agentResult.agentId,
        pattern: input.pattern,
        matchCount: searchResults.length,
        results: searchResults
      });

    case 'files':
      const files = agentResult.result?.files || [];
      const maxFiles = input.maxResults || 50;
      return JSON.stringify({
        success: true,
        source: 'storage',
        agent_id: agentResult.agentId,
        fileCount: files.length,
        files: files.slice(0, maxFiles),
        truncated: files.length > maxFiles
      });

    default:
      return JSON.stringify({
        success: false,
        error: `Unknown action: ${input.action}`
      });
  }
}

/**
 * 处理池中的 agent 结果（运行中的 agent）
 * @param {Object} input - 工具输入参数
 * @param {Object} agentStatus - Agent 状态
 * @returns {string} JSON 字符串结果
 */
export function handlePoolAgentResult(input, agentStatus) {
  if (input.action === 'summary') {
    return JSON.stringify({
      success: true,
      source: 'pool',
      agent_id: input.agent_id,
      status: agentStatus.status,
      executionTime: agentStatus.executionTime,
      hasResult: !!agentStatus.result,
      hasError: !!agentStatus.error
    });
  }

  return JSON.stringify({
    success: true,
    source: 'pool',
    ...agentStatus
  });
}

/**
 * 处理池操作
 * @param {Object} input - 工具输入参数
 * @param {Object} pool - Agent Pool
 * @returns {string} JSON 字符串结果
 */
export function handlePoolOperations(input, pool) {
  switch (input.action) {
    case 'pool_status':
      const poolStatus = pool.getPoolStatus();
      return JSON.stringify({
        success: true,
        ...poolStatus
      });

    case 'list_running':
      const runningAgents = pool.listRunningAgents();
      return JSON.stringify({
        success: true,
        count: runningAgents.length,
        agents: runningAgents
      });

    case 'list_waiting':
      const waitingAgents = pool.listWaitingAgents();
      return JSON.stringify({
        success: true,
        count: waitingAgents.length,
        agents: waitingAgents
      });

    case 'stats':
      const stats = pool.getStats();
      return JSON.stringify({
        success: true,
        ...stats
      });

    case 'terminate':
      if (!input.agent_id) {
        return JSON.stringify({
          success: false,
          error: 'agent_id is required for "terminate" action'
        });
      }

      const terminated = pool.terminateAgent(input.agent_id);
      return JSON.stringify({
        success: terminated,
        message: terminated 
          ? `Agent ${input.agent_id} terminated successfully`
          : `Agent ${input.agent_id} not found or could not be terminated`
      });

    default:
      return JSON.stringify({
        success: false,
        error: `Unknown action: ${input.action}`
      });
  }
}

/**
 * 在 agent 结果中搜索
 * @param {Object} agentResult - Agent 结果
 * @param {string} pattern - 搜索模式
 * @param {number} maxResults - 最大结果数
 * @returns {Array} 搜索结果
 */
export function searchInAgentResult(agentResult, pattern, maxResults) {
  const results = [];
  const regex = new RegExp(pattern, 'i');

  // 搜索 findings
  if (agentResult.result?.findings) {
    for (const finding of agentResult.result.findings) {
      if (results.length >= maxResults) break;

      const text = JSON.stringify(finding);
      if (regex.test(text)) {
        results.push({
          type: 'finding',
          data: finding
        });
      }
    }
  }

  // 搜索文件
  if (agentResult.result?.files) {
    for (const file of agentResult.result.files) {
      if (results.length >= maxResults) break;

      if (regex.test(file)) {
        results.push({
          type: 'file',
          data: file
        });
      }
    }
  }

  // 搜索摘要
  if (agentResult.result?.summary && regex.test(agentResult.result.summary)) {
    if (results.length < maxResults) {
      results.push({
        type: 'summary',
        data: agentResult.result.summary
      });
    }
  }

  return results;
}
