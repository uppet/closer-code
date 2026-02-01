# Context 压缩与任务重开 - 技术设计文档

## 1. Token 计算实现

### 1.1 多级 Token 计算策略

```javascript
// src/conversation/context-tracker.js

export class ContextTracker {
  constructor(config) {
    this.config = config;
    this.maxTokens = config.maxTokens || 200000;
    this.warningThreshold = config.warningThreshold || 0.85;
    this.criticalThreshold = config.criticalThreshold || 0.95;

    // Token 计算缓存
    this.tokenCache = new Map();
  }

  /**
   * 多级 token 计算策略
   * 1. 优先使用 API 的 countTokens（最准确）
   * 2. 降级使用 Claude Tokenizer（较准确）
   * 3. 最后使用简单估算（快速但不准确）
   */
  async estimateTokens(messages, options = {}) {
    const { useCache = true, method = 'auto' } = options;

    // 生成缓存键
    const cacheKey = this._generateCacheKey(messages);
    if (useCache && this.tokenCache.has(cacheKey)) {
      return this.tokenCache.get(cacheKey);
    }

    let tokenCount;

    try {
      if (method === 'auto') {
        // 尝试使用 API
        tokenCount = await this._countTokensViaAPI(messages);
      } else if (method === 'local') {
        // 使用本地 tokenizer
        tokenCount = this._countTokensLocally(messages);
      } else {
        // 使用估算
        tokenCount = this._estimateTokensRoughly(messages);
      }
    } catch (error) {
      console.warn('[ContextTracker] Token counting failed, falling back to estimation:', error.message);
      tokenCount = this._estimateTokensRoughly(messages);
    }

    // 缓存结果
    if (useCache) {
      this.tokenCache.set(cacheKey, tokenCount);
    }

    return tokenCount;
  }

  /**
   * 使用 Anthropic API 计算 token（最准确）
   */
  async _countTokensViaAPI(messages) {
    try {
      const Anthropic = await import('@anthropic-ai/sdk');
      const client = new Anthropic.Anthropic({
        apiKey: this.config.apiKey
      });

      // 构建请求
      const request = {
        model: this.config.model || 'claude-3-5-sonnet-20241022',
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      };

      // 使用 countTokens API
      const response = await client.messages.countTokens(request);

      return response.input_tokens;
    } catch (error) {
      throw new Error(`API token counting failed: ${error.message}`);
    }
  }

  /**
   * 使用本地 tokenizer 计算 token（较准确）
   */
  _countTokensLocally(messages) {
    // 使用 js-tiktoken 或类似库
    // 这里使用简化版本

    let totalTokens = 0;

    for (const message of messages) {
      const content = typeof message.content === 'string'
        ? message.content
        : JSON.stringify(message.content);

      // 估算规则（基于 GPT tokenizer）
      const chars = content.length;
      const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
      const englishChars = chars - chineseChars;

      // 中文字符约 2-3 tokens，英文字符约 0.25 tokens
      const tokens = Math.ceil(chineseChars * 2.5 + englishChars * 0.25);
      totalTokens += tokens;

      // 消息开销
      totalTokens += 4; // role, content 等字段
    }

    return totalTokens;
  }

  /**
   * 粗略估算 token（快速但不准确）
   */
  _estimateTokensRoughly(messages) {
    let totalChars = 0;

    for (const message of messages) {
      const content = typeof message.content === 'string'
        ? message.content
        : JSON.stringify(message.content);
      totalChars += content.length;
    }

    // 粗略估算：1 token ≈ 4 字符
    return Math.ceil(totalChars / 4);
  }

  /**
   * 生成缓存键
   */
  _generateCacheKey(messages) {
    // 使用消息内容的 hash 作为缓存键
    const content = messages.map(m =>
      `${m.role}:${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`
    ).join('|');

    // 简单 hash 函数
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return hash.toString(36);
  }

  /**
   * 检查是否需要压缩
   */
  needsCompression(currentTokens) {
    return currentTokens >= this.maxTokens * this.warningThreshold;
  }

  /**
   * 检查是否需要重开任务
   */
  needsTaskReset(currentTokens) {
    return currentTokens >= this.maxTokens * this.criticalThreshold;
  }

  /**
   * 获取状态信息
   */
  getStatus(currentTokens) {
    const percentage = (currentTokens / this.maxTokens) * 100;
    const status = percentage >= 95 ? 'critical' :
                   percentage >= 85 ? 'warning' :
                   percentage >= 70 ? 'caution' : 'normal';

    return {
      currentTokens,
      maxTokens: this.maxTokens,
      percentage,
      status,
      needsCompression: this.needsCompression(currentTokens),
      needsReset: this.needsTaskReset(currentTokens)
    };
  }
}
```

## 2. 压缩策略实现

### 2.1 策略基类和具体实现

```javascript
// src/conversation/compression-strategy.js

/**
 * 压缩策略基类
 */
export class CompressionStrategy {
  constructor(config) {
    this.config = config;
  }

  /**
   * 应用压缩策略
   */
  async compress(messages, options = {}) {
    throw new Error('Subclasses must implement compress()');
  }

  /**
   * 生成压缩摘要
   */
  generateSummary(removedMessages) {
    return {
      removedCount: removedMessages.length,
      preservedCount: 0,
      strategy: this.constructor.name
    };
  }
}

/**
 * 策略 1：保留最近 N 条消息
 */
export class KeepRecentStrategy extends CompressionStrategy {
  async compress(messages, options = {}) {
    const { count = 50 } = options;
    const preserved = messages.slice(-count);
    const removed = messages.slice(0, -count);

    return {
      messages: preserved,
      summary: this.generateSummary(removed, { preservedCount: preserved.length })
    };
  }

  generateSummary(removed, { preservedCount }) {
    return {
      removedCount: removed.length,
      preservedCount,
      strategy: 'Keep Recent',
      description: `保留最近 ${preservedCount} 条消息，删除 ${removed.length} 条旧消息`
    };
  }
}

/**
 * 策略 2：保留重要消息
 */
export class KeepImportantStrategy extends CompressionStrategy {
  async compress(messages, options = {}) {
    const { recentCount = 20, preserveToolCalls = true, preserveErrors = true } = options;

    const important = [];
    const recent = [];

    // 分析每条消息的重要性
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const isRecent = i >= messages.length - recentCount;

      if (isRecent) {
        recent.push(message);
        continue;
      }

      // 检查是否包含工具调用
      if (preserveToolCalls && this._hasToolCalls(message)) {
        important.push(message);
        continue;
      }

      // 检查是否是错误消息
      if (preserveErrors && message.role === 'error') {
        important.push(message);
        continue;
      }

      // 检查是否是用户的关键指令（包含特定关键词）
      if (this._isUserCommand(message)) {
        important.push(message);
        continue;
      }
    }

    const preserved = [...important, ...recent];
    const removed = messages.filter(m => !preserved.includes(m));

    return {
      messages: preserved,
      summary: this.generateSummary(removed, { preservedCount: preserved.length })
    };
  }

  _hasToolCalls(message) {
    if (message.role === 'assistant' && Array.isArray(message.content)) {
      return message.content.some(block => block.type === 'tool_use');
    }
    return false;
  }

  _isUserCommand(message) {
    if (message.role !== 'user') return false;
    const content = typeof message.content === 'string' ? message.content : '';
    const keywords = ['创建', '实现', '修复', '优化', 'create', 'implement', 'fix', 'optimize'];
    return keywords.some(keyword => content.toLowerCase().includes(keyword));
  }

  generateSummary(removed, { preservedCount }) {
    return {
      removedCount: removed.length,
      preservedCount,
      strategy: 'Keep Important',
      description: `保留 ${preservedCount} 条重要消息，删除 ${removed.length} 条消息`
    };
  }
}

/**
 * 策略 3：智能摘要 + 保留最近消息
 */
export class SummarizeStrategy extends CompressionStrategy {
  constructor(config, aiClient) {
    super(config);
    this.aiClient = aiClient;
  }

  async compress(messages, options = {}) {
    const { recentCount = 30, summaryLength = 500 } = options;

    // 分割消息
    const toSummarize = messages.slice(0, -recentCount);
    const recent = messages.slice(-recentCount);

    // 生成摘要
    const summary = await this._generateSummary(toSummarize, summaryLength);

    // 构建摘要消息
    const summaryMessage = {
      role: 'system',
      content: `## 对话摘要\n\n${summary}\n\n---\n\n*以下是最新的 ${recentCount} 条消息*`,
      metadata: {
        type: 'compression_summary',
        originalMessageCount: toSummarize.length,
        timestamp: Date.now()
      }
    };

    return {
      messages: [summaryMessage, ...recent],
      summary: {
        removedCount: toSummarize.length,
        preservedCount: recent.length + 1,
        strategy: 'Summarize',
        description: `生成摘要并保留最近 ${recentCount} 条消息`
      }
    };
  }

  async _generateSummary(messages, maxLength) {
    if (!this.aiClient) {
      return this._generateSimpleSummary(messages);
    }

    try {
      // 构建摘要请求
      const prompt = `请将以下对话历史压缩为简洁的摘要（不超过 ${maxLength} 字）：

${messages.map(m => `[${m.role}]: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`).join('\n\n')}

要求：
1. 保留关键信息（任务目标、重要决策、当前状态）
2. 省略冗余细节
3. 使用简洁的语言
4. 保持上下文连贯性`;

      const response = await this.aiClient.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: maxLength,
        messages: [{ role: 'user', content: prompt }]
      });

      return response.content[0].text;
    } catch (error) {
      console.warn('[SummarizeStrategy] AI summarization failed, using simple summary:', error.message);
      return this._generateSimpleSummary(messages);
    }
  }

  _generateSimpleSummary(messages) {
    // 简单的规则摘要
    const userMessages = messages.filter(m => m.role === 'user').length;
    const assistantMessages = messages.filter(m => m.role === 'assistant').length;
    const toolCalls = messages.filter(m => this._hasToolCalls(m)).length;

    return `对话包含 ${userMessages} 条用户消息、${assistantMessages} 条助手响应和 ${toolCalls} 次工具调用。`;
  }

  _hasToolCalls(message) {
    if (message.role === 'assistant' && Array.isArray(message.content)) {
      return message.content.some(block => block.type === 'tool_use');
    }
    return false;
  }
}

