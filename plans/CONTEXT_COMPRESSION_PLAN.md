# Context 压缩与任务重开功能实现计划

## 📋 项目概述

**目标**：实现对话历史压缩和任务重开功能，防止因 context 超限导致的对话失败。

**当前问题**：
- 当对话超过模型 context 限制时，会报错：
  ```
  Request 170146 input tokens exceeds the model's maximum context length 202750
  ```
- 没有预防性检测机制
- 没有自动压缩或重开任务的机制
- 用户无法继续长对话

## 🎯 设计原则

### 前瞻性设计
1. **预防性检测**：在达到限制前就触发压缩（80-90% 阈值）
2. **智能压缩**：保留重要信息，删除冗余内容
3. **用户可控**：允许用户配置压缩策略和阈值
4. **透明性**：清晰告知用户发生了什么
5. **平滑过渡**：任务重开时保留必要的上下文

### 可扩展性
- 支持不同的压缩策略
- 支持多种 token 计算方法
- 支持自定义压缩规则
- 支持不同的模型和 context 限制

## 📊 架构设计

### 1. 核心模块

```
src/conversation/
├── context-manager.js      # Context 管理器（新增）
├── compression-strategy.js # 压缩策略（新增）
├── context-tracker.js      # Token 追踪器（新增）
└── task-continuator.js     # 任务延续器（新增）
```

### 2. 模块职责

#### ContextTracker（Token 追踪器）
- **职责**：实时追踪对话历史的 token 使用量
- **功能**：
  - 计算消息的 token 数（使用 API 或估算）
  - 累计统计当前会话的 token 使用
  - 预测下一条消息的可能 token 数
  - 检测是否接近 context 限制

#### ContextManager（Context 管理器）
- **职责**：管理对话历史，执行压缩和重开策略
- **功能**：
  - 监控 token 使用情况
  - 判断是否需要压缩或重开
  - 执行压缩操作
  - 触发任务重开流程

#### CompressionStrategy（压缩策略）
- **职责**：定义不同的压缩算法
- **功能**：
  - 保留最近 N 条消息
  - 保留重要消息（包含工具调用、错误信息等）
  - 生成对话摘要
  - 滑动窗口策略

#### TaskContinuator（任务延续器）
- **职责**：在重开任务时传递必要的上下文
- **功能**：
  - 生成任务摘要
  - 提取关键信息（当前任务、文件状态等）
  - 创建新的对话会话
  - 注入上下文到新会话

## 🔄 工作流程

### 流程 1：预防性检测

```
用户发送消息
    ↓
ContextTracker 预估 token
    ↓
检查是否超过阈值（默认 85%）
    ↓
是 → 触发压缩流程
否 → 正常发送消息
```

### 流程 2：压缩流程

```
检测到 context 接近限制
    ↓
ContextManager 评估压缩策略
    ↓
选择合适的压缩策略
    ↓
执行压缩（删除/合并消息）
    ↓
更新对话历史
    ↓
继续处理用户消息
```

### 流程 3：任务重开流程

```
压缩后仍无法满足需求
    ↓
TaskContinuator 生成任务摘要
    ↓
保存当前状态（工作目录、打开的文件等）
    ↓
创建新的 Conversation 实例
    ↓
注入任务摘要和上下文
    ↓
继续处理用户消息
```

## 🛠️ 实现细节

### 阶段 1：Token 追踪（基础）

**文件**：`src/conversation/context-tracker.js`

```javascript
export class ContextTracker {
  constructor(config) {
    this.config = config;
    this.maxTokens = config.maxTokens || 200000;
    this.warningThreshold = config.warningThreshold || 0.85; // 85%
    this.criticalThreshold = config.criticalThreshold || 0.95; // 95%
  }

  /**
   * 估算消息的 token 数
   */
  async estimateTokens(messages) {
    // 优先使用 API 的 countTokens
    // 降级使用本地估算算法
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
}
```

### 阶段 2：压缩策略

**文件**：`src/conversation/compression-strategy.js`

```javascript
export class CompressionStrategy {
  /**
   * 保留最近 N 条消息
   */
  static keepRecent(messages, count = 50) {
    return messages.slice(-count);
  }

  /**
   * 保留重要消息
   */
  static keepImportant(messages) {
    // 保留包含以下内容的消息：
    // - 工具调用
    // - 错误信息
    // - 用户的关键指令
    // - 最近的消息
  }

  /**
   * 生成摘要 + 保留最近消息
   */
  static summarizeAndKeep(messages) {
    // 使用 AI 生成对话摘要
    // 保留摘要 + 最近 N 条消息
  }
}
```

### 阶段 3：Context 管理

**文件**：`src/conversation/context-manager.js`

