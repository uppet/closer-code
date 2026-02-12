/**
 * 对话导出工具
 *
 * 提供多种格式的对话导出功能
 */

import fs from 'fs';

/**
 * 检查消息是否有有效内容
 * @param {*} content - 消息内容
 * @returns {boolean}
 */
function hasValidContent(content) {
  // 空值检查
  if (content === null || content === undefined) {
    return false;
  }
  
  // 字符串检查
  if (typeof content === 'string') {
    return content.trim().length > 0;
  }
  
  // 数组检查 - 需要检查数组中是否有实际内容
  if (Array.isArray(content)) {
    if (content.length === 0) {
      return false;
    }
    
    // 检查是否有 text 类型的 block 且内容非空
    const hasTextBlock = content.some(block => 
      block.type === 'text' && block.text && block.text.trim().length > 0
    );
    
    // 检查是否有工具调用或结果
    const hasToolBlock = content.some(block => 
      block.type === 'tool_use' || block.type === 'tool_result'
    );
    
    // 检查是否有 thinking
    const hasThinkingBlock = content.some(block => 
      block.type === 'thinking' || block.type === 'redacted_thinking'
    );
    
    return hasTextBlock || hasToolBlock || hasThinkingBlock;
  }
  
  // 对象检查
  if (typeof content === 'object') {
    return Object.keys(content).length > 0;
  }
  
  return false;
}

/**
 * 导出为简洁 Markdown 格式
 * 只包含对话内容，适合阅读和分享
 *
 * @param {Object} conversation - Conversation 对象
 * @param {Array} toolExecutions - 工具执行记录（可选）
 * @param {Array} thinking - Thinking 记录（可选）
 * @returns {string} Markdown 内容
 */
export function exportToSimpleMarkdown(conversation, toolExecutions = [], thinking = []) {
  const exportData = conversation.export();
  const messages = exportData.messages || [];

  let markdown = '';

  // 标题
  markdown += '# Closer Code 对话记录\n\n';
  markdown += `**导出时间**: ${new Date().toLocaleString('zh-CN')}\n`;
  markdown += `**原始消息数**: ${messages.length}\n`;
  markdown += '\n---\n\n';

  // Thinking 过程（如果有的话）
  if (thinking.length > 0) {
    markdown += '## 🧠 AI 思考过程\n\n';
    thinking.forEach((thought, index) => {
      // 简化 thinking 显示，去掉时间戳等冗余信息
      const simplifiedThought = thought
        .replace(/\[.*?\]\s*/g, '')  // 去掉时间戳
        .replace(/^[🤔✅✍️⚡📊🔒❌📋]\s*/g, '')  // 去掉 emoji 前缀
        .trim();
      
      if (simplifiedThought) {
        markdown += `${index + 1}. ${simplifiedThought}\n\n`;
      }
    });
    markdown += '---\n\n';
  }

  // 对话内容 - 过滤掉空内容的消息
  const validMessages = messages.filter(msg => {
    // 只导出用户和助手的对话
    if (msg.role !== 'user' && msg.role !== 'assistant') {
      return false;
    }
    
    // 检查是否有有效内容
    return hasValidContent(msg.content);
  });

  markdown += `**有效消息数**: ${validMessages.length}\n`;
  markdown += '\n---\n\n';

  validMessages.forEach((msg, index) => {
    const roleLabel = msg.role === 'user' ? '👤 用户' : '🤖 助手';

    markdown += `## ${roleLabel}\n\n`;

    const content = msg.content;
    if (typeof content === 'string') {
      // 字符串内容，直接显示（与 FullscreenConversation 一致）
      markdown += `${content}\n\n`;
    } else if (Array.isArray(content)) {
      // 数组内容，先尝试提取 text block
      const textBlocks = content.filter(block => block.type === 'text');
      if (textBlocks.length > 0) {
        // 有 text block，显示文本内容
        markdown += textBlocks.map(block => block.text).join('\n') + '\n\n';
      } else {
        // 没有 text block，显示完整 JSON（与 FullscreenConversation 的 JSON.stringify 行为一致）
        markdown += `\`\`\`json\n${JSON.stringify(content, null, 2)}\n\`\`\`\n\n`;
      }
    } else {
      // 其他类型的内容，显示 JSON（与 FullscreenConversation 一致）
      markdown += `\`\`\`json\n${JSON.stringify(content, null, 2)}\n\`\`\`\n\n`;
    }

    markdown += '---\n\n';
  });

  return markdown;
}

/**
 * 导出为完整 Markdown 格式
 * 包含所有细节：thinking、工具调用、token 统计等
 *
 * @param {Object} conversation - Conversation 对象
 * @param {Array} toolExecutions - 工具执行记录
 * @param {Array} thinking - Thinking 记录（可选）
 * @param {Object} tokenStats - Token 统计（可选）
 * @returns {string} Markdown 内容
 */