/**
 * 策略工厂
 */
export class CompressionStrategyFactory {
  static create(type, config, aiClient = null) {
    switch (type) {
      case 'keepRecent':
        return new KeepRecentStrategy(config);
      case 'keepImportant':
        return new KeepImportantStrategy(config);
      case 'summarize':
        return new SummarizeStrategy(config, aiClient);
      default:
        throw new Error(`Unknown compression strategy: ${type}`);
    }
  }
}
```

## 3. Context 管理器实现

```javascript
// src/conversation/context-manager.js

import { ContextTracker } from './context-tracker.js';
import { CompressionStrategyFactory } from './compression-strategy.js';

export class ContextManager {
  constructor(conversation, config, aiClient = null) {
    this.conversation = conversation;
    this.config = config;
    this.aiClient = aiClient;

    // 初始化 tracker
    this.tracker = new ContextTracker({
      maxTokens: config.context?.maxTokens || 200000,
      warningThreshold: config.context?.warningThreshold || 0.85,
      criticalThreshold: config.context?.criticalThreshold || 0.95
    });

    // 压缩统计
    this.stats = {
      compressionCount: 0,
      resetCount: 0,
      totalTokensRemoved: 0
    };
  }

  /**
   * 在发送消息前检查并处理 context
   * @returns {Object|null} 返回处理结果，null 表示无需处理
   */
  async beforeSend(userMessage) {
    // 构建完整消息列表（包括即将发送的消息）
    const allMessages = [
      ...this.conversation.messages,
      { role: 'user', content: userMessage }
    ];

    // 计算 token
    const estimatedTokens = await this.tracker.estimateTokens(allMessages);

    // 获取状态
    const status = this.tracker.getStatus(estimatedTokens);

    console.log(`[ContextManager] Token status: ${status.currentTokens}/${status.maxTokens} (${status.percentage.toFixed(1)}%) - ${status.status}`);

    // 根据状态采取行动
    if (status.needsReset) {
      return await this._handleTaskReset(userMessage, status);
    }

    if (status.needsCompression) {
      return await this._handleCompression(userMessage, status);
    }

    return null; // 无需处理
  }

