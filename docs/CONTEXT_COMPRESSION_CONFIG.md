# Context 压缩功能配置示例

## 完整配置示例

将以下配置添加到你的 `~/.closer-code/config.json` 或项目的 `.closer-code.json` 文件中：

```json
{
  "ai": {
    "provider": "anthropic",
    "anthropic": {
      "apiKey": "your-api-key",
      "baseURL": "https://api.anthropic.com",
      "model": "claude-sonnet-4-5-20250929",
      "maxTokens": 8192
    }
  },
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
      },
      "slidingWindow": {
        "count": 50,
        "preserveSystem": true
      },
      "smartToken": {
        "maxTokens": 100000,
        "targetTokens": 80000
      }
    },
    "autoCompress": true,
    "autoReset": true,
    "resetBehavior": "summarize"
  }
}
```

## 配置参数说明

### context.maxTokens
- **类型**: `number`
- **默认值**: `200000`
- **说明**: 模型的最大 context 限制（token 数）
- **注意**: 不同模型的限制不同：
  - Claude 3.5 Sonnet: 200K tokens
  - Claude 3 Opus: 200K tokens
  - GPT-4: 128K tokens
  - GPT-4-32K: 32K tokens

### context.warningThreshold
- **类型**: `number` (0-1)
- **默认值**: `0.85` (85%)
- **说明**: 触发压缩的阈值（相对于 maxTokens 的比例）
- **推荐值**:
  - 保守: 0.75 (75%) - 更早压缩，保留更多上下文
  - 平衡: 0.85 (85%) - 默认值，推荐
  - 激进: 0.90 (90%) - 更晚压缩，最大化上下文

### context.criticalThreshold
- **类型**: `number` (0-1)
- **默认值**: `0.95` (95%)
- **说明**: 触发任务重开的阈值（相对于 maxTokens 的比例）
- **推荐值**: 0.90 - 0.95

### context.compressionStrategy
- **类型**: `string`
- **默认值**: `"keepRecent"`
- **可选值**:
  - `"keepRecent"`: 保留最近 N 条消息（默认）
  - `"keepImportant"`: 保留重要消息（工具调用、错误等）
  - `"slidingWindow"`: 滑动窗口策略
  - `"smartToken"`: 智能 token 压缩

### context.compressionOptions
- **类型**: `object`
- **说明**: 各种压缩策略的选项

#### keepRecent 选项
```json
{
  "count": 50  // 保留最近 50 条消息
}
```

#### keepImportant 选项
```json
{
  "preserveToolCalls": true,   // 保留工具调用消息
  "preserveErrors": true,      // 保留错误消息
  "recentCount": 20            // 保留最近 20 条消息
}
```

#### slidingWindow 选项
```json
{
  "count": 50,           // 保留最近 50 条消息
  "preserveSystem": true   // 保留系统消息
}
```

#### smartToken 选项
```json
{
  "maxTokens": 100000,    // 最大 token 数
  "targetTokens": 80000    // 目标 token 数（留有余量）
}
```

### context.autoCompress
- **类型**: `boolean`
- **默认值**: `true`
- **说明**: 是否自动压缩对话历史

### context.autoReset
- **类型**: `boolean`
- **默认值**: `true`
- **说明**: 是否在达到危险阈值时自动重开任务

### context.resetBehavior
- **类型**: `string`
- **默认值**: `"summarize"`
- **可选值**:
  - `"summarize"`: 生成摘要并重开
  - `"compress"`: 仅压缩，不重开
  - `"clear"`: 清空历史

## 使用场景

### 场景 1: 长对话（推荐配置）
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
      }
    },
    "autoCompress": true,
    "autoReset": true
  }
}
```

### 场景 2: 代码审查（需要保留更多历史）
```json
{
  "context": {
    "maxTokens": 200000,
    "warningThreshold": 0.80,
    "compressionStrategy": "keepImportant",
    "compressionOptions": {
      "keepImportant": {
        "preserveToolCalls": true,
        "preserveErrors": true,
        "recentCount": 30
      }
    },
    "autoCompress": true,
    "autoReset": false
  }
}
```

### 场景 3: 短对话（禁用压缩）
```json
{
  "context": {
    "autoCompress": false,
    "autoReset": false
  }
}
```

## 监控和调试

### 查看当前 token 使用情况

在对话中输入 `/status` 命令，可以看到：
- 当前消息数量
- Token 使用情况
- Context 管理器统计

### 手动触发压缩

如果需要手动压缩对话历史，可以在代码中调用：

```javascript
await conversation.manualCompress('keepRecent');
```

## 性能考虑

### Token 计算缓存
- ContextTracker 使用缓存来避免重复计算
- 缓存命中率通常 > 90%
- 缓存大小限制为 100 个条目

### 压缩性能
- 压缩操作通常在 10-50ms 内完成
- 不会影响对话响应速度

### 重开性能
- 任务重开通常在 100-500ms 内完成
- 包括摘要生成和会话创建

## 故障排除

### 问题：压缩太频繁
**解决方案**: 提高 `warningThreshold` 到 0.90 或 0.95

### 问题：丢失重要上下文
**解决方案**: 使用 `keepImportant` 策略而不是 `keepRecent`

### 问题：仍然遇到 context overflow 错误
**解决方案**: 
1. 降低 `warningThreshold` 到 0.75
2. 启用 `autoReset`
3. 减小 `compressionOptions.keepRecent.count`

## 最佳实践

1. **从保守开始**: 先使用 0.75 的阈值，观察效果
2. **监控使用情况**: 定期检查 `/status` 输出
3. **选择合适的策略**: 
   - 一般对话: `keepRecent`
   - 代码审查: `keepImportant`
   - 长文档: `smartToken`
4. **保持启用自动压缩**: 避免手动清理的麻烦
5. **测试配置**: 在非生产环境中测试不同的配置

## 技术细节

### Token 估算方法
- **优先**: 使用 API 的 `countTokens` 方法（精确）
- **降级**: 使用本地估算算法（快速）
  - 中文字符: ~2.5 tokens
  - 英文字符: ~0.25 tokens
  - 代码: ~0.5 tokens

### 压缩策略对比

| 策略 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| keepRecent | 简单快速 | 可能丢失重要信息 | 一般对话 |
| keepImportant | 保留关键信息 | 可能保留过多 | 代码审查 |
| slidingWindow | 保留系统消息 | 可能不灵活 | 需要系统提示 |
| smartToken | 基于 token | 计算开销大 | 长文档 |

### 压缩触发时机
```
正常流程:
用户输入 → 检查 context → [在阈值内] → 发送消息
                ↓
           [超过警告阈值]
                ↓
           执行压缩 → 发送消息
                ↓
           [超过危险阈值]
                ↓
           任务重开 → 发送消息
```
