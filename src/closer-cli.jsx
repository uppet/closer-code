#!/usr/bin/env node
/**
 * Closer Code - AI 编程助理 CLI
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { render, Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useInput } from 'ink';
import { createConversation } from './conversation.js';
import { getConfig, updateConfig } from './config.js';
import { createShortcutManager } from './shortcuts.js';
import { createSnippetManager, SNIPPET_TEMPLATES } from './snippets.js';
import fs from 'fs';
import path from 'path';

// 面板组件
function Panel({ title, children, borderColor = 'gray', flex = 1 }) {
  return (
    <Box
      borderStyle="round"
      borderColor={borderColor}
      flexDirection="column"
      flexGrow={flex}
      paddingX={1}
      marginRight={1}
      marginBottom={1}
    >
      <Box borderBottom={false} borderColor={borderColor} paddingBottom={0} marginBottom={1}>
        <Text bold color={borderColor}>{title}</Text>
      </Box>
      <Box flexGrow={1} flexDirection="column">
        {children}
      </Box>
    </Box>
  );
}

// 消息显示组件
// 任务进度组件
function TaskProgress({ plan }) {
  if (!plan) return null;

  const { completed, total, percentage } = plan.getProgress ? plan.getProgress() : { completed: 0, total: 0, percentage: 0 };
  const statusColor = plan.status === 'completed' ? 'green' :
                     plan.status === 'failed' ? 'red' :
                     plan.status === 'in_progress' ? 'yellow' : 'gray';

  // 进度条
  const barWidth = 20;
  const filled = Math.round((percentage / 100) * barWidth);
  const empty = barWidth - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  // Plan 类型标识和摘要
  const typeLabel = plan.type === 'auto' ? '🤖' : '📋';
  const summary = plan.getSummary ? plan.getSummary() : `${completed}/${total}`;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* 父计划摘要 */}
      <Box flexDirection="row" justifyContent="space-between" width="100%">
        <Text bold color={statusColor}>
          {typeLabel} {plan.description.substring(0, 40)}{plan.description.length > 40 ? '...' : ''}
        </Text>
        <Text dim>{summary}</Text>
      </Box>

      {/* 进度条 */}
      <Box>
        <Text color="cyan">[{bar}]</Text>
        <Text dim> {completed}/{total} ({Math.round(percentage)}%)</Text>
      </Box>

      {/* 最近 5 个步骤 */}
      {plan.steps && plan.steps.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          {plan.steps.slice(-5).map((step, i) => {
            const stepIcon = step.status === 'completed' ? '✓' :
                           step.status === 'in_progress' ? '→' :
                           step.status === 'failed' ? '✗' : '○';
            const stepColor = step.status === 'completed' ? 'green' :
                            step.status === 'in_progress' ? 'yellow' :
                            step.status === 'failed' ? 'red' : 'gray';
            // 步骤描述限制为 40 字符
            const shortDesc = step.description.length > 40
              ? step.description.substring(0, 40) + '...'
              : step.description;
            return (
              <Box key={step.id || i}>
                <Text color={stepColor}>{stepIcon} {shortDesc}</Text>
              </Box>
            );
          })}
        </Box>
      )}

      {/* 错误信息 */}
      {plan.metadata?.error && (
        <Box>
          <Text color="red">Error: {plan.metadata.error}</Text>
        </Box>
      )}
    </Box>
  );
}

// 工具执行显示组件
function ToolExecution({ summary, timestamp }) {
  return (
    <Box flexDirection="column" marginBottom={1} paddingX={1} borderStyle="single" borderColor="gray" width="100%">
      <Box width="100%">
        <Text>{summary}</Text>
        <Text dim> [{timestamp}]</Text>
      </Box>
    </Box>
  );
}

/**
 * 将thinking消息格式化为行数组
 * @param {string} thought - thinking消息
 * @param {number} maxWidth - 最大宽度（字符数）
 * @returns {Array} - 行数组
 */
