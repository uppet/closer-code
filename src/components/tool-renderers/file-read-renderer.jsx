/**
 * 文件读取渲染器
 * 
 * 支持工具：readFile, readFileLines, readFileTail
 * 
 * 特点：
 * - 显示文件路径和大小
 * - 内容预览（带行号）
 * - 行范围信息
 */

import React from 'react';
import { Box, Text } from 'ink';
import { ProgressBar, Spinner } from '../progress-bar.jsx';

/**
 * 解析文件读取工具的输入参数
 */
function parseInput(input, toolName) {
  if (!input) return { path: '' };
  
  if (typeof input === 'string') {
    return { path: input };
  }
  
  const path = input.path || input.filePath || input.file || '';
  
  // readFileLines 特有参数
  if (toolName === 'readFileLines') {
    return {
      path,
      startLine: input.startLine || input.start || 1,
      endLine: input.endLine || input.end
    };
  }
  
  // readFileTail 特有参数
  if (toolName === 'readFileTail') {
    return {
      path,
      lines: input.lines || input.n || 10
    };
  }
  
  return { path };
}

/**
 * 解析文件读取工具的输出结果
 */
function parseResult(result) {
  if (!result) return null;
  
  if (typeof result === 'string') {
    return { content: result, success: true };
  }
  
  return {
    content: result.content || result.text || result.data || '',
    size: result.size || result.bytes,
    lines: result.lines || result.lineCount,
    success: result.success !== false,
    error: result.error || result.message
  };
}

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  if (!bytes) return '';
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
 * 内容预览组件（带行号）
 */
function ContentPreview({ content, maxLines = 6, startLine = 1 }) {
  if (!content) {
    return <Text dim italic>（无内容）</Text>;
  }
  
  const lines = String(content).split('\n');
  const displayLines = lines.slice(0, maxLines);
  const hasMore = lines.length > maxLines;
  
  // 计算行号宽度
  const maxLineNum = startLine + displayLines.length - 1;
  const lineNumWidth = String(maxLineNum).length;
  
  return (
    <Box flexDirection="column">
      {displayLines.map((line, i) => {
        const lineNum = String(startLine + i).padStart(lineNumWidth, ' ');
        const displayLine = line.length > 70 ? line.substring(0, 67) + '...' : line;
        
        return (
          <Box key={i}>
            <Text dim>{lineNum} │ </Text>
            <Text>{displayLine}</Text>
          </Box>
        );
      })}
      {hasMore && (
        <Text dim italic>... 还有 {lines.length - maxLines} 行</Text>
      )}
    </Box>
  );
}

/**
 * 文件读取渲染器组件
 * 
 * @param {Object} props
 * @param {Object} props.tool - 工具执行数据
 * @param {number} props.maxHeight - 最大高度
 */
export function FileReadRenderer({ tool, maxHeight = 10 }) {
  const { input, result, status, duration, startTime } = tool;
  const toolName = tool.tool || 'readFile';
  
  const parsedInput = parseInput(input, toolName);
  const parsedResult = parseResult(result);
  
  const isRunning = status === 'running';
  const isSuccess = status === 'success' || parsedResult?.success;
  const isError = status === 'error' || parsedResult?.success === false;
  
  const fileName = getFileName(parsedInput.path);
  const directory = getDirectory(parsedInput.path);
  
  // 计算内容预览可用行数
  const previewMaxLines = Math.max(3, maxHeight - 6);
  
  // 工具图标
  const toolIcons = {
    readFile: '📖',
    readFileLines: '📄',
    readFileTail: '📜'
  };
  const icon = toolIcons[toolName] || '📖';
  
  return (
    <Box flexDirection="column">
      {/* 文件信息 */}
      <Box>
        <Text>{icon} </Text>
        <Text bold color="cyan">{fileName}</Text>
        {parsedResult?.size && (
          <Text dim> ({formatSize(parsedResult.size)})</Text>
        )}
      </Box>
      
      {/* 目录路径 */}
      {directory && (
        <Box>
          <Text dim>📂 {directory}</Text>
        </Box>
      )}
      
      {/* 行范围信息 */}
      {toolName === 'readFileLines' && parsedInput.startLine && (
        <Box>
          <Text dim>📍 行 {parsedInput.startLine}</Text>
          {parsedInput.endLine && <Text dim> - {parsedInput.endLine}</Text>}
          {parsedResult?.lines && <Text dim> / 共 {parsedResult.lines} 行</Text>}
        </Box>
      )}
      
      {toolName === 'readFileTail' && (
        <Box>
          <Text dim>📍 最后 {parsedInput.lines} 行</Text>
        </Box>
      )}
      
      {/* 分隔线 */}
      <Text dim>{'─'.repeat(60)}</Text>
      
      {/* 执行中状态 */}
      {isRunning && (
        <Box flexDirection="column">
          <Box>
            <Spinner color="cyan" />
            <Text color="cyan"> 读取中...</Text>
            {startTime && (
              <Text dim> ({((Date.now() - startTime) / 1000).toFixed(1)}s)</Text>
            )}
          </Box>
          <Box marginTop={1}>
            <ProgressBar width={40} color="cyan" label="读取中..." />
          </Box>
        </Box>
      )}
      
      {/* 完成状态 - 显示内容预览 */}
      {!isRunning && isSuccess && parsedResult && (
        <Box flexDirection="column">
          <Text bold color="cyan">📝 内容预览</Text>
          <Box 
            borderStyle="single" 
            borderColor="gray" 
            paddingX={1}
          >
            <ContentPreview 
              content={parsedResult.content} 
              maxLines={previewMaxLines}
              startLine={parsedInput.startLine || 1}
            />
          </Box>
        </Box>
      )}
      
      {/* 错误状态 */}
      {!isRunning && isError && (
        <Box flexDirection="column">
          <Text color="red">❌ 读取失败</Text>
          {parsedResult?.error && (
            <Text color="red" dim>{parsedResult.error}</Text>
          )}
        </Box>
      )}
      
      {/* 底部状态栏 */}
      {!isRunning && (
        <Box marginTop={1}>
          {isSuccess ? (
            <Text color="green">✓ 读取完成</Text>
          ) : (
            <Text color="red">✗ 读取失败</Text>
          )}
          {duration && (
            <Text dim> | {duration}ms</Text>
          )}
        </Box>
      )}
    </Box>
  );
}

export default FileReadRenderer;