```javascript
export class ContextManager {
  constructor(conversation, config) {
    this.conversation = conversation;
    this.tracker = new ContextTracker(config);
    this.strategy = new CompressionStrategy(config);
  }

  /**
   * 在发送消息前检查
   */
  async beforeSend(userMessage) {
    const estimatedTokens = await this.tracker.estimateTokens(
      this.conversation.messages
    );

    if (this.tracker.needsTaskReset(estimatedTokens)) {
      return await this.resetTask(userMessage);
    }

    if (this.tracker.needsCompression(estimatedTokens)) {
      await this.compressHistory();
    }

    return null; // 继续正常流程
  }

  /**
   * 压缩历史
   */
  async compressHistory() {
    const strategy = this.config.compressionStrategy || 'keepRecent';
    const compressed = this.strategy.apply(
      this.conversation.messages,
      strategy
    );
    this.conversation.messages = compressed;
  }

  /**
   * 重开任务
   */
  async resetTask(userMessage) {
    // 生成摘要
    const summary = await this.generateSummary();

    // 创建新会话
    const newConversation = await createConversation(this.config);

    // 注入上下文
    newConversation.injectContext(summary);

    return newConversation;
  }
}
```

### 阶段 4：UI 集成

**修改文件**：`src/closer-cli.jsx`

```javascript
// 在 handleSubmit 中添加
const handleSubmit = useCallback(async (value) => {
  // ... 现有代码 ...

  // 检查 context
  const contextCheck = await conversation.checkContext(value);
  if (contextCheck.action === 'compressed') {
    setActivity('🗜️ 对话历史已压缩');
    setMessages(prev => [...prev, {
      role: 'system',
      content: `对话历史已压缩（保留最近 ${contextCheck.kept} 条消息）`
    }]);
  } else if (contextCheck.action === 'reset') {
    setActivity('🔄 任务已重开，上下文已传递');
    setConversation(contextCheck.newConversation);
    setMessages(prev => [...prev, {
      role: 'system',
      content: '任务已重开（上下文已保留）'
    }]);
  }

  // 继续正常流程
  // ...
}, [conversation]);
```

## ⚙️ 配置选项

**文件**：`config.example.json`

```json
{
  "context": {
    "maxTokens": 200000,
    "warningThreshold": 0.85,
    "criticalThreshold": 0.95,
    "compressionStrategy": "keepRecent",
    "compressionOptions": {
      "keepRecent": {
        "count": 50
      },
      "keepImportant": {
        "preserveToolCalls": true,
        "preserveErrors": true,
        "recentCount": 20
      }
    },
    "autoReset": true,
    "resetBehavior": "summarize"
  }
}
```

## 📈 实现阶段

### Phase 1：基础检测（第 1-2 天）
- [ ] 实现 `ContextTracker` 类
- [ ] 实现 token 估算功能
- [ ] 添加阈值检测逻辑
- [ ] 编写单元测试

### Phase 2：压缩策略（第 3-4 天）
- [ ] 实现 `CompressionStrategy` 类
- [ ] 实现多种压缩算法
- [ ] 添加配置支持
- [ ] 编写单元测试

### Phase 3：Context 管理（第 5-6 天）
- [ ] 实现 `ContextManager` 类
- [ ] 集成到 `Conversation` 类
- [ ] 添加压缩和重开逻辑
- [ ] 编写集成测试

### Phase 4：UI 集成（第 7 天）
- [ ] 修改 `closer-cli.jsx`
- [ ] 添加用户提示
- [ ] 添加状态显示
- [ ] 测试用户体验

### Phase 5：测试和优化（第 8-10 天）
- [ ] 端到端测试
- [ ] 性能优化
- [ ] 文档编写
- [ ] 用户反馈收集

## 🧪 测试策略

### 单元测试
- Token 计算准确性
- 压缩策略正确性
- 边界条件处理

### 集成测试
- 与现有 Conversation 类的集成
- 与 AI 客户端的集成
- 与 UI 的集成

### 端到端测试
- 模拟长对话场景
- 验证压缩效果
- 验证任务重开流程

## 📝 用户文档

### 配置指南
- 如何配置压缩阈值
- 如何选择压缩策略
- 如何启用/禁用自动重开

### 使用指南
- 压缩时会发生什么
- 如何手动触发压缩
- 任务重开后如何继续

## 🚀 未来扩展

### 高级功能
- **智能摘要**：使用 AI 生成更高质量的摘要
- **语义压缩**：基于语义相似度合并消息
- **分层存储**：将旧消息存储到外部，需要时加载
- **用户自定义规则**：允许用户定义哪些消息必须保留

### 性能优化
- **增量计算**：只计算新增消息的 token
- **缓存机制**：缓存 token 计算结果
- **异步处理**：在后台进行压缩准备

## 📋 验收标准

### 功能性
- ✅ 能准确检测 context 接近限制
- ✅ 能正确压缩对话历史
- ✅ 能平滑重开任务并传递上下文
- ✅ 用户能清楚了解发生了什么

### 性能
- ✅ Token 计算不影响响应速度
- ✅ 压缩操作在 1 秒内完成
- ✅ 任务重开在 2 秒内完成

### 可靠性
- ✅ 不会丢失关键信息
- ✅ 不会导致对话中断
- ✅ 边界条件处理正确

## 🔄 回滚计划

如果功能出现问题：
1. 可以通过配置禁用自动压缩
2. 保留 `/clear` 命令作为手动清理方式
3. 可以降级到仅检测不处理模式

## 📊 成功指标

- Context 超限错误减少 95%
- 长对话成功率提升到 99%
- 用户满意度提升
- 对话连续性改善

---

**创建日期**：2025-01-XX
**最后更新**：2025-01-XX
**状态**：待审核