function formatThinkingAsLines(thought, maxWidth = 80) {
  const lines = [];

  // 提取emoji图标
  const emojiMatch = thought.match(/^([\p{Emoji}]{1,2})\s+/u);
  const emoji = emojiMatch ? emojiMatch[1] : '•';
  const content = thought.replace(/^[\p{Emoji}]{1,2}\s+/u, '');

  // 提取时间戳
  const timestampMatch = content.match(/\[.*?\]/);
  const timestamp = timestampMatch ? timestampMatch[0] : '';
  const messageContent = timestampMatch ? content.replace(/\[.*?\]\s*/, '') : content;

  // 根据emoji确定颜色
  const colorMap = {
    '🤔': 'cyan',
    '✅': 'green',
    '✍️': 'yellow',
    '⚡': 'yellow',
    '📊': 'blue',
    '🔒': 'magenta',
    '❌': 'red',
    '📋': 'yellow',
    '•': 'gray'
  };
  const color = colorMap[emoji] || 'gray';

  // 添加第一行（emoji + timestamp）
  const prefixLine = `${emoji} ${timestamp}`;
  lines.push({
    text: prefixLine,
    color: color,
    type: 'prefix'
  });

  // 分割内容为行
  const contentWidth = maxWidth - 4; // 留出缩进
  if (messageContent.length > contentWidth) {
    for (let i = 0; i < messageContent.length; i += contentWidth) {
      const chunk = messageContent.slice(i, i + contentWidth);
      lines.push({
        text: '    ' + chunk, // 缩进4个空格
        color: color,
        type: 'content'
      });
    }
  } else {
    lines.push({
      text: '    ' + (messageContent || ''),
      color: color,
      type: 'content'
    });
  }

  return lines;
}

/**
 * 将消息格式化为行数组
 * @param {Object} message - 消息对象
 * @param {number} maxWidth - 最大宽度（字符数）
 * @returns {Array} - 行数组
 */
function formatMessageAsLines(message, maxWidth = 80) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isError = message.role === 'error';

  const color = isUser ? 'cyan' : isError ? 'red' : isSystem ? 'yellow' : 'white';
  const prefix = isUser ? '👤 ' : isError ? '❌ ' : isSystem ? 'ℹ️ ' : '🤖 ';
  const content = typeof message.content === 'string'
    ? message.content
    : JSON.stringify(message.content);

  const lines = [];
  const prefixLength = 4; // emoji + space
  const contentWidth = maxWidth - prefixLength - 2; // 留出边距

  // 添加前缀行
  lines.push({
    text: prefix,
    color: color,
    type: 'prefix'
  });

  // 分割内容为行
  const contentLines = content.split('\n');

  for (let line of contentLines) {
    // 如果行太长，需要分割
    if (line.length > contentWidth) {
      // 分割长行
      for (let i = 0; i < line.length; i += contentWidth) {
        const chunk = line.slice(i, i + contentWidth);
        lines.push({
          text: '  ' + chunk, // 缩进
          color: color,
          type: 'content'
        });
      }
    } else {
      lines.push({
        text: '  ' + (line || ''), // 缩进，空行也显示
        color: color,
        type: 'content'
      });
    }
  }

  // 添加消息间分隔
  lines.push({
    text: '',
    color: 'gray',
    type: 'separator'
  });

  return lines;
}

/**
 * 滚动容器组件
 */
function ScrollContainer({ items, height, scrollPosition }) {
  // 计算可见范围
  const startIndex = Math.max(0, Math.floor(scrollPosition));
  const endIndex = Math.min(items.length, startIndex + height);
  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <Box flexDirection="column" width="100%">
      {visibleItems.map((item, index) => (
        <Box key={startIndex + index} width="100%">
          <Text color={item.color}>{item.text}</Text>
        </Box>
      ))}
    </Box>
  );
}

