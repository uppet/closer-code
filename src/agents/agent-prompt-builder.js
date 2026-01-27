/**
 * Agent 提示词构建器
 *
 * 负责构建 agent 专用的系统提示词和任务描述
 * - Agent 专用系统提示词
 * - 任务描述模板
 */

/**
 * Agent 系统提示词模板
 */
const AGENT_SYSTEM_PROMPT = `# 你是一个专门的搜索 Agent

## 你的角色

你是一个专门负责执行只读搜索任务的 AI Agent。你的目标是帮助主 AI 快速找到相关的文件和信息。

## 你的能力

你只能使用以下只读工具：
- **GlobTool** (searchFiles): 按文件名模式搜索文件
- **GrepTool** (searchCode): 在文件内容中搜索文本/正则表达式
- **LS** (listFiles): 列出目录内容
- **View** (readFile/readFileLines/readFileChunk): 读取文件内容

## 你的限制

**严格禁止**：
- ❌ 不能使用 Bash 工具（无法执行命令）
- ❌ 不能使用 Edit/Replace 工具（无法修改文件）
- ❌ 不能修改任何文件或系统状态

## 你的工作流程

1. **理解任务**: 仔细阅读主 AI 给你的搜索任务
2. **制定策略**: 选择最合适的搜索工具和策略
3. **执行搜索**: 使用只读工具进行搜索
4. **收集结果**: 整理所有找到的相关信息
5. **返回报告**: 返回结构化的搜索结果

## 你的输出格式

返回 JSON 格式的结果：

\`\`\`json
{
  "summary": "简要总结搜索结果",
  "findings": [
    {
      "type": "file|code|directory",
      "description": "发现的描述",
      "location": "文件路径或位置",
      "relevance": "high|medium|low",
      "details": "详细信息（可选）"
    }
  ],
  "files": ["找到的相关文件列表"],
  "suggestions": ["进一步探索的建议（可选）"]
}
\`\`\`

## 最佳实践

1. **从宽泛到具体**: 先用 GlobTool 找到候选文件，再用 GrepTool 精确搜索
2. **使用正则表达式**: GrepTool 支持正则，可以更精确地匹配
3. **读取关键文件**: 找到相关文件后，用 View 工具读取内容
4. **注意相关性**: 只返回与任务高度相关的结果
5. **简洁明了**: summary 要简短但信息丰富

## 示例

**任务**: "找到所有与日志相关的配置文件"

**你的执行**:
1. 使用 GlobTool 搜索: "**/*log*.{js,json,yaml,yml,conf}"
2. 使用 GrepTool 搜索: "logger|logging" 在配置文件中
3. 读取找到的文件内容
4. 返回结果

---

记住：你是一个**只读** Agent，专注于搜索和信息收集。不要尝试修改任何内容。`;

/**
 * Agent Prompt Builder 类
 */
export class AgentPromptBuilder {
  /**
   * 构建 agent 的系统提示词
   * @param {Object} options - 配置选项
   * @returns {string} 系统提示词
   */
  buildSystemPrompt(options = {}) {
    const {
      customInstructions = '',  // 自定义指令
      toolWhitelist = [],        // 工具白名单
      workingDir = process.cwd() // 工作目录
    } = options;

    let prompt = AGENT_SYSTEM_PROMPT;

    // 添加工作目录信息
    prompt += `\n\n## 当前工作目录\n\n当前工作目录: \`${workingDir}\`\n`;

    // 添加工具白名单信息
    if (toolWhitelist.length > 0) {
      prompt += `\n## 可用工具\n\n你当前可以使用以下工具：\n`;
      toolWhitelist.forEach(tool => {
        prompt += `- \`${tool}\`\n`;
      });
      prompt += `\n`;
    }

    // 添加自定义指令
    if (customInstructions) {
      prompt += `\n## 额外指令\n\n${customInstructions}\n`;
    }

    return prompt;
  }

  /**
   * 构建 agent 的用户任务描述
   * @param {string} task - 任务描述
   * @param {Object} context - 任务上下文
   * @returns {string} 格式化的任务描述
   */
  buildTaskPrompt(task, context = {}) {
    const {
      additionalInfo = '',    // 额外信息
      examples = [],          // 示例
      constraints = []        // 约束条件
    } = context;

    let prompt = `# 搜索任务\n\n${task}\n`;

    // 添加额外信息
    if (additionalInfo) {
      prompt += `\n## 额外信息\n\n${additionalInfo}\n`;
    }

    // 添加示例
    if (examples.length > 0) {
      prompt += `\n## 示例\n\n`;
      examples.forEach((example, index) => {
        prompt += `${index + 1}. ${example}\n`;
      });
    }

    // 添加约束条件
    if (constraints.length > 0) {
      prompt += `\n## 约束条件\n\n`;
      constraints.forEach(constraint => {
        prompt += `- ${constraint}\n`;
      });
    }

    prompt += `\n请执行搜索任务并返回结构化的 JSON 结果。`;

    return prompt;
  }

  /**
   * 构建完整的 agent 消息
   * @param {string} task - 任务描述
   * @param {Object} options - 配置选项
   * @returns {Object} { system: string, user: string }
   */
  buildAgentMessage(task, options = {}) {
    return {
      system: this.buildSystemPrompt(options),
      user: this.buildTaskPrompt(task, options.context || {})
    };
  }
}

/**
 * 创建 Agent Prompt Builder 的工厂函数
 * @returns {AgentPromptBuilder} Agent Prompt Builder 实例
 */
export function createAgentPromptBuilder() {
  return new AgentPromptBuilder();
}
