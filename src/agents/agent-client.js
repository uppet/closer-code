/**
 * Agent AI 客户端
 *
 * 负责管理 Agent 的 AI 调用和工具执行
 * - 复用现有的 AI 客户端（ai-client.js）
 * - 配置 agent 专用参数（低 max_tokens, 温度 0）
 * - 使用独立的 conversation 上下文
 * - 实现单次 agent 执行流程
 */

import { createAIClient } from '../ai-client.js';
import { createAgentPromptBuilder } from './agent-prompt-builder.js';
import { getGlobalAgentToolManager } from './agent-tools.js';
import { getToolDefinitions } from '../tools.js';

/**
 * Agent Client 类
 */
export class AgentClient {
  constructor(config) {
    this.config = config;
    this.promptBuilder = createAgentPromptBuilder();
    this.toolManager = getGlobalAgentToolManager();
    this.workingDir = config.behavior?.workingDir || process.cwd();
    
    // Agent 专用配置
    this.agentConfig = {
      maxTokens: 4096,      // 默认最大 token 数（较低）
      temperature: 0,        // 温度 0（确定性输出）
      timeout: 60000         // 默认超时 60 秒
    };
  }

  /**
   * 执行单个 agent 任务
   * @param {Object} options - 执行选项
   * @returns {Promise<Object>} 执行结果
   */
  async execute(options) {
    const {
      prompt,           // 任务描述
      maxTokens = this.agentConfig.maxTokens,
      timeout = this.agentConfig.timeout
    } = options;

    const startTime = Date.now();

    try {
      // 1. 构建 agent 消息
      const agentMessage = this.promptBuilder.buildAgentMessage(prompt, {
        context: {
          workingDir: this.workingDir
        }
      });

      // 2. 创建 AI 客户端（复用现有配置）
      const aiClient = await createAIClient(this.config);

      // 3. 获取 agent 允许的工具
      const allowedToolNames = this.toolManager.getAllowedTools();
      const tools = getToolDefinitions(allowedToolNames);

      // 4. 设置工具执行器上下文（agent 专用）
      const { setToolExecutorContext } = await import('../tools.js');
      setToolExecutorContext({
        behavior: { workingDir: this.workingDir },
        tools: { enabled: Array.from(allowedToolNames) }
      });

      // 5. 调用 AI 模型（使用 chatWithTools 自动处理工具调用循环）
      const messages = [
        {
          role: 'user',
          content: agentMessage.user
        }
      ];

      const response = await aiClient.chatWithTools(
        messages,
        tools,
        {
          system: agentMessage.system,
          temperature: 0
        }
      );

      // 6. 解析响应并提取结果
      const result = this._parseAgentResponse(response, startTime);

      return {
        success: true,
        ...result
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 解析 agent 响应
   * @param {Object} response - AI 响应
   * @param {number} startTime - 开始时间
   * @returns {Object} 解析后的结果
   * @private
   */
  _parseAgentResponse(response, startTime) {
    const executionTime = Date.now() - startTime;

    // 尝试从响应中提取 JSON 格式的结果
    let result = {
      summary: '',
      findings: [],
      files: [],
      suggestions: []
    };

    // 获取最后一个文本块
    const textBlocks = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text);

    if (textBlocks.length > 0) {
      const lastText = textBlocks[textBlocks.length - 1];

      // 尝试解析 JSON
      try {
        // 查找 JSON 代码块
        const jsonMatch = lastText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[1]);
        } else {
          // 尝试直接解析
          result = JSON.parse(lastText);
        }
      } catch (e) {
        // 如果不是 JSON，使用文本作为 summary
        result.summary = lastText.substring(0, 500);
      }
    }

    // 收集工具调用信息
    const toolCalls = [];
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        toolCalls.push({
          name: block.name,
          input: block.input,
          result: block.result || null
        });
      }
    }

    // 提取找到的文件
    const files = new Set();
    for (const call of toolCalls) {
      if (call.name === 'searchFiles' && call.result) {
        try {
          const searchResult = JSON.parse(call.result);
          if (searchResult.files) {
            searchResult.files.forEach(f => files.add(f));
          }
        } catch (e) {
          // 忽略解析错误
        }
      } else if (call.name === 'readFile' || call.name === 'readFileLines') {
        if (call.input && call.input.filePath) {
          files.add(call.input.filePath);
        }
      }
    }

    return {
      result: {
        ...result,
        files: Array.from(files),
        toolCalls: toolCalls,
        toolCallCount: toolCalls.length
      },
      executionTime,
      responseId: response.id,
      model: response.model,
      stopReason: response.stop_reason
    };
  }

  /**
   * 流式执行 agent 任务（用于调试）
   * @param {Object} options - 执行选项
   * @param {Function} onChunk - 流式回调
   * @returns {Promise<Object>} 执行结果
   */
  async executeStream(options, onChunk) {
    const {
      prompt,
      maxTokens = this.agentConfig.maxTokens
    } = options;

    const startTime = Date.now();

    try {
      // 构建消息
      const agentMessage = this.promptBuilder.buildAgentMessage(prompt, {
        context: {
          workingDir: this.workingDir
        }
      });

      // 创建 AI 客户端
      const aiClient = await createAIClient(this.config);

      // 获取允许的工具
      const allowedToolNames = this.toolManager.getAllowedTools();
      const tools = getToolDefinitions(allowedToolNames);

      // 设置工具执行器上下文
      const { setToolExecutorContext } = await import('../tools.js');
      setToolExecutorContext({
        behavior: { workingDir: this.workingDir },
        tools: { enabled: Array.from(allowedToolNames) }
      });

      // 流式调用
      const messages = [
        {
          role: 'user',
          content: agentMessage.user
        }
      ];

      const response = await aiClient.chatStream(
        messages,
        {
          system: agentMessage.system,
          temperature: 0,
          tools: tools
        },
        onChunk
      );

      // 解析结果
      const result = this._parseAgentResponse(response, startTime);

      return {
        success: true,
        ...result
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 更新 agent 配置
   * @param {Object} config - 新配置
   */
  updateConfig(config) {
    this.agentConfig = {
      ...this.agentConfig,
      ...config
    };
  }

  /**
   * 获取当前配置
   * @returns {Object} 当前配置
   */
  getConfig() {
    return {
      ...this.agentConfig,
      workingDir: this.workingDir,
      allowedTools: this.toolManager.getAllowedTools()
    };
  }
}

/**
 * 创建 Agent Client 的工厂函数
 * @param {Object} config - 配置对象
 * @returns {AgentClient} Agent Client 实例
 */
export function createAgentClient(config) {
  return new AgentClient(config);
}
