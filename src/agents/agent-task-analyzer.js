/**
 * Agent 任务分析器
 *
 * 负责分析任务并决定是否需要使用 agent
 * - 判断是否需要使用 agent
 * - 自动选择最佳工具集
 * - 任务分解（大任务拆分为多个 sub-agents）
 */

/**
 * 任务类型枚举
 */
export const TaskType = {
  SIMPLE_SEARCH: 'simple_search',       // 简单搜索（单次搜索即可）
  COMPLEX_SEARCH: 'complex_search',     // 复杂搜索（需要多轮搜索）
  FILE_EXPLORATION: 'file_exploration', // 文件探索（浏览目录结构）
  MULTI_TARGET: 'multi_target',         // 多目标搜索（多个不相关的目标）
  UNSUITABLE: 'unsuitable'              // 不适合 agent（简单操作或需要修改）
};

/**
 * 任务复杂度评估结果
 */
export class TaskAnalysis {
  constructor() {
    this.shouldUseAgent = false;      // 是否应该使用 agent
    this.taskType = null;             // 任务类型
    this.confidence = 0;              // 置信度 (0-1)
    this.reasoning = [];              // 分析原因
    this.recommendedTools = [];       // 推荐使用的工具
    this.suggestedSubtasks = [];      // 建议的子任务分解
    this.estimatedTime = 0;           // 预估执行时间（毫秒）
    this.estimatedTokens = 0;         // 预估 token 使用量
  }

  /**
   * 添加分析原因
   * @param {string} reason - 原因描述
   */
  addReason(reason) {
    this.reasoning.push(reason);
  }

  /**
   * 获取摘要信息
   * @returns {Object} 摘要
   */
  getSummary() {
    return {
      shouldUseAgent: this.shouldUseAgent,
      taskType: this.taskType,
      confidence: this.confidence,
      reasoning: this.reasoning.join('; '),
      recommendedTools: this.recommendedTools,
      subtaskCount: this.suggestedSubtasks.length,
      estimatedTime: this.estimatedTime,
      estimatedTokens: this.estimatedTokens
    };
  }
}

/**
 * Agent 任务分析器类
 */
export class AgentTaskAnalyzer {
  constructor() {
    // 关键词模式（用于快速判断）
    this.patterns = {
      // 明确表示需要搜索的关键词
      search: [
        'search', 'find', 'look for', 'locate', 'discover',
        '搜索', '查找', '寻找', '定位'
      ],
      // 表示需要探索的关键词
      explore: [
        'explore', 'browse', 'investigate', 'examine',
        '探索', '浏览', '调查', '检查'
      ],
      // 表示多个目标的关键词
      multiple: [
        'all', 'every', 'each', 'multiple', 'list of',
        '所有', '全部', '每个', '多个', '列出'
      ],
      // 不确定性的关键词
      uncertain: [
        'maybe', 'might be', 'could be', 'not sure', 'uncertain',
        '可能', '也许', '不确定', '不清楚'
      ],
      // 常见搜索目标
      commonTargets: [
        'config', 'configuration', 'setting', 'logger', 'log',
        'api', 'endpoint', 'route', 'handler', 'controller',
        'test', 'spec', 'mock', 'fixture', 'stub',
        'component', 'module', 'service', 'util', 'helper',
        '配置', '日志', '接口', '测试', '组件', '模块'
      ]
    };
  }

  /**
   * 分析任务是否适合使用 agent
   * @param {string} prompt - 任务描述
   * @returns {TaskAnalysis} 分析结果
   */
  analyze(prompt) {
    const analysis = new TaskAnalysis();
    const lowerPrompt = prompt.toLowerCase();

    // 1. 检查任务长度（太短的任务不适合 agent）
    if (prompt.length < 10) {
      analysis.shouldUseAgent = false;
      analysis.taskType = TaskType.UNSUITABLE;
      analysis.addReason('任务描述太短，不需要 agent');
      analysis.confidence = 0.9;
      return analysis;
    }

    // 2. 检查是否包含明确的关键词
    const hasSearchKeyword = this._containsAny(lowerPrompt, this.patterns.search);
    const hasExploreKeyword = this._containsAny(lowerPrompt, this.patterns.explore);
    const hasMultipleKeyword = this._containsAny(lowerPrompt, this.patterns.multiple);
    const hasUncertainKeyword = this._containsAny(lowerPrompt, this.patterns.uncertain);
    const hasCommonTarget = this._containsAny(lowerPrompt, this.patterns.commonTargets);

    // 3. 分析任务类型
    if (hasMultipleKeyword && (hasSearchKeyword || hasExploreKeyword)) {
      // 多目标搜索
      analysis.taskType = TaskType.MULTI_TARGET;
      analysis.shouldUseAgent = true;
      analysis.confidence = 0.85;
      analysis.addReason('任务涉及多个目标的搜索');

      // 尝试分解任务
      const subtasks = this._decomposeMultiTargetTask(prompt);
      analysis.suggestedSubtasks = subtasks;
      analysis.estimatedTime = subtasks.length * 15000; // 每个子任务 15 秒
      analysis.estimatedTokens = subtasks.length * 2000; // 每个子任务 2000 tokens

    } else if (hasExploreKeyword || (hasSearchKeyword && hasUncertainKeyword)) {
      // 复杂搜索或探索
      analysis.taskType = TaskType.COMPLEX_SEARCH;
      analysis.shouldUseAgent = true;
      analysis.confidence = 0.8;
      analysis.addReason('任务需要探索或多轮搜索');

      analysis.recommendedTools = ['searchFiles', 'searchCode', 'listFiles', 'readFile'];
      analysis.estimatedTime = 30000; // 30 秒
      analysis.estimatedTokens = 3000;

    } else if (hasSearchKeyword && hasCommonTarget) {
      // 简单搜索
      analysis.taskType = TaskType.SIMPLE_SEARCH;
      analysis.shouldUseAgent = true;
      analysis.confidence = 0.7;
      analysis.addReason('任务是明确的搜索操作');

      analysis.recommendedTools = this._selectToolsForPrompt(prompt);
      analysis.estimatedTime = 15000; // 15 秒
      analysis.estimatedTokens = 2000;

    } else if (hasExploreKeyword) {
      // 文件探索
      analysis.taskType = TaskType.FILE_EXPLORATION;
      analysis.shouldUseAgent = true;
      analysis.confidence = 0.75;
      analysis.addReason('任务需要探索文件系统');

      analysis.recommendedTools = ['listFiles', 'searchFiles', 'readFile'];
      analysis.estimatedTime = 20000; // 20 秒
      analysis.estimatedTokens = 2500;

    } else {
      // 不确定是否适合
      analysis.taskType = TaskType.UNSUITABLE;
      analysis.shouldUseAgent = false;
      analysis.confidence = 0.6;
      analysis.addReason('任务不明确需要 agent，可能直接使用工具更合适');
    }

    return analysis;
  }

