/**
 * 调试日志模块
 */

import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';

const LOG_DIR = path.join(homedir(), '.closer-code/logs');
const DEBUG_ENABLED = process.env.CLOSER_DEBUG_LOG === '1';

let logFile = null;
let logStream = null;

/**
 * 初始化日志
 */
export async function initLogger() {
  if (!DEBUG_ENABLED) return;

  try {
    await fs.mkdir(LOG_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    logFile = path.join(LOG_DIR, `closer_debug_log_${timestamp}.log`);

    logStream = await fs.open(logFile, 'a');

    await writeLog('=== Closer Code Debug Log Started ===');
    await writeLog(`Log file: ${logFile}`);
    await writeLog(`CLOSER_DEBUG_LOG: ${process.env.CLOSER_DEBUG_LOG}`);
    await writeLog(`Node.js: ${process.version}`);
    await writeLog(`Platform: ${process.platform}`);
    await writeLog(`Working Directory: ${process.cwd()}`);
    await writeLog('');

    console.error(`[DEBUG] Logging enabled. Log file: ${logFile}`);

  } catch (error) {
    console.error('Failed to initialize logger:', error.message);
  }
}

/**
 * 写入日志
 */
async function writeLog(message) {
  if (!DEBUG_ENABLED || !logStream) return;

  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;

  try {
    await logStream.write(logMessage);
  } catch (error) {
    console.error('Failed to write log:', error.message);
  }
}

/**
 * 格式化对象为日志字符串
 */
function formatObject(obj, indent = 0) {
  const spaces = '  '.repeat(indent);

  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (typeof obj !== 'object') return String(obj);

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    const items = obj.slice(0, 5).map(item => formatObject(item, indent + 1));
    const truncated = obj.length > 5 ? `\n${spaces}... (${obj.length} items total)` : '';
    return `[\n${spaces}${items.join(',\n' + spaces)}${truncated}\n${spaces.slice(0, -2)}]`;
  }

  const keys = Object.keys(obj);
  if (keys.length === 0) return '{}';

  const entries = keys.slice(0, 10).map(key => {
    const value = obj[key];
    if (typeof value === 'object' && value !== null) {
      return `${key}: ${formatObject(value, indent + 1)}`;
    }
    return `${key}: ${JSON.stringify(value)}`;
  });

  const truncated = keys.length > 10 ? `\n${spaces}... (${keys.length} keys total)` : '';

  return `{\n${spaces}${entries.join(',\n' + spaces)}${truncated}\n${spaces.slice(0, -2)}}`;
}

/**
 * 记录配置
 */
export async function logConfig(config) {
  if (!DEBUG_ENABLED) return;

  await writeLog('--- Configuration ---');
  await writeLog(`AI Provider: ${config.ai.provider}`);

  if (config.ai.anthropic) {
    await writeLog(`Anthropic API Key: ${config.ai.anthropic.apiKey ? '***' + config.ai.anthropic.apiKey.slice(-4) : 'NOT SET'}`);
    await writeLog(`Anthropic Base URL: ${config.ai.anthropic.baseURL}`);
    await writeLog(`Anthropic Model: ${config.ai.anthropic.model}`);
    await writeLog(`Anthropic Max Tokens: ${config.ai.anthropic.maxTokens}`);
  }

  if (config.ai.openai) {
    await writeLog(`OpenAI API Key: ${config.ai.openai.apiKey ? '***' + config.ai.openai.apiKey.slice(-4) : 'NOT SET'}`);
    await writeLog(`OpenAI Base URL: ${config.ai.openai.baseURL}`);
    await writeLog(`OpenAI Model: ${config.ai.openai.model}`);
    await writeLog(`OpenAI Max Tokens: ${config.ai.openai.maxTokens}`);
  }

  await writeLog(`Auto Plan: ${config.behavior.autoPlan}`);
  await writeLog(`Auto Execute: ${config.behavior.autoExecute}`);
  await writeLog(`Working Dir: ${config.behavior.workingDir}`);
  await writeLog(`Enabled Tools: ${config.tools.enabled.join(', ')}`);
  await writeLog('');
}

/**
 * 记录用户消息
 */
export async function logUserMessage(message) {
  if (!DEBUG_ENABLED) return;

  await writeLog('--- User Message ---');
  await writeLog(`Content: ${message}`);
  await writeLog(`Length: ${message.length} characters`);
  await writeLog('');
}

/**
 * 记录 AI 请求
 */
export async function logAIRequest(messages, options) {
  if (!DEBUG_ENABLED) return;

  await writeLog('--- AI Request ---');
  await writeLog(`Message Count: ${messages.length}`);
  await writeLog(`Temperature: ${options.temperature}`);
  await writeLog(`Max Tokens: ${options.maxTokens || 'N/A'}`);
  await writeLog(`Tool Count: ${options.tools?.length || 0}`);

  if (options.tools) {
    await writeLog('Available Tools:');
    for (const tool of options.tools) {
      await writeLog(`  - ${tool.name}: ${tool.description?.slice(0, 80)}...`);
    }
  }

  await writeLog('Messages:');
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    await writeLog(`  [${i}] Role: ${msg.role}`);

    if (msg.content) {
      const content = typeof msg.content === 'string'
        ? msg.content
        : JSON.stringify(msg.content).slice(0, 200);
      await writeLog(`      Content: ${content}...`);
    }

    if (msg.toolCalls) {
      await writeLog(`      Tool Calls: ${msg.toolCalls.length}`);
    }
  }

  await writeLog('');
}

