/**
 * 对话管理器 - 处理与 AI 的交互
 */

import { createAIClient, checkConfig } from './ai-client.js';
import { ToolExecutor, getToolDefinitions } from './tools.js';
import { TaskPlanner, ProblemDiagnoser } from './planner.js';
import { loadHistory, saveHistory, loadMemory } from './config.js';
import {
  initLogger,
  logConfig,
  logUserMessage,
  logAIRequest,
  logStreamStart,
  logStreamChunk,
  logStreamEnd,
  logToolCall,
  logAIError,
  logAIResponse,
  logSessionSummary
} from './logger.js';

// 消息类型
export const MessageType = {
  USER: 'user',
  ASSISTANT: 'assistant',
  TOOL: 'tool',
  SYSTEM: 'system',
  ERROR: 'error'
};

/**
 * 解析 AI 响应中的工具调用
 * 格式: >>>CALL:toolName\n{"param":"value"}\n<<<
 */
function parseToolCalls(text) {
  const toolCalls = [];
  const callPattern = />>>CALL:(\w+)\s*\n([\s\S]*?)<<</g;

  let match;
  while ((match = callPattern.exec(text)) !== null) {
    const toolName = match[1];
    const jsonStr = match[2].trim();

    try {
      const params = JSON.parse(jsonStr);
      toolCalls.push({
        name: toolName,
        input: params,
        fullMatch: match[0]
      });
    } catch (e) {
      console.error(`Failed to parse tool call JSON for ${toolName}:`, e);
    }
  }

  return toolCalls;
}

/**
 * 清理响应文本，移除工具调用标记
 */
function cleanToolCallMarkers(text) {
  if (!text || typeof text !== 'string') return text;

  // 移除所有工具调用标记（支持多行 JSON）
  // 格式: >>>CALL:toolName\n{...}\n<<<
  return text.replace(/>>>CALL:\w+\s*\n.*?<<</gs, '').trim();
}

/**
 * 对话会话
 */
export class Conversation {
  constructor(config) {
    this.config = config;
    this.messages = [];
    this.toolExecutor = new ToolExecutor(config);
    this.planner = new TaskPlanner(config);
    this.diagnoser = new ProblemDiagnoser(config);
    this.currentPlan = null;
    this.isProcessing = false;
  }

  /**
   * 初始化对话
   */
  async initialize() {
    // 初始化日志
    await initLogger();
    await logConfig(this.config);

    // 检查配置
    checkConfig(this.config);

    // 加载历史
    const history = loadHistory();
    this.messages = history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // 构建系统提示
    this.buildSystemPrompt();

    return this;
  }

