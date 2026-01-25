/**
 * Bash Result 渲染器
 *
 * 用于渲染 bashResult 工具的执行结果
 * 这个工具从缓存的 bash 结果中获取更多内容，避免重新执行命令
 */

import React from 'react';
import { Box, Text } from 'ink';

/**
 * 解析 bashResult 工具的输入参数
 */
function parseInput(input) {
  if (!input) return { result_id: '', action: '' };

  if (typeof input === 'string') {
    return { result_id: input, action: '' };
  }

  return {
    result_id: input.result_id || '',
    action: input.action || 'unknown',
    lines: input.lines,
    startLine: input.startLine,
    endLine: input.endLine,
    pattern: input.pattern
  };
}

/**
 * 解析 bashResult 工具的输出结果
 */
function parseResult(result) {
  if (!result) return null;

  // 处理字符串结果
  if (typeof result === 'string') {
    try {
      return JSON.parse(result);
    } catch {
      return { stdout: result, success: true };
    }
  }

  // 处理对象结果
  return {
    success: result.success !== false,
    action: result.action,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    lines: result.lines,
    lineCount: result.lineCount,
    matchCount: result.matchCount,
    totalLines: result.totalLines,
    truncated: result.truncated,
    error: result.error
  };
}

/**
 * 输出内容显示组件
 */
function OutputDisplay({ content, maxLines = 5, color = 'white' }) {
  if (!content) return null;

  const lines = String(content).split('\n').filter(line => line.trim());
  const displayLines = lines.slice(-maxLines);
  const hasMore = lines.length > maxLines;

  return (
    <Box flexDirection="column">
      {hasMore && (
        <Text dim italic>... 省略 {lines.length - maxLines} 行</Text>
      )}
      {displayLines.map((line, i) => (
        <Text key={i} color={color}>
          {line.length > 80 ? line.substring(0, 77) + '...' : line}
        </Text>
      ))}
    </Box>
  );
}

/**
 * Bash Result 渲染器组件
 *
 * @param {Object} props
 * @param {Object} props.tool - 工具执行数据
 * @param {number} props.maxHeight - 最大高度
 */
export function BashResultRenderer({ tool, maxHeight = 10 }) {
  const { input, result, status, duration } = tool;
  const { result_id, action, lines, startLine, endLine, pattern } = parseInput(input);
  const parsedResult = parseResult(result);

  const isSuccess = status === 'success' || parsedResult?.success;
  const isError = status === 'error' || parsedResult?.success === false;

  // 计算输出区域可用行数
  const outputMaxLines = Math.max(3, maxHeight - 6);

  // Action 图标映射
  const actionIcons = {
    head: '📄',
    tail: '📄',
    lineRange: '📋',
    grep: '🔍',
    full: '📦'
  };

  return (
    <Box flexDirection="column">
      {/* 工具信息 */}
      <Box>
        <Text color="cyan" bold>bashResult</Text>
        <Text dim> | </Text>
        <Text>{actionIcons[action] || '❓'} {action}</Text>
      </Box>

      {/* result_id */}
      {result_id && (
        <Box>
          <Text dim>ID: </Text>
          <Text dim>{result_id.length > 40 ? result_id.substring(0, 37) + '...' : result_id}</Text>
        </Box>
      )}

      {/* 参数信息 */}
      {(lines || startLine || endLine || pattern) && (
        <Box>
          <Text dim>参数: </Text>
          {lines && <Text dim>lines={lines}</Text>}
          {startLine && endLine && <Text dim> range=[{startLine}-{endLine}]</Text>}
          {pattern && <Text dim> pattern="{pattern}"</Text>}
        </Box>
      )}

      {/* 分隔线 */}
      <Text dim>{'─'.repeat(60)}</Text>

      {/* 执行中状态 */}
      {status === 'running' && (
        <Box>
          <Text color="yellow">⏳ 读取中...</Text>
        </Box>
      )}

      {/* 完成状态 - 显示输出 */}
      {!isError && parsedResult && parsedResult.stdout !== undefined && (
        <Box flexDirection="column">
          <Text color="cyan" bold>📤 输出</Text>
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

          {/* 统计信息 */}
          <Box>
            {parsedResult.lineCount !== undefined && (
              <Text dim>行数: {parsedResult.lineCount}</Text>
            )}
            {parsedResult.matchCount !== undefined && (
              <Text dim> | 匹配: {parsedResult.matchCount}</Text>
            )}
            {parsedResult.totalLines !== undefined && (
              <Text dim> | 总计: {parsedResult.totalLines}</Text>
            )}
            {parsedResult.truncated && (
              <Text color="yellow" dim> | (已截断)</Text>
            )}
          </Box>
        </Box>
      )}

      {/* 错误状态 */}
      {isError && (
        <Box flexDirection="column">
          <Text color="red" bold>❌ 错误</Text>
          <Box
            borderStyle="single"
            borderColor="red"
            paddingX={1}
          >
            <Text color="red">
              {parsedResult?.error || '未知错误'}
            </Text>
          </Box>
        </Box>
      )}

      {/* 底部状态栏 */}
      {status !== 'running' && (
        <Box marginTop={1}>
          {isSuccess ? (
            <Text color="green">✓ 成功</Text>
          ) : (
            <Text color="red">✗ 失败</Text>
          )}
          {duration && (
            <Text dim> | {duration}ms</Text>
          )}
        </Box>
      )}
    </Box>
  );
}

export default BashResultRenderer;
