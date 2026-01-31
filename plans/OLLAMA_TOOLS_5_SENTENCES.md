# Ollama 工具调用修复 - 5句话总结

1. **根本原因**：`_formatMessages()` 错误地跳过了所有包含 tool_calls 的消息
2. **错误假设**：以为 Ollama 不支持 tool_calls，但官方示例证明完全支持
3. **格式差异**：Anthropic 将 tool_calls 放在 content 数组，Ollama 使用单独字段
4. **关键修复**：保留 tool_calls 并转换为 Ollama 格式，tool_result 使用 role:'tool'
5. **验证通过**：4个commits 完成修复，编译成功，符合官方示例格式
