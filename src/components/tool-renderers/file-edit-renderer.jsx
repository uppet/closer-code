/**
 * 文件编辑渲染器
 * 
 * 支持工具：editFile, regionConstrainedEdit
 * 
 * 特点：
 * - 显示文件路径
 * - 变更对比（diff 风格）
 * - 替换次数
 * - 行范围信息（regionConstrainedEdit）
 */

import React from 'react';
import { Box, Text } from 'ink';
import { ProgressBar, Spinner } from '../progress-bar.jsx';

/**
 * 解析文件编辑工具的输入参数
 */
function parseInput(input, toolName) {
  if (!input) return { path: '', oldText: '', newText: '' };
  
  if (typeof input === 'string') {
    return { path: input, oldText: '', newText: '' };
  }
  
  const result = {
    path: input.path || input.filePath || input.file || '',
    oldText: input.oldText || input.old || input.search || input.find || '',
    newText: input.newText || input.new || input.replace || input.replacement || ''
  };
  
  // regionConstrainedEdit 特有参数
  if (toolName === 'regionConstrainedEdit') {
    result.startLine = input.startLine || input.start;
    result.endLine = input.endLine || input.end;
  }
  
  return result;
}

/**
 * 解析文件编辑工具的输出结果
 */
function parseResult(result) {
  if (!result) return null;
  
  if (typeof result === 'string') {
    return { success: true, message: result };
  }
  
  return {
    success: result.success !== false,
    replacements: result.replacements || result.count || result.matches || 0,
    error: result.error || result.message
  };
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
 * Diff 预览组件
 */
function DiffPreview({ oldText, newText, maxLines = 4 }) {
  const oldLines = oldText ? String(oldText).split('\n').slice(0, maxLines) : [];
  const newLines = newText ? String(newText).split('\n').slice(0, maxLines) : [];
  
  const hasMoreOld = oldText && String(oldText).split('\n').length > maxLines;
  const hasMoreNew = newText && String(newText).split('\n').length > maxLines;
  
  return (
    <Box flexDirection="column">
      {/* 删除的内容 */}
      {oldLines.length > 0 && (
        <Box flexDirection="column">
          {oldLines.map((line, i) => {
            const displayLine = line.length > 55 ? line.substring(0, 52) + '...' : line;
            return (
              <Box key={`old-${i}`}>
                <Text color="red">- </Text>
                <Text color="red">{displayLine}</Text>
              </Box>
            );
          })}
          {hasMoreOld && <Text color="red" dim>  ... 更多删除内容</Text>}
        </Box>
      )}
      
      {/* 添加的内容 */}
      {newLines.length > 0 && (
        <Box flexDirection="column">
          {newLines.map((line, i) => {
            const displayLine = line.length > 55 ? line.substring(0, 52) + '...' : line;
            return (
              <Box key={`new-${i}`}>
                <Text color="green">+ </Text>
                <Text color="green">{displayLine}</Text>
              </Box>
            );
          })}
          {hasMoreNew && <Text color="green" dim>  ... 更多添加内容</Text>}
        </Box>
      )}
      
      {/* 无变更 */}
      {oldLines.length === 0 && newLines.length === 0 && (
        <Text dim italic>（无变更内容）</Text>
      )}
    </Box>
  );
}

/**
 * 文件编辑渲染器组件
 * 
 * @param {Object} props
 * @param {Object} props.tool - 工具执行数据
 * @param {number} props.maxHeight - 最大高度
 */
export function FileEditRenderer({ tool, maxHeight = 10 }) {
  const { input, result, status, duration, startTime } = tool;
  const toolName = tool.tool || 'editFile';
  
  const parsedInput = parseInput(input, toolName);
  const parsedResult = parseResult(result);
  
  const isRunning = status === 'running';
  const isSuccess = status === 'success' || parsedResult?.success;
  const isError = status === 'error' || parsedResult?.success === false;
  
  const fileName = getFileName(parsedInput.path);
  const directory = getDirectory(parsedInput.path);
  
  // 计算 diff 预览可用行数
  const diffMaxLines = Math.max(2, Math.floor((maxHeight - 7) / 2));
  
  // 工具图标
  const icon = toolName === 'regionConstrainedEdit' ? '🔧' : '✏️';
  
  return (
    <Box flexDirection="column">
      {/* 文件信息 */}
      <Box>
        <Text>{icon} </Text>
        <Text bold color="yellow">{fileName}</Text>
        {parsedResult?.replacements > 0 && (
          <Text color="cyan"> 🔄 {parsedResult.replacements} 处替换</Text>
        )}
      </Box>
      
      {/* 目录路径 */}
      {directory && (
        <Box>
          <Text dim>📂 {directory}</Text>
        </Box>
      )}
      
      {/* 行范围信息（regionConstrainedEdit） */}
      {toolName === 'regionConstrainedEdit' && parsedInput.startLine && (
        <Box>
          <Text dim>📍 行 {parsedInput.startLine}</Text>
          {parsedInput.endLine && <Text dim> - {parsedInput.endLine}</Text>}
        </Box>
      )}
      
      {/* 分隔线 */}
      <Text dim>{'─'.repeat(60)}</Text>
      
      {/* 执行中状态 */}
      {isRunning && (
        <Box flexDirection="column">
          <Box>
            <Spinner color="yellow" />
            <Text color="yellow"> 编辑中...</Text>
            {startTime && (
              <Text dim> ({((Date.now() - startTime) / 1000).toFixed(1)}s)</Text>
            )}
          </Box>
          <Box marginTop={1}>
            <ProgressBar width={40} color="yellow" label="替换中..." />
          </Box>
        </Box>
      )}
      
      {/* 完成状态 - 显示 diff 预览 */}
      {!isRunning && isSuccess && (
        <Box flexDirection="column">
          <Text bold color="cyan">📝 变更预览</Text>
          <Box 
            borderStyle="single" 
            borderColor="gray" 
            paddingX={1}
          >
            <DiffPreview 
              oldText={parsedInput.oldText}
              newText={parsedInput.newText}
              maxLines={diffMaxLines}
            />
          </Box>
        </Box>
      )}
      
      {/* 错误状态 */}
      {!isRunning && isError && (
        <Box flexDirection="column">
          <Text color="red">❌ 编辑失败</Text>
          {parsedResult?.error && (
            <Text color="red" dim>{parsedResult.error}</Text>
          )}
        </Box>
      )}
      
      {/* 底部状态栏 */}
      {!isRunning && (
        <Box marginTop={1}>
          {isSuccess ? (
            <Text color="green">✓ 编辑完成</Text>
          ) : (
            <Text color="red">✗ 编辑失败</Text>
          )}
          {duration && (
            <Text dim> | {duration}ms</Text>
          )}
        </Box>
      )}
    </Box>
  );
}

export default FileEditRenderer;
