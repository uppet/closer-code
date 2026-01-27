/**
 * Agent 错误处理器
 *
 * 负责处理 Agent 执行过程中的错误
 * - Agent 失败重试
 * - 降级策略（agent 失败后使用主 AI）
 * - 错误报告
 */

/**
 * 错误类型枚举
 */
export const ErrorType = {
  TIMEOUT: 'timeout',                  // 超时错误
  NETWORK: 'network',                  // 网络错误
  API_ERROR: 'api_error',              // API 错误
  TOOL_EXECUTION: 'tool_execution',    // 工具执行错误
  PARSE_ERROR: 'parse_error',          // 解析错误
  UNKNOWN: 'unknown'                   // 未知错误
};

/**
 * 重试策略配置
 */
export const RetryStrategy = {
  NONE: 0,           // 不重试
  ONCE: 1,           // 重试 1 次
  TWICE: 2,          // 重试 2 次
  EXPONENTIAL: -1    // 指数退避重试（最多 3 次）
};

/**
 * 错误记录
 */
class ErrorRecord {
  constructor(errorType, error, attempt) {
    this.timestamp = Date.now();
    this.errorType = errorType;
    this.error = error;
    this.attempt = attempt;
  }

  /**
   * 获取错误信息
   * @returns {Object} 错误信息
   */
  getInfo() {
    return {
      timestamp: this.timestamp,
      errorType: this.errorType,
      message: this.error?.message || 'Unknown error',
      stack: this.error?.stack,
      attempt: this.attempt
    };
  }
}

/**
 * Agent 错误处理器类
 */
export class AgentErrorHandler {
  constructor(config = {}) {
    this.config = {
      maxRetries: config.maxRetries || 2,           // 最大重试次数
      retryDelay: config.retryDelay || 1000,        // 重试延迟（毫秒）
      useExponentialBackoff: config.useExponentialBackoff !== false,  // 使用指数退避
      fallbackToMainAI: config.fallbackToMainAI !== false,  // 降级到主 AI
      enableErrorReporting: config.enableErrorReporting !== false  // 启用错误报告
    };

    // 错误统计
    this.stats = {
      totalErrors: 0,
      errorsByType: {},
      retrySuccesses: 0,
      fallbackActivations: 0
    };
  }

  /**
   * 处理 Agent 执行错误
   * @param {Error} error - 错误对象
   * @param {Object} context - 执行上下文
   * @returns {Promise<Object>} 处理结果
   */
  async handleExecutionError(error, context = {}) {
    const {
      attempt = 1,
      prompt,
      agentId,
      executor
    } = context;

    // 1. 识别错误类型
    const errorType = this._classifyError(error);
    
    // 2. 记录错误
    this._recordError(errorType, error);

    // 3. 决定是否重试
    const shouldRetry = this._shouldRetry(errorType, attempt);
    
    if (shouldRetry && attempt <= this.config.maxRetries) {
      // 计算重试延迟
      const delay = this._calculateRetryDelay(attempt);
      
      return {
        action: 'retry',
        errorType,
        delay,
        attempt: attempt + 1,
        message: `Error occurred: ${error.message}. Retrying in ${delay}ms...`
      };
    }

    // 4. 是否降级到主 AI
    if (this.config.fallbackToMainAI && this._shouldFallback(errorType)) {
      this.stats.fallbackActivations++;
      
      return {
        action: 'fallback',
        errorType,
        message: `Agent failed after ${attempt} attempts. Falling back to main AI.`,
        fallbackReason: this._getFallbackReason(errorType)
      };
    }

    // 5. 最终失败
    return {
      action: 'fail',
      errorType,
      message: `Agent failed after ${attempt} attempts: ${error.message}`,
      errorReport: this.config.enableErrorReporting 
        ? this._generateErrorReport(error, errorType, context)
        : null
    };
  }