  /**
   * 构建系统提示
   */
  buildSystemPrompt() {
    const memory = loadMemory();
    const projectKey = this.config.behavior.workingDir || 'default';
    const projectInfo = memory.projects?.[projectKey];

    this.systemPrompt = `You are Closer, an AI programming assistant designed to help developers with coding tasks, debugging, and project management.

## Tool Call Format (CRITICAL - MUST FOLLOW)

**When you need to call a tool, use this EXACT format:**

\`\`\`
>>>CALL:toolName
{"parameter":"value","parameter2":"value2"}
<<<
\`\`\`

**Examples:**

Call bash tool:
\`\`\`
>>>CALL:bash
{"command":"ls -la"}
<<<
\`\`\`

Call readFile tool:
\`\`\`
>>>CALL:readFile
{"filePath":"src/tools.js"}
<<<
\`\`\`

Call writeFile tool:
\`\`\`
>>>CALL:writeFile
{"filePath":"test.txt","content":"Hello World"}
<<<
\`\`\`

**IMPORTANT RULES:**
1. Start each tool call with \`>>>CALL:toolName\` on its own line
2. Put all parameters as JSON on the next line
3. End with \`<<<\` on its own line
4. DO NOT use XML tags like <readFile> or </invoke>
5. DO NOT mix tool calls with your text response

This format prevents parsing errors when filenames contain special characters like \`<\`, \`>\`, \`/\`, etc.

## Tool Use Requirements (CRITICAL)

**YOU MUST USE TOOLS TO EXECUTE ACTIONS.** This is not optional.

- When user asks you to "show", "list", "check", "see", "view" directory contents → **MUST** call bash tool with "ls" or "dir" command
- When user asks about files → **MUST** call readFile, searchFiles, or searchCode tools
- When user asks to run commands/tests → **MUST** call bash tool
- When user asks to make changes → **MUST** call writeFile or editFile tools

**DO NOT** just say "I'll check", "Let me see", "I'll look into it" - **IMMEDIATELY CALL THE APPROPRIATE TOOL**.

Examples of CORRECT behavior:
- User: "What's in this directory?" → You: Immediately call bash tool using the format above
- User: "Show me the config" → You: Immediately call readFile tool using the format above
- User: "Run the tests" → You: Immediately call bash tool using the format above

## Multi-Step Task Execution Guide

When users request complex tasks that require multiple tool calls, you MUST complete ALL steps before providing a summary.

### Task: "Read the entire project" / "Analyze the whole project" / "Read all the code"

**Required Steps (Do ALL of them):**
1. List the src/ directory to see all source files
2. Read README.md, package.json, and config files to understand the project
3. **Read ALL source code files** (.js, .jsx, .ts, .tsx) in src/ directory
4. Analyze the code architecture, module relationships, and data flow
5. Identify performance bottlenecks, security issues, or design problems
6. Provide a comprehensive summary including:
   - Project purpose and functionality
   - Technical architecture
   - Code quality assessment
   - Performance concerns
   - Design issues or improvements

**Completion Criteria:**
- ✅ All source files have been read (not just 1-2 files)
- ✅ Architecture has been analyzed
- ✅ Specific issues have been identified
- ❌ DO NOT stop after reading only README or only 1-2 source files

### Task: "Search for X in the codebase"

**Required Steps:**
1. Use searchFiles to find relevant files
2. Use searchCode to search within file contents
3. Read the matching files to understand context
4. Provide specific findings with file names and line numbers

### Task: "Fix the bug" / "Debug this"

**Required Steps:**
1. Analyze error messages or stack traces
2. Search for related code
3. Read the relevant files
4. Identify the root cause
5. Propose a specific fix
6. If user approves, implement the fix using editFile or writeFile

## Your Capabilities

You have access to tools that allow you to:
- **bash**: Execute bash commands (ls, cat, grep, npm, git, etc.)
- **readFile**: Read file contents
- **writeFile**: Create or modify files
- **editFile**: Replace text in files
- **searchFiles**: Find files by pattern
- **searchCode**: Search within file contents

## Tool Usage Strategy

### When to Use Multiple Tools
- **Sequential**: Some tasks require tool A's output to inform tool B
- **Parallel**: When independent, multiple tools can be called together
- **Iterative**: Continue using tools until the task is COMPLETE

### Completion Standards
- A task is ONLY complete when you have:
  1. Gathered ALL necessary information
  2. Analyzed the data thoroughly
  3. Provided actionable insights or results
  4. Answered the user's specific question

**Stop saying "Let me check" and START calling tools immediately.**

## Your Approach

1. **ALWAYS Use Tools**: When user requests an action, IMMEDIATELY call the appropriate tool
2. **Explain Briefly**: Give a 1-2 sentence explanation before calling the tool
3. **Be Thorough**: For multi-step tasks, complete ALL steps before summarizing
4. **Verify Results**: Check tool outputs and confirm success
5. **Iterate**: Continue using tools until the task is COMPLETE
6. **Learn Patterns**: Adapt to the project's existing style

## Current Context

Working Directory: ${this.config.behavior.workingDir}
Available Tools: ${this.config.tools.enabled.join(', ')}

${projectInfo ? `
## Project Patterns

This is a familiar project. Remember these patterns:
${JSON.stringify(projectInfo.patterns, null, 2)}
` : ''}

## Behavior Configuration

- Auto Plan: ${this.config.behavior.autoPlan ? 'Enabled' : 'Disabled'}
- Auto Execute: ${this.config.behavior.autoExecute ? 'Enabled (low-risk operations only)' : 'Disabled'}
- Confirm Destructive: ${this.config.behavior.confirmDestructive ? 'Enabled' : 'Disabled'}

**Remember: Use tools proactively. Complete ALL steps of multi-step tasks before reporting results.**`;
  }

