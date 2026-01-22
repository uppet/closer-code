/**
 * 工具渲染器统一导出
 * 
 * 根据工具名称选择对应的渲染器
 */

import React from 'react';
import { Box, Text } from 'ink';

import { BashRenderer } from './bash-renderer.jsx';
import { FileReadRenderer } from './file-read-renderer.jsx';
import { FileWriteRenderer } from './file-write-renderer.jsx';
import { FileEditRenderer } from './file-edit-renderer.jsx';
import { SearchRenderer } from './search-renderer.jsx';
import { ListRenderer } from './list-renderer.jsx';

/**
 * 工具名称到渲染器的映射
 */
const TOOL_RENDERER_MAP = {
  // Bash 命令
  bash: BashRenderer,
  
  // 文件读取
  readFile: FileReadRenderer,
  readFileLines: FileReadRenderer,
  readFileTail: FileReadRenderer,
  
  // 文件写入
  writeFile: FileWriteRenderer,
  
  // 文件编辑
  editFile: FileEditRenderer,
  regionConstrainedEdit: FileEditRenderer,
  
  // 搜索
  searchFiles: SearchRenderer,
  searchCode: SearchRenderer,
  
  // 目录列表
  listFiles: ListRenderer
};

/**
 * 默认渲染器（用于未知工具）
 */
function DefaultRenderer({ tool, maxHeight = 10 }) {
  const { input, result, status, duration } = tool;
  
  const statusConfig = {
    pending: { icon: '⏳', color: 'gray', label: '等待' },
    running: { icon: '⚡', color: 'yellow', label: '执行中' },
    success: { icon: '✓', color: 'green', label: '成功' },
    error: { icon: '✗', color: 'red', label: '失败' }
  };
  
  const { icon, color, label } = statusConfig[status] || statusConfig.pending;
  
  return (
    <Box flexDirection="column">
      {/* 工具信息 */}
      <Box>
        <Text color={color}>{icon} </Text>
        <Text bold>{tool.tool}</Text>
        <Text dim> | </Text>
        <Text color={color}>{label}</Text>
        {duration && <Text dim> | {duration}ms</Text>}
      </Box>
      
      {/* 分隔线 */}
      <Text dim>{'─'.repeat(60)}</Text>
      
      {/* 输入参数 */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold color="cyan">📥 输入</Text>
        <Box borderStyle="single" borderColor="gray" paddingX={1}>
          <Text>{formatJson(input, maxHeight - 6)}</Text>
        </Box>
      </Box>
      
      {/* 输出结果 */}
      {result && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color={result?.success !== false ? 'green' : 'red'}>
            📤 输出 {result?.success !== false ? '✓' : '✗'}
          </Text>
          <Box borderStyle="single" borderColor="gray" paddingX={1}>
            <Text>{formatJson(result, maxHeight - 6)}</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}

/**
 * 格式化 JSON 为字符串
 */
function formatJson(data, maxLines = 5) {
  if (data === null || data === undefined) {
    return 'null';
  }
  
  try {
    const str = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const lines = str.split('\n');
    
    if (lines.length <= maxLines) {
      return str;
    }
    
    return lines.slice(0, maxLines).join('\n') + `\n... 还有 ${lines.length - maxLines} 行`;
  } catch {
    return String(data);
  }
}

/**
 * 获取工具对应的渲染器
 * 
 * @param {string} toolName - 工具名称
 * @returns {React.Component} 渲染器组件
 */
export function getToolRenderer(toolName) {
  return TOOL_RENDERER_MAP[toolName] || DefaultRenderer;
}

/**
 * 工具渲染器包装组件
 * 
 * 自动根据工具名称选择对应的渲染器
 * 
 * @param {Object} props
 * @param {Object} props.tool - 工具执行数据
 * @param {number} props.maxHeight - 最大高度
 */
export function ToolRenderer({ tool, maxHeight = 10 }) {
  if (!tool) {
    return (
      <Box justifyContent="center" alignItems="center">
        <Text dim>暂无工具数据</Text>
      </Box>
    );
  }
  
  const Renderer = getToolRenderer(tool.tool);
  
  return <Renderer tool={tool} maxHeight={maxHeight} />;
}

// 导出所有渲染器
export { BashRenderer } from './bash-renderer.jsx';
export { FileReadRenderer } from './file-read-renderer.jsx';
export { FileWriteRenderer } from './file-write-renderer.jsx';
export { FileEditRenderer } from './file-edit-renderer.jsx';
export { SearchRenderer } from './search-renderer.jsx';
export { ListRenderer } from './list-renderer.jsx';

export default ToolRenderer;
