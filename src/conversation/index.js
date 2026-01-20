/**
 * Conversation Module - 对话模块
 *
 * 重构后的对话管理模块，将原来的 1176 行代码拆分为多个职责单一的子模块：
 *
 * - core.js: 核心对话管理
 * - abort-fence.js: Abort 机制
 * - stream-handler.js: 流式处理
 * - mcp-integration.js: MCP 集成
 * - plan-manager.js: 计划管理
 * - tool-executor.js: 工具执行
 *
 * 优势：
 * - 代码更易维护
 * - 更容易测试
 * - 更好的可读性
 * - 更容易扩展新功能
 */

// 核心类和函数
export {
  Conversation,
  createConversation,
  MessageType,
  WORKFLOW_PROMPT_PREFIX
} from './core.js';

// 子模块（如果需要单独使用）
export { AbortFenceManager } from './abort-fence.js';
export { StreamHandler } from './stream-handler.js';
export { MCPIntegration } from './mcp-integration.js';
export { PlanManager } from './plan-manager.js';
export { ToolExecutor } from './tool-executor.js';