  /**
   * 发送消息并获取响应
   */
  async sendMessage(userMessage, onProgress = null) {
    if (this.isProcessing) {
      throw new Error('Already processing a message');
    }

    this.isProcessing = true;

    try {
      // 记录用户消息
      await logUserMessage(userMessage);

      // 添加用户消息
      this.messages.push({
        role: MessageType.USER,
        content: userMessage
      });

      // 获取 AI 客户端
      const aiClient = createAIClient(this.config);
      const tools = getToolDefinitions(this.config.tools.enabled);

      const requestOptions = {
        system: this.systemPrompt,
        tools: tools,
        temperature: 0.7
      };

      // 记录 AI 请求
      await logAIRequest(this.messages, requestOptions);

      // 流式响应处理
      let fullResponse = '';
      let toolCalls = [];

      await logStreamStart();

      await aiClient.chatStream(
        this.messages,
        requestOptions,
        (chunk) => {
          // 记录流式响应块
          logStreamChunk(chunk);

          // 处理流式响应块
          if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
            const text = chunk.delta.text;
            fullResponse += text;

            // 实时清理工具调用标记，只显示纯文本给用户
            if (onProgress) {
              // 注意：流式输出时无法完整清理（可能只收到部分标记）
              // 所以这里只做简单的部分清理，完整清理在响应结束后进行
              const cleanedToken = text
                .replace(/>>>CALL:\w+\s*\n$/g, '')  // 移除开始标记
                .replace(/^<<</g, '');                 // 移除结束标记（单独一行）
              onProgress({
                type: 'token',
                content: cleanedToken
              });
            }
          } else if (chunk.type === 'content_block_start' && chunk.content_block?.type === 'tool_use') {
            // 工具调用开始 - 收集工具信息
            const toolUse = chunk.content_block;
            toolCalls.push({
              id: toolUse.id,
              name: toolUse.name,
              input: null // 稍后在 content_block_delta 中填充
            });
          } else if (chunk.type === 'content_block_delta' && chunk.delta?.partial_json) {
            // 工具输入参数通过 partial_json 传递
            const lastTool = toolCalls[toolCalls.length - 1];
            if (lastTool) {
              if (!lastTool.input) {
                lastTool.input = '';
              }
              lastTool.input += chunk.delta.partial_json;
            }
          }
        }
      );

      // 记录流式响应结束
      await logStreamEnd(fullResponse, toolCalls);

      // 解析工具调用的 JSON 输入
      for (const toolCall of toolCalls) {
        if (typeof toolCall.input === 'string') {
          try {
            toolCall.input = JSON.parse(toolCall.input);
          } catch (e) {
            console.error('Failed to parse tool input:', e);
          }
        }
      }

      // 额外解析文本中的工具调用标记（格式: >>>CALL:toolName\nJSON\n<<<）
      const textToolCalls = parseToolCalls(fullResponse);

      // 合并 API 工具调用和文本工具调用
      if (textToolCalls.length > 0) {
        console.log(`Found ${textToolCalls.length} tool calls in text response`);
        toolCalls = [...toolCalls, ...textToolCalls];
      }

      // 清理响应文本，移除工具调用标记
      const cleanedResponse = cleanToolCallMarkers(fullResponse);

      // 如果有工具调用，执行它们
      if (toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          if (onProgress) {
            onProgress({
              type: 'tool_start',
              tool: toolCall.name,
              input: toolCall.input
            });
          }

          const result = await this.toolExecutor.execute(toolCall.name, toolCall.input);

          // 记录工具调用
          await logToolCall(toolCall.name, toolCall.input, result);

          // 添加工具结果到消息历史
          this.messages.push({
            role: MessageType.ASSISTANT,
            content: cleanedResponse,
            toolCalls: toolCalls
          });

          this.messages.push({
            role: MessageType.TOOL,
            toolUseId: toolCall.id,
            content: JSON.stringify(result)
          });

          if (onProgress) {
            onProgress({
              type: 'tool_complete',
              tool: toolCall.name,
              result
            });
          }
        }

        // 记录第二次 AI 请求
        await logAIRequest(this.messages, { system: this.systemPrompt });

        // 获取 AI 对工具结果的响应
        const followUp = await aiClient.chat(this.messages, {
          system: this.systemPrompt
        });

        // 记录 AI 响应
        await logAIResponse(followUp);

        const followUpText = followUp.content.find(c => c.type === 'text')?.text || '';

        this.messages.push({
          role: MessageType.ASSISTANT,
          content: followUpText
        });

        // 保存历史
        saveHistory(this.messages);

        return {
          content: cleanedResponse + '\n\n' + followUpText,
          toolCalls: toolCalls.map(t => t.name),
          followUp: followUpText
        };
      }

