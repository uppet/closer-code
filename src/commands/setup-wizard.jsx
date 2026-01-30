/**
 * Ink 版本的配置向导
 * 使用 Ink 组件而不是 readline，避免与 Ink 的输入处理冲突
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.closer-code');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * 配置向导组件
 */
export function SetupWizard({ onComplete, onError }) {
  const [step, setStep] = useState('provider');
  const [provider, setProvider] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [workingDir, setWorkingDir] = useState(process.cwd());
  const [overwrite, setOverwrite] = useState(false);
  const [configExists, setConfigExists] = useState(false);
  const [overwriteInput, setOverwriteInput] = useState('');  // 覆盖确认输入
  const [providerInput, setProviderInput] = useState('');  // 提供商选择输入
  const [modelInput, setModelInput] = useState('');  // 模型选择输入
  const [customModelInput, setCustomModelInput] = useState('');  // 自定义模型名称输入
  const { exit } = useApp();

  // 检查配置文件是否存在
  useEffect(() => {
    setConfigExists(fs.existsSync(CONFIG_FILE));
  }, []);

  // 处理特殊按键
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
    }
  });

  // 完成配置
  const finishSetup = async (finalConfig) => {
    try {
      const fsPromises = await import('fs/promises');
      
      // 创建配置目录
      if (!fs.existsSync(CONFIG_DIR)) {
        await fsPromises.mkdir(CONFIG_DIR, { recursive: true });
      }
      
      // 保存配置
      await fsPromises.writeFile(CONFIG_FILE, JSON.stringify(finalConfig, null, 2));
      
      onComplete(finalConfig);
    } catch (error) {
      onError(error);
    }
  };

  // 步骤 1: 检查是否覆盖（如果配置已存在）
  if (configExists && step === 'provider' && !overwrite) {
    return (
      <Box flexDirection="column">
        <Box>
          <Text bold yellow>⚠️  配置文件已存在</Text>
        </Box>
        <Box marginTop={1}>
          <Text>是否要覆盖现有配置? (y/N): </Text>
          <TextInput
            value={overwriteInput}
            placeholder="y 或 n"
            onChange={setOverwriteInput}
            onSubmit={() => {
              const answer = overwriteInput.toLowerCase().trim();
              if (answer === 'y') {
                setOverwrite(true);
                setOverwriteInput('');
                setStep('provider');
              } else if (answer === 'n') {
                exit();
              }
              // 如果不是 y 或 n，清除输入让用户重新输入
              setOverwriteInput('');
            }}
          />
        </Box>
        <Box marginTop={1}>
          <Text dim>提示: 输入 y 覆盖，输入 n 退出</Text>
        </Box>
      </Box>
    );
  }

  // 步骤 2: 选择提供商
  if (step === 'provider') {
    return (
      <Box flexDirection="column">
        <Box>
          <Text bold>🚀 Closer Code 配置向导</Text>
        </Box>
        <Box marginTop={1}>
          <Text>选择 AI 提供商:</Text>
        </Box>
        <Box marginTop={1}>
          <Text>1. Anthropic Claude (推荐)</Text>
        </Box>
        <Box>
          <Text>2. OpenAI (GPT-4, GPT-3.5)</Text>
        </Box>
        <Box>
          <Text>3. Ollama (本地运行)</Text>
        </Box>
        <Box marginTop={1}>
          <Text>请选择 (1-3): </Text>
          <TextInput
            value={providerInput}
            placeholder="1-3"
            onChange={setProviderInput}
            onSubmit={() => {
              const choice = providerInput.trim();
              if (choice === '1') {
                setProvider('anthropic');
                setProviderInput('');
                setStep('model');
              } else if (choice === '2') {
                setProvider('openai');
                setProviderInput('');
                setStep('model');
              } else if (choice === '3') {
                setProvider('ollama');
                setProviderInput('');
                setStep('model');
              } else {
                // 无效输入，清除并提示
                setProviderInput('');
              }
            }}
          />
        </Box>
        <Box marginTop={1}>
          <Text dim>提示: 输入 1/2/3 后按 Enter</Text>
        </Box>
      </Box>
    );
  }

  // 步骤 3: 选择模型
  if (step === 'model') {
    const models = {
      anthropic: [
        { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5 (最新)' },
        { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' }
      ],
      openai: [
        { id: 'gpt-4o', name: 'GPT-4O (最新)' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
      ],
      ollama: [
        { id: 'llama3.1', name: 'Llama 3.1 (推荐)' },
        { id: 'llama3.2', name: 'Llama 3.2' },
        { id: 'qwen2.5:7b', name: 'Qwen 2.5 7B' },
        { id: 'mistral-7b', name: 'Mistral 7B' },
        { id: 'deepseek-r1:1.5b', name: 'DeepSeek R1' },
        { id: 'gemma2:2b', name: 'Gemma 2 2B' }
      ]
    };

    const availableModels = models[provider] || [];

    return (
      <Box flexDirection="column">
        <Box>
          <Text bold>🤖 选择模型</Text>
        </Box>
        <Box marginTop={1}>
          <Text>可选模型 ({provider}):</Text>
        </Box>
        {availableModels.map((model, index) => (
          <Box key={model.id}>
            <Text>{index + 1}. {model.name}</Text>
          </Box>
        ))}
        <Box>
          <Text bold>{availableModels.length + 1}. 自定义模型名称</Text>
        </Box>
        <Box marginTop={1}>
          <Text>请选择 (1-{availableModels.length + 1}): </Text>
          <TextInput
            value={modelInput}
            placeholder={`1-${availableModels.length + 1}`}
            onChange={setModelInput}
            onSubmit={() => {
              const index = parseInt(modelInput.trim()) - 1;
              if (index >= 0 && index < availableModels.length) {
                setModel(availableModels[index].id);
                setModelInput('');
                
                // Ollama 不需要 API Key，直接跳到工作目录
                if (provider === 'ollama') {
                  setStep('workingDir');
                } else {
                  setStep('apiKey');
                }
              } else if (index === availableModels.length) {
                // 选择自定义模型
                setModelInput('');
                setStep('customModel');
              } else {
                // 无效输入，清除并提示
                setModelInput('');
              }
            }}
          />
        </Box>
        <Box marginTop={1}>
          <Text dim>提示: 输入序号后按 Enter，选择 {availableModels.length + 1} 可输入自定义模型名称</Text>
        </Box>
      </Box>
    );
  }

  // 步骤 3.5: 输入自定义模型名称
  if (step === 'customModel') {
    return (
      <Box flexDirection="column">
        <Box>
          <Text bold>🤖 自定义模型名称</Text>
        </Box>
        <Box marginTop={1}>
          <Text>请输入 {provider} 模型名称: </Text>
          <TextInput
            value={customModelInput}
            placeholder="例如: claude-3-opus-20240229, gpt-4-turbo-preview"
            onChange={setCustomModelInput}
            onSubmit={() => {
              const modelName = customModelInput.trim();
              if (modelName) {
                setModel(modelName);
                setCustomModelInput('');
                
                // Ollama 不需要 API Key，直接跳到工作目录
                if (provider === 'ollama') {
                  setStep('workingDir');
                } else {
                  setStep('apiKey');
                }
              }
            }}
          />
        </Box>
        <Box marginTop={1}>
          <Text dim>提示: 输入任意有效的模型名称后按 Enter</Text>
        </Box>
      </Box>
    );
  }

  // 步骤 4: 输入 API Key（Ollama 跳过此步骤）
  if (step === 'apiKey') {
    const providerName = provider === 'anthropic' ? 'Anthropic' : 'OpenAI';
    
    return (
      <Box flexDirection="column">
        <Box>
          <Text bold>🔑 {providerName} API Key</Text>
        </Box>
        <Box marginTop={1}>
          <Text>请输入 {providerName} API Key: </Text>
          <TextInput
            value={apiKey}
            onChange={setApiKey}
            placeholder="sk-..."
            onSubmit={() => {
              setStep('workingDir');
            }}
          />
        </Box>
        <Box marginTop={1}>
          <Text dim>提示: 按 Enter 继续</Text>
        </Box>
      </Box>
    );
  }

  // 步骤 5: 输入工作目录
  if (step === 'workingDir') {
    return (
      <Box flexDirection="column">
        <Box>
          <Text bold>📁 工作目录</Text>
        </Box>
        <Box marginTop={1}>
          <Text>工作目录 (默认: {workingDir}): </Text>
          <TextInput
            value={workingDir}
            onChange={setWorkingDir}
            onSubmit={() => {
              // 创建配置对象
              const config = createConfig(provider, apiKey, model, workingDir);
              finishSetup(config);
            }}
          />
        </Box>
        <Box marginTop={1}>
          <Text dim>提示: 按 Enter 使用默认值</Text>
        </Box>
      </Box>
    );
  }

  // 创建配置对象
  function createConfig(provider, apiKey, model, workingDir) {
    return {
      ai: {
        provider,
        anthropic: {
          apiKey: provider === 'anthropic' ? apiKey : '',
          baseURL: 'https://api.anthropic.com',
          model: provider === 'anthropic' ? (model || 'claude-sonnet-4-5-20250929') : 'claude-sonnet-4-5-20250929',
          maxTokens: 8192
        },
        openai: {
          apiKey: provider === 'openai' ? apiKey : '',
          baseURL: 'https://api.openai.com/v1',
          model: provider === 'openai' ? (model || 'gpt-4o') : 'gpt-4o',
          maxTokens: 4096
        },
        ollama: {
          baseURL: 'http://localhost:11434',
          model: provider === 'ollama' ? (model || 'llama3.1') : 'llama3.1',
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
  }

  return null;
}

/**
 * 启动配置向导（Ink 版本）
 * 这个函数不会使用 readline，而是使用 Ink 组件
 */
export async function startSetupWizard() {
  const { render } = await import('ink');
  const React = await import('react');

  return new Promise((resolve, reject) => {
    const { rerender } = render(
      React.createElement(SetupWizard, {
        onComplete: (config) => {
          rerender(
            React.createElement(SuccessScreen, { 
              config,
              onExit: () => {
                resolve(config);
              }
            })
          );
        },
        onError: (error) => {
          rerender(
            React.createElement(ErrorScreen, { 
              error,
              onExit: () => {
                reject(error);
              }
            })
          );
        }
      })
    );
  });
}

/**
 * 成功屏幕
 */
function SuccessScreen({ config, onExit }) {
  const { exit } = useApp();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      exit();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold green>✅ 配置已保存！</Text>
      </Box>
      <Box marginTop={1}>
        <Text>Provider: {config.ai.provider}</Text>
      </Box>
      <Box>
        <Text>Model: {config.ai[config.ai.provider]?.model}</Text>
      </Box>
      <Box marginTop={1}>
        <Text dim>3秒后自动退出...</Text>
      </Box>
    </Box>
  );
}

/**
 * 错误屏幕
 */
function ErrorScreen({ error, onExit }) {
  const { exit } = useApp();

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold red>❌ 配置保存失败</Text>
      </Box>
      <Box marginTop={1}>
        <Text>{error.message}</Text>
      </Box>
      <Box marginTop={1}>
        <Text dim>按 Ctrl+C 退出</Text>
      </Box>
    </Box>
  );
}
