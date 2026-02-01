# Context 压缩与任务重开 - 执行总结

## 🎯 核心目标

实现对话历史压缩和任务重开功能，解决 context 超限问题：
- **当前问题**：`Request 170146 input tokens exceeds the model's maximum context length 202750`
- **解决目标**：在达到限制前自动压缩，无法压缩时平滑重开任务

## 📐 解决方案架构

### 三层防御策略

```
1. Token 追踪层 (ContextTracker)
   ├─ 实时计算对话 token 数量
   ├─ 支持多种计算方法（API/本地/估算）
   └─ 检测是否接近限制

2. 压缩策略层 (CompressionStrategy)
   ├─ KeepRecent: 保留最近 N 条消息
   ├─ KeepImportant: 保留重要消息（工具调用、错误等）
   └─ Summarize: AI 生成摘要 + 保留最近消息

3. 任务管理层 (ContextManager)
   ├─ 监控 token 使用情况
   ├─ 触发压缩或重开
   └─ 传递上下文到新会话
```

## 🔄 工作流程

```
用户发送消息
    ↓
计算预估 token（包括新消息）
    ↓
判断状态：
  ├─ < 85%: 正常发送
  ├─ 85-95%: 触发压缩
  └─ > 95%: 压缩后仍超限则重开任务
    ↓
继续处理或重开会话
```

## 📁 文件结构

```
src/conversation/
├── context-tracker.js          # Token 追踪（新增）
├── compression-strategy.js     # 压缩策略（新增）
├── context-manager.js          # Context 管理（新增）
└── core.js                     # 修改：集成 ContextManager

src/closer-cli.jsx              # 修改：UI 提示
config.example.json             # 修改：添加配置项
```

## ⚙️ 配置示例

```json
{
  "context": {
    "maxTokens": 200000,
    "warningThreshold": 0.85,
    "criticalThreshold": 0.95,
    "compressionStrategy": "keepImportant",
    "compressionOptions": {
      "keepImportant": {
        "recentCount": 20,
        "preserveToolCalls": true,
        "preserveErrors": true
      }
    },
    "autoReset": true
  }
}
```

## 🎬 用户体验

### 压缩时
```
🗜️ 对话历史已压缩
保留 45 条重要消息，删除 120 条消息
```

### 重开时
```
🔄 任务已重开，上下文已保留

之前的对话摘要：
- 用户要求实现文件上传功能
- 已完成前端部分，正在处理后端
- 最近活动：调试 API 接口

上下文信息：
- 工作目录：/path/to/project
- 活动计划：是
- 技能系统：启用
```

## 📊 实现阶段

### Phase 1：基础检测（2天）
- [x] ContextTracker 类
- [x] Token 计算功能
- [x] 阈值检测逻辑
- [ ] 单元测试

### Phase 2：压缩策略（2天）
- [x] CompressionStrategy 基类
- [x] KeepRecentStrategy
- [x] KeepImportantStrategy
- [ ] SummarizeStrategy（可选）
- [ ] 单元测试

### Phase 3：Context 管理（2天）
- [x] ContextManager 类
- [ ] 集成到 Conversation
- [ ] 压缩和重开逻辑
- [ ] 集成测试

### Phase 4：UI 集成（1天）
- [x] UI 修改方案
- [ ] 实现用户提示
- [ ] 测试用户体验

### Phase 5：测试优化（2天）
- [ ] 端到端测试
- [ ] 性能优化
- [ ] 文档编写

**总计：约 9-10 天**

## ✅ 验收标准

### 功能性
- ✅ 能准确检测 context 接近限制（误差 < 5%）
- ✅ 能正确压缩对话历史（不丢失关键信息）
- ✅ 能平滑重开任务（上下文传递正确）
- ✅ 用户能清楚了解发生了什么

### 性能
- ✅ Token 计算耗时 < 100ms（使用缓存）
- ✅ 压缩操作耗时 < 1s
- ✅ 任务重开耗时 < 2s

### 可靠性
- ✅ 不会丢失工具调用记录
- ✅ 不会丢失错误信息
- ✅ 不会导致对话中断
- ✅ 边界条件处理正确

## 🚀 优势

1. **前瞻性**：在达到限制前就触发（85% 阈值）
2. **智能化**：多种压缩策略，保留重要信息
3. **用户可控**：可配置阈值和策略
4. **透明性**：清晰告知用户发生了什么
5. **平滑过渡**：任务重开时保留必要上下文

## 🔄 回滚方案

如果功能出现问题：
1. 配置中设置 `"autoReset": false` 禁用自动重开
2. 保留 `/clear` 命令作为手动清理
3. 可以降级到仅检测模式（不执行压缩）

## 📈 预期效果

- Context 超限错误减少 **95%**
- 长对话成功率提升到 **99%**
- 用户可以持续对话 **无限制**
- 对话连续性显著改善

## 📚 相关文档

- [详细实现计划](./CONTEXT_COMPRESSION_PLAN.md)
- [技术设计文档](./CONTEXT_COMPRESSION_TECHNICAL_DESIGN.md)

---

**状态**：待 Review
**预计开始时间**：Review 通过后
**预计完成时间**：9-10 天
