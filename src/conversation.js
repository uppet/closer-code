/**
 * 对话管理器（重构版 - 模块化）
 *
 * 此文件现在只是一个兼容层，重新导出模块化的 conversation 模块。
 *
 * 原来的 1176 行代码已被拆分为以下模块：
 * - src/conversation/core.js - 核心对话管理
 * - src/conversation/abort-fence.js - Abort 机制
 * - src/conversation/stream-handler.js - 流式处理
 * - src/conversation/mcp-integration.js - MCP 集成
 * - src/conversation/plan-manager.js - 计划管理
 * - src/conversation/tool-executor.js - 工具执行
 *
 * 重构收益：
 * ✅ 代码更易维护
 * ✅ 更容易测试
 * ✅ 更好的可读性
 * ✅ 更容易扩展新功能
 */

// 重新导出所有内容
export {
  Conversation,
  createConversation,
  MessageType,
  WORKFLOW_PROMPT_PREFIX
} from './conversation/index.js';