export function exportToFullMarkdown(conversation, toolExecutions = [], thinking = [], tokenStats = null) {
  const exportData = conversation.export();
  const messages = exportData.messages || [];

  let markdown = '';

  // 标题和元数据
  markdown += '# Closer Code 完整对话记录\n\n';
  markdown += '## 📊 元数据\n\n';
  markdown += `- **导出时间**: ${new Date().toLocaleString('zh-CN')}\n`;
  markdown += `- **原始消息数**: ${messages.length}\n`;
  markdown += `- **工具调用**: ${toolExecutions.length} 次\n`;
  markdown += `- **Thinking 记录**: ${thinking.length} 条\n`;

  if (tokenStats) {
    markdown += `- **Token 使用**: ${tokenStats.total?.toLocaleString() || 0} / ${tokenStats.limit?.toLocaleString() || 4096}\n`;
    markdown += `  - 输入: ${tokenStats.input?.toLocaleString() || 0}\n`;
    markdown += `  - 输出: ${tokenStats.output?.toLocaleString() || 0}\n`;
  }

  markdown += '\n---\n\n';

  // Thinking 记录
  if (thinking.length > 0) {
    markdown += '## 🧠 AI Thinking 过程\n\n';
    thinking.forEach((thought, index) => {
      markdown += `### ${index + 1}. ${thought}\n\n`;
    });
    markdown += '\n---\n\n';
  }

  // 工具执行记录
  if (toolExecutions.length > 0) {
    markdown += '## 🔧 工具执行记录\n\n';

    toolExecutions.forEach((tool, index) => {
      const statusIcon = {
        'pending': '⏳',
        'running': '⚡',
        'success': '✅',
        'error': '❌'
      }[tool.status] || '•';

      markdown += `### ${index + 1}. ${statusIcon} ${tool.tool}\n\n`;
      markdown += `- **状态**: ${tool.status}\n`;
      markdown += `- **时间**: ${tool.timestamp}\n`;

      if (tool.duration) {
        markdown += `- **耗时**: ${tool.duration}ms\n`;
      }

      if (tool.input) {
        markdown += `- **输入**:\n\n\`\`\`json\n${JSON.stringify(tool.input, null, 2)}\n\`\`\`\n\n`;
      }

      if (tool.result) {
        markdown += `- **结果**:\n\n\`\`\`json\n${JSON.stringify(tool.result, null, 2)}\n\`\`\`\n\n`;
      }

      markdown += '---\n\n';
    });
  }

  // 对话内容 - 也过滤空消息
  markdown += '## 💬 对话内容\n\n';

  const validMessages = messages.filter(msg => hasValidContent(msg.content));

  validMessages.forEach((msg, index) => {
    const roleLabels = {
      'user': '👤 用户',
      'assistant': '🤖 助手',
      'system': 'ℹ️ 系统',
      'error': '❌ 错误'
    };

    const roleLabel = roleLabels[msg.role] || msg.role;

    markdown += `### ${index + 1}. ${roleLabel}\n\n`;

    const content = msg.content;
    if (typeof content === 'string') {
      // 如果是代码块，用 Markdown 格式包裹
      if (content.includes('```')) {
        markdown += `${content}\n\n`;
      } else {
        markdown += `${content}\n\n`;
      }
    } else if (Array.isArray(content)) {
      // 处理复杂内容
      content.forEach((block, i) => {
        if (block.type === 'text') {
          markdown += `${block.text}\n\n`;
        } else if (block.type === 'tool_use') {
          markdown += `**工具调用**: \`${block.name}\`\n\n`;
          markdown += '```json\n' + JSON.stringify(block.input, null, 2) + '\n```\n\n';
        } else if (block.type === 'tool_result') {
          markdown += `**工具结果**:\n\n`;
          markdown += '```\n' + block.content + '\n```\n\n';
        } else if (block.type === 'thinking' || block.type === 'redacted_thinking') {
          markdown += `*${block.type}: ${block.thinking?.substring(0, 100)}...*\n\n`;
        }
      });
    } else {
      markdown += `\`\`\`json\n${JSON.stringify(content, null, 2)}\n\`\`\`\n\n`;
    }

    markdown += '---\n\n';
  });

  // 页脚
  markdown += '\n*由 Closer Code 生成*\n';

  return markdown;
}

/**
 * 保存 Markdown 到文件
 *
 * @param {string} content - Markdown 内容
 * @param {string} filename - 文件名
 * @returns {Object} { success, path, error }
 */
export function saveMarkdown(content, filename) {
  try {
    // 确保文件名有 .md 扩展名
    let finalFilename = filename;
    if (!filename.endsWith('.md')) {
      finalFilename = filename + '.md';
    }

    // 写入文件
    fs.writeFileSync(finalFilename, content, 'utf-8');

    return {
      success: true,
      path: finalFilename
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