  /**
   * 根据任务描述选择最佳工具集
   * @param {string} prompt - 任务描述
   * @returns {Array<string>} 推荐的工具列表
   * @private
   */
  _selectToolsForPrompt(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    const tools = [];

    // 检查是否需要搜索文件名
    if (this._containsAny(lowerPrompt, ['file', 'files', 'filename', '文件', '文件名'])) {
      tools.push('searchFiles');
    }

    // 检查是否需要搜索文件内容
    if (this._containsAny(lowerPrompt, ['content', 'code', 'function', 'class', '内容', '代码', '函数', '类'])) {
      tools.push('searchCode');
    }

    // 检查是否需要列出目录
    if (this._containsAny(lowerPrompt, ['directory', 'folder', 'list', '目录', '文件夹', '列出'])) {
      tools.push('listFiles');
    }

    // 检查是否需要读取文件
    if (this._containsAny(lowerPrompt, ['read', 'view', 'show', 'display', '读取', '查看', '显示'])) {
      tools.push('readFile');
    }

    // 如果没有明确指示，默认使用搜索工具
    if (tools.length === 0) {
      tools.push('searchFiles', 'searchCode');
    }

    return tools;
  }

  /**
   * 分解多目标任务
   * @param {string} prompt - 任务描述
   * @returns {Array<string>} 子任务列表
   * @private
   */
  _decomposeMultiTargetTask(prompt) {
    const subtasks = [];

    // 尝试识别逗号分隔的目标
    const commaSeparated = prompt.split(/,|，/);
    if (commaSeparated.length > 1) {
      commaSeparated.forEach(part => {
        const trimmed = part.trim();
        if (trimmed.length > 3) {
          subtasks.push(trimmed);
        }
      });
      return subtasks;
    }

    // 尝试识别 "and" 或 "和" 连接的目标
    const andSeparated = prompt.split(/\s+and\s+|和|以及/);
    if (andSeparated.length > 1) {
      andSeparated.forEach(part => {
        const trimmed = part.trim();
        if (trimmed.length > 3) {
          subtasks.push(trimmed);
        }
      });
      return subtasks;
    }

    // 尝试识别常见模式
    const commonPatterns = [
      /(?:find|search|查找|搜索)\s+(.+)?\s+(?:in|from|within|在.*中)/gi,
      /(?:all|every|所有)\s+(.+)?\s+(?:files|documents|文件)/gi
    ];

    for (const pattern of commonPatterns) {
      const matches = prompt.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const target = match.replace(/(?:find|search|查找|搜索|all|every|所有|files|documents|文件|in|from|within|在.*中)/gi, '').trim();
          if (target.length > 2) {
            subtasks.push(`Find ${target}`);
          }
        });
        break;
      }
    }

    // 如果无法分解，返回原任务
    if (subtasks.length === 0) {
      subtasks.push(prompt);
    }

    return subtasks;
  }

  /**
   * 检查字符串是否包含任何给定的关键词
   * @param {string} text - 要检查的文本
   * @param {Array<string>} keywords - 关键词列表
   * @returns {boolean} 是否包含
   * @private
   */
  _containsAny(text, keywords) {
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * 获取分析器的统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      patterns: this.patterns,
      taskTypes: Object.values(TaskType)
    };
  }
}

/**
 * 创建任务分析器的工厂函数
 * @returns {AgentTaskAnalyzer} 任务分析器实例
 */
export function createAgentTaskAnalyzer() {
  return new AgentTaskAnalyzer();
}

/**
 * 全局单例
 */
let globalTaskAnalyzer = null;

/**
 * 获取全局任务分析器实例
 * @returns {AgentTaskAnalyzer} 全局实例
 */
export function getGlobalAgentTaskAnalyzer() {
  if (!globalTaskAnalyzer) {
    globalTaskAnalyzer = new AgentTaskAnalyzer();
  }
  return globalTaskAnalyzer;
}