// 主应用组件
function App() {
  const [config, setConfig] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [toolExecutions, setToolExecutions] = useState([]);
  const [status, setStatus] = useState('Initializing...');
  const [messageCounter, setMessageCounter] = useState(0);
  const [activity, setActivity] = useState(null); // 当前活动描述
  const [thinking, setThinking] = useState([]); // AI 思考过程
  const [thinkingEnabled, setThinkingEnabled] = useState(true); // Thinking 开关状态
  const [thinkingScrollPosition, setThinkingScrollPosition] = useState(0); // Thinking滚动位置

  // 终端尺寸状态
  const [terminalSize, setTerminalSize] = useState({
    columns: process.stdout.columns || 80,
    rows: process.stdout.rows || 30
  });

  // 监听终端尺寸变化
  useEffect(() => {
    const handleResize = () => {
      setTerminalSize({
        columns: process.stdout.columns || 80,
        rows: process.stdout.rows || 30
      });
    };

    process.stdout.on('resize', handleResize);
    return () => {
      process.stdout.off('resize', handleResize);
    };
  }, []);

  // 自定义滚动管理
  const [messageLines, setMessageLines] = useState([]); // 所有消息行
  const [scrollPosition, setScrollPosition] = useState(0); // 当前滚动位置
  const conversationHeight = Math.floor(terminalSize.rows * 0.65) - 2; // Conversation区域高度（行数）

  // Thinking区域滚动管理
  const [thinkingLines, setThinkingLines] = useState([]); // 所有thinking行
  const thinkingHeight = 3; // Thinking区域固定显示3行
  
  // Ctrl+C 退出控制
  const [lastCtrlC, setLastCtrlC] = useState(0);
  const [showExitHint, setShowExitHint] = useState(false);
  const [abortMessage, setAbortMessage] = useState(null); // 中止任务的提示
  const abortControllerRef = useRef(null);
  const inputRef = useRef(''); // 用于在 useInput 中获取最新的 input 值

  // 当消息更新时，重新计算行
  useEffect(() => {
    const allLines = [];
    const maxWidth = Math.floor(terminalSize.columns * 0.7) - 4; // Conversation区域宽度

    for (const message of messages) {
      const lines = formatMessageAsLines(message, maxWidth);
      allLines.push(...lines);
    }

    setMessageLines(allLines);

    // 自动滚动到底部（如果不是用户主动滚动）
    const maxPosition = Math.max(0, allLines.length - conversationHeight);
    // 只有在处理新消息时才自动滚动
    if (isProcessing || allLines.length < 100) {
      setScrollPosition(maxPosition);
    }
  }, [messages, terminalSize.columns, conversationHeight, isProcessing]);

  // 当thinking更新时，重新计算行
  useEffect(() => {
    const allLines = [];
    const maxWidth = Math.floor(terminalSize.columns) - 4; // Thinking区域宽度

    for (const thought of thinking) {
      const lines = formatThinkingAsLines(thought, maxWidth);
      allLines.push(...lines);
    }

    setThinkingLines(allLines);

    // 自动滚动到底部
    const maxPosition = Math.max(0, allLines.length - thinkingHeight);
    setThinkingScrollPosition(maxPosition);
  }, [thinking, terminalSize.columns, thinkingHeight]);

  // 键盘输入处理（用于滚动和 Ctrl+C）
  useInput((input, key) => {
    // 处理 Ctrl+C 和 ESC（始终有效，即使在输入模式）
    if ((key.ctrl && input === 'c') || key.escape) {
      const now = Date.now();

      if (isProcessing) {
        // 如果 AI 正在执行，中止对话
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
        setIsProcessing(false);
        setActivity('❌ 用户中止了 AI 执行');
        setAbortMessage('❌ AI 执行已被中止');
        setThinking(prev => [...prev, `❌ [${new Date().toLocaleTimeString()}] 用户中止了 AI 执行`]);

        // 3秒后清除中止提示
        setTimeout(() => {
          setAbortMessage(null);
          setActivity(null);
        }, 3000);

        return;
      }

      // 没有任务在执行时的退出逻辑
      if (now - lastCtrlC < 1500) {
        // 1.5秒内再次按下，退出程序
        console.log('\n👋 再见！\n');
        process.exit(0);
      } else {
        // 第一次按下，显示提示
        setShowExitHint(true);
        setLastCtrlC(now);
        setTimeout(() => setShowExitHint(false), 1500);
      }
      return;
    }

    // 处理 Tab 键 - 切换 Thinking 开关
    if (key.tab) {
      setThinkingEnabled(prev => {
        const newValue = !prev;
        process.env.CLOSER_THINKING_ENABLED = newValue ? '1' : '0';
        setActivity(newValue ? '✅ Thinking 已启用' : '🚫 Thinking 已禁用');
        setTimeout(() => setActivity(null), 2000);
        return newValue;
      });
      return;
    }

    // 处理滚动（使用自定义滚动系统）
    // PageUp/PageDown - 始终可用于滚动
    if (key.pageUp) {
      const delta = Math.min(10, conversationHeight);
      setScrollPosition(prev => Math.max(0, prev - delta));
    } else if (key.pageDown) {
      const delta = Math.min(10, conversationHeight);
      const maxPosition = Math.max(0, messageLines.length - conversationHeight);
      setScrollPosition(prev => Math.min(maxPosition, prev + delta));
    }
    // 方向键 - 仅在输入框为空时滚动（避免与光标移动冲突）
    else if (inputRef.current.length === 0) {
      if (key.upArrow) {
        setScrollPosition(prev => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        const maxPosition = Math.max(0, messageLines.length - conversationHeight);
        setScrollPosition(prev => Math.min(maxPosition, prev + 1));
      }
    }
    // Alt 键组合 - 始终可用
    else if (key.alt && key.upArrow) {
      setScrollPosition(prev => Math.max(0, prev - 1));
    } else if (key.alt && key.downArrow) {
      const maxPosition = Math.max(0, messageLines.length - conversationHeight);
      setScrollPosition(prev => Math.min(maxPosition, prev + 1));
    }
    // Shift + 方向键 - 滚动Thinking区域
    else if (key.shift && key.upArrow) {
      setThinkingScrollPosition(prev => Math.max(0, prev - 1));
    } else if (key.shift && key.downArrow) {
      const maxPosition = Math.max(0, thinkingLines.length - thinkingHeight);
      setThinkingScrollPosition(prev => Math.min(maxPosition, prev + 1));
    }
  }, { capture: true }); // capture: true 确保能捕获按键

  // 初始化
  useEffect(() => {
    async function init() {
      try {
        const cfg = getConfig();
        setConfig(cfg);

        const conv = await createConversation(cfg);
        setConversation(conv);

        // 欢迎消息
        const welcomeMsg = {
          role: 'assistant',
          content: `Welcome to Closer Code! 🚀

I'm your AI programming assistant. I can help you with:
• Writing and editing code
• Debugging and fixing errors
• Planning and executing complex tasks
• Searching through codebases
• Running tests and commands

Current directory: ${cfg.behavior.workingDir}

Type your message or command to get started.`
        };

        setMessages([welcomeMsg]);
        setStatus('Ready');
      } catch (error) {
        setStatus(`Error: ${error.message}`);
        console.error('Init error:', error);
      }
    }

    init();
  }, []);


  // 处理用户输入
  const handleSubmit = useCallback(async (value) => {
    if (!conversation || isProcessing) return;

    setInput('');
    setIsProcessing(true);
    setActivity('📤 发送消息到 AI...');

    // 添加用户消息
    const userMsg = { role: 'user', content: value };
    setMessages(prev => [...prev, userMsg]);

    // 处理特殊命令
    if (value.startsWith('/')) {
      await handleCommand(value);
      setIsProcessing(false);
      setActivity(null);
      return;
    }

    try {
      // 创建 AbortController 用于中止
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      
      // 记录思考开始
      setThinking(prev => [...prev, `🤔 [${new Date().toLocaleTimeString()}] 开始分析用户请求...`]);
      
      // 发送到 AI
      setActivity('🤔 AI 正在思考...');
      const response = await conversation.sendMessage(
        value,
        (progress) => {
          // 处理流式响应（使用 SDK 事件监听器 API）
          if (progress.type === 'thinking') {
            // AI thinking 内容 - 逐字显示
            setActivity('🤔 AI 正在深度思考...');
            setThinking(prev => {
              const newThinking = [...prev];

              // 检查最后一条是否是当前 thinking（未完成的）
              const lastEntry = newThinking[newThinking.length - 1];
              const thinkingDelta = progress.delta || '';

              if (lastEntry && lastEntry.startsWith('🤔') && !lastEntry.includes('✅')) {
                // 追加增量到当前的 thinking 条目
                const timestamp = lastEntry.match(/\[.*?\]/)[0];
                const currentContent = lastEntry.substring(lastEntry.indexOf('] ') + 2);
                newThinking[newThinking.length - 1] = `🤔 ${timestamp} ${currentContent}${thinkingDelta}`;
              } else {
                // 创建新的 thinking 条目
                const timestamp = `[${new Date().toLocaleTimeString()}]`;
                newThinking.push(`🤔 ${timestamp} ${thinkingDelta}`);
              }

              return newThinking.slice(-30); // 保留最后 30 条thinking记录
            });
          } else if (progress.type === 'thinking_signature') {
            // Thinking 签名
            setThinking(prev => {
              const newThinking = [...prev];
              // 计算累计的thinking内容长度
              const totalThinkingLength = prev
                .filter(entry => entry.startsWith('🤔'))
                .reduce((sum, entry) => {
                  // 提取thinking内容（去掉时间戳前缀）
                  const content = entry.replace(/^🤔 \[.*?\] /, '');
                  return sum + content.length;
                }, 0);
              
              newThinking.push(`✅ [${new Date().toLocaleTimeString()}] Thinking 完成 (${totalThinkingLength} 字符, ~${Math.ceil(totalThinkingLength/4)} tokens)`);
              return newThinking.slice(-30);
            });
          } else if (progress.type === 'thinking_redacted') {
            // Redacted thinking（被编辑的思考内容）
            setThinking(prev => {
              const newThinking = [...prev];
              newThinking.push(`🔒 [${new Date().toLocaleTimeString()}] Redacted thinking: ${progress.content}`);
              return newThinking.slice(-10);
            });
          } else if (progress.type === 'token') {
            // 真正的流式文本
            setActivity('✍️ AI 正在输入...');
            setThinking(prev => [...prev, `✍️ [${new Date().toLocaleTimeString()}] 生成响应中...`]);
            setMessages(prev => {
              const lastMsg = prev[prev.length - 1];

              if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.complete) {
                // 追加内容
                return [
                  ...prev.slice(0, -1),
                  {
                    ...lastMsg,
                    content: lastMsg.content + progress.content,
                    key: Date.now()
                  }
                ];
              } else {
                // 创建新消息
                return [...prev, {
                  role: 'assistant',
                  content: progress.content,
                  complete: false,
                  key: Date.now()
                }];
              }
            });
          } else if (progress.type === 'tool_use_start') {
            // 检测到工具调用
            const thinkingMsg = `⚡ [${new Date().toLocaleTimeString()}] 检测到工具调用: ${progress.toolName}`;
            setActivity(`⚡ 准备执行工具: ${progress.toolName}...`);
            setThinking(prev => [...prev, thinkingMsg]);
          } else if (progress.type === 'plan_created') {
            // AI Planning 被创建
            setCurrentPlan(progress.plan);
            setThinking(prev => [...prev, `📋 [${new Date().toLocaleTimeString()}] AI Planning 已创建`]);
          } else if (progress.type === 'plan_progress') {
            // AI Planning 进度更新
            setCurrentPlan(progress.plan);
          } else if (progress.type === 'tool_start') {
            const thinkingMsg = `⚡ [${new Date().toLocaleTimeString()}] 调用工具: ${progress.tool}`;
            setActivity(`⚡ 执行工具: ${progress.tool}...`);
            setThinking(prev => [...prev, thinkingMsg]);
            // 存储工具信息，包括 input 和 result 引用（用于生成摘要）
            setToolExecutions(prev => {
              const newExecs = [...prev, {
                tool: progress.tool,
                timestamp: new Date().toLocaleTimeString(),
                input: progress.input,
                result: null
              }];
              // 只保留最近 10 个
              return newExecs.slice(-10);
            });
          } else if (progress.type === 'tool_complete') {
            const resultMsg = progress.result.success ? '✓ 成功' : '✗ 失败';
            setActivity('📊 处理工具结果...');
            setThinking(prev => [...prev, `📊 [${new Date().toLocaleTimeString()}] 工具执行结果: ${resultMsg}`]);
            // 更新工具执行结果，并生成摘要
            setToolExecutions(prev => {
              if (prev.length === 0) return prev;
              const newExecs = [...prev];
              const lastExec = newExecs[newExecs.length - 1];

              // 生成简短摘要（不使用完整数据）
              let summary = '';
              const tool = lastExec.tool;
              const input = lastExec.input || {};
              const result = progress.result;

              // 根据工具类型生成摘要
              if (tool === 'bash') {
                const cmd = input.command || '';
                const parts = cmd.trim().split(/\s+/);
                const command = parts[0] || 'bash';
                const arg1 = parts[1] ? parts[1].substring(0, 20) : '';
                summary = result.success
                  ? `✓ ${command} ${arg1}`
                  : `✗ ${command}`;
              } else if (tool === 'readFile') {
                const filePath = input.filePath || '';
                const fileName = filePath.split('/').pop().substring(0, 20);
                summary = result.success
                  ? `📖 ${fileName}`
                  : `✗ ${fileName}`;
              } else if (tool === 'writeFile') {
                const filePath = input.filePath || '';
                const fileName = filePath.split('/').pop().substring(0, 20);
                summary = result.success
                  ? `✍️ ${fileName}`
                  : `✗ ${fileName}`;
              } else if (tool === 'editFile') {
                const filePath = input.filePath || '';
                const fileName = filePath.split('/').pop().substring(0, 20);
                summary = result.success
                  ? `✏️ ${fileName}`
                  : `✗ ${fileName}`;
              } else {
                summary = result.success
                  ? `✓ ${tool}`
                  : `✗ ${tool}`;
              }

              newExecs[newExecs.length - 1] = {
                ...lastExec,
                result: progress.result,
                summary: summary
              };
              return newExecs;
            });
          }
        }
      );
      
      abortControllerRef.current = null;

      // 更新最后的消息为完整响应
      setMessages(prev => {
        const lastIdx = prev.findIndex(m => m.role === 'assistant' && !m.complete);
        if (lastIdx >= 0) {
          return [
            ...prev.slice(0, lastIdx),
            {
              role: 'assistant',
              content: response.content,
              complete: true,
              toolCalls: response.toolCalls,
              key: Date.now()
            }
          ];
        } else {
          return [...prev, {
            role: 'assistant',
            content: response.content,
            complete: true,
            toolCalls: response.toolCalls,
            key: Date.now()
          }];
        }
      });

    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'error',
        content: `Error: ${error.message}`,
        key: Date.now()
      }]);
    } finally {
      setIsProcessing(false);
      setActivity(null);
    }
  }, [conversation, isProcessing]);

  // 处理命令
  const handleCommand = async (cmd) => {
    const parts = cmd.split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    switch (command) {
      case '/clear':
        setActivity('🗑️ 清除对话历史...');
        setMessages([]);
        conversation.clearHistory();
        setActivity(null);
        break;

      case '/plan':
        if (args.length === 0) {
          setMessages(prev => [...prev, {
            role: 'system',
            content: 'Usage: /plan <task description>'
          }]);
          return;
        }
        setActivity('📋 规划任务...');
        setStatus('Planning...');
        const planResult = await conversation.planAndExecute(args.join(' '), (progress) => {
          if (progress.type === 'plan_created' || progress.type === 'plan_ready') {
            setActivity('📋 任务计划已创建');
            setCurrentPlan(progress.plan);
          } else if (progress.type === 'step_start') {
            setActivity(`⚙️ ${progress.step.description}`);
            setCurrentPlan(progress.plan);
          } else if (progress.type === 'step_complete' || progress.type === 'step_failed') {
            setCurrentPlan(progress.plan);
          }
        });
        setStatus('Ready');
        setActivity(null);
        setMessages(prev => [...prev, {
          role: 'system',
          content: `✅ Plan ${planResult.success ? 'completed' : 'failed'}`
        }]);
        break;

      case '/learn':
        setActivity('🧠 学习项目模式...');
        setStatus('Learning...');
        await conversation.learnProject();
        setMessages(prev => [...prev, {
          role: 'system',
          content: 'Project patterns learned successfully!'
        }]);
        setStatus('Ready');
        setActivity(null);
        break;

      case '/status':
        setActivity('📊 获取统计信息...');
        const summary = conversation.getSummary();
        setMessages(prev => [...prev, {
          role: 'system',
          content: JSON.stringify(summary, null, 2)
        }]);
        setActivity(null);
        break;

      case '/export':
        if (args.length === 0) {
          setMessages(prev => [...prev, {
            role: 'system',
            content: 'Usage: /export <filename> - Export conversation to a text file'
          }]);
          return;
        }
        setActivity('📤 导出对话...');
        const filename = args.join(' ');
        await exportConversation(conversation, filename);
        setMessages(prev => [...prev, {
          role: 'system',
          content: `✅ Conversation exported to: ${filename}`
        }]);
        setActivity(null);
        break;

      case '/help':
        setMessages(prev => [...prev, {
          role: 'system',
          content: `Available commands:
/clear - Clear conversation history
/export <filename> - Export conversation to a text file
/plan <task> - Create and execute a task plan
/learn - Learn project patterns
/status - Show conversation summary
/help - Show this help message`
        }]);
        break;

      default:
        setMessages(prev => [...prev, {
          role: 'system',
          content: `Unknown command: ${command}. Type /help for available commands.`
        }]);
    }
  };

  if (!config) {
    return (
      <Box padding={1}>
        <Text>Loading Closer Code...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1} height="100%">
      {/* 顶部状态栏 */}
      <Box
        borderStyle="bold"
        borderColor="magenta"
        paddingX={1}
        marginBottom={1}
      >
        <Box flexGrow={1}>
          <Text bold color="magenta">Closer Code</Text>
          <Text dim> - AI Programming Assistant</Text>
        </Box>
        <Text dim color="gray">|</Text>
        <Box marginLeft={1}>
          <Text color={isProcessing ? 'yellow' : 'green'}>
            {isProcessing ? '● Processing' : '● ' + status}
          </Text>
        </Box>
      </Box>

      {/* Thinking 区域 - 占17.5%高度 */}
      <Box
        borderStyle="round"
        borderColor="cyan"
        flexDirection="column"
        flexGrow={17.5}
        marginBottom={1}
        width="100%"
      >
        <Box borderBottom={false} borderColor="cyan" paddingBottom={0} marginBottom={1}>
          <Text bold color="cyan">
            🧠 AI Thinking Process ({thinking.length})
            <Text dim color="gray"> [Tab: {thinkingEnabled ? 'ON ✅' : 'OFF ❌'}] [Shift+↑/↓: Scroll]</Text>
          </Text>
        </Box>
        <Box flexGrow={1} flexDirection="column" overflow="hidden" width="100%">
          {thinkingLines.length > 0 ? (
            <>
              {/* 滚动提示 */}
              {thinkingScrollPosition > 0 && (
                <Box marginBottom={1} width="100%">
                  <Text dim color="cyan">↑ Line {thinkingScrollPosition + 1} of {thinkingLines.length} - Press Shift+↓ to scroll</Text>
                </Box>
              )}
              {thinkingScrollPosition + thinkingHeight < thinkingLines.length && (
                <Box marginBottom={1} width="100%">
                  <Text dim color="cyan">↓ {thinkingLines.length - thinkingScrollPosition - thinkingHeight} more thoughts below</Text>
                </Box>
              )}
              <ScrollContainer
                items={thinkingLines}
                height={thinkingHeight}
                scrollPosition={thinkingScrollPosition}
              />
            </>
          ) : (
            <Box justifyContent="center" alignItems="center" height="100%">
              <Text dim color="gray">No thinking messages yet</Text>
            </Box>
          )}
        </Box>
      </Box>

      {/* 主内容区域 - 占剩余65% */}
      <Box flexGrow={65} flexDirection="row">
        <Box width="100%">
          {/* 左侧：对话面板 - 占67%宽度 */}
          <Box
            borderStyle="round"
            borderColor="blue"
            flexDirection="column"
            flexGrow={67}
            marginRight={1}
            width="67%"
            height="100%"
          >
            <Box borderBottom={false} borderColor="blue" paddingBottom={0} marginBottom={1}>
              <Text bold color="blue">💬 Conversation</Text>
            </Box>
            <Box flexDirection="column" overflow="hidden" width="100%" height="100%">
              {messageLines.length > 0 ? (
                <>
                  {/* 滚动提示 */}
                  {scrollPosition > 0 && (
                    <Box marginBottom={1} width="100%">
                      <Text dim color="blue">↑ Line {scrollPosition + 1} of {messageLines.length} - Press Alt+↓ or PageDown to scroll</Text>
                    </Box>
                  )}
                  {scrollPosition + conversationHeight < messageLines.length && (
                    <Box marginBottom={1} width="100%">
                      <Text dim color="blue">↓ {messageLines.length - scrollPosition - conversationHeight} more lines below</Text>
                    </Box>
                  )}
                  <ScrollContainer
                    items={messageLines}
                    height={conversationHeight}
                    scrollPosition={scrollPosition}
                  />
                </>
              ) : (
                <Box justifyContent="center" alignItems="center" height="100%">
                  <Text dim>No messages yet</Text>
                </Box>
              )}
            </Box>
          </Box>

          {/* 右侧：任务和工具面板 - 占33%宽度 */}
          <Box flexDirection="column" flexGrow={33} width="33%" height="100%">
            {/* 任务进度 - 占50%高度 */}
            <Box
              borderStyle="round"
              borderColor="yellow"
              flexDirection="column"
              flexGrow={50}
              marginBottom={1}
              width="100%"
            >
              <Box borderBottom={false} borderColor="yellow" paddingBottom={0} marginBottom={1}>
                <Text bold color="yellow">📋 Task Progress</Text>
              </Box>
              {currentPlan ? (
                <TaskProgress plan={currentPlan} />
              ) : (
                <Text dim>No active task</Text>
              )}
            </Box>

            {/* 工具执行 - 占50%高度 */}
            <Box
              borderStyle="round"
              borderColor="green"
              flexDirection="column"
              flexGrow={50}
              width="100%"
            >
              <Box borderBottom={false} borderColor="green" paddingBottom={0} marginBottom={1}>
                <Text bold color="green">🔧 Tool Execution</Text>
              </Box>
              <Box flexDirection="column" overflow="hidden" width="100%">
                {toolExecutions.slice(-3).map((exec, i) => (
                  <ToolExecution key={i} {...exec} />
                ))}
                {toolExecutions.length === 0 && (
                  <Text dim>No tools executed yet</Text>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* 活动提示 */}
      {activity && (
        <Box
          borderStyle="round"
          borderColor={abortMessage ? "red" : "yellow"}
          paddingX={1}
          marginTop={1}
          marginBottom={1}
        >
          <Text bold color={abortMessage ? "red" : "yellow"}>{activity}</Text>
        </Box>
      )}

      {/* 退出提示 */}
      {showExitHint && (
        <Box
          borderStyle="round"
          borderColor="red"
          paddingX={1}
          marginTop={1}
          marginBottom={1}
        >
          <Text bold color="red">⚠️ 再次按 Ctrl+C 或 ESC 退出程序 (1.5秒内)</Text>
        </Box>
      )}

      {/* 输入区域 */}
      <Box
        borderStyle="double"
        borderColor="cyan"
        paddingX={1}
        marginTop={activity ? 0 : 1}
      >
        <Box marginRight={1}>
          <Text bold color="cyan">❯</Text>
        </Box>
        <TextInput
          value={input}
          onChange={(value) => {
            setInput(value);
            inputRef.current = value;
          }}
          onSubmit={handleSubmit}
          placeholder="Type a message or /help for commands..."
          disabled={isProcessing}
        />
      </Box>
    </Box>
  );
}