/**
 * 记录流式响应开始
 */
export async function logStreamStart() {
  if (!DEBUG_ENABLED) return;

  await writeLog('--- Stream Response Started ---');
}

/**
 * 记录流式响应数据块
 */
export async function logStreamChunk(chunk) {
  if (!DEBUG_ENABLED) return;

  await writeLog(`Stream Chunk Type: ${chunk.type}`);

  if (chunk.type === 'content_block_delta') {
    await writeLog(`  Delta Text: ${chunk.delta?.text || '(empty)'}`);
    await writeLog(`  Delta Length: ${chunk.delta?.text?.length || 0}`);
  }

  if (chunk.type === 'content_block_stop') {
    await writeLog(`  Block Type: ${chunk.content_block?.type}`);
    if (chunk.content_block?.type === 'tool_use') {
      await writeLog(`  Tool Name: ${chunk.content_block.name}`);
      await writeLog(`  Tool Input: ${JSON.stringify(chunk.content_block.input).slice(0, 200)}...`);
    }
  }

  if (chunk.type === 'message_stop') {
    await writeLog(`  Stop Reason: ${chunk.stop_reason}`);
  }
}

/**
 * 记录流式响应结束
 */
export async function logStreamEnd(fullResponse, toolCalls) {
  if (!DEBUG_ENABLED) return;

  await writeLog('--- Stream Response Ended ---');
  await writeLog(`Total Response Length: ${fullResponse.length} characters`);
  await writeLog(`Tool Calls Found: ${toolCalls.length}`);

  if (toolCalls.length > 0) {
    await writeLog('Tool Calls:');
    for (const tc of toolCalls) {
      await writeLog(`  - ${tc.name}`);
      await writeLog(`    Input: ${JSON.stringify(tc.input).slice(0, 200)}...`);
    }
  }

  await writeLog(`Full Response (first 500 chars):\n${fullResponse.slice(0, 500)}${fullResponse.length > 500 ? '...' : ''}`);
  await writeLog('');
}

/**
 * 记录工具调用
 */
export async function logToolCall(toolName, input, result) {
  if (!DEBUG_ENABLED) return;

  await writeLog('--- Tool Call ---');
  await writeLog(`Tool: ${toolName}`);
  await writeLog(`Input: ${JSON.stringify(input).slice(0, 300)}...`);
  await writeLog(`Success: ${result.success}`);

  if (result.success) {
    await writeLog(`Result Data: ${JSON.stringify(result.data).slice(0, 300)}...`);
  } else {
    await writeLog(`Error: ${result.error}`);
  }

  await writeLog('');
}

/**
 * 记录 AI 错误
 */
export async function logAIError(error) {
  if (!DEBUG_ENABLED) return;

  await writeLog('--- AI Error ---');
  await writeLog(`Error: ${error.message}`);
  await writeLog(`Stack: ${error.stack}`);
  await writeLog('');
}

/**
 * 记录非流式响应
 */
export async function logAIResponse(response) {
  if (!DEBUG_ENABLED) return;

  await writeLog('--- AI Response ---');
  await writeLog(`Model: ${response.model}`);
  await writeLog(`Stop Reason: ${response.stopReason || response.finishReason}`);
  await writeLog(`Content Blocks: ${response.content?.length || 0}`);

  if (response.content) {
    let fullText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        fullText += block.text;
      }
    }
    await writeLog(`Response Length: ${fullText.length} characters`);
    await writeLog(`Response (first 500 chars):\n${fullText.slice(0, 500)}${fullText.length > 500 ? '...' : ''}`);

    const toolUses = response.content.filter(b => b.type === 'tool_use');
    if (toolUses.length > 0) {
      await writeLog(`Tool Uses: ${toolUses.length}`);
      for (const tu of toolUses) {
        await writeLog(`  - ${tu.name}: ${JSON.stringify(tu.input).slice(0, 100)}...`);
      }
    }
  }

  await writeLog('');
}

/**
 * 记录会话摘要
 */
export async function logSessionSummary(conversation) {
  if (!DEBUG_ENABLED) return;

  await writeLog('--- Session Summary ---');
  const summary = conversation.getSummary();
  await writeLog(formatObject(summary));
  await writeLog('');

  await writeLog('=== Closer Code Debug Log Ended ===');
  await closeLogger();
}

/**
 * 关闭日志
 */
export async function closeLogger() {
  if (!DEBUG_ENABLED || !logStream) return;

  try {
    await logStream.close();
    console.error(`\n[DEBUG] Log saved to: ${logFile}`);
  } catch (error) {
    console.error('Failed to close logger:', error.message);
  }
}

/**
 * 获取日志文件路径
 */
export function getLogFile() {
  return logFile;
}
