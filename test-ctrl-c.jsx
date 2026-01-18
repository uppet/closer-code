#!/usr/bin/env node
/**
 * Ctrl+C 双击退出功能测试
 *
 * 预期行为：
 * 1. 第一次 Ctrl+C：显示红色提示框（1.5秒后消失）
 * 2. 1.5秒内第二次 Ctrl+C：退出程序
 * 3. 超时后重置：需要再次双击
 */

import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useInput } from 'ink';

const useKeepAlive = () => useEffect(() => {
  // refresh the app every 100ms to keep the process alive
  const intervalId = setInterval(() => {}, 100); 
  return () => clearInterval(intervalId); // Cleanup on unmount
}, []);

function App() {
  const [input, setInput] = useState('');
  const [lastCtrlC, setLastCtrlC] = useState(0);
  const [showExitHint, setShowExitHint] = useState(false);
  const [message, setMessage] = useState('等待输入...');

  useKeepAlive();

  // 定时消息提示
  useEffect(() => {
    const messages = [
      '提示：按 Ctrl+C 测试退出功能',
      '第一次 Ctrl+C 会显示提示',
      '1.5秒内第二次 Ctrl+C 才会退出',
      '试试在输入框输入一些内容',
    ];
    let index = 0;

    const timer = setInterval(() => {
      index = (index + 1) % messages.length;
      setMessage(messages[index]);
    }, 1500);

    return () => clearInterval(timer);
  }, []);

  // Ctrl+C 处理 - 使用 capture: true
  useInput((input, key) => {
    if ((key.ctrl && input === 'c') || key.escape) {
      const now = Date.now();

      if (now - lastCtrlC < 1500) {
        // 1.5秒内第二次按下 - 退出
        console.log('\n✅ 测试成功！程序将在双击 Ctrl+C 后退出\n');
        process.exit(0);
      } else {
        // 第一次按下 - 显示提示
        setShowExitHint(true);
        setLastCtrlC(now);
        setTimeout(() => setShowExitHint(false), 1500);
      }
      return;
    }

    // 其他按键（可选：显示按键信息）
    if (input) {
      // 可以在这里处理其他按键
    }
  }, { capture: true }); // 关键：捕获 Ctrl+C

  return (
    <Box flexDirection="column" paddingX={2}>
      {/* 标题 */}
      <Box marginBottom={1}>
        <Text bold color="cyan">🧪 Ctrl+C 双击退出测试</Text>
      </Box>

      {/* 定时消息提示 */}
      <Box marginBottom={1}>
        <Text color="yellow">💡 {message}</Text>
      </Box>

      {/* 退出提示 */}
      {showExitHint && (
        <Box
          borderStyle="round"
          borderColor="red"
          paddingX={1}
          marginBottom={1}
        >
          <Text bold color="red">⚠️ 再次按 Ctrl+C 或 ESC 退出程序 (1.5秒内)</Text>
        </Box>
      )}

      {/* 输入框 */}
      <Box>
        <Text color="green">❯ </Text>
        <TextInput
          value={input}
          onChange={setInput}
          placeholder="输入任何内容测试..."
        />
      </Box>

      {/* 状态信息 */}
      <Box marginTop={1}>
        <Text dimColor>
          上次 Ctrl+C: {lastCtrlC > 0 ? new Date(lastCtrlC).toLocaleTimeString() : '未按下'} |
          提示状态: {showExitHint ? '显示中' : '隐藏'}
        </Text>
      </Box>

      {/* 帮助信息 */}
      <Box marginTop={1}>
        <Text dimColor>
          测试说明：按一次 Ctrl+C 应该显示红色提示，再按一次（1.5秒内）应该退出
        </Text>
      </Box>
    </Box>
  );
}

render(<App />, {exitOnCtrlC: false});

process.once('SIGINT', () => {console.log('FORK');});
