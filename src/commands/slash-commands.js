/**
 * 斜杠命令处理模块
 * 提供跨交互式和批处理模式的命令实现
 */

import { getConfig, getConfigPaths } from '../config.js';
import { createShortcutManager } from '../shortcuts.js';
import path from 'path';
import os from 'os';

/**
 * 命令执行结果
 * @typedef {Object} CommandResult
 * @property {boolean} success - 是否成功
 * @property {string} content - 命令输出内容
 * @property {string} [error] - 错误信息（如果失败）
 */

/**
 * /keys 命令 - 显示键盘快捷键参考
 * @param {Object} options - 命令选项
 * @param {boolean} options.markdown - 是否使用 Markdown 格式（默认 true）
 * @returns {CommandResult}
 */
export function keysCommand(options = {}) {
  const { markdown = true } = options;

  const content = markdown ? `
快捷键参考：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖥️  模式切换
  Ctrl+G    切换全屏模式
  Ctrl+T    切换工具详情/工具显示
  Tab       开关 Thinking 显示

📝 输入控制
  Enter     发送消息
  Ctrl+Enter 多行模式下换行
  Ctrl+O    切换多行输入模式

🔄 滚动控制
  Alt+↑/↓   精确滚动一行
  PageUp/Down 快速滚动
  Shift+↑/↓ 滚动 Thinking 或切换工具

⚡ 任务控制
  Ctrl+C    单击中止任务 / 双击退出
  Ctrl+Z    挂起程序（Linux/Mac）

❓ 帮助
  /help     显示所有命令
  /keys     显示本快捷键参考
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : `
Keyboard Shortcuts Reference:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mode Switching:
  Ctrl+G    Toggle fullscreen mode
  Ctrl+T    Toggle tool detail view
  Tab       Toggle Thinking display

Input Control:
  Enter     Send message
  Ctrl+Enter New line in multiline mode
  Ctrl+O    Toggle multiline input mode

Scroll Control:
  Alt+↑/↓   Precise scroll by line
  PageUp/Down Quick scroll
  Shift+↑/↓ Scroll Thinking or switch tools

Task Control:
  Ctrl+C    Abort task (single) / Exit (double)
  Ctrl+Z    Suspend program (Linux/Mac)

Help:
  /help     Show all commands
  /keys     Show this reference
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  return {
    success: true,
    content: content.trim()
  };
}

/**
 * /config 命令 - 显示当前配置
 * @param {Object} options - 命令选项
 * @param {boolean} options.markdown - 是否使用 Markdown 格式（默认 true）
 * @returns {CommandResult}
 */