  /**
   * 执行带错误处理的 Agent 任务
   * @param {Function} executeFn - 执行函数
   * @param {Object} context - 上下文
   * @returns {Promise<Object>} 执行结果
   */
  async executeWithErrorHandling(executeFn, context = {}) {
    let attempt = 1;
    let lastError = null;

    while (attempt <= this.config.maxRetries + 1) {
      try {
        // 执行任务
        const result = await executeFn();
        
        // 如果之前有重试，记录成功
        if (attempt > 1) {
          this.stats.retrySuccesses++;
        }
        
        return {
          success: true,
          result,
          attempts: attempt,
          errorHistory: context.errorHistory || []
        };

      } catch (error) {
        lastError = error;
        
        // 处理错误
        const handling = await this.handleExecutionError(error, {
          ...context,
          attempt,
          errorHistory: context.errorHistory || []
        });

        // 记录错误历史
        if (!context.errorHistory) {
          context.errorHistory = [];
        }
        context.errorHistory.push(new ErrorRecord(handling.errorType, error, attempt));

        // 根据处理结果决定下一步
        if (handling.action === 'retry') {
          // 等待后重试
          await this._delay(handling.delay);
          attempt++;
          continue;
        } else if (handling.action === 'fallback') {
          // 降级到主 AI
          return {
            success: false,
            fallback: true,
            fallbackReason: handling.fallbackReason,
            error: error.message,
            attempts: attempt,
            errorHistory: context.errorHistory
          };
        } else {
          // 最终失败
          return {
            success: false,
            error: error.message,
            errorType: handling.errorType,
            attempts: attempt,
            errorHistory: context.errorHistory,
            errorReport: handling.errorReport
          };
        }
      }
    }

    // 不应该到这里
    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      attempts: attempt - 1
    };
  }

  /**
   * 分类错误类型
   * @param {Error} error - 错误对象
   * @returns {string} 错误类型
   * @private
   */
  _classifyError(error) {
    const message = error.message?.toLowerCase() || '';
    const code = error.code?.toLowerCase() || '';

    // 超时错误
    if (message.includes('timeout') || code === 'etimeout' || code === 'etimedout') {
      return ErrorType.TIMEOUT;
    }

    // 网络错误
    if (message.includes('network') || message.includes('connection') || 
        code === 'enotfound' || code === 'econnrefused' || code === 'econnreset') {
      return ErrorType.NETWORK;
    }

    // API 错误
    if (message.includes('api') || message.includes('rate limit') || 
        message.includes('quota') || error.status >= 500) {
      return ErrorType.API_ERROR;
    }

    // 工具执行错误
    if (message.includes('tool') || message.includes('execution')) {
      return ErrorType.TOOL_EXECUTION;
    }

    // 解析错误
    if (message.includes('parse') || message.includes('json') || 
        message.includes('syntax')) {
      return ErrorType.PARSE_ERROR;
    }

    return ErrorType.UNKNOWN;
  }

  /**
   * 判断是否应该重试
   * @param {string} errorType - 错误类型
   * @param {number} attempt - 当前尝试次数
   * @returns {boolean} 是否应该重试
   * @private
   */
  _shouldRetry(errorType, attempt) {
    // 超时和网络错误通常可以重试
    if (errorType === ErrorType.TIMEOUT || errorType === ErrorType.NETWORK) {
      return true;
    }

    // API 错误（如 5xx）可以重试
    if (errorType === ErrorType.API_ERROR) {
      return true;
    }

    // 其他错误不重试
    return false;
  }

  /**
   * 判断是否应该降级到主 AI
   * @param {string} errorType - 错误类型
   * @returns {boolean} 是否应该降级
   * @private
   */
  _shouldFallback(errorType) {
    // 工具执行错误和解析错误可以降级
    if (errorType === ErrorType.TOOL_EXECUTION || errorType === ErrorType.PARSE_ERROR) {
      return true;
    }

    // 持续的网络或超时错误也可以降级
    if (errorType === ErrorType.NETWORK || errorType === ErrorType.TIMEOUT) {
      return true;
    }

    return false;
  }

  /**
   * 获取降级原因
   * @param {string} errorType - 错误类型
   * @returns {string} 降级原因
   * @private
   */
  _getFallbackReason(errorType) {
    const reasons = {
      [ErrorType.TIMEOUT]: 'Agent execution timed out repeatedly',
      [ErrorType.NETWORK]: 'Network issues prevented agent execution',
      [ErrorType.API_ERROR]: 'API errors prevented agent execution',
      [ErrorType.TOOL_EXECUTION]: 'Agent encountered tool execution errors',
      [ErrorType.PARSE_ERROR]: 'Agent encountered parsing errors'
    };

    return reasons[errorType] || 'Unknown error type';
  }

  /**
   * 计算重试延迟
   * @param {number} attempt - 当前尝试次数
   * @returns {number} 延迟时间（毫秒）
   * @private
   */
  _calculateRetryDelay(attempt) {
    if (this.config.useExponentialBackoff) {
      // 指数退避：1s, 2s, 4s, ...
      return this.config.retryDelay * Math.pow(2, attempt - 1);
    } else {
      // 固定延迟
      return this.config.retryDelay;
    }
  }

  /**
   * 延迟函数
   * @param {number} ms - 延迟时间（毫秒）
   * @returns {Promise<void>}
   * @private
   */
  async _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 记录错误
   * @param {string} errorType - 错误类型
   * @param {Error} error - 错误对象
   * @private
   */
  _recordError(errorType, error) {
    this.stats.totalErrors++;
    
    if (!this.stats.errorsByType[errorType]) {
      this.stats.errorsByType[errorType] = 0;
    }
    this.stats.errorsByType[errorType]++;
  }

  /**
   * 生成错误报告
   * @param {Error} error - 错误对象
   * @param {string} errorType - 错误类型
   * @param {Object} context - 上下文
   * @returns {Object} 错误报告
   * @private
   */
  _generateErrorReport(error, errorType, context) {
    return {
      timestamp: Date.now(),
      errorType,
      errorMessage: error.message,
      errorStack: error.stack,
      errorCode: error.code,
      context: {
        agentId: context.agentId,
        prompt: context.prompt?.substring(0, 200),
        attempt: context.attempt
      },
      suggestions: this._getErrorSuggestions(errorType)
    };
  }

  /**
   * 获取错误建议
   * @param {string} errorType - 错误类型
   * @returns {Array<string>} 建议列表
   * @private
   */
  _getErrorSuggestions(errorType) {
    const suggestions = {
      [ErrorType.TIMEOUT]: [
        'Increase the agent timeout value',
        'Check if the task is too complex for an agent',
        'Consider breaking down the task into smaller subtasks'
      ],
      [ErrorType.NETWORK]: [
        'Check your internet connection',
        'Verify API endpoint accessibility',
        'Try again later if the service is temporarily unavailable'
      ],
      [ErrorType.API_ERROR]: [
        'Check API key and quota limits',
        'Verify the API service status',
        'Consider reducing the complexity of the task'
      ],
      [ErrorType.TOOL_EXECUTION]: [
        'Verify file paths and permissions',
        'Check if required files exist',
        'Review agent tool permissions'
      ],
      [ErrorType.PARSE_ERROR]: [
        'Check if the agent response format is correct',
        'Verify the prompt clarity',
        'Consider simplifying the task description'
      ]
    };

    return suggestions[errorType] || [
      'Review the error details for more information',
      'Check the agent logs for additional context',
      'Consider filing an issue if the error persists'
    ];
  }

  /**
   * 获取错误统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      errorRate: this.stats.totalErrors > 0 
        ? (this.stats.totalErrors / (this.stats.totalErrors + this.stats.retrySuccesses)).toFixed(2)
        : 0
    };
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalErrors: 0,
      errorsByType: {},
      retrySuccesses: 0,
      fallbackActivations: 0
    };
  }
}

/**
 * 创建 Agent 错误处理器的工厂函数
 * @param {Object} config - 配置对象
 * @returns {AgentErrorHandler} 错误处理器实例
 */
export function createAgentErrorHandler(config) {
  return new AgentErrorHandler(config);
}

/**
 * 全局单例
 */
let globalErrorHandler = null;

/**
 * 获取全局 Agent 错误处理器实例
 * @param {Object} config - 配置对象（仅在首次调用时使用）
 * @returns {AgentErrorHandler} 全局实例
 */
export function getGlobalAgentErrorHandler(config) {
  if (!globalErrorHandler) {
    globalErrorHandler = new AgentErrorHandler(config);
  }
  return globalErrorHandler;
}