  /**
   * 处理压缩
   */
  async _handleCompression(userMessage, status) {
    console.log('[ContextManager] Triggering compression...');

    const strategyType = this.config.context?.compressionStrategy || 'keepRecent';
    const strategyOptions = this.config.context?.compressionOptions?.[strategyType] || {};

    // 创建策略实例
    const strategy = CompressionStrategyFactory.create(
      strategyType,
      this.config,
      this.aiClient
    );

    // 执行压缩
    const result = await strategy.compress(this.conversation.messages, strategyOptions);

    // 更新对话历史
    const beforeLength = this.conversation.messages.length;
    this.conversation.messages = result.messages;
    const afterLength = this.conversation.messages.length;

    // 更新统计
    this.stats.compressionCount++;
    this.stats.totalTokensRemoved += status.currentTokens - await this.tracker.estimateTokens(result.messages);

    // 保存历史
    if (!this.conversation.testMode) {
      const { saveHistory } = await import('../config.js');
      saveHistory(this.conversation.messages);
    }

    console.log(`[ContextManager] Compression complete: ${beforeLength} → ${afterLength} messages`);

    return {
      action: 'compressed',
      summary: result.summary,
      status
    };
  }

  /**
   * 处理任务重开
   */
  async _handleTaskReset(userMessage, status) {
    console.log('[ContextManager] Triggering task reset...');

    // 先尝试压缩，看看是否能满足需求
    const compressResult = await this._handleCompression(userMessage, status);

    // 再次检查
    const compressedTokens = await this.tracker.estimateTokens([
      ...this.conversation.messages,
      { role: 'user', content: userMessage }
    ]);

    if (this.tracker.needsTaskReset(compressedTokens)) {
      // 压缩后仍然超出限制，需要重开任务
      return await this._performTaskReset(userMessage);
    }

    // 压缩后满足需求，返回压缩结果
    return compressResult;
  }

