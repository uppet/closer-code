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
function MessageItem({ message }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isError = message.role === 'error';

  const color = isUser ? 'cyan' : isError ? 'red' : isSystem ? 'yellow' : 'white';
  const prefix = isUser ? '👤 ' : isError ? '❌ ' : isSystem ? 'ℹ️ ' : '🤖 ';
  const content = typeof message.content === 'string'
    ? message.content
    : JSON.stringify(message.content);

  // 限制消息的最大行数和字符数
  const maxLines = 10;
  const maxChars = 1000;

  const lines = content.split('\n');
  let displayContent = content;
  let isTruncated = false;

  if (content.length > maxChars) {
    displayContent = content.slice(0, maxChars);
    isTruncated = true;
  }

  const displayLines = displayContent.split('\n');
  if (displayLines.length > maxLines) {
    displayContent = displayLines.slice(0, maxLines).join('\n');
    isTruncated = true;
  }

  return (
    <Box marginBottom={1} flexDirection="column" width="100%">
      <Box width="100%">
        <Text dim color={color}>
          {prefix}
        </Text>
        <Text color={color} wrap="wrap">{displayContent}</Text>
        {isTruncated && (
          <Text dim color="gray">... (truncated)</Text>
        )}
      </Box>
    </Box>
  );
}

// 任务进度组件
function TaskProgress({ plan }) {
  if (!plan) return null;

  const { completed, total, percentage } = plan.getProgress();
  const statusColor = plan.status === 'completed' ? 'green' :
                     plan.status === 'failed' ? 'red' :
                     plan.status === 'in_progress' ? 'yellow' : 'gray';

  // 进度条
  const barWidth = 30;
  const filled = Math.round((percentage / 100) * barWidth);
  const empty = barWidth - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold color={statusColor}>
          {plan.description}
        </Text>
      </Box>
      <Box>
        <Text color="cyan">[{bar}]</Text>
        <Text dim> {completed}/{total} ({Math.round(percentage)}%)</Text>
      </Box>
      {plan.error && (
        <Box>
          <Text color="red">Error: {plan.error}</Text>
        </Box>
      )}
    </Box>
  );
}