      // 保存助手响应
      this.messages.push({
        role: MessageType.ASSISTANT,
        content: cleanedResponse
      });

      // 保存历史
      saveHistory(this.messages);

      return {
        content: cleanedResponse,
        toolCalls: []
      };

    } catch (error) {
      await logAIError(error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 规划并执行任务
   */
  async planAndExecute(task, onProgress = null) {
    if (onProgress) {
      onProgress({ type: 'planning_start', task });
    }

    // 创建计划
    const plan = await this.planner.planTask(task, {
      workingDir: this.config.behavior.workingDir
    });

    if (onProgress) {
      onProgress({ type: 'plan_created', plan });
    }

    this.currentPlan = plan;

    // 执行计划
    const result = await this.planner.executePlan(plan, (event) => {
      if (onProgress) {
        onProgress({ type: 'execution_progress', event });
      }
    });

    return result;
  }

  /**
   * 诊断错误
   */
  async diagnoseError(error, context = {}) {
    const diagnosis = await this.diagnoser.diagnose(error, context);

    // 添加到对话
    this.messages.push({
      role: MessageType.SYSTEM,
      content: `Error Diagnosis:\n${diagnosis}`
    });

    return diagnosis;
  }

  /**
   * 学习项目模式
   */
  async learnProject() {
    const patterns = await this.planner.learnFromProject();

    if (patterns) {
      this.messages.push({
        role: MessageType.SYSTEM,
        content: `Learned project patterns:\n${JSON.stringify(patterns, null, 2)}`
      });
    }

    return patterns;
  }

  /**
   * 清除对话历史
   */
  clearHistory() {
    this.messages = [];
    saveHistory([]);
  }

  /**
   * 获取对话摘要
   */
  getSummary() {
    return {
      messageCount: this.messages.length,
      hasPlan: !!this.currentPlan,
      planStatus: this.currentPlan?.status,
      lastMessage: this.messages[this.messages.length - 1]
    };
  }

  /**
   * 导出对话
   */
  export() {
    return {
      messages: this.messages,
      plan: this.currentPlan,
      summary: this.getSummary()
    };
  }

  /**
   * 导入对话
   */
  import(data) {
    this.messages = data.messages || [];
    this.currentPlan = data.plan || null;
    saveHistory(this.messages);
  }
}

/**
 * 创建对话会话
 */
export async function createConversation(config) {
  const conversation = new Conversation(config);
  await conversation.initialize();
  return conversation;
}
