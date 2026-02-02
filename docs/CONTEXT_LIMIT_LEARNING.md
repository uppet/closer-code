# Context 限制值动态学习功能

**功能**: 动态学习和记录真实的 API context 限制值
**状态**: ✅ 已实现并测试通过
**日期**: 2025-01-02

---

## 📋 功能概述

### 问题
不同 AI 模型的 context 限制值不同：
- Claude 3.5 Sonnet: 200,000 tokens
- Claude 3 Opus: 200,000 tokens
- GPT-4: 128,000 tokens
- GPT-4-32K: 32,000 tokens
- 其他模型: 各不相同

硬编码这些限制值：
- 不准确（可能与实际不符）
- 不灵活（新模型需要更新代码）
- 不实用（不同用户使用不同模型）

### 解决方案
**动态学习**：从实际运行中学习真实的 context 限制值

1. **首次遇到**: 当 API 返回 context overflow 错误时
2. **自动提取**: 从错误消息中提取真实的限制值
3. **持久保存**: 保存到 `.context_limits.json` 文件
4. **后续使用**: 下次启动时自动加载已知限制值
5. **持续更新**: 遇到新的限制值时自动更新

---

## 🎯 核心特性

### 1. 自动从错误中学习

```javascript
// API 返回错误
Error: context length exceeded: 200000 tokens

// 自动提取限制值
const limit = manager.extractLimitFromError(error);
// limit = 200000

// 保存到文件
manager.updateLimit('claude-3-5-sonnet', 200000, 'error');
```

### 2. 持久化存储

```json
// .context_limits.json
{
  "models": {
    "claude-3-5-sonnet": {
      "value": 200000,
      "source": "error",
      "updatedAt": "2025-01-02T10:30:00.000Z"
    },
    "gpt-4": {
      "value": 128000,
      "source": "error",
      "updatedAt": "2025-01-02T11:00:00.000Z"
    }
  },
  "lastUpdated": "2025-01-02T11:00:00.000Z"
}
```

### 3. 多种错误格式支持

支持多种 API 的错误格式：
- ✅ Anthropic: `context length exceeded: 200000 tokens`
- ✅ OpenAI: `maximum context length is 128000 tokens`
- ✅ 其他: `Request exceeded limit of 8192 tokens`

### 4. 智能验证

- ✅ 验证限制值范围（1,000 - 10,000,000）
- ✅ 检测异常值（与已知值差异 >50% 时取平均）
- ✅ 记录来源（error/user/config）
- ✅ 记录更新时间

---

## 📊 使用方式

### 自动使用（推荐）

无需配置，功能自动工作：

```javascript
// 1. 启动时自动加载已知限制
const manager = new ContextLimitManager(workingDir);

// 2. ContextManager 自动使用
const contextManager = new ContextManager(conversation, config);

// 3. 遇到错误时自动学习
try {
  await api.sendMessage(messages);
} catch (error) {
  contextManager.handleAPIError(error); // 自动学习
}
```

### 手动管理

```javascript
const manager = new ContextLimitManager(workingDir);

// 手动设置限制
manager.updateLimit('my-model', 100000, 'user');

// 获取限制
const limit = manager.getLimit('my-model');

// 获取或估算（带回退值）
const limit = manager.getOrEstimateLimit('my-model', 200000);

// 清除限制
manager.clearLimit('my-model');

// 查看所有限制
const all = manager.getAllLimits();
```

---

## 🔧 实现细节

### 文件结构

```
src/conversation/
├── context-limit-manager.js  # 限制值管理器（新增）
├── context-manager.js         # 集成限制学习（修改）
└── core.js                    # 错误处理（修改）

test/
└── test-context-limit-manager.js  # 测试（新增）
```

### 关键方法

#### ContextLimitManager

```javascript
class ContextLimitManager {
  // 从错误中提取限制值
  extractLimitFromError(error): number | null
  
  // 更新限制值
  updateLimit(model, limit, source): boolean
  
  // 从错误中学习
  learnFromError(error, model): boolean
  
  // 获取限制值
  getLimit(model): number | null
  
  // 获取或估算（带回退）
  getOrEstimateLimit(model, fallback): number
  
  // 保存到文件
  saveLimits(): void
  
  // 从文件加载
  loadLimits(): object
}
```

#### ContextManager（集成）

```javascript
class ContextManager {
  constructor(conversation, config) {
    // 初始化限制管理器
    this.limitManager = createContextLimitManager(workingDir);
    
    // 获取或学习限制值
    const learnedLimit = this.limitManager.getLimit(model);
    const maxTokens = learnedLimit || config.maxTokens || 200000;
    
    // 创建 tracker
    this.tracker = new ContextTracker({ maxTokens, ... });
  }
  
  // 处理 API 错误
  handleAPIError(error): boolean {
    const isOverflow = /context.*exceed/.test(error.message);
    if (isOverflow) {
      this.limitManager.learnFromError(error, model);
      this.tracker.maxTokens = this.limitManager.getLimit(model);
      return true;
    }
    return false;
  }
}
```

