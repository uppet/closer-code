#!/usr/bin/env node
/**
 * Closer Code 设置脚本
 */

import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { createInterface } from 'readline';
import { execSync } from 'child_process';
import { isMainModule } from './utils/platform.js';

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

async function setupInternal() {
  console.log('🚀 Closer Code 初始化向导\n');

  // 创建配置目录
  if (!existsSync(CONFIG_DIR)) {
    console.log(`创建配置目录: ${CONFIG_DIR}`);
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  // 检查是否已有配置
  if (existsSync(CONFIG_FILE)) {
    console.log(`配置文件已存在: ${CONFIG_FILE}`);
    const overwrite = await question('是否要覆盖? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('保持现有配置');
      rl.close();
      return;
    }
  }

  console.log('\n选择 AI 提供商:');
  console.log('1. Anthropic Claude (推荐)');
  console.log('2. OpenAI (GPT-4, GPT-3.5)');
  console.log('3. Ollama (本地运行)\n');

  const providerChoice = await question('请选择 (1-3): ');
  let provider, apiKey, model;

  switch (providerChoice) {
    case '1':
      provider = 'anthropic';
      apiKey = await question('请输入 Anthropic API Key: ');
      model = 'claude-sonnet-4-5-20250929';
      break;
    case '2':
      provider = 'openai';
      apiKey = await question('请输入 OpenAI API Key: ');
      model = 'gpt-4o';
      break;
    case '3':
      provider = 'ollama';
      console.log('使用 Ollama - 确保服务运行在 http://localhost:11434');
      apiKey = '';
      model = 'llama3.1';
      break;
    default:
      console.log('无效选择，使用默认配置');
      provider = 'anthropic';
      apiKey = '';
      model = 'claude-sonnet-4-5-20250929';
  }

  const workingDir = await question(`工作目录 (默认: ${process.cwd()}): `) || process.cwd();

  const config = {
    ai: {
      provider,
      anthropic: {
        apiKey: provider === 'anthropic' ? apiKey : '',
        baseURL: 'https://api.anthropic.com',
        model: 'claude-sonnet-4-5-20250929',
        maxTokens: 8192
      },
      openai: {
        apiKey: provider === 'openai' ? apiKey : '',
        baseURL: 'https://api.openai.com/v1',
        model: 'gpt-4o',
        maxTokens: 4096
      },
      ollama: {
        baseURL: 'http://localhost:11434',
        model: 'llama3.1',
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

  // 写入配置
  const fs = await import('fs/promises');
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));

  console.log(`\n✅ 配置已保存到: ${CONFIG_FILE}`);
  console.log('\n你现在可以运行: npm start');
  console.log('\n提示: 如果不想在配置文件中存储 API Key，可以设置环境变量:');
  if (provider === 'anthropic') {
    console.log('  export ANTHROPIC_API_KEY=your-key');
  } else if (provider === 'openai') {
    console.log('  export OPENAI_API_KEY=your-key');
  }

  rl.close();
}

/**
 * 导出配置函数，而不是立即执行
 * 避免在 import 时就运行配置
 */
export function setup() {
  return setupInternal();
}

// 如果直接运行此文件，则启动配置
if (isMainModule(import.meta.url)) {
  setup().catch(console.error);
}
