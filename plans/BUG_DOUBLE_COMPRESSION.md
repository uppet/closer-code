# 严重 Bug 发现 - Context 检查导致双重压缩

**问题**: 在非 batch 界面 CLI 使用过程中，会出现对话信息不断滚动无法退出

**根本原因**: 双重压缩导致消息重复添加

## 🔴 Bug 分析

### 错误的执行流程

1. `Conversation.sendMessage()` 调用 `contextManager.checkBeforeSend(userMessage)`
2. `checkBeforeSend()` 检测到需要重开，调用 `resetTask(userMessage, usageInfo)`
3. `resetTask()` **已经执行了压缩**并添加了系统消息
4. `checkBeforeSend()` 返回 `{ action: 'reset', ... }`
5. `Conversation.sendMessage()` 看到 `action === 'reset'`，**又调用** `resetTaskInternal()`
6. `resetTaskInternal()` **再次压缩**历史！

### 导致的问题

1. **双重压缩**: 历史被压缩两次
2. **消息丢失**: 第二次压缩可能删除系统消息
3. **无限循环**: 如果压缩后仍然超过阈值，会一直重复
4. **无法退出**: 消息不断滚动，用户无法控制

## 🔧 修复方案

### 方案 1: checkBeforeSend 只检查，不执行 ✅ 推荐

修改 `checkBeforeSend()` 方法，只返回建议，不执行压缩/重开：

```javascript
async checkBeforeSend(userMessage) {
  const messages = this.conversation.getMessages();
  const currentTokens = await this.tracker.estimateTokens(messages);
  const usageInfo = this.tracker.getUsageInfo(currentTokens);

  console.log(`[ContextManager] Current token usage: ${usageInfo.percentageDisplay} (${currentTokens}/${usageInfo.max})`);

  // 检查是否需要重开任务
  if (this.tracker.needsTaskReset(currentTokens)) {
    return {
      action: 'reset',
      usageInfo,
      reason: 'critical_threshold'
    };
  }

  // 检查是否需要压缩
  if (this.tracker.needsCompression(currentTokens)) {
    return {
      action: 'compressed',
      usageInfo,
      reason: 'warning_threshold'
    };
  }

  return {
    action: 'none',
    usageInfo
  };
}
```

### 方案 2: Conversation 不重复执行 ✅ 也可以

保持 `checkBeforeSend()` 不变，但修改 `Conversation.sendMessage()`：

```javascript
const contextCheck = await this.contextManager.checkBeforeSend(userMessage);

// 如果已经执行了压缩/重开，不要再执行
if (contextCheck.action === 'reset' || contextCheck.action === 'compressed') {
  // checkBeforeSend 已经处理了，直接添加用户消息
  this.messages.push({
    role: MessageType.USER,
    content: userMessage
  });
} else {
  // 正常情况
  this.messages.push({
    role: MessageType.USER,
    content: userMessage
  });
}
```

## 🎯 推荐修复

**方案 1** 更清晰，职责分离：
- `checkBeforeSend()`: 只检查，返回建议
- `Conversation.sendMessage()`: 根据建议执行操作

这样可以避免双重执行，逻辑更清晰。

---

**优先级**: 🔴 P0 - 立即修复
**影响**: 严重 - 导致无法正常使用
**修复时间**: 15 分钟