#### Conversation（错误处理）

```javascript
class Conversation {
  async sendMessage(userMessage, onProgress, options) {
    try {
      // ... 发送消息
    } catch (error) {
      // 检查是否是 context overflow
      const isOverflow = this.contextManager.handleAPIError(error);
      
      if (isOverflow) {
        // 压缩历史并提示用户
        await this.contextManager.manualCompress();
        throw new Error('Context overflow detected and learned. Please try again.');
      }
      
      throw error;
    }
  }
}
```

---

## ✅ 测试验证

### 测试覆盖

- ✅ 从错误中提取限制值（6 种格式）
- ✅ 保存和加载限制值
- ✅ 从错误中学习
- ✅ 获取或估算限制值
- ✅ 限制值验证
- ✅ 清除限制值

### 测试结果

```bash
$ node test/test-context-limit-manager.js
✅ 所有测试通过！
```

**测试文件**: `test/test-context-limit-manager.js`

---

## 📈 优势

### 与硬编码相比

| 特性 | 硬编码 | 动态学习 |
|------|--------|----------|
| 准确性 | 可能不准确 | ✅ 真实值 |
| 灵活性 | 需要更新代码 | ✅ 自动学习 |
| 维护性 | 需要维护模型列表 | ✅ 无需维护 |
| 实用性 | 依赖预设值 | ✅ 基于实际 |
| 适应性 | 不适应变化 | ✅ 自动适应 |

### 实际效果

1. **首次使用**: 使用配置的回退值（如 200,000）
2. **遇到错误**: 自动学习真实限制值
3. **后续使用**: 使用学习到的准确值
4. **持续优化**: 遇到新限制值时自动更新

---

## 🎯 使用场景

### 场景 1: 使用新模型

```javascript
// 用户切换到新模型 "gpt-5"
// 限制值未知，使用回退值 200,000

// 首次遇到 context overflow
Error: context length exceeded: 1000000 tokens

// 自动学习并保存
// 下次启动时使用准确的 1,000,000 限制
```

### 场景 2: 多模型切换

```json
// .context_limits.json
{
  "models": {
    "claude-3-5-sonnet": { "value": 200000 },
    "gpt-4": { "value": 128000 },
    "gpt-4-32k": { "value": 32000 }
  }
}

// 自动为每个模型使用正确的限制值
```

### 场景 3: 限制值变化

```javascript
// API 提供商更新限制值
// 从 200,000 增加到 250,000

// 自动检测变化并更新
// 使用平均值避免误判
```

---

## 📝 配置选项

### 默认行为（无需配置）

```javascript
// 自动启用
const contextManager = new ContextManager(conversation, config);
```

### 自定义回退值

```javascript
const contextManager = new ContextManager(conversation, {
  // ...
  context: {
    maxTokens: 200000 // 回退值
  }
});
```

### 禁用自动学习（不推荐）

```javascript
// 在 Conversation.sendMessage() 中不调用 handleAPIError()
// 或设置 context.autoCompress = false
```

---

## 🔍 故障排除

### 问题 1: 限制值未学习

**检查**:
1. 错误消息是否包含限制值？
2. 错误格式是否被支持？
3. 查看日志 `[ContextLimitManager]`

**解决**:
- 查看错误消息格式
- 添加新的正则表达式模式
- 手动设置限制值

### 问题 2: 学习到的限制值不准确

**检查**:
1. 限制值是否在合理范围内？
2. 是否与已知值差异过大？

**解决**:
- 系统会自动取平均值
- 可以手动清除并重新学习
- `manager.clearLimit(model)`

### 问题 3: .context_limits.json 文件位置

**默认位置**: `{workingDir}/.context_limits.json`

**修改**:
```javascript
const manager = new ContextLimitManager(customPath);
```

---

## 🎉 总结

### 核心价值

1. **准确性**: 基于真实 API 限制，而非预设值
2. **灵活性**: 自动适应不同模型和限制变化
3. **实用性**: 一次学习，永久使用
4. **智能化**: 自动验证、自动更新

### 技术亮点

- ✅ 自动错误检测和提取
- ✅ 多种错误格式支持
- ✅ 智能验证和平滑
- ✅ 持久化存储
- ✅ 完整的测试覆盖

### 下一步

- [ ] 支持从 API 响应头中学习限制
- [ ] 支持用户手动配置限制值
- [ ] 提供管理命令（查看、清除、更新）
- [ ] 上报和共享限制值（可选）

---

**实现完成时间**: 2025-01-02
**实现者**: Cloco AI Assistant
**状态**: ✅ 已实现并测试通过
**文件**: `src/conversation/context-limit-manager.js`
