#!/usr/bin/env node
/**
 * Closer Code - AI 编程助理 CLI
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { render, Box, Text } from 'ink';
import TextInput from 'ink-text-input';
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

  return (
    <Box marginBottom={1} flexDirection="column">
      <Text dim color={color}>
        {prefix}
      </Text>
      <Text color={color}>{content}</Text>
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
  return (
    <Box flexDirection="column" marginBottom={1} paddingX={1} borderStyle="single" borderColor="gray">
      <Box>
        <Text bold color="yellow">⚡ {tool}</Text>
      </Box>
      {input && (
        <Box>
          <Text dim>Input: {JSON.stringify(input).slice(0, 50)}...</Text>
        </Box>
      )}
      {result && (
        <Box>
          <Text color={result.success ? 'green' : 'red'}>
            {result.success ? '✓' : '✗'} {result.success ? 'Success' : result.error}
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
      // 发送到 AI
      setActivity('🤔 AI 正在思考...');
      const response = await conversation.sendMessage(
        value,
        (progress) => {
          // 处理流式响应
          if (progress.type === 'token') {
            setActivity('✍️ AI 正在输入...');
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
            setActivity(`⚡ 执行工具: ${progress.tool}...`);
            setToolExecutions(prev => [...prev, {
              tool: progress.tool,
              input: progress.input,
              result: null
            }]);
          } else if (progress.type === 'tool_complete') {
            setActivity('📊 处理工具结果...');
            setToolExecutions(prev => {
              const newExecs = [...prev];
              newExecs[newExecs.length - 1].result = progress.result;
              return newExecs;
            });
          }
        }
      );

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

      {/* 主内容区域 */}
      <Box flexGrow={1}>
        <Box width="100%">
          {/* 左侧：对话面板 */}
          <Panel title="💬 Conversation" borderColor="blue" flex={2}>
            <Box flexGrow={1} flexDirection="column" overflow="hidden">
              {messages.map((message, index) => (
                <MessageItem key={message.key || index} message={message} />
              ))}
            </Box>
          </Panel>

          {/* 右侧：任务和工具面板 */}
          <Box flexDirection="column" flex={1}>
            {/* 任务进度 */}
            <Panel title="📋 Task Progress" borderColor="yellow">
              {currentPlan ? (
                <TaskProgress plan={currentPlan} />
              ) : (
                <Text dim>No active task</Text>
              )}
            </Panel>

            {/* 工具执行 */}
            <Panel title="🔧 Tool Execution" borderColor="green">
              <Box flexDirection="column" overflow="hidden">
                {toolExecutions.slice(-5).map((exec, i) => (
                  <ToolExecution key={i} {...exec} />
                ))}
                {toolExecutions.length === 0 && (
                  <Text dim>No tools executed yet</Text>
                )}
              </Box>
            </Panel>
          </Box>
        </Box>
      </Box>

      {/* 活动提示 */}
      {activity && (
        <Box
          borderStyle="round"
          borderColor="yellow"
          paddingX={1}
          marginTop={1}
          marginBottom={1}
        >
          <Text bold color="yellow">{activity}</Text>
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
render(<App />);

// 优雅退出
process.on('SIGINT', () => {
  process.exit(0);
});
