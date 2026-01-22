/**
 * 搜索渲染器
 * 
 * 支持工具：searchFiles, searchCode
 * 
 * 特点：
 * - 显示搜索模式
 * - 匹配数量统计
 * - 匹配文件/位置列表
 */

import React from 'react';
import { Box, Text } from 'ink';
import { ProgressBar, Spinner } from '../progress-bar.jsx';

/**
 * 解析搜索工具的输入参数
 */
function parseInput(input, toolName) {
  if (!input) return { pattern: '' };
  
  if (typeof input === 'string') {
    return { pattern: input };
  }
  
  return {
    pattern: input.pattern || input.query || input.search || input.glob || '',
    directory: input.directory || input.dir || input.path || '',
    filePattern: input.filePattern || input.include || '',
    caseSensitive: input.caseSensitive
  };
}

/**
 * 解析搜索工具的输出结果
 */
function parseResult(result, toolName) {
  if (!result) return null;
  
  // 字符串结果
  if (typeof result === 'string') {
    // 尝试解析为文件列表
    const lines = result.split('\n').filter(line => line.trim());
    return {
      success: true,
      files: lines,
      count: lines.length
    };
  }
  
  // 数组结果
  if (Array.isArray(result)) {
    return {
      success: true,
      files: result.map(item => typeof item === 'string' ? item : item.path || item.file || String(item)),
      matches: result,
      count: result.length
    };
  }
  
  // 对象结果
  return {
    success: result.success !== false,
    files: result.files || result.matches || result.results || [],
    count: result.count || result.total || (result.files || result.matches || result.results || []).length,
    error: result.error || result.message
  };
}

/**
 * 匹配列表组件
 */
function MatchList({ items, maxItems = 6, type = 'file' }) {
  if (!items || items.length === 0) {
    return <Text dim italic>（无匹配）</Text>;
  }
  
  const displayItems = items.slice(0, maxItems);
  const hasMore = items.length > maxItems;
  
  return (
    <Box flexDirection="column">
      {displayItems.map((item, i) => {
        let displayText = '';
        let lineInfo = '';
        
        if (typeof item === 'string') {
          displayText = item;
        } else if (item.path || item.file) {
          displayText = item.path || item.file;
          if (item.line) {
            lineInfo = `:${item.line}`;
          }
          if (item.match || item.text) {
            lineInfo += ` ${(item.match || item.text).substring(0, 30)}`;
          }
        } else {
          displayText = String(item);
        }
        
        // 截断长路径
        if (displayText.length > 50) {
          displayText = '...' + displayText.substring(displayText.length - 47);
        }
        
        return (
          <Box key={i}>
            <Text dim>• </Text>
            <Text color="cyan">{displayText}</Text>
            {lineInfo && <Text dim>{lineInfo}</Text>}
          </Box>
        );
      })}
      {hasMore && (
        <Text dim italic>... 还有 {items.length - maxItems} 个匹配</Text>
      )}
    </Box>
  );
}

/**
 * 搜索渲染器组件
 * 
 * @param {Object} props
 * @param {Object} props.tool - 工具执行数据
 * @param {number} props.maxHeight - 最大高度
 */
export function SearchRenderer({ tool, maxHeight = 10 }) {
  const { input, result, status, duration, startTime } = tool;
  const toolName = tool.tool || 'searchFiles';
  
  const parsedInput = parseInput(input, toolName);
  const parsedResult = parseResult(result, toolName);
  
  const isRunning = status === 'running';
  const isSuccess = status === 'success' || parsedResult?.success;
  const isError = status === 'error' || parsedResult?.success === false;
  
  // 计算列表可用行数
  const listMaxItems = Math.max(3, maxHeight - 6);
  
  // 工具配置
  const toolConfig = {
    searchFiles: { icon: '🔍', label: '文件搜索', resultLabel: '匹配文件' },
    searchCode: { icon: '🔎', label: '代码搜索', resultLabel: '匹配位置' }
  };
  const config = toolConfig[toolName] || toolConfig.searchFiles;
  
  return (
    <Box flexDirection="column">
      {/* 搜索信息 */}
      <Box>
        <Text>{config.icon} </Text>
        <Text bold color="blue">{config.label}</Text>
        {parsedResult?.count > 0 && (
          <Text color="green"> 📊 找到 {parsedResult.count} 个</Text>
        )}
      </Box>
      
      {/* 搜索模式 */}
      <Box>
        <Text dim>🎯 模式: </Text>
        <Text color="yellow">
          {parsedInput.pattern.length > 50 
            ? parsedInput.pattern.substring(0, 47) + '...' 
            : parsedInput.pattern}
        </Text>
      </Box>
      
      {/* 搜索目录 */}
      {parsedInput.directory && (
        <Box>
          <Text dim>📂 目录: {parsedInput.directory}</Text>
        </Box>
      )}
      
      {/* 文件模式 */}
      {parsedInput.filePattern && (
        <Box>
          <Text dim>📄 文件: {parsedInput.filePattern}</Text>
        </Box>
      )}
      
      {/* 分隔线 */}
      <Text dim>{'─'.repeat(60)}</Text>
      
      {/* 执行中状态 */}
      {isRunning && (
        <Box flexDirection="column">
          <Box>
            <Spinner color="blue" />
            <Text color="blue"> 搜索中...</Text>
            {startTime && (
              <Text dim> ({((Date.now() - startTime) / 1000).toFixed(1)}s)</Text>
            )}
          </Box>
          <Box marginTop={1}>
            <ProgressBar width={40} color="blue" label="搜索中..." />
          </Box>
        </Box>
      )}
      
      {/* 完成状态 - 显示匹配列表 */}
      {!isRunning && isSuccess && parsedResult && (
        <Box flexDirection="column">
          <Text bold color="cyan">📁 {config.resultLabel}</Text>
          <Box 
            borderStyle="single" 
            borderColor="gray" 
            paddingX={1}
          >
            <MatchList 
              items={parsedResult.files || parsedResult.matches}
              maxItems={listMaxItems}
              type={toolName === 'searchCode' ? 'code' : 'file'}
            />
          </Box>
        </Box>
      )}
      
      {/* 错误状态 */}
      {!isRunning && isError && (
        <Box flexDirection="column">
          <Text color="red">❌ 搜索失败</Text>
          {parsedResult?.error && (
            <Text color="red" dim>{parsedResult.error}</Text>
          )}
        </Box>
      )}
      
      {/* 底部状态栏 */}
      {!isRunning && (
        <Box marginTop={1}>
          {isSuccess ? (
            <Text color="green">✓ 搜索完成</Text>
          ) : (
            <Text color="red">✗ 搜索失败</Text>
          )}
          {duration && (
            <Text dim> | {duration}ms</Text>
          )}
        </Box>
      )}
    </Box>
  );
}

export default SearchRenderer;
