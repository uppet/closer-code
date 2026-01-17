/**
 * 配置管理命令
 */

import { loadConfig, saveConfig, updateConfig } from '../config.js';
import { showError, showSuccess, showTip, showInfo } from '../utils/cli.js';
import { execSync } from 'child_process';
import { join } from 'path';
import os from 'os';

const CONFIG_DIR = join(os.homedir(), '.closer-code');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

/**
 * 显示配置
 */
function showConfig(config, key = null) {
  if (key) {
    // 显示特定配置项
    const keys = key.split('.');
    let value = config;
    for (const k of keys) {
      value = value?.[k];
    }
    if (value === undefined) {
      showError(`配置项不存在: ${key}`);
    } else {
      console.log(`${key}: ${JSON.stringify(value, null, 2)}`);
    }
  } else {
    // 显示所有配置
    console.log(JSON.stringify(config, null, 2));
  }
}

/**
 * 设置配置项
 */
function setConfig(key, value) {
  if (!key || value === undefined) {
    showError('用法: cloco config set <key> <value>');
    return;
  }

  try {
    // 解析值（支持 JSON 和原始类型）
    let parsedValue;
    try {
      parsedValue = JSON.parse(value);
    } catch {
      parsedValue = value;
    }

    // 使用点号表示法设置嵌套属性
    const keys = key.split('.');
    const update = {};
    let current = update;
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = parsedValue;

    updateConfig(update);
    showSuccess(`已设置 ${key} = ${JSON.stringify(parsedValue)}`);
  } catch (error) {
    showError(`设置配置失败: ${error.message}`);
  }
}

/**
 * 获取配置项
 */
function getConfigValue(key) {
  if (!key) {
    showError('用法: cloco config get <key>');
    return;
  }

  const config = loadConfig();
  showConfig(config, key);
}

/**
 * 打开配置文件编辑器
 */
function openConfigInEditor() {
  try {
    const editor = process.env.EDITOR || process.env.VISUAL || 'code';

    if (!editor) {
      showTip('未设置编辑器。请设置环境变量 EDITOR 或 VISUAL');
      showTip('例如: export EDITOR=code');
      showInfo(`配置文件位置: ${CONFIG_FILE}`);
      return;
    }

    showInfo(`正在使用 ${editor} 打开配置文件...`);
    execSync(`${editor} "${CONFIG_FILE}"`, { stdio: 'inherit' });
  } catch (error) {
    showError(`打开编辑器失败: ${error.message}`);
  }
}

/**
 * 重置配置
 */
function resetConfig() {
  try {
    // 导入默认配置
    const { DEFAULT_CONFIG } = '../config.js';
    saveConfig(DEFAULT_CONFIG);
    showSuccess('配置已重置为默认值');
  } catch (error) {
    showError(`重置配置失败: ${error.message}`);
  }
}

/**
 * 配置管理主命令
 */
export default async function configCommand(args, options) {
  const action = args[0];
  const config = loadConfig();

  switch (action) {
    case 'set':
      setConfig(args[1], args[2]);
      break;

    case 'get':
      getConfigValue(args[1]);
      break;

    case 'edit':
      openConfigInEditor();
      break;

    case 'reset':
      resetConfig();
      break;

    case 'show':
    case undefined:
      showConfig(config);
      break;

    default:
      showError(`未知操作: ${action}`);
      showTip('可用操作: set, get, edit, reset, show');
      showTip('运行 "cloco help" 查看更多信息');
      process.exit(1);
  }
}
