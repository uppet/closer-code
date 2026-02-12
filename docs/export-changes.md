# 导出功能变更

1. **空消息过滤**：添加 `hasValidContent()` 检查消息有效性
2. **显示 thinking**：普通导出包含 AI 思考过程（简化格式）
3. **与 UI 对齐**：数组 content 处理逻辑与 FullscreenConversation 一致
4. **修复遗漏**：无工具调用时助手响应未添加到 messages

效果：导出内容完整、连贯，与 UI 显示一致
