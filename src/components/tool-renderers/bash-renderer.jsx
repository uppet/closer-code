/**
 * Bash 命令执行渲染器
 * 
 * 特点：
 * - 显示命令行
 * - 实时输出流（stdout/stderr 分离）
 * - 退出码
 * - 执行时长
 */

import React from 'react';
import { Box, Text } from 'ink';
import { ProgressBar, Spinner } from '../progress-bar.jsx';

/**
 * 解析 bash 工具的输入参数
 */
function parseInput(input) {
  if (!input) return { command: '' };
  
  if (typeof input === 'string') {
    return { command: input };
  }
  
  return {
    command: input.command || input.cmd || '',
    timeout: input.timeout,
    cwd: input.cwd
  };
}

/**
 * 解析 bash 工具的输出结果
 */
function parseResult(result) {
  if (!result) return null;
  
  // 处理字符串结果
  if (typeof result === 'string') {
    return { stdout: result, stderr: '', exitCode: 0 };
  }
  
  // 处理对象结果
  return {
    stdout: result.stdout || result.output || '',
    stderr: result.stderr || '',
    exitCode: result.exitCode ?? result.code ?? (result.success === false ? 1 : 0),
    success: result.success !== false
  };
}

/**
 * 输出内容显示组件
 */
function OutputDisplay({ content, maxLines = 5, color = 'white', prefix = '' }) {
  if (!content) return null;
  
  const lines = String(content).split('\n').filter(line => line.trim());
  const displayLines = lines.slice(-maxLines); // 显示最后几行
  const hasMore = lines.length > maxLines;
  
  return (
    <Box flexDirection="column">
      {hasMore && (
        <Text dim italic>... 省略 {lines.length - maxLines} 行</Text>
      )}
      {displayLines.map((line, i) => (
        <Text key={i} color={color}>
          {prefix}{line.length > 80 ? line.substring(0, 77) + '...' : line}
        </Text>
      ))}
    </Box>
  );
}

/**
 * Bash 渲染器组件
 * 
 * @param {Object} props
 * @param {Object} props.tool - 工具执行数据
 * @param {number} props.maxHeight - 最大高度
 */
export function BashRenderer({ tool, maxHeight = 10 }) {
  const { input, result, status, duration, startTime } = tool;
  const { command, cwd } = parseInput(input);
  const parsedResult = parseResult(result);
  
  const isRunning = status === 'running';
  const isSuccess = status === 'success' || (parsedResult?.exitCode === 0);
  const isError = status === 'error' || (parsedResult?.exitCode !== 0 && parsedResult?.exitCode !== undefined);
  
  // 计算输出区域可用行数
  const outputMaxLines = Math.max(3, maxHeight - 5);
  
  return (
    <Box flexDirection="column">
      {/* 命令行 */}
      <Box>
        <Text color="green" bold>$ </Text>
        <Text bold>{command.length > 70 ? command.substring(0, 67) + '...' : command}</Text>
      </Box>
      
      {/* 工作目录（如果有） */}
      {cwd && (
        <Box>
          <Text dim>📂 </Text>
          <Text dim>{cwd}</Text>
        </Box>
      )}
      
      {/* 分隔线 */}
      <Text dim>{'─'.repeat(60)}</Text>
      
      {/* 执行中状态 */}
      {isRunning && (
        <Box flexDirection="column">
          <Box>
            <Spinner color="yellow" />
            <Text color="yellow"> 执行中...</Text>
            {startTime && (
              <Text dim> ({((Date.now() - startTime) / 1000).toFixed(1)}s)</Text>
            )}
          </Box>
          <Box marginTop={1}>
            <ProgressBar width={40} color="yellow" label="执行中..." />
          </Box>
        </Box>
      )}
      
      {/* 完成状态 - 显示输出 */}
      {!isRunning && parsedResult && (
        <Box flexDirection="column">
          {/* stdout */}
          {parsedResult.stdout && (
            <Box flexDirection="column">
              <Text color="cyan" bold>📤 stdout</Text>
              <Box 
                borderStyle="single" 
                borderColor="gray" 
                paddingX={1}
                marginBottom={1}
              >
                <OutputDisplay 
                  content={parsedResult.stdout} 
                  maxLines={outputMaxLines}
                  color="white"
                />
              </Box>
            </Box>
          )}
          
          {/* stderr */}
          {parsedResult.stderr && (
            <Box flexDirection="column">
              <Text color="yellow" bold>⚠️ stderr</Text>
              <Box 
                borderStyle="single" 
                borderColor="yellow" 
                paddingX={1}
              >
                <OutputDisplay 
                  content={parsedResult.stderr} 
                  maxLines={3}
                  color="yellow"
                />
              </Box>
            </Box>
          )}
          
          {/* 无输出时的提示 */}
          {!parsedResult.stdout && !parsedResult.stderr && (
            <Text dim italic>（无输出）</Text>
          )}
        </Box>
      )}
      
      {/* 底部状态栏 */}
      {!isRunning && (
        <Box marginTop={1}>
          {isSuccess ? (
            <Text color="green">✓ 完成</Text>
          ) : (
            <Text color="red">✗ 失败</Text>
          )}
          {parsedResult?.exitCode !== undefined && (
            <Text dim> | exit: {parsedResult.exitCode}</Text>
          )}
          {duration && (
            <Text dim> | {duration}ms</Text>
          )}
        </Box>
      )}
    </Box>
  );
}

export default BashRenderer;