export function configCommand(options = {}) {
  const { markdown = true } = options;

  try {
    const configPaths = getConfigPaths();
    const currentConfig = getConfig();

    // 格式化配置信息
    const providerNames = {
      anthropic: 'Anthropic Claude',
      openai: 'OpenAI GPT',
      deepseek: 'DeepSeek',
      ollama: 'Ollama (本地)'
    };

    const provider = currentConfig.ai?.provider || 'anthropic';
    const providerConfig = currentConfig.ai?.[provider] || {};

    let content;

    if (markdown) {
      content = `
当前配置
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 AI 配置
  提供商: ${providerNames[provider] || provider}
  模型: ${providerConfig.model || '默认'}
  Token 限制: ${providerConfig.maxTokens || 4096}
  API Key: ${providerConfig.apiKey ? '已设置' : '未设置'}

📁 行为配置
  工作目录: ${currentConfig.behavior?.workingDir || process.cwd()}
  自动计划: ${currentConfig.behavior?.autoPlan ? '开启' : '关闭'}
  自动执行: ${currentConfig.behavior?.autoExecute ? '开启' : '关闭'}
  最大重试: ${currentConfig.behavior?.maxRetries || 3}
  超时时间: ${currentConfig.behavior?.timeout || 30000}ms

🔧 工具配置
  启用工具: ${currentConfig.tools?.enabled?.length || 0} 个

🖥️ UI 配置
  主题: ${currentConfig.ui?.theme || 'default'}
  显示行号: ${currentConfig.ui?.showLineNumbers ? '开启' : '关闭'}
  最大输出行: ${currentConfig.ui?.maxOutputLines || 100}

📁 配置文件
  全局配置: ${configPaths.global}
  项目配置: ${configPaths.project || '未找到'}
  当前使用: ${configPaths.active}

🔧 操作提示
  • 使用 \`cloco config\` 命令管理配置
  • 使用 \`cloco setup\` 重新运行配置向导
  • 使用环境变量存储敏感信息更安全
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    } else {
      // 纯文本格式
      content = `
Current Configuration:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI Configuration:
  Provider: ${providerNames[provider] || provider}
  Model: ${providerConfig.model || 'Default'}
  Max Tokens: ${providerConfig.maxTokens || 4096}
  API Key: ${providerConfig.apiKey ? 'Set' : 'Not set'}

Behavior Configuration:
  Working Directory: ${currentConfig.behavior?.workingDir || process.cwd()}
  Auto Plan: ${currentConfig.behavior?.autoPlan ? 'Enabled' : 'Disabled'}
  Auto Execute: ${currentConfig.behavior?.autoExecute ? 'Enabled' : 'Disabled'}
  Max Retries: ${currentConfig.behavior?.maxRetries || 3}
  Timeout: ${currentConfig.behavior?.timeout || 30000}ms

Tools Configuration:
  Enabled Tools: ${currentConfig.tools?.enabled?.length || 0}

UI Configuration:
  Theme: ${currentConfig.ui?.theme || 'default'}
  Show Line Numbers: ${currentConfig.ui?.showLineNumbers ? 'Enabled' : 'Disabled'}
  Max Output Lines: ${currentConfig.ui?.maxOutputLines || 100}

Configuration Files:
  Global Config: ${configPaths.global}
  Project Config: ${configPaths.project || 'Not found'}
  Active Config: ${configPaths.active}

Tips:
  • Use \`cloco config\` command to manage configuration
  • Use \`cloco setup\` to re-run configuration wizard
  • Using environment variables for sensitive info is more secure
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    }

    return {
      success: true,
      content: content.trim()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      content: `Error: ${error.message}`
    };
  }
}

/**
 * /skills 命令 - 显示技能系统状态
 * @param {Object} options - 命令选项
 * @param {boolean} options.markdown - 是否使用 Markdown 格式（默认 true）
 * @param {Object} options.conversation - Conversation 实例（可选）
 * @returns {CommandResult}
 */
export async function skillsCommand(options = {}) {
  const { markdown = true, conversation = null } = options;

  try {
    const config = getConfig();
    const skillsEnabled = config.skills?.enabled ?? false;

    let content = '';

    if (markdown) {
      content = `
🎯 技能系统状态
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 系统状态
  技能系统: ${skillsEnabled ? '✅ 已启用' : '❌ 未启用'}
  
  📁 技能目录
    全局: ${path.join(os.homedir(), '.closer-code', 'skills')}
    项目: ${path.join(process.cwd(), '.closer-code', 'skills')}
  
  🔄 常驻技能: ${config.skills?.resident?.length || 0} 个
    ${config.skills?.resident?.map(s => `    • ${s}`).join('\n') || '    无'}
`;

      if (skillsEnabled && conversation) {
        // 从 conversation 实例获取详细信息
        const { skillRegistry, conversationState } = conversation;
        
        if (skillRegistry) {
          const stats = skillRegistry.getStats();
          const discovered = await skillRegistry.discover();
          
          content += `
📈 注册表统计
  初始化状态: ${stats.initialized ? '✅ 已初始化' : '❌ 未初始化'}
  缓存技能数: ${stats.cachedSkills}
  发现缓存数: ${stats.discoveryCacheSize}
  
  🔍 可用技能: ${discovered.length} 个
${discovered.map(s => `    • ${s.name}`).join('\n') || '    无'}
`;
        }
        
        if (conversationState) {
          const activeSkills = conversationState.getActiveSkills();
          
          content += `
✅ 已激活技能: ${activeSkills.length} 个
${activeSkills.map(s => `    • ${s.name}`).join('\n') || '    无'}
`;
        }
      } else if (skillsEnabled) {
        content += `
💡 提示
  运行此命令时未提供 conversation 实例
  部分信息可能不可用
`;
      }

      content += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 使用提示
  • 使用 /plan 可以触发技能加载
  • 技能文件格式: skill-name/skill.md
  • 支持 Markdown 和 YAML front-matter
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    } else {
      // 纯文本格式
      content = `
Skills System Status:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

System Status:
  Skills System: ${skillsEnabled ? 'Enabled' : 'Disabled'}
  
  Skill Directories:
    Global: ${path.join(os.homedir(), '.closer-code', 'skills')}
    Project: ${path.join(process.cwd(), '.closer-code', 'skills')}
  
  Resident Skills: ${config.skills?.resident?.length || 0}
${config.skills?.resident?.map(s => `    • ${s}`).join('\n') || '    None'}
`;

      if (skillsEnabled && conversation) {
        const { skillRegistry, conversationState } = conversation;
        
        if (skillRegistry) {
          const stats = skillRegistry.getStats();
          const discovered = await skillRegistry.discover();
          
          content += `
Registry Statistics:
  Initialized: ${stats.initialized ? 'Yes' : 'No'}
  Cached Skills: ${stats.cachedSkills}
  Discovery Cache: ${stats.discoveryCacheSize}
  
  Available Skills: ${discovered.length}
${discovered.map(s => `    • ${s.name}`).join('\n') || '    None'}
`;
        }
        
        if (conversationState) {
          const activeSkills = conversationState.getActiveSkills();
          
          content += `
Active Skills: ${activeSkills.length}
${activeSkills.map(s => `    • ${s.name}`).join('\n') || '    None'}
`;
        }
      }

      content += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tips:
  • Use /plan to trigger skill loading
  • Skill file format: skill-name/skill.md
  • Supports Markdown and YAML front-matter
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    }

    return {
      success: true,
      content: content.trim()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      content: `Error: ${error.message}`
    };
  }
}

/**
 * /help 命令 - 显示帮助信息
 * @param {Object} options - 命令选项
 * @param {boolean} options.markdown - 是否使用 Markdown 格式（默认 true）
 * @returns {CommandResult}
 */
export function helpCommand(options = {}) {
  const { markdown = true } = options;

  const content = markdown ? `
可用命令：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 对话命令
  /plan <task>   创建并执行任务计划
  /learn         学习项目模式
  /status        显示对话摘要
  /history       显示输入历史统计

ℹ️  信息命令
  /keys          显示键盘快捷键参考
  /config        显示当前配置
  /skills        显示技能系统状态
  /help          显示本帮助信息

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
提示：
  • 使用 Tab 键自动补全命令
  • 使用 Ctrl+C 中止当前任务
  • 更多快捷键请使用 /keys 查看
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : `
Available Commands:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Conversation Commands:
  /plan <task>   Create and execute task plan
  /learn         Learn project patterns
  /status        Show conversation summary
  /history       Show input history statistics

Information Commands:
  /keys          Show keyboard shortcuts reference
  /config        Show current configuration
  /skills        Show skills system status
  /help          Show this help message

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tips:
  • Use Tab key for command autocomplete
  • Use Ctrl+C to abort current task
  • Use /keys to see more shortcuts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  return {
    success: true,
    content: content.trim()
  };
}

/**
 * 命令注册表
 */
export const COMMAND_REGISTRY = {
  '/keys': {
    handler: keysCommand,
    description: '显示键盘快捷键参考',
    descriptionEn: 'Show keyboard shortcuts reference'
  },
  '/config': {
    handler: configCommand,
    description: '显示当前配置',
    descriptionEn: 'Show current configuration'
  },
  '/skills': {
    handler: skillsCommand,
    description: '显示技能系统状态',
    descriptionEn: 'Show skills system status'
  },
  '/help': {
    handler: helpCommand,
    description: '显示帮助信息',
    descriptionEn: 'Show help information'
  }
};

/**
 * 检测输入是否为斜杠命令
 * @param {string} input - 用户输入
 * @returns {boolean}
 */
export function isSlashCommand(input) {
  return input.trim().startsWith('/');
}

/**
 * 解析斜杠命令
 * @param {string} input - 用户输入
 * @returns {Object} - { command: string, args: string[] }
 */
export function parseSlashCommand(input) {
  const trimmed = input.trim();
  const parts = trimmed.split(/\s+/);
  const command = parts[0];
  const args = parts.slice(1);

  return { command, args };
}

/**
 * 执行斜杠命令
 * @param {string} input - 用户输入
 * @param {Object} options - 命令选项
 * @returns {Promise<CommandResult|null>} - 如果不是斜杠命令返回 null
 */
export async function executeSlashCommand(input, options = {}) {
  if (!isSlashCommand(input)) {
    return null;
  }

  const { command } = parseSlashCommand(input);
  const commandInfo = COMMAND_REGISTRY[command];

  if (!commandInfo) {
    return {
      success: false,
      error: `未知命令: ${command}`,
      content: `未知命令: ${command}\n使用 /help 查看可用命令。`
    };
  }

  try {
    const result = commandInfo.handler(options);
    
    // 如果返回的是 Promise，等待它
    if (result && typeof result.then === 'function') {
      return await result;
    }
    
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message,
      content: `命令执行失败: ${error.message}`
    };
  }
}

/**
 * 获取所有可用命令列表
 * @param {boolean} chinese - 是否使用中文描述（默认 true）
 * @returns {Array}
 */
export function getAvailableCommands(chinese = true) {
  return Object.entries(COMMAND_REGISTRY).map(([cmd, info]) => ({
    command: cmd,
    description: chinese ? info.description : info.descriptionEn
  }));
}
