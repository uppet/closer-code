#!/usr/bin/env node
/**
 * Closer Code - AI 编程助理 CLI
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { render, Box, Text } from 'ink';
import { useInput } from 'ink';
import { createConversation } from './conversation.js';
import { getConfig, updateConfig, getConfigPaths } from './config.js';
import { generateToolSummary } from './tools.js';
import { createShortcutManager } from './shortcuts.js';
import { createSnippetManager, SNIPPET_TEMPLATES } from './snippets.js';
import { createHistoryManager } from './input/history.js';
import { EnhancedTextInputWithShortcuts } from './input/enhanced-input.jsx';
import FullscreenConversation from './components/fullscreen-conversation.jsx';
import { ToolDetailPanel } from './components/tool-detail-view.jsx';
import { safeSuspend, getPlatformName } from './utils/platform.js';
import { useSmartThrottledState } from './hooks/use-throttled-state.js';
import { executeSlashCommand } from './commands/slash-commands.js';
import fs from 'fs';
import path from 'path';

// 面板组件
function Panel({ title, children, borderColor = 'gray', flex = 1 }) {
  return (
    <Box
      borderTop={true}
      borderBottom={true}
      borderLeft={false}
      borderRight={false}
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
function ToolExecution({ summary, detailInfo, timestamp }) {
  return (
    <Box flexDirection="column" marginBottom={1} paddingX={1} borderStyle="single" borderColor="gray" width="100%">
      {/* 第一行：简短摘要 */}
      <Box width="100%">
        <Text>{summary}</Text>
        <Text dim> [{timestamp}]</Text>
      </Box>
      {/* 第二行：详细信息 */}
      {detailInfo && (
        <Box width="100%">
          <Text dim color="gray">{detailInfo}</Text>
        </Box>
      )}
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
  const contentWidth = maxWidth - prefixLength - 4; // 留出更多边距
  const contentIndent = '    '; // 4个空格缩进，确保内容不被遮挡

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
          text: contentIndent + chunk, // 使用4个空格缩进
          color: color,
          type: 'content'
        });
      }
    } else {
      lines.push({
        text: contentIndent + (line || ''), // 使用4个空格缩进，空行也显示
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
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [showToolsInFullscreen, setShowToolsInFullscreen] = useState(true); // 全屏模式下是否显示工具
  const [currentPlan, setCurrentPlan] = useState(null);
  const [toolExecutions, setToolExecutions] = useState([]);
  const [status, setStatus] = useState('Initializing...');
  const [messageCounter, setMessageCounter] = useState(0);
  const [activity, setActivity] = useState(null); // 当前活动描述
  const [thinking, setThinking] = useState([]); // AI 思考过程
  const [thinkingEnabled, setThinkingEnabled] = useState(true); // Thinking 开关状态
  const [thinkingScrollPosition, setThinkingScrollPosition] = useState(0); // Thinking滚动位置
  const [showToolDetail, setShowToolDetail] = useState(false); // 工具详情面板开关
  const [toolDetailIndex, setToolDetailIndex] = useState(0); // 工具详情面板选中索引

  // 节流更新 Hook
  const activityUpdate = useSmartThrottledState(setActivity, {
    throttleDelay: 1500,
    immediateTypes: ['error', 'abort']
  });

  const thinkingUpdate = useSmartThrottledState(setThinking, {
    throttleDelay: 1500,
    immediateTypes: ['tool_start', 'tool_complete', 'thinking_signature',
                    'thinking_redacted', 'abort']
  });

  const messagesUpdate = useSmartThrottledState(setMessages, {
    throttleDelay: 1500,
    immediateTypes: ['user', 'error', 'system']
  });

  const toolExecutionsUpdate = useSmartThrottledState(setToolExecutions, {
    throttleDelay: 1500,
    immediateTypes: ['complete', 'error']
  });

  const planUpdate = useSmartThrottledState(setCurrentPlan, {
    throttleDelay: 1500,
    immediateTypes: ['completed', 'failed']
  });

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

  // 监听 SIGCONT (fg 恢复信号)
  useEffect(() => {
    const handleContinue = () => {
      // 恢复 raw mode
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
      }

      // 清屏重绘
      console.clear();

      // 强制刷新终端尺寸，触发重新渲染
      setTerminalSize({
        columns: process.stdout.columns || 80,
        rows: process.stdout.rows || 30
      });
    };

    process.on('SIGCONT', handleContinue);

    return () => {
      process.off('SIGCONT', handleContinue);
    };
  }, []);

  // 自定义滚动管理
  const [messageLines, setMessageLines] = useState([]); // 所有消息行
  const [scrollPosition, setScrollPosition] = useState(0); // 当前滚动位置
  const conversationHeight = Math.floor(terminalSize.rows * 0.65) - 4; // Conversation区域高度（行数）

  // Thinking区域滚动管理
  const [thinkingLines, setThinkingLines] = useState([]); // 所有thinking行
  const thinkingHeight = 4; // Thinking区域固定显示4行（增加1行以便更好查看标题）

  // Ctrl+C 退出控制
  const [lastCtrlC, setLastCtrlC] = useState(0);
  const [showExitHint, setShowExitHint] = useState(false);
  const [abortMessage, setAbortMessage] = useState(null); // 中止任务的提示
  const [aborting, setAborting] = useState(false); // 是否正在中止
  const conversationRef = useRef(null); // Conversation 对象引用
  const inputRef = useRef(''); // 用于在 useInput 中获取最新的 input 值
  // 历史记录管理器
  const [inputHistory] = useState(() => createHistoryManager({ maxSize: 100 }));

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
    // 处理 Ctrl+Z - 挂起程序（发送 SIGTSTP 信号）
    if (key.ctrl && input === 'z') {
      // 使用安全的挂起函数
      const success = safeSuspend();

      if (!success) {
        // 挂起失败或不支持，显示提示
        console.log(`\n⚠️  ${getPlatformName()} 不支持 Ctrl+Z 挂起\n`);
        console.log('替代方案：');
        console.log('  - 使用 Ctrl+C 退出程序');
        console.log('  - 或使用 Ctrl+G 切换全屏模式\n');
      }
      return;
    }

    // 处理 Ctrl+G - 切换全屏模式
    if (key.ctrl && input === 'g') {
      setFullscreenMode(prev => !prev);
      return;
    }

    // 处理 Ctrl+T - 全屏模式下切换工具显示，普通模式下切换工具详情面板
    if (key.ctrl && input === 't') {
      if (fullscreenMode) {
        // 全屏模式：切换工具显示
        setShowToolsInFullscreen(prev => {
          const newValue = !prev;
          setActivity(newValue ? '🔧 工具显示已开启' : '🚫 工具显示已关闭');
          setTimeout(() => setActivity(null), 1500);
          return newValue;
        });
      } else {
        // 普通模式：切换工具详情面板
        setShowToolDetail(prev => {
          const newValue = !prev;
          setActivity(newValue ? '📋 工具详情面板已打开' : '📋 工具详情面板已关闭');
          setTimeout(() => setActivity(null), 1500);
          return newValue;
        });
      }
      return;
    }

    // 处理 Ctrl+C 和 ESC（始终有效，即使在输入模式）
    if ((key.ctrl && input === 'c') || key.escape) {
      const now = Date.now();

      if (isProcessing) {
        // 如果 AI 正在执行，中止对话
        handleAbort();
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

    // 方向键：让 MultilineTextInput 处理历史记录导航和多行光标移动
    // 父组件不再拦截这些事件
    if (key.upArrow || key.downArrow) {
      // 始终让子组件处理
      return false;
    }

    // 处理滚动（使用自定义滚动系统）
    // PageUp/PageDown - 始终可用于滚动
    else if (key.pageUp) {
      const delta = Math.min(10, conversationHeight);
      setScrollPosition(prev => Math.max(0, prev - delta));
    } else if (key.pageDown) {
      const delta = Math.min(10, conversationHeight);
      const maxPosition = Math.max(0, messageLines.length - conversationHeight);
      setScrollPosition(prev => Math.min(maxPosition, prev + delta));
    }
    // Alt 键组合 - 始终可用
    else if (key.alt && key.upArrow) {
      setScrollPosition(prev => Math.max(0, prev - 1));
    } else if (key.alt && key.downArrow) {
      const maxPosition = Math.max(0, messageLines.length - conversationHeight);
      setScrollPosition(prev => Math.min(maxPosition, prev + 1));
    }
    // Shift + 方向键 - 工具详情面板打开时切换工具，否则滚动Thinking区域
    else if (key.shift && key.upArrow) {
      if (showToolDetail && toolExecutions.length > 0) {
        setToolDetailIndex(prev => Math.max(0, prev - 1));
      } else {
        setThinkingScrollPosition(prev => Math.max(0, prev - 1));
      }
    } else if (key.shift && key.downArrow) {
      if (showToolDetail && toolExecutions.length > 0) {
        setToolDetailIndex(prev => Math.min(toolExecutions.length - 1, prev + 1));
      } else {
        const maxPosition = Math.max(0, thinkingLines.length - thinkingHeight);
        setThinkingScrollPosition(prev => Math.min(maxPosition, prev + 1));
      }
    }
  }, { capture: true }); // capture: true 确保能捕获按键

  // Token 统计状态
  const [tokenStats, setTokenStats] = useState({
    total: 0,
    limit: 4096, // 默认token限制
    input: 0,
    output: 0,
    percentage: 0
  });

  // 初始化
  useEffect(() => {
    async function init() {
      try {
        const cfg = getConfig();
        setConfig(cfg);

        // 从配置中获取token限制
        const provider = cfg.ai?.provider || 'anthropic';
        const tokenLimit = cfg.ai?.[provider]?.maxTokens || 4096;

        // 更新token统计状态
        setTokenStats(prev => ({
          ...prev,
          limit: tokenLimit
        }));

        const conv = await createConversation(cfg);
        setConversation(conv);
        conversationRef.current = conv; // 保存引用

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


  // 更新token统计信息
  const updateTokenStats = useCallback((newInputTokens = 0, newOutputTokens = 0) => {
    setTokenStats(prev => {
      const newInput = prev.input + newInputTokens;
      const newOutput = prev.output + newOutputTokens;
      const newTotal = newInput + newOutput;
      const newPercentage = Math.round((newTotal / prev.limit) * 100);

      return {
        ...prev,
        input: newInput,
        output: newOutput,
        total: newTotal,
        percentage: newPercentage
      };
    });
  }, []);

  // 估算用户消息的token数（在没有API计数的情况下使用）
  const estimateUserTokens = useCallback((text) => {
    // 简单估算：中文字符和英文字符分别处理
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishChars = text.length - chineseChars;
    // 中文字符约2-3个token，英文字符约0.25个token（按单词计算）
    return Math.ceil(chineseChars * 2.5 + englishChars * 0.25);
  }, []);

  /**
   * 处理 Ctrl+C 中止
   * 使用 Abort Fence 机制中止当前对话
   */
  const handleAbort = useCallback(async () => {
    if (!isProcessing || aborting) {
      return;
    }

    setAborting(true);
    setActivity('⚠️ 正在中止任务...');
    setThinking(prev => [...prev, `⚠️ [${new Date().toLocaleTimeString()}] 正在中止当前任务...`]);

    try {
      if (conversationRef.current) {
        // 调用 Conversation 的 abortCurrentPhase 方法
        await conversationRef.current.abortCurrentPhase();
      }
    } catch (error) {
      console.error('[Abort Error]', error.message);
      setThinking(prev => [...prev, `❌ [${new Date().toLocaleTimeString()}] 中止失败: ${error.message}`]);
    } finally {
      setAborting(false);
      setIsProcessing(false);
      setActivity('❌ 任务已中止');
      setAbortMessage('❌ AI 执行已被中止');

      // 3秒后清除中止提示
      setTimeout(() => {
        setAbortMessage(null);
        setActivity(null);
      }, 3000);
    }
  }, [isProcessing, aborting]);

  // 处理用户输入
  const handleSubmit = useCallback(async (value) => {
    if (!conversation || isProcessing) {
      // 如果正在中止，等待
      if (aborting) {
        setActivity('⏳ 等待中止完成...');
      }
      return;
    }

    setInput('');
    setIsProcessing(true);
    setActivity('📤 发送消息到 AI...');

    // 添加用户消息
    const userMsg = { role: 'user', content: value };
    setMessages(prev => [...prev, userMsg]);

    // 估算用户消息的token数（在没有API计数的情况下使用）
    const userTokens = estimateUserTokens(value);
    updateTokenStats(userTokens, 0);

    // 处理特殊命令
    if (value.startsWith('/')) {
      await handleCommand(value);
      setIsProcessing(false);
      setActivity(null);
      return;
    }

    try {
      // 记录思考开始
      setThinking(prev => [...prev, `🤔 [${new Date().toLocaleTimeString()}] 开始分析用户请求...`]);

      // 发送到 AI（Conversation 内部会管理 AbortController）
      setActivity('🤔 AI 正在思考...');
      const response = await conversation.sendMessage(
        value,
        (progress) => {
          // 处理流式响应（使用 SDK 事件监听器 API）
          if (progress.type === 'thinking') {
            // AI thinking 内容 - 逐字显示（使用节流更新）
            activityUpdate.updateImmediate('🤔 AI 正在深度思考...');
            thinkingUpdate.updateSmart(prev => {
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
            }, 'thinking');
          } else if (progress.type === 'thinking_signature') {
            // Thinking 签名（立即更新）
            thinkingUpdate.updateSmart(prev => {
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
            }, 'thinking_signature');
          } else if (progress.type === 'thinking_redacted') {
            // Redacted thinking（立即更新）
            thinkingUpdate.updateSmart(prev => {
              const newThinking = [...prev];
              newThinking.push(`🔒 [${new Date().toLocaleTimeString()}] Redacted thinking: ${progress.content}`);
              return newThinking.slice(-10);
            }, 'thinking_redacted');
          } else if (progress.type === 'token') {
            // 真正的流式文本（使用节流更新）
            activityUpdate.updateImmediate('✍️ AI 正在输入...');
            thinkingUpdate.updateThrottled(prev => [...prev, `✍️ [${new Date().toLocaleTimeString()}] 生成响应中...`]);
            messagesUpdate.updateSmart(prev => {
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
            activityUpdate.updateImmediate(`⚡ 准备执行工具: ${progress.toolName}...`);
            thinkingUpdate.updateSmart(prev => [...prev, thinkingMsg], 'tool_start');
          } else if (progress.type === 'plan_created') {
            // AI Planning 被创建
            planUpdate.updateImmediate(progress.plan);
            thinkingUpdate.updateThrottled(prev => [...prev, `📋 [${new Date().toLocaleTimeString()}] AI Planning 已创建`]);
          } else if (progress.type === 'plan_progress') {
            // AI Planning 进度更新（节流更新）
            planUpdate.updateThrottled(progress.plan);
          } else if (progress.type === 'tool_start') {
            const thinkingMsg = `⚡ [${new Date().toLocaleTimeString()}] 调用工具: ${progress.tool}`;
            activityUpdate.updateImmediate(`⚡ 执行工具: ${progress.tool}...`);
            thinkingUpdate.updateSmart(prev => [...prev, thinkingMsg], 'tool_start');
            // 存储工具信息，包括 input 和 result 引用（用于生成摘要）
            toolExecutionsUpdate.updateSmart(prev => {
              const newExecs = [...prev, {
                id: Date.now(),
                tool: progress.tool,
                timestamp: new Date().toLocaleTimeString(),
                input: progress.input,
                result: null,
                status: 'running',
                startTime: Date.now(),
                duration: null
              }];
              // 只保留最近 10 个
              const sliced = newExecs.slice(-10);
              // 自动将索引指向最新的工具
              setToolDetailIndex(sliced.length - 1);
              return sliced;
            }, 'tool_start');
          } else if (progress.type === 'tool_complete') {
            const resultMsg = progress.result.success ? '✓ 成功' : '✗ 失败';
            activityUpdate.updateImmediate('📊 处理工具结果...');
            thinkingUpdate.updateSmart(prev => [...prev, `📊 [${new Date().toLocaleTimeString()}] 工具执行结果: ${resultMsg}`], 'tool_complete');
            // 更新工具执行结果，并生成摘要
            toolExecutionsUpdate.updateSmart(prev => {
              if (prev.length === 0) return prev;
              const newExecs = [...prev];
              // 找到最后一个 running 状态的工具
              const lastRunningIdx = newExecs.findLastIndex(e => e.status === 'running');
              if (lastRunningIdx === -1) return prev;
              const lastExec = newExecs[lastRunningIdx];

              // 使用 generateToolSummary 生成双行显示
              const { summary, detailInfo } = generateToolSummary(
                lastExec.tool,
                lastExec.input || {},
                progress.result
              );

              newExecs[lastRunningIdx] = {
                ...lastExec,
                result: progress.result,
                status: progress.result.success ? 'success' : 'error',
                duration: Date.now() - lastExec.startTime,
                summary,
                detailInfo
              };
              return newExecs;
            });
          }
        }
      );

      // 检查是否是 abort 结果
      if (response.aborted) {
        thinkingUpdate.updateSmart(prev => [...prev, `❌ [${new Date().toLocaleTimeString()}] 对话已中止: ${response.abortReason}`], 'abort');
        return;
      }

      // 使用API返回的准确token使用信息
      if (response.usage) {
        const { input_tokens = 0, output_tokens = 0 } = response.usage;
        updateTokenStats(input_tokens, output_tokens);

        // 在thinking中记录准确的token使用
        thinkingUpdate.updateSmart(prev => [...prev, `📊 [${new Date().toLocaleTimeString()}] API Token使用: 输入=${input_tokens}, 输出=${output_tokens}`], 'thinking');
      } else {
        // 如果没有usage信息，使用估算
        const aiTokens = Math.ceil(response.content.length / 4);
        updateTokenStats(0, aiTokens);
      }

      // 更新最后的消息为完整响应
      messagesUpdate.updateSmart(prev => {
        const lastIdx = prev.findIndex(m => m.role === 'assistant' && !m.complete);
        if (lastIdx >= 0) {
          return [
            ...prev.slice(0, lastIdx),
            {
              role: 'assistant',
              content: response.content,
              complete: true,
              toolCalls: response.toolCalls,
              usage: response.usage,
              key: Date.now()
            }
          ];
        } else {
          return [...prev, {
            role: 'assistant',
            content: response.content,
            complete: true,
            toolCalls: response.toolCalls,
            usage: response.usage,
            key: Date.now()
          }];
        }
      });

    } catch (error) {
      messagesUpdate.updateSmart(prev => [...prev, {
        role: 'error',
        content: `Error: ${error.message}`,
        key: Date.now()
      }], 'error');
    } finally {
      setIsProcessing(false);
      activityUpdate.updateImmediate(null);
    }
  }, [conversation, isProcessing, updateTokenStats]);

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
        // 重置token统计
        setTokenStats({
          total: 0,
          limit: tokenStats.limit, // 保持原有的限制
          input: 0,
          output: 0,
          percentage: 0
        });
        setActivity(null);
        break;

      case '/skills': {
        setActivity('🎯 获取技能系统状态...');
        const result = await executeSlashCommand(cmd, { 
          markdown: true,
          conversation: conversation 
        });
        if (result && result.success) {
          setMessages(prev => [...prev, {
            role: 'system',
            content: result.content
          }]);
        }
        setActivity(null);
        break;
      }

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

      case '/keys': {
        const result = executeSlashCommand(cmd, { markdown: true });
        if (result && result.success) {
          setMessages(prev => [...prev, {
            role: 'system',
            content: result.content
          }]);
        }
        break;
      }

      case '/help':
        setMessages(prev => [...prev, {
          role: 'system',
          content: `Available commands:
/clear - Clear conversation history
/export <filename> - Export conversation to a text file
/plan <task> - Create and execute a task plan
/learn - Learn project patterns
/status - Show conversation summary
/history - Show input history statistics
/keys - Show keyboard shortcuts reference
/config - Show current configuration
/skills - Show skills system status
/help - Show this help message`
        }]);
        break;

      case '/config': {
        setActivity('⚙️ 加载配置信息...');
        const result = executeSlashCommand(cmd, { markdown: true });
        if (result && result.success) {
          setMessages(prev => [...prev, {
            role: 'system',
            content: result.content
          }]);
        }
        setActivity(null);
        break;
      }

      case '/history':
        setActivity('📊 获取历史记录统计...');
        const historyStats = inputHistory.getStats();
        const historyInfo = {
          role: 'system',
          content: `Input History Statistics:
• Total entries: ${historyStats.total}
• Current index: ${historyStats.currentIndex}
• Search results: ${historyStats.searchResults}
• History file: ~/.closer-code/closer-input-history

Tips:
• Use ↑/↓ arrows to browse history
• History is automatically saved
• Duplicate entries are filtered`
        };
        setMessages(prev => [...prev, historyInfo]);
        setActivity(null);
        break;

      default:
        setMessages(prev => [...prev, {
          role: 'system',
          content: `Unknown command: ${command}. Type /help for available commands.`
        }]);
    }
  };

  // 根据token使用情况确定颜色
  const getTokenColor = () => {
    const percentage = tokenStats.percentage;
    if (percentage < 70) return 'green';
    if (percentage < 90) return 'yellow';
    return 'red';
  };


  // 全屏模式：显示完整对话历史（包含工具详情）
  if (fullscreenMode) {
    return (
      <FullscreenConversation
        messages={messages}
        tokenStats={tokenStats}
        toolExecutions={toolExecutions}
        showTools={showToolsInFullscreen}
      />
    );
  }
  if (!config) {
    return (
      <Box padding={1}>
        <Text>Loading Closer Code...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
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
        borderTop={true}
        borderBottom={true}
        borderLeft={false}
        borderRight={false}
	borderStyle="single"
        borderColor="cyan"
        flexDirection="column"
        marginBottom={1}
        width="100%"
      >
        <Box borderBottom={false} borderColor="cyan" paddingBottom={0} marginBottom={1}>
          <Text bold color="cyan">
            🧠 AI Thinking Process ({thinking.length})
            <Text dim color="gray"> [Tab: {thinkingEnabled ? 'ON ✅' : 'OFF ❌'}] [Shift+↑/↓: Scroll]</Text>
          </Text>
        </Box>
        <Box  flexDirection="column" width="100%">
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
            <Box justifyContent="center" alignItems="center">
              <Text dim color="gray">No thinking messages yet</Text>
            </Box>
          )}
        </Box>
      </Box>

      {/* 主内容区域 - 工具详情面板打开时占50%，否则占65% */}
      <Box flexDirection="row">
        <Box width="100%">
          {/* 左侧：对话面板 - 占67%宽度 */}
          <Box
            borderColor="blue"
            borderTop={true}
            borderBottom={true}
            borderLeft={false}
            borderRight={false}
	    borderStyle="single"
            flexDirection="column"
            flexGrow={67}
            marginRight={1}
            width="67%"
            height="60%"
          >
            <Box borderBottom={false} borderColor="blue" paddingBottom={0} marginBottom={1}>
              <Text bold color="blue">
                💬 Conversation
                <Text color={getTokenColor()}> [Tokens: {tokenStats.total.toLocaleString()}/{tokenStats.limit.toLocaleString()}]</Text>
              </Text>
            </Box>
            <Box flexDirection="column" overflow="hidden" width="100%">
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
                <Box justifyContent="center" alignItems="center" height="60%">
                  <Text dim>No messages yet</Text>
                </Box>
              )}
            </Box>
          </Box>

          {/* 右侧：任务和工具面板 - 占33%宽度 */}
          <Box flexDirection="column" flexGrow={33} width="33%" height="60%">
            {/* 任务进度 - 占46%高度（减少4个单位以减少2行高度） */}
            <Box
              borderTop={true}
              borderBottom={true}
              borderLeft={false}
              borderRight={false}
	      borderStyle="single"
              borderColor="yellow"
              flexDirection="column"
              flexGrow={46}
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

            {/* 工具执行 - 占54%高度（相应增加以保持平衡） */}
            <Box
              borderTop={true}
              borderBottom={true}
              borderLeft={false}
              borderRight={false}
	      borderStyle="single"
              borderColor="green"
              flexDirection="column"
              flexGrow={54}
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
          borderTop={true}
          borderBottom={true}
          borderStyle="single"
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
          borderTop={true}
          borderBottom={true}
          borderStyle="single"
          borderColor="red"
          paddingX={1}
          marginTop={1}
          marginBottom={1}
        >
          <Text bold color="red">⚠️ 再次按 Ctrl+C 或 ESC 退出程序 (1.5秒内)</Text>
        </Box>
      )}

      {/* 工具详情面板 - 当打开时占用较大空间 */}
      {showToolDetail && (
        <ToolDetailPanel
          tools={toolExecutions}
          visible={showToolDetail}
          onClose={() => setShowToolDetail(false)}
          height={Math.floor(terminalSize.rows * 0.45)}
          selectedIndex={toolDetailIndex}
        />
      )}

      {/* 输入区域 */}
      <Box flexDirection="column" marginTop={activity ? 0 : 1}>
        {/* 输入区域标记 */}
        <Box marginBottom={1} paddingLeft={1}>
          <Text dim color="cyan">
            {isProcessing ? '⏳ 处理中...' : '▶ 输入消息'}
          </Text>
          <Text dim color="gray">
            {' '}(Enter发送, Ctrl+Enter换行)
          </Text>
        </Box>

        {/* 输入框 - 无边框，方便鼠标复制 */}
        <Box paddingLeft={1} paddingRight={1}>
          <EnhancedTextInputWithShortcuts
            value={input}
            onChange={(value) => {
              setInput(value);
              inputRef.current = value;
            }}
            onSubmit={handleSubmit}
            placeholder="在这里输入..."
            disabled={isProcessing}
            history={inputHistory}
            showHistoryIndicator={true}
          />
        </Box>
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
