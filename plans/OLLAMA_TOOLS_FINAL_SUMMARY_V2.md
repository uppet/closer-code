# Ollama 工具调用修复 - 5句话总结

## 问题
conversation 模块无法触发 Ollama 工具调用，但直接调用 Ollama SDK 可以工作。

## 根因
`chatStream()` 方法没有传递 `tools` 参数给 Ollama，导致工具定义无法到达后端。

## 修复
3 个 commits 完整修复：工具响应格式、chat() 工具支持、chatStream() 工具支持。

## 效果
conversation 模块现在可以正常调用 Ollama 工具，支持多轮工具对话。

## 验证
✅ 编译通过、测试通过、已提交 git
