/**
 * 工具详情视图组件
 * 
 * 在终端底部显示当前选中工具的详情
 * - 使用专用渲染器为每种工具提供个性化展示
 * - 通过 Shift+↑↓ 切换查看不同工具
 * - ESC/Ctrl+T 关闭
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';
import { ToolRenderer } from './tool-renderers/index.jsx';

/**
 * 工具详情面板（简化版 - 上下排版）
 * 
 * @param {Object} props
 * @param {Array} props.tools - 工具执行列表
 * @param {boolean} props.visible - 是否显示
 * @param {Function} props.onClose - 关闭回调
 * @param {number} props.height - 面板高度
 */
export function ToolDetailPanel({ 
  tools = [], 
  visible, 
  onClose,
  height = 14,
  selectedIndex = 0,
  onIndexChange
}) {
  // 键盘处理 - ESC 关闭面板
  useInput((input, key) => {
    if (!visible) return;
    
    if (key.escape) {
      onClose?.();
      return;
    }
  });
  
  if (!visible) return null;
  
  // 确保索引在有效范围内
  const safeIndex = Math.max(0, Math.min(selectedIndex, tools.length - 1));
  const selectedTool = tools[safeIndex];
  
  return (
    <Box
      flexDirection="column"
      borderTop={true}
      borderBottom={true}
      borderStyle="single"
      borderColor="cyan"
      paddingX={1}
      height={height}
    >
      {/* 标题栏 */}
      <Box justifyContent="space-between">
        <Box>
          <Text bold color="cyan">📋 工具详情 </Text>
          {tools.length > 0 && (
            <Text dim>({safeIndex + 1}/{tools.length})</Text>
          )}
        </Box>
        <Text dim>Shift+↑↓ 切换 | ESC 关闭</Text>
      </Box>
      
      {tools.length === 0 ? (
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <Text dim>暂无工具执行记录</Text>
        </Box>
      ) : (
        <Box flexDirection="column" flexGrow={1} marginTop={1}>
          {/* 使用专用渲染器显示工具详情 */}
          <ToolRenderer tool={selectedTool} maxHeight={height - 4} />
        </Box>
      )}
    </Box>
  );
}

export default ToolDetailPanel;