// 导出对话到文本文件
export async function exportConversation(conversation, filename) {
  try {
    const exportData = conversation.export();
    const messages = exportData.messages || [];

    // 生成文本格式
    let textContent = '';
    textContent += '='.repeat(80) + '\n';
    textContent += 'Closer Code - Conversation Export\n';
    textContent += '='.repeat(80) + '\n';
    textContent += `Export Date: ${new Date().toLocaleString('zh-CN')}\n`;
    textContent += `Total Messages: ${messages.length}\n`;
    textContent += '='.repeat(80) + '\n\n';

    messages.forEach((msg, index) => {
      const role = msg.role || 'unknown';
      const roleLabel = {
        'user': '👤 User',
        'assistant': '🤖 Assistant',
        'system': 'ℹ️ System',
        'error': '❌ Error'
      }[role] || role;

      textContent += `[${index + 1}] ${roleLabel}\n`;
      textContent += '-'.repeat(80) + '\n';

      const content = msg.content;
      if (typeof content === 'string') {
        textContent += content + '\n';
      } else if (Array.isArray(content)) {
        // 处理工具调用等复杂内容
        content.forEach(block => {
          if (block.type === 'text') {
            textContent += block.text + '\n';
          } else if (block.type === 'tool_use') {
            textContent += `[Tool: ${block.name}]\n`;
            textContent += JSON.stringify(block.input, null, 2) + '\n';
          } else if (block.type === 'tool_result') {
            textContent += `[Tool Result]\n`;
            textContent += block.content + '\n';
          }
        });
      } else {
        textContent += JSON.stringify(content, null, 2) + '\n';
      }

      textContent += '\n';
    });

    textContent += '='.repeat(80) + '\n';
    textContent += 'End of Export\n';
    textContent += '='.repeat(80) + '\n';

    // 确保文件名有 .txt 扩展名
    let finalFilename = filename;
    if (!filename.endsWith('.txt')) {
      finalFilename = filename + '.txt';
    }

    // 写入文件
    fs.writeFileSync(finalFilename, textContent, 'utf-8');

    return { success: true, path: finalFilename };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 启动应用
render(<App />, {exitOnCtrlC: false});

// 注意：不在这里设置 SIGINT 处理器，因为 useInput 会处理 Ctrl+C
// 如果在这里设置，会导致第一次 Ctrl+C 就直接退出
