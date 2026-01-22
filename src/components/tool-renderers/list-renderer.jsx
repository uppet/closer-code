/**
 * 目录列表渲染器
 * 
 * 支持工具：listFiles
 * 
 * 特点：
 * - 显示目录路径
 * - 文件/文件夹分类统计
 * - 分类显示列表
 */

import React from 'react';
import { Box, Text } from 'ink';
import { ProgressBar, Spinner } from '../progress-bar.jsx';

/**
 * 解析目录列表工具的输入参数
 */
function parseInput(input) {
  if (!input) return { path: '' };
  
  if (typeof input === 'string') {
    return { path: input };
  }
  
  return {
    path: input.path || input.directory || input.dir || '',
    recursive: input.recursive,
    pattern: input.pattern || input.glob
  };
}

/**
 * 解析目录列表工具的输出结果
 */
function parseResult(result) {
  if (!result) return null;
  
  // 字符串结果（换行分隔的文件列表）
  if (typeof result === 'string') {
    const items = result.split('\n').filter(line => line.trim());
    return categorizeItems(items);
  }
  
  // 数组结果
  if (Array.isArray(result)) {
    const items = result.map(item => {
      if (typeof item === 'string') return item;
      return item.name || item.path || String(item);
    });
    return categorizeItems(items);
  }
  
  // 对象结果
  if (result.files || result.items || result.entries) {
    const items = result.files || result.items || result.entries;
    return {
      ...categorizeItems(items),
      success: result.success !== false,
      error: result.error
    };
  }
  
  return {
    success: result.success !== false,
    folders: [],
    files: [],
    total: 0,
    error: result.error
  };
}

/**
 * 将项目分类为文件夹和文件
 */
function categorizeItems(items) {
  const folders = [];
  const files = [];
  
  for (const item of items) {
    const name = typeof item === 'string' ? item : (item.name || item.path || String(item));
    const isDir = typeof item === 'object' ? item.isDirectory : name.endsWith('/');
    
    if (isDir || name.endsWith('/')) {
      folders.push(name.replace(/\/$/, ''));
    } else {
      files.push(name);
    }
  }
  
  return {
    success: true,
    folders,
    files,
    total: folders.length + files.length
  };
}

/**
 * 项目列表组件
 */
function ItemList({ items, maxItems = 5, icon = '📄', color = 'white' }) {
  if (!items || items.length === 0) {
    return null;
  }
  
  const displayItems = items.slice(0, maxItems);
  const hasMore = items.length > maxItems;
  
  return (
    <Box flexDirection="column">
      {displayItems.map((item, i) => {
        const displayName = item.length > 45 ? item.substring(0, 42) + '...' : item;
        return (
          <Box key={i}>
            <Text dim>• </Text>
            <Text color={color}>{displayName}</Text>
          </Box>
        );
      })}
      {hasMore && (
        <Text dim italic>... 还有 {items.length - maxItems} 个</Text>
      )}
    </Box>
  );
}

/**
 * 目录列表渲染器组件
 * 
 * @param {Object} props
 * @param {Object} props.tool - 工具执行数据
 * @param {number} props.maxHeight - 最大高度
 */
export function ListRenderer({ tool, maxHeight = 10 }) {
  const { input, result, status, duration, startTime } = tool;
  
  const parsedInput = parseInput(input);
  const parsedResult = parseResult(result);
  
  const isRunning = status === 'running';
  const isSuccess = status === 'success' || parsedResult?.success;
  const isError = status === 'error' || parsedResult?.success === false;
  
  // 计算列表可用行数
  const listMaxItems = Math.max(2, Math.floor((maxHeight - 8) / 2));
  
  return (
    <Box flexDirection="column">
      {/* 目录信息 */}
      <Box>
        <Text>📂 </Text>
        <Text bold color="blue">{parsedInput.path || '.'}</Text>
      </Box>
      
      {/* 递归标识 */}
      {parsedInput.recursive && (
        <Box>
          <Text dim>🔄 递归模式</Text>
        </Box>
      )}
      
      {/* 模式过滤 */}
      {parsedInput.pattern && (
        <Box>
          <Text dim>🎯 模式: {parsedInput.pattern}</Text>
        </Box>
      )}
      
      {/* 分隔线 */}
      <Text dim>{'─'.repeat(60)}</Text>
      
      {/* 执行中状态 */}
      {isRunning && (
        <Box flexDirection="column">
          <Box>
            <Spinner color="blue" />
            <Text color="blue"> 列出文件中...</Text>
            {startTime && (
              <Text dim> ({((Date.now() - startTime) / 1000).toFixed(1)}s)</Text>
            )}
          </Box>
          <Box marginTop={1}>
            <ProgressBar width={40} color="blue" label="扫描中..." />
          </Box>
        </Box>
      )}
      
      {/* 完成状态 - 显示统计和列表 */}
      {!isRunning && isSuccess && parsedResult && (
        <Box flexDirection="column">
          {/* 统计信息 */}
          <Box marginBottom={1}>
            <Text>📊 共 </Text>
            <Text bold color="cyan">{parsedResult.total}</Text>
            <Text> 项</Text>
            {parsedResult.folders.length > 0 && (
              <Text dim> ({parsedResult.folders.length} 文件夹, {parsedResult.files.length} 文件)</Text>
            )}
          </Box>
          
          {/* 文件夹列表 */}
          {parsedResult.folders.length > 0 && (
            <Box flexDirection="column" marginBottom={1}>
              <Text bold color="yellow">📁 文件夹</Text>
              <Box 
                borderStyle="single" 
                borderColor="gray" 
                paddingX={1}
              >
                <ItemList 
                  items={parsedResult.folders}
                  maxItems={listMaxItems}
                  icon="📁"
                  color="yellow"
                />
              </Box>
            </Box>
          )}
          
          {/* 文件列表 */}
          {parsedResult.files.length > 0 && (
            <Box flexDirection="column">
              <Text bold color="cyan">📄 文件</Text>
              <Box 
                borderStyle="single" 
                borderColor="gray" 
                paddingX={1}
              >
                <ItemList 
                  items={parsedResult.files}
                  maxItems={listMaxItems}
                  icon="📄"
                  color="cyan"
                />
              </Box>
            </Box>
          )}
          
          {/* 空目录 */}
          {parsedResult.total === 0 && (
            <Text dim italic>（空目录）</Text>
          )}
        </Box>
      )}
      
      {/* 错误状态 */}
      {!isRunning && isError && (
        <Box flexDirection="column">
          <Text color="red">❌ 列出失败</Text>
          {parsedResult?.error && (
            <Text color="red" dim>{parsedResult.error}</Text>
          )}
        </Box>
      )}
      
      {/* 底部状态栏 */}
      {!isRunning && (
        <Box marginTop={1}>
          {isSuccess ? (
            <Text color="green">✓ 列出完成</Text>
          ) : (
            <Text color="red">✗ 列出失败</Text>
          )}
          {duration && (
            <Text dim> | {duration}ms</Text>
          )}
        </Box>
      )}
    </Box>
  );
}

export default ListRenderer;
