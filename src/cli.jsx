#!/usr/bin/env node
import React, { useState, useCallback } from 'react';
import { render, Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { executeBashCommand } from './bash-runner.js';

// 历史记录管理
let commandHistory = [];
let resultHistory = [];

// 命令输入组件
function CommandInput({ onSubmit }) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value);
      setValue('');
    }
  };

  return (
    <Box borderStyle="double" borderColor="cyan" paddingX={1} marginBottom={1}>
      <Box marginRight={1}>
        <Text bold color="cyan">$</Text>
      </Box>
      <TextInput
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
        placeholder="输入 bash 命令..."
      />
    </Box>
  );
}

// 输出区域组件
function OutputArea({ label, content, color, borderColor }) {
  return (
    <Box
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
      marginBottom={1}
      flexDirection="column"
      width="100%"
    >
      <Text bold color={color}>
        {label}
      </Text>
      <Box flexGrow={1}>
        {content || <Text dim>(空)</Text>}
      </Box>
    </Box>
  );
}

// 信息区域组件
function InfoArea({ result }) {
  if (!result) {
    return (
      <OutputArea
        label="[INFO] 执行信息"
        content={<Text>等待命令执行...</Text>}
        color="yellow"
        borderColor="yellow"
      />
    );
  }

  const status = result.success ? '✓ 成功' : '✗ 失败';
  const statusColor = result.success ? 'green' : 'red';
  const time = result.timestamp.split('T')[1].split('.')[0];

  const infoText = [
    <Text key="line1">状态: <Text color={statusColor} bold>{status}</Text></Text>,
    <Text key="line2">退出码: <Text bold>{result.exitCode ?? 'N/A'}</Text></Text>,
    <Text key="line3">时间: {time}</Text>,
    <Text key="line4" dim>命令: {result.command.slice(0, 60)}{result.command.length > 60 ? '...' : ''}</Text>,
    result.signal && (
      <Text key="line5" color="red">信号: {result.signal}</Text>
    ),
    result.error && (
      <Text key="line6" color="red">错误: {result.error}</Text>
    )
  ].filter(Boolean);

  return (
    <OutputArea
      label="[INFO] 执行信息"
      content={<Box flexDirection="column">{infoText}</Box>}
      color="yellow"
      borderColor="yellow"
    />
  );
}

// 主应用组件
function App() {
  const [lastResult, setLastResult] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleCommand = useCallback(async (command) => {
    setIsExecuting(true);
    commandHistory.push(command);

    try {
      const result = await executeBashCommand(command, {
        timeout: 30000
      });
      resultHistory.push(result);
      setLastResult(result);
    } catch (errorResult) {
      resultHistory.push(errorResult);
      setLastResult(errorResult);
    } finally {
      setIsExecuting(false);
    }
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <Box
        borderStyle="bold"
        borderColor="magenta"
        paddingX={1}
        marginBottom={1}
      >
        <Box flexDirection="column">
          <Text bold color="magenta">Bash 调用工具</Text>
          <Text dim>按 Ctrl+C 退出</Text>
        </Box>
      </Box>

      <InfoArea result={lastResult} />

      <OutputArea
        label="[STDOUT] 标准输出"
        content={<Text>{lastResult?.stdout || ''}</Text>}
        color="green"
        borderColor="green"
      />

      <OutputArea
        label="[STDERR] 错误输出"
        content={<Text>{lastResult?.stderr || ''}</Text>}
        color="red"
        borderColor="red"
      />

      {isExecuting && (
        <Text color="cyan" dim>⏳ 执行中...</Text>
      )}

      <CommandInput onSubmit={handleCommand} />
    </Box>
  );
}

// 启动应用
render(<App />);

// 优雅退出
process.on('SIGINT', () => {
  process.exit(0);
});
