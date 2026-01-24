#!/usr/bin/env node
/**
 * Closer Code 增强版设置脚本
 * 提供更友好的交互式配置向导
 */

import { existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { createInterface } from 'readline';

const CONFIG_DIR = join(homedir(), '.closer-code');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

function clearLine() {
  process.stdout.write('\r\x1b[K');
}

/**
 * 显示欢迎消息
 */
function showWelcome() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                     🚀 Closer Code 配置向导                                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('欢迎使用 Closer Code！这是一个 AI 编程助手，可以帮助你：');
  console.log('• 编写和编辑代码');
  console.log('• 调试和修复错误');
  console.log('• 规划和执行复杂任务');
  console.log('• 搜索和分析代码库');
  console.log('');
}

/**
 * 显示进度指示器
 */
function showProgress(step, total, message) {
  const percentage = Math.round((step / total) * 100);
  const barWidth = 30;
  const filled = Math.round((percentage / 100) * barWidth);
  const empty = barWidth - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  
  clearLine();
  process.stdout.write(`[${bar}] ${percentage}% - ${message}`);
  if (step === total) {
    console.log('');
  }
}

/**
 * 选择配置模式
 */
async function selectMode() {
  console.log('请选择配置模式：');
  console.log('');
  console.log('  [1] 快速配置（推荐）');
  console.log('      • 使用默认选项');
  console.log('      • 最少输入');
  console.log('      • 适合新手');
  console.log('');
  console.log('  [2] 高级配置');
  console.log('      • 自定义所有选项');
  console.log('      • 更多控制权');
  console.log('      • 适合高级用户');
  console.log('');
  
  while (true) {
    const choice = await question('请选择 (1-2): ');
    if (choice === '1') return 'quick';
    if (choice === '2') return 'advanced';
    console.log('无效选择，请重新输入');
  }
}

/**
 * 选择 AI 提供商
 */
async function selectProvider() {
  console.log('');
  console.log('选择 AI 提供商：');
  console.log('');
  console.log('  [1] Anthropic Claude');
  console.log('      • 强大的推理能力');
  console.log('      • 适合编程任务');
  console.log('      • 需要 API Key');
  console.log('');
  console.log('  [2] OpenAI GPT');
  console.log('      • 广泛的应用支持');
  console.log('      • 多种模型选择');
  console.log('      • 需要 API Key');
  console.log('');
  console.log('  [3] DeepSeek');
  console.log('      • 优秀的代码能力');
  console.log('      • 性价比高');
  console.log('      • 需要 API Key');
  console.log('');
  console.log('  [4] 本地模型 (Ollama)');
  console.log('      • 完全本地运行');
  console.log('      • 无需 API Key');
  console.log('      • 需要安装 Ollama');
  console.log('');
  
  while (true) {
    const choice = await question('请选择 (1-4): ');
    switch (choice) {
      case '1': return 'anthropic';
      case '2': return 'openai';
      case '3': return 'deepseek';
      case '4': return 'ollama';
      default: console.log('无效选择，请重新输入');
    }
  }
}

/**
 * 获取 API Key 信息
 */
function getApiKeyInfo(provider) {
  const info = {
    anthropic: {
      name: 'Anthropic Claude',
      url: 'https://console.anthropic.com/',
      example: 'sk-ant-...',
      note: '需要注册 Anthropic 账户'
    },
    openai: {
      name: 'OpenAI',
      url: 'https://platform.openai.com/api-keys',
      example: 'sk-...',
      note: '需要注册 OpenAI 账户'
    },
    deepseek: {
      name: 'DeepSeek',
      url: 'https://platform.deepseek.com/api_keys',
      example: 'sk-...',
      note: '需要注册 DeepSeek 账户'
    },
    ollama: {
      name: 'Ollama',
      url: 'https://ollama.com/',
      example: '无需 API Key',
      note: '需要安装并运行 Ollama 服务'
    }
  };
  
  return info[provider] || info.anthropic;
}

/**
 * 输入 API Key
 */