// 工具执行显示组件
function ToolExecution({ tool, input, result }) {
  // 限制输入和结果的显示长度
  const maxDisplayLength = 100;

  const displayInput = input
    ? (JSON.stringify(input).length > maxDisplayLength
        ? JSON.stringify(input).slice(0, maxDisplayLength) + '...'
        : JSON.stringify(input))
    : null;

  const displayResult = result
    ? (result.success
        ? '✓ Success'
        : (result.error && result.error.length > maxDisplayLength
            ? result.error.slice(0, maxDisplayLength) + '...'
            : result.error || 'Failed'))
    : null;

  return (
    <Box flexDirection="column" marginBottom={1} paddingX={1} borderStyle="single" borderColor="gray" width="100%">
      <Box width="100%">
        <Text bold color="yellow">⚡ {tool}</Text>
      </Box>
      {displayInput && (
        <Box width="100%">
          <Text dim>Input: {displayInput}</Text>
        </Box>
      )}
      {displayResult && (
        <Box width="100%">
          <Text color={result.success ? 'green' : 'red'}>
            {result.success ? '✓' : '✗'} {displayResult}
          </Text>
        </Box>
      )}
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
  const [logs, setLogs] = useState([]); // 日志内容
  const [thinking, setThinking] = useState([]); // AI 思考过程
  const [scrollOffset, setScrollOffset] = useState(0); // 滚动偏移量（从底部开始）
  const maxVisibleMessages = 15; // 最多显示15条消息
  
  // Ctrl+C 退出控制
  const [lastCtrlC, setLastCtrlC] = useState(0);
  const [showExitHint, setShowExitHint] = useState(false);
  const [abortMessage, setAbortMessage] = useState(null); // 中止任务的提示
  const abortControllerRef = useRef(null);

  // 键盘输入处理（用于滚动和 Ctrl+C）
  useInput((input, key) => {
    // 处理 Ctrl+C 和 ESC
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
    
    // 当不在输入模式时处理滚动
    if (key.upArrow) {
      setScrollOffset(prev => Math.min(prev + 5, Math.max(0, messages.length - maxVisibleMessages)));
    } else if (key.downArrow) {
      setScrollOffset(prev => Math.max(0, prev - 5));
    } else if (key.pageUp) {
      setScrollOffset(prev => Math.min(prev + 10, Math.max(0, messages.length - maxVisibleMessages)));
    } else if (key.pageDown || key.return) {
      setScrollOffset(0); // 回到底部
    }
  }, { capture: true }); // capture: true 确保 Ctrl+C 被捕获而不是传递给终端

  // 初始化
  useEffect(() => {
    async function init() {
      try {
        const cfg = getConfig();
        setConfig(cfg);

        const conv = await createConversation(cfg);
        setConversation(conv);

        // 加载日志
        await loadLatestLogs();

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

  // 加载最新日志
  const loadLatestLogs = async () => {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const os = await import('os');

      const logDir = path.join(os.homedir(), '.closer-code', 'logs');
      const files = await fs.readdir(logDir);

      // 找到最新的日志文件
      const logFiles = files
        .filter(f => f.startsWith('closer_debug_log_'))
        .sort()
        .reverse();

      if (logFiles.length > 0) {
        const latestLog = path.join(logDir, logFiles[0]);
        const content = await fs.readFile(latestLog, 'utf-8');

        // 只显示最后 50 行
        const lines = content.split('\n').slice(-50);
        setLogs(lines);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  // 处理用户输入
  const handleSubmit = useCallback(async (value) => {
    if (!conversation || isProcessing) return;

    setInput('');
    setIsProcessing(true);
    setActivity('📤 发送消息到 AI...');
    setScrollOffset(0); // 重置滚动到底部

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
          // 处理流式响应
          if (progress.type === 'token') {
            setActivity('✍️ AI 正在输入...');
            setThinking(prev => [...prev, `✍️ [${new Date().toLocaleTimeString()}] 生成响应中...`]);
            setMessages(prev => {
              const lastMsg = prev[prev.length - 1];

              if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.complete) {
                // 更新 key 强制重新渲染
                return [
                  ...prev.slice(0, -1),
                  {
                    ...lastMsg,
                    content: lastMsg.content + progress.content,
                    key: Date.now() // 每次更新都改变 key
                  }
                ];
              } else {
                return [...prev, {
                  role: 'assistant',
                  content: progress.content,
                  complete: false,
                  key: Date.now()
                }];
              }
            });
          } else if (progress.type === 'tool_start') {
            const thinkingMsg = `⚡ [${new Date().toLocaleTimeString()}] 调用工具: ${progress.tool}`;
            setActivity(`⚡ 执行工具: ${progress.tool}...`);
            setThinking(prev => [...prev, thinkingMsg]);
            setToolExecutions(prev => [...prev, {
              tool: progress.tool,
              input: progress.input,
              result: null
            }]);
          } else if (progress.type === 'tool_complete') {
            const resultMsg = progress.result.success ? '✓ 成功' : '✗ 失败';
            setActivity('📊 处理工具结果...');
            setThinking(prev => [...prev, `📊 [${new Date().toLocaleTimeString()}] 工具执行结果: ${resultMsg}`]);
            setToolExecutions(prev => {
              const newExecs = [...prev];
              newExecs[newExecs.length - 1].result = progress.result;
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
          if (progress.type === 'plan_created') {
            setActivity('📋 任务计划已创建');
            setCurrentPlan(progress.plan);
          } else if (progress.type === 'execution_progress') {
            setActivity('⚙️ 执行任务中...');
            setCurrentPlan(prev => {
              if (prev && prev.id === progress.event.plan?.id) {
                return progress.event.plan;
              }
              return prev;
            });
          }
        });
        setStatus('Ready');
        setActivity(null);
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

      case '/help':
        setMessages(prev => [...prev, {
          role: 'system',
          content: `Available commands:
/clear - Clear conversation history
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

      {/* 日志区域 - 占17.5%高度 */}
      <Box
        borderStyle="round"
        borderColor="gray"
        flexDirection="column"
        flexGrow={17.5}
        marginBottom={1}
        width="100%"
      >
        <Box borderBottom={false} borderColor="gray" paddingBottom={0} marginBottom={1}>
          <Text bold color="gray">📋 Latest Logs</Text>
        </Box>
        <Box flexGrow={1} flexDirection="column" overflow="hidden" width="100%">
          {logs.length > 0 ? (
            logs.slice(-15).map((line, i) => (
              <Box key={i} width="100%">
                <Text dim color="gray" wrap="truncate">{line.slice(0, 100)}</Text>
              </Box>
            ))
          ) : (
            <Text dim>No logs available</Text>
          )}
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
          <Text bold color="cyan">🧠 AI Thinking Process</Text>
        </Box>
        <Box flexGrow={1} flexDirection="column" overflow="hidden" width="100%">
          {thinking.length > 0 ? (
            thinking.slice(-10).map((thought, i) => (
              <Box key={i} width="100%">
                <Text dim color="cyan" wrap="truncate">{thought}</Text>
              </Box>
            ))
          ) : (
            <Text dim color="gray">No thinking messages yet</Text>
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
            <Box flexGrow={1} flexDirection="column" overflow="hidden" width="100%" height="100%">
              {messages.length > 0 ? (
                <>
                  {scrollOffset > 0 && (
                    <Box marginBottom={1} width="100%">
                      <Text dim color="blue">↑ Scrolled up ({scrollOffset} lines hidden) - Press ↓/Enter to return</Text>
                    </Box>
                  )}
                  {messages
                    .slice(Math.max(0, messages.length - maxVisibleMessages - scrollOffset), messages.length - scrollOffset || undefined)
                    .map((message, index) => (
                      <MessageItem key={message.key || index} message={message} />
                    ))}
                </>
              ) : (
                <Text dim>No messages yet</Text>
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
                {toolExecutions.slice(-5).map((exec, i) => (
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
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder="Type a message or /help for commands..."
          disabled={isProcessing}
        />
      </Box>
    </Box>
  );
}

// 启动应用
render(<App />, {exitOnCtrlC: false});

// 注意：不在这里设置 SIGINT 处理器，因为 useInput 会处理 Ctrl+C
// 如果在这里设置，会导致第一次 Ctrl+C 就直接退出
