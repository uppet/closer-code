/**
 * 文件写入渲染器
 * 
 * 支持工具：writeFile
 * 
 * 特点：
 * - 显示文件路径
 * - 写入大小
 * - 新建/覆盖标识
 */

import React from 'react';
import { Box, Text } from 'ink';
import { ProgressBar, Spinner } from '../progress-bar.jsx';

/**
 * 解析文件写入工具的输入参数
 */
function parseInput(input) {
  if (!input) return { path: '', content: '' };
  
  if (typeof input === 'string') {
    return { path: input, content: '' };
  }
  
  return {
    path: input.path || input.filePath || input.file || '',
    content: input.content || input.text || input.data || ''
  };
}

/**
 * 解析文件写入工具的输出结果
 */
function parseResult(result) {
  if (!result) return null;
  
  if (typeof result === 'string') {
    return { success: true, message: result };
  }
  
  return {
    success: result.success !== false,
    created: result.created || result.isNew,
    size: result.size || result.bytes,
    error: result.error || result.message
  };
}

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 从路径中提取文件名
 */
function getFileName(path) {
  if (!path) return '';
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || path;
}

/**
 * 从路径中提取目录
 */
function getDirectory(path) {
  if (!path) return '';
  const normalized = path.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash > 0 ? normalized.substring(0, lastSlash + 1) : '';
}

/**
 * 内容预览组件
 */
function ContentPreview({ content, maxLines = 4 }) {
  if (!content) {
    return <Text dim italic>（无内容）</Text>;
  }
  
  const lines = String(content).split('\n');
  const displayLines = lines.slice(0, maxLines);
  const hasMore = lines.length > maxLines;
  
  return (
    <Box flexDirection="column">
      {displayLines.map((line, i) => {
        const displayLine = line.length > 60 ? line.substring(0, 57) + '...' : line;
        return (
          <Text key={i} dim>{displayLine}</Text>
        );
      })}
      {hasMore && (
        <Text dim italic>... 还有 {lines.length - maxLines} 行</Text>
      )}
    </Box>
  );
}

/**
 * 文件写入渲染器组件
 * 
 * @param {Object} props
 * @param {Object} props.tool - 工具执行数据
 * @param {number} props.maxHeight - 最大高度
 */
export function FileWriteRenderer({ tool, maxHeight = 10 }) {
  const { input, result, status, duration, startTime } = tool;
  
  const parsedInput = parseInput(input);
  const parsedResult = parseResult(result);
  
  const isRunning = status === 'running';
  const isSuccess = status === 'success' || parsedResult?.success;
  const isError = status === 'error' || parsedResult?.success === false;
  
  const fileName = getFileName(parsedInput.path);
  const directory = getDirectory(parsedInput.path);
  
  // 计算写入大小
  const contentSize = parsedInput.content ? 
    new TextEncoder().encode(parsedInput.content).length : 0;
  const displaySize = parsedResult?.size || contentSize;
  
  return (
    <Box flexDirection="column">
      {/* 文件信息 */}
      <Box>
        <Text>✍️ </Text>
        <Text bold color="magenta">{fileName}</Text>
        {parsedResult?.created && (
          <Text color="green"> ✨ 新建</Text>
        )}
        {!parsedResult?.created && isSuccess && (
          <Text color="yellow"> 📝 覆盖</Text>
        )}
      </Box>
      
      {/* 目录路径 */}
      {directory && (
        <Box>
          <Text dim>📂 {directory}</Text>
        </Box>
      )}
      
      {/* 写入大小 */}
      {displaySize > 0 && (
        <Box>
          <Text dim>📏 写入 {formatSize(displaySize)}</Text>
        </Box>
      )}
      
      {/* 分隔线 */}
      <Text dim>{'─'.repeat(60)}</Text>
      
      {/* 执行中状态 */}
      {isRunning && (
        <Box flexDirection="column">
          <Box>
            <Spinner color="magenta" />
            <Text color="magenta"> 写入中...</Text>
            {startTime && (
              <Text dim> ({((Date.now() - startTime) / 1000).toFixed(1)}s)</Text>
            )}
          </Box>
          <Box marginTop={1}>
            <ProgressBar width={40} color="magenta" label="写入中..." />
          </Box>
        </Box>
      )}
      
      {/* 完成状态 - 显示内容预览 */}
      {!isRunning && isSuccess && (
        <Box flexDirection="column">
          <Text bold color="cyan">📝 写入内容预览</Text>
          <Box 
            borderStyle="single" 
            borderColor="gray" 
            paddingX={1}
          >
            <ContentPreview 
              content={parsedInput.content} 
              maxLines={Math.max(3, maxHeight - 7)}
            />
          </Box>
        </Box>
      )}
      
      {/* 错误状态 */}
      {!isRunning && isError && (
        <Box flexDirection="column">
          <Text color="red">❌ 写入失败</Text>
          {parsedResult?.error && (
            <Text color="red" dim>{parsedResult.error}</Text>
          )}
        </Box>
      )}
      
      {/* 底部状态栏 */}
      {!isRunning && (
        <Box marginTop={1}>
          {isSuccess ? (
            <Text color="green">✓ 写入完成</Text>
          ) : (
            <Text color="red">✗ 写入失败</Text>
          )}
          {duration && (
            <Text dim> | {duration}ms</Text>
          )}
        </Box>
      )}
    </Box>
  );
}

export default FileWriteRenderer;