async function inputApiKey(provider) {
  if (provider === 'ollama') {
    console.log('');
    console.log('✅ Ollama 无需 API Key');
    console.log('请确保 Ollama 服务运行在 http://localhost:11434');
    return '';
  }
  
  const info = getApiKeyInfo(provider);
  
  console.log('');
  console.log(`获取 ${info.name} API Key:`);
  console.log(`1. 访问: ${info.url}`);
  console.log(`2. 创建新的 API Key`);
  console.log(`3. 复制 Key 到此处`);
  console.log('');
  console.log(`示例格式: ${info.example}`);
  console.log(`注意: ${info.note}`);
  console.log('');
  
  const apiKey = await question(`请输入 ${info.name} API Key: `);
  
  // 简单的格式验证
  if (provider === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
    console.log('⚠️  API Key 格式可能不正确，请检查');
  } else if ((provider === 'openai' || provider === 'deepseek') && !apiKey.startsWith('sk-')) {
    console.log('⚠️  API Key 格式可能不正确，请检查');
  }
  
  return apiKey.trim();
}

/**
 * 选择模型
 */
async function selectModel(provider) {
  const models = {
    anthropic: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: '推荐，平衡性能和成本' },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: '最强能力，成本较高' },
      { id: 'claude-haiku-4-20250514', name: 'Claude Haiku 4', description: '快速响应，成本较低' }
    ],
    openai: [
      { id: 'gpt-4o', name: 'GPT-4o', description: '最新模型，推荐使用' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: '强大能力，性价比高' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: '快速响应，成本低' }
    ],
    deepseek: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', description: '推荐，优秀的代码能力' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', description: '专门优化代码生成' }
    ],
    ollama: [
      { id: 'llama3.1', name: 'Llama 3.1', description: '推荐，平衡性能和大小' },
      { id: 'codellama', name: 'CodeLlama', description: '专门优化代码生成' },
      { id: 'mistral', name: 'Mistral', description: '快速响应，质量好' }
    ]
  };
  
  const providerModels = models[provider] || models.anthropic;
  
  console.log('');
  console.log(`选择 ${provider} 模型:`);
  console.log('');
  
  providerModels.forEach((model, index) => {
    console.log(`  [${index + 1}] ${model.name}`);
    console.log(`      ${model.description}`);
    console.log('');
  });
  
  while (true) {
    const choice = await question(`请选择 (1-${providerModels.length}): `);
    const index = parseInt(choice) - 1;
    if (index >= 0 && index < providerModels.length) {
      return providerModels[index].id;
    }
    console.log('无效选择，请重新输入');
  }
}

/**
 * 设置工作目录
 */
async function setWorkingDir() {
  const currentDir = process.cwd();
  
  console.log('');
  console.log('设置工作目录:');
  console.log(`当前目录: ${currentDir}`);
  console.log('');
  console.log('工作目录是 Closer Code 操作文件的默认位置。');
  console.log('你可以使用当前目录，或输入其他路径。');
  console.log('');
  
  const useCurrent = await question(`使用当前目录? [Y/n]: `);
  
  if (useCurrent.toLowerCase() === 'n') {
    const customDir = await question('请输入工作目录路径: ');
    return customDir.trim();
  }
  
  return currentDir;
}

/**
 * 显示配置摘要
 */
function showConfigSummary(config) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                     📋 配置摘要                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const providerNames = {
    anthropic: 'Anthropic Claude',
    openai: 'OpenAI GPT',
    deepseek: 'DeepSeek',
    ollama: 'Ollama (本地)'
  };
  
  console.log('🤖 AI 配置');
  console.log(`  提供商: ${providerNames[config.ai.provider] || config.ai.provider}`);
  console.log(`  模型: ${config.ai[config.ai.provider]?.model || '默认'}`);
  console.log(`  Token 限制: ${config.ai[config.ai.provider]?.maxTokens || 4096}`);
  console.log('');
  
  console.log('📁 行为配置');
  console.log(`  工作目录: ${config.behavior.workingDir}`);
  console.log(`  自动计划: ${config.behavior.autoPlan ? '开启' : '关闭'}`);
  console.log(`  自动执行: ${config.behavior.autoExecute ? '开启' : '关闭'}`);
  console.log(`  最大重试: ${config.behavior.maxRetries}`);
  console.log('');
  
  console.log('🔧 工具配置');
  console.log(`  启用工具: ${config.tools.enabled.length} 个`);
  console.log('');
}

/**
 * 确认配置
 */
async function confirmConfig() {
  console.log('');
  const confirm = await question('确认保存此配置? [Y/n]: ');
  return confirm.toLowerCase() !== 'n';
}

/**
 * 保存配置
 */
async function saveConfig(config) {
  showProgress(1, 2, '创建配置目录...');
  
  // 创建配置目录
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  
  showProgress(2, 2, '写入配置文件...');
  
  // 写入配置
  const fs = await import('fs/promises');
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
  
  console.log('');
  console.log(`✅ 配置已保存到: ${CONFIG_FILE}`);
}

