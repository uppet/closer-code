#!/usr/bin/env node
/**
 * Closer Code - 极简模式 CLI
 *
 * 极简界面，只提供一个多行输入框
 * 支持两次 Ctrl+C 退出，Ctrl+Z 挂起（非 Windows）
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { render, Box, Text } from 'ink';
import { useInput } from 'ink';
import { createConversation } from './conversation.js';
import { getConfig } from './config.js';
import { createHistoryManager } from './input/history.js';
import { EnhancedTextInputWithShortcuts } from './input/enhanced-input.jsx';
import { safeSuspend, getPlatformName, isMainModule } from './utils/platform.js';

/**
 * 极简模式主组件
 */
function App() {
  const [config, setConfig] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('Initializing...');
  const [lastResponse, setLastResponse] = useState('');
  const inputRef = useRef('');
  const conversationRef = useRef(null);
  const [inputHistory] = useState(() => createHistoryManager({
    maxSize: 100,
    testMode: process.env.CLOSER_TEST_MODE === '1'
  }));

  // Ctrl+C 双击退出控制
  const [lastCtrlC, setLastCtrlC] = useState(0);
  const [showExitHint, setShowExitHint] = useState(false);

  // 初始化
  useEffect(() => {
    async function init() {
      try {
        const cfg = getConfig();
        setConfig(cfg);

        const conv = await createConversation(cfg, false, process.env.CLOSER_TEST_MODE === '1');
        setConversation(conv);
        conversationRef.current = conv;

        if (process.env.CLOSER_TEST_MODE === '1') {
          console.log('[Test Mode] Running without history persistence');
        }

        setStatus('Ready');
      } catch (error) {
        setStatus(`Error: ${error.message}`);
        console.error('Init error:', error);
      }
    }

    init();
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
    };

    process.on('SIGCONT', handleContinue);

    return () => {
      process.off('SIGCONT', handleContinue);
    };
  }, []);

  /**
   * 处理用户输入
   */
  const handleSubmit = useCallback(async (value) => {
    if (!conversation || isProcessing) {
      return;
    }

    setInput('');
    setIsProcessing(true);
    setStatus('Processing...');

    try {
      // 发送到 AI
      const response = await conversation.sendMessage(
        value,
        (progress) => {
          // 简单的进度提示
          if (progress.type === 'thinking') {
            setStatus('Thinking...');
          } else if (progress.type === 'token') {
            setStatus('Generating response...');
          } else if (progress.type === 'tool_start') {
            setStatus(`Executing: ${progress.tool}...`);
          }
        }
      );

      // 显示响应
      setLastResponse(response.content || '(No response)');
      setStatus('Ready');

    } catch (error) {
      setLastResponse(`Error: ${error.message}`);
      setStatus('Error');
    } finally {
      setIsProcessing(false);
    }
  }, [conversation, isProcessing]);

  // 键盘输入处理
  useInput((input, key) => {
    // 处理 Ctrl+Z - 挂起程序（发送 SIGTSTP 信号）
    if (key.ctrl && input === 'z') {
      const success = safeSuspend();

      if (!success) {
        console.log(`\n⚠️  ${getPlatformName()} 不支持 Ctrl+Z 挂起\n`);
        console.log('替代方案：');
        console.log('  - 使用 Ctrl+C 退出程序\n');
      }
      return;
    }

    // 处理 Ctrl+C 和 ESC
    if ((key.ctrl && input === 'c') || key.escape) {
      const now = Date.now();

      if (isProcessing) {
        // 如果 AI 正在执行，中止对话
        if (conversationRef.current) {
          conversationRef.current.abortCurrentPhase();
        }
        setIsProcessing(false);
        setStatus('Aborted');
        return;
      }

      // 没有任务在执行时的退出逻辑
      if (now - lastCtrlC < 1500) {
        // 1.5秒内再次按下，退出程序
        console.log('\n👋 再见！\n');

        // 设置强制退出超时（2秒后强制退出）
        const forceExitTimeout = setTimeout(() => {
          console.log('[Exit] ⚠️ 清理超时，强制退出');
          process.exit(1);
        }, 2000);

        // 异步清理资源
        (async () => {
          try {
            // 清理 conversation 资源
            if (conversationRef.current) {
              if (typeof conversationRef.current.cleanup === 'function') {
                await conversationRef.current.cleanup();
              }
            }

            // 移除所有事件监听器
            process.removeAllListeners('SIGCONT');
            process.removeAllListeners('SIGINT');
            process.removeAllListeners('SIGHUP');

            // 恢复终端状态
            if (process.stdin.isTTY) {
              try {
                process.stdin.setRawMode(false);
                process.stdin.pause();
              } catch (error) {
                // 忽略
              }
            }

            // 取消强制退出
            clearTimeout(forceExitTimeout);

            // 正常退出
            process.exit(0);
          } catch (error) {
            console.error('[Exit Error]', error.message);
            clearTimeout(forceExitTimeout);
            process.exit(1);
          }
        })();

        return;
      } else {
        // 第一次按下，显示提示
        setShowExitHint(true);
        setLastCtrlC(now);
        setTimeout(() => setShowExitHint(false), 1500);
      }
      return;
    }

    // 方向键让 EnhancedTextInput 处理
    if (key.upArrow || key.downArrow) {
      return false;
    }
  }, { capture: true });

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
        borderColor="cyan"
        paddingX={1}
        marginBottom={1}
      >
        <Box flexGrow={1}>
          <Text bold color="cyan">Closer Code</Text>
          <Text dim> - Simple Mode</Text>
        </Box>
        <Text dim color="gray">|</Text>
        <Box marginLeft={1}>
          <Text color={isProcessing ? 'yellow' : 'green'}>
            {isProcessing ? '● Processing' : '● ' + status}
          </Text>
        </Box>
      </Box>

      {/* 响应显示区域 */}
      {lastResponse && (
        <Box
          borderStyle="single"
          borderColor="gray"
          paddingX={1}
          marginBottom={1}
          flexDirection="column"
        >
          <Text dim color="gray">Last Response:</Text>
          <Box marginTop={1}>
            <Text>{lastResponse}</Text>
          </Box>
        </Box>
      )}

      {/* 退出提示 */}
      {showExitHint && (
        <Box
          borderStyle="single"
          borderColor="red"
          paddingX={1}
          marginBottom={1}
        >
          <Text bold color="red">⚠️ 再次按 Ctrl+C 或 ESC 退出程序 (1.5秒内)</Text>
        </Box>
      )}

      {/* 输入区域 */}
      <Box flexDirection="column">
        <Box marginBottom={1} paddingLeft={1}>
          <Text dim color="cyan">
            {isProcessing ? '⏳ 处理中...' : '▶ 输入消息'}
          </Text>
          <Text dim color="gray">
            {' '}(Enter发送, Ctrl+Enter换行, Ctrl+Z挂起)
          </Text>
        </Box>

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

/**
 * 启动极简模式
 * 导出函数，而不是立即渲染，避免导入时就启动UI
 */
export function startMinimalMode() {
  render(<App />, { exitOnCtrlC: false });
}

// 如果直接运行此文件（例如 node src/minimal-cli.jsx），则启动
if (isMainModule(import.meta.url)) {
  startMinimalMode();
}