  /**
   * 执行任务重开
   */
  async _performTaskReset(userMessage) {
    console.log('[ContextManager] Performing task reset...');

    // 1. 生成任务摘要
    const summary = await this._generateTaskSummary();

    // 2. 提取关键上下文
    const context = await this._extractContext();

    // 3. 创建新会话
    const { createConversation } = await import('./core.js');
    const newConversation = await createConversation(this.config, false, this.conversation.testMode);

    // 4. 注入上下文
    await this._injectContext(newConversation, summary, context);

    // 5. 更新统计
    this.stats.resetCount++;

    console.log('[ContextManager] Task reset complete');

    return {
      action: 'reset',
      newConversation,
      summary,
      context
    };
  }

  /**
   * 生成任务摘要
   */
  async _generateTaskSummary() {
    const messages = this.conversation.messages;

    // 提取关键信息
    const userGoals = messages
      .filter(m => m.role === 'user')
      .slice(-5) // 最近 5 条用户消息
      .map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content))
      .join('\n');

    const recentActivity = messages
      .slice(-10) // 最近 10 条消息
      .map(m => `[${m.role}]: ${typeof m.content === 'string' ? m.content.substring(0, 100) : '[复杂内容]'}`)
      .join('\n');

    return {
      userGoals,
      recentActivity,
      messageCount: messages.length,
      timestamp: Date.now()
    };
  }

  /**
   * 提取上下文
   */
  async _extractContext() {
    // 提取关键上下文信息
    return {
      workingDir: this.config.behavior.workingDir,
      activePlan: this.conversation.currentPlan,
      skillsEnabled: this.conversation.skillsEnabled,
      timestamp: Date.now()
    };
  }

  /**
   * 注入上下文到新会话
   */
  async _injectContext(newConversation, summary, context) {
    // 构建上下文消息
    const contextMessage = `## 任务延续

**之前的对话摘要**：
${summary.userGoals}

**最近活动**：
${summary.recentActivity}

**上下文信息**：
- 工作目录：${context.workingDir}
- 活动计划：${context.activePlan ? '是' : '否'}
- 技能系统：${context.skillsEnabled ? '启用' : '禁用'}

---
*这是从之前对话延续的任务，请基于以上上下文继续工作。*`;

    // 注入到新会话
    newConversation.messages.push({
      role: 'user',
      content: contextMessage,
      metadata: {
        type: 'task_continuation',
        timestamp: Date.now()
      }
    });

    // 保存历史
    if (!newConversation.testMode) {
      const { saveHistory } = await import('../config.js');
      saveHistory(newConversation.messages);
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * 重置统计
   */
  resetStats() {
    this.stats = {
      compressionCount: 0,
      resetCount: 0,
      totalTokensRemoved: 0
    };
  }
}
```

## 4. 集成到 Conversation 类

```javascript
// 在 src/conversation/core.js 中添加

export class Conversation {
  constructor(config, workflowTest = false, testMode = false) {
    // ... 现有代码 ...

    // 初始化 Context Manager
    this.contextManager = null;
  }

  async initialize() {
    // ... 现有代码 ...

    // 初始化 Context Manager（在 AI 客户端之后）
    const aiClient = await createAIClient(this.config);
    this.contextManager = new ContextManager(this, this.config, aiClient);

    return this;
  }

  async sendMessage(userMessage, onProgress = null, options = {}) {
    if (this.isProcessing) {
      throw new Error('Already processing a message');
    }
    this.isProcessing = true;

    try {
      // ✅ 新增：在发送前检查 context
      if (this.contextManager) {
        const contextResult = await this.contextManager.beforeSend(userMessage);

        if (contextResult) {
          // 通知 UI 发生了压缩或重开
          if (typeof onProgress === 'function') {
            onProgress({
              type: 'context_action',
              action: contextResult.action,
              summary: contextResult.summary
            });
          }

          // 如果是任务重开，返回新会话
          if (contextResult.action === 'reset') {
            return {
              ...contextResult,
              content: '任务已重开，上下文已保留。请继续您的对话。',
              aborted: false
            };
          }
        }
      }

      // ... 继续现有的 sendMessage 逻辑 ...
    } catch (error) {
      // ... 现有错误处理 ...
    } finally {
      this.isProcessing = false;
    }
  }
}
```

## 5. UI 集成

```javascript
// 在 src/closer-cli.jsx 中修改 handleSubmit

const handleSubmit = useCallback(async (value) => {
  if (!conversation || isProcessing) {
    return;
  }

  setInput('');
  setIsProcessing(true);
  setActivity('📤 发送消息到 AI...');

  // 添加用户消息
  const userMsg = { role: 'user', content: value };
  setMessages(prev => [...prev, userMsg]);

  try {
    // 发送到 AI
    const response = await conversation.sendMessage(
      value,
      (progress) => {
        // ... 现有的 progress 处理 ...

        // ✅ 新增：处理 context 操作
        if (progress.type === 'context_action') {
          if (progress.action === 'compressed') {
            setActivity('🗜️ 对话历史已压缩');
            setThinking(prev => [...prev, `🗜️ [${new Date().toLocaleTimeString()}] ${progress.summary.description}`]);

            // 添加系统消息
            messagesUpdate.updateSmart(prev => [...prev, {
              role: 'system',
              content: `✂️ 对话历史已压缩\n${progress.summary.description}`
            }], 'system');
          } else if (progress.action === 'reset') {
            setActivity('🔄 任务已重开');
            setThinking(prev => [...prev, `🔄 [${new Date().toLocaleTimeString()}] 任务已重开，上下文已保留`]);

            // 添加系统消息
            messagesUpdate.updateSmart(prev => [...prev, {
              role: 'system',
              content: `🔄 任务已重开\n上下文已保留，可以继续对话。`
            }], 'system');

            // 更新 conversation 引用
            if (progress.newConversation) {
              conversationRef.current = progress.newConversation;
              setConversation(progress.newConversation);
            }
          }
        }
      }
    );

    // 检查是否是任务重开
    if (response.action === 'reset') {
      // 更新 conversation
      conversationRef.current = response.newConversation;
      setConversation(response.newConversation);

      // 显示提示
      setMessages(prev => [...prev, {
        role: 'system',
        content: response.content
      }]);

      setIsProcessing(false);
      setActivity(null);
      return;
    }

    // ... 继续现有的响应处理 ...
  } catch (error) {
    // ... 现有错误处理 ...
  }
}, [conversation, isProcessing]);
```

## 6. 配置示例

```json
{
  "context": {
    "maxTokens": 200000,
    "warningThreshold": 0.85,
    "criticalThreshold": 0.95,
    "compressionStrategy": "keepImportant",
    "compressionOptions": {
      "keepRecent": {
        "count": 50
      },
      "keepImportant": {
        "recentCount": 20,
        "preserveToolCalls": true,
        "preserveErrors": true
      },
      "summarize": {
        "recentCount": 30,
        "summaryLength": 500
      }
    },
    "autoReset": true,
    "tokenCalculationMethod": "auto"
  }
}
```

## 7. 测试用例

```javascript
// test/context-manager.test.js

import { ContextTracker } from '../src/conversation/context-tracker.js';
import { KeepRecentStrategy, KeepImportantStrategy } from '../src/conversation/compression-strategy.js';
import { ContextManager } from '../src/conversation/context-manager.js';

describe('ContextTracker', () => {
  test('should estimate tokens accurately', async () => {
    const tracker = new ContextTracker({ maxTokens: 200000 });
    const messages = [
      { role: 'user', content: 'Hello world' },
      { role: 'assistant', content: 'Hi there!' }
    ];

    const tokens = await tracker.estimateTokens(messages);
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(100);
  });

  test('should detect when compression is needed', () => {
    const tracker = new ContextTracker({ maxTokens: 1000, warningThreshold: 0.85 });
    expect(tracker.needsCompression(850)).toBe(true);
    expect(tracker.needsCompression(800)).toBe(false);
  });

  test('should detect when reset is needed', () => {
    const tracker = new ContextTracker({ maxTokens: 1000, criticalThreshold: 0.95 });
    expect(tracker.needsTaskReset(950)).toBe(true);
    expect(tracker.needsTaskReset(900)).toBe(false);
  });
});

describe('CompressionStrategy', () => {
  test('KeepRecentStrategy should keep only recent messages', async () => {
    const strategy = new KeepRecentStrategy({});
    const messages = Array.from({ length: 100 }, (_, i) => ({
      role: 'user',
      content: `Message ${i}`
    }));

    const result = await strategy.compress(messages, { count: 10 });
    expect(result.messages.length).toBe(10);
    expect(result.messages[0].content).toBe('Message 90');
  });

  test('KeepImportantStrategy should preserve tool calls', async () => {
    const strategy = new KeepImportantStrategy({});
    const messages = [
      { role: 'user', content: 'Create a file' },
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'I will create the file' },
          { type: 'tool_use', name: 'writeFile', input: { path: 'test.txt' } }
        ]
      },
      { role: 'user', content: 'Another message' }
    ];

    const result = await strategy.compress(messages, { recentCount: 0 });
    expect(result.messages.some(m => strategy._hasToolCalls(m))).toBe(true);
  });
});
```

---

**创建日期**：2025-01-XX
**最后更新**：2025-01-XX
**状态**：待审核