/**
 * 显示使用提示
 */
function showUsageTips() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                     🎉 配置完成！                                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('现在你可以开始使用 Closer Code：');
  console.log('');
  console.log('1. 启动交互模式');
  console.log('   $ cloco');
  console.log('   $ npm start');
  console.log('');
  console.log('2. 使用批处理模式');
  console.log('   $ cloco -b "分析这个项目"');
  console.log('   $ cloco -b --json "生成代码" > output.json');
  console.log('');
  console.log('3. 管理配置');
  console.log('   $ cloco config                    # 查看配置');
  console.log('   $ cloco config set <key> <value>  # 修改配置');
  console.log('   $ cloco setup                     # 重新运行配置向导');
  console.log('');
  console.log('4. 常用命令');
  console.log('   /help     - 显示帮助信息');
  console.log('   /keys     - 显示快捷键参考');
  console.log('   /clear    - 清除对话历史');
  console.log('   /plan     - 创建和执行任务计划');
  console.log('');
  console.log('5. 安全提示');
  console.log('   • 建议使用环境变量存储 API Key');
  console.log('   • 配置文件包含敏感信息，请妥善保管');
  console.log('');
}

/**
 * 主配置函数
 */
async function setupEnhanced() {
  try {
    // 显示欢迎消息
    showWelcome();
    
    // 检查是否已有配置
    if (existsSync(CONFIG_FILE)) {
      console.log('⚠️  检测到已有配置文件');
      const overwrite = await question('是否要重新配置? [y/N]: ');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('保持现有配置');
        rl.close();
        return;
      }
    }
    
    // 选择配置模式
    const mode = await selectMode();
    
    // 选择 AI 提供商
    showProgress(1, 6, '选择 AI 提供商...');
    const provider = await selectProvider();
    
    // 输入 API Key
    showProgress(2, 6, '输入 API Key...');
    const apiKey = await inputApiKey(provider);
    
    // 选择模型
    showProgress(3, 6, '选择模型...');
    const model = await selectModel(provider);
    
    // 设置工作目录
    showProgress(4, 6, '设置工作目录...');
    const workingDir = await setWorkingDir();
    
    // 构建配置对象
    showProgress(5, 6, '构建配置...');
    const config = {
      ai: {
        provider,
        anthropic: {
          apiKey: provider === 'anthropic' ? apiKey : '',
          baseURL: 'https://api.anthropic.com',
          model: provider === 'anthropic' ? model : 'claude-sonnet-4-20250514',
          maxTokens: 8192
        },
        openai: {
          apiKey: provider === 'openai' ? apiKey : '',
          baseURL: 'https://api.openai.com/v1',
          model: provider === 'openai' ? model : 'gpt-4o',
          maxTokens: 4096
        },
        deepseek: {
          apiKey: provider === 'deepseek' ? apiKey : '',
          baseURL: 'https://api.deepseek.com/v1',
          model: provider === 'deepseek' ? model : 'deepseek-chat',
          maxTokens: 8192
        },
        ollama: {
          baseURL: 'http://localhost:11434',
          model: provider === 'ollama' ? model : 'llama3.1',
          maxTokens: 4096
        }
      },
      behavior: {
        autoPlan: true,
        autoExecute: false,
        confirmDestructive: true,
        maxRetries: 3,
        timeout: 30000,
        workingDir
      },
      tools: {
        enabled: [
          'bash',
          'readFile',
          'writeFile',
          'editFile',
          'searchFiles',
          'searchCode',
          'listFiles',
          'analyzeError',
          'runTests',
          'planTask'
        ]
      },
      ui: {
        theme: 'default',
        showLineNumbers: true,
        maxOutputLines: 100,
        autoScroll: true
      }
    };
    
    // 显示配置摘要
    showProgress(6, 6, '完成配置...');
    showConfigSummary(config);
    
    // 确认配置
    const confirmed = await confirmConfig();
    if (!confirmed) {
      console.log('配置已取消');
      rl.close();
      return;
    }
    
    // 保存配置
    await saveConfig(config);
    
    // 显示使用提示
    showUsageTips();
    
  } catch (error) {
    console.error('配置过程中出现错误:', error.message);
  } finally {
    rl.close();
  }
}

// 运行配置向导
setupEnhanced().catch(console.error);
