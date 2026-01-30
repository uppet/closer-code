/**
 * 全屏对话组件
 *
 * 特点：
 * - 占满整个屏幕
 * - 不限制高度，自然滚动
 * - 方便查看完整历史和复制内容
 * - 使用终端自带滚动
 * - 工具详情与对话混排显示
 */

import React from 'react';
import { Box, Text } from 'ink';
import { ToolRenderer } from './tool-renderers/index.jsx';

/**
 * 工具执行卡片组件（全屏模式专用 - 简洁版）
 */
function ToolExecutionCard({ tool }) {
  const statusConfig = {
    pending: { icon: '⏳', color: 'gray' },
    running: { icon: '⚡', color: 'yellow' },
    success: { icon: '✓', color: 'green' },
    error: { icon: '✗', color: 'red' }
  };
  
  const status = tool.status || 'pending';
  const { icon, color } = statusConfig[status];
  
  return (
    <Box flexDirection="column" marginY={1} width="100%">
      {/* 工具标题 - 简洁样式 */}
      <Box>
        <Text color={color}>{icon} </Text>
        <Text color="gray">🔧 </Text>
        <Text bold>{tool.tool}</Text>
        {tool.duration && <Text dim> ({tool.duration}ms)</Text>}
      </Box>
      
      {/* 工具详情 */}
      <Box paddingLeft={2}>
        <ToolRenderer tool={tool} maxHeight={20} />
      </Box>
    </Box>
  );
}

/**
 * 全屏对话组件（使用 React.memo 优化渲染性能）
 */
const FullscreenConversation = React.memo(function FullscreenConversation({ messages, tokenStats, toolExecutions = [], showTools = true }) {

  // 计算token使用颜色
  const getTokenColor = () => {
    const percentage = tokenStats.percentage || 0;
    if (percentage < 70) return 'green';
    if (percentage < 90) return 'yellow';
    return 'red';
  };

  // 将消息和工具执行按时间顺序混合（交叉混排）
  const getMixedContent = () => {
    const content = [];
    
    // 为消息添加排序时间戳（如果没有key，使用递减的时间戳）
    const messagesWithTime = messages.map((msg, index) => ({
      ...msg,
      _sortTime: msg.key || (Date.now() - (messages.length - index) * 10000)
    }));
    
    // 按照消息顺序遍历，并在合适的位置插入工具执行
    let lastMsgIndex = 0;
    messagesWithTime.forEach((message, msgIndex) => {
      // 添加消息
      content.push({
        type: 'message',
        data: message,
        key: message.key || `msg-${msgIndex}`,
        timestamp: message._sortTime
      });
      
      // 如果是助手消息，查找应该在这个消息之后的工具执行
      if (message.role === 'assistant' && showTools) {
        // 获取下一个消息的时间戳（如果有的话）
        const nextMsgTime = messagesWithTime[msgIndex + 1]?._sortTime || Infinity;
        
        // 找到所有应该在这个消息之后的工具执行
        // 条件：工具开始时间在当前消息之后，且在下一个消息之前
        const relatedTools = toolExecutions.filter(tool => {
          const toolTime = tool.startTime || tool.id || 0;
          return toolTime > message._sortTime && toolTime < nextMsgTime;
        });
        
        // 按工具开始时间排序并添加
        relatedTools
          .sort((a, b) => (a.startTime || a.id || 0) - (b.startTime || b.id || 0))
          .forEach((tool, toolIdx) => {
            content.push({
              type: 'tool',
              data: tool,
              key: tool.id || `tool-${msgIndex}-${toolIdx}`,
              timestamp: tool.startTime || tool.id || 0
            });
          });
      }
    });
    
    return content;
  };

  const mixedContent = getMixedContent();

  return (
    <Box flexDirection="column" height="100%" paddingX={1}>
      {/* 顶部状态栏 - 简洁无边框 */}
      <Box paddingX={1} marginBottom={1} justifyContent="space-between">
        <Text dim>📺 全屏模式 (Ctrl+G 退出)</Text>
        <Text color={getTokenColor()} dim>
          {tokenStats.total?.toLocaleString() || 0}/{tokenStats.limit?.toLocaleString() || 4096}
        </Text>
      </Box>

      {/* 混合内容列表 - 不限制高度 */}
      <Box flexDirection="column" flexGrow={1}>
        {mixedContent.length === 0 ? (
          <Box justifyContent="center" alignItems="center">
            <Text dim>暂无消息</Text>
          </Box>
        ) : (
          mixedContent.map((item, index) => {
            if (item.type === 'message') {
              const message = item.data;
              const isUser = message.role === 'user';
              const isSystem = message.role === 'system';
              const isError = message.role === 'error';

              const color = isUser ? 'cyan' : isError ? 'red' : isSystem ? 'yellow' : 'white';

              return (
                <Box key={item.key} flexDirection="column" marginBottom={1} width="100%">
                  <Box width="100%">
                    <Text bold color={color}>
                      {isUser ? '👤 用户' : isError ? '❌ 错误' : isSystem ? 'ℹ️ 系统' : '🤖 助手'}
                    </Text>
                  </Box>
                  <Box width="100%">
                    <Text color={color}>
                      {typeof message.content === 'string'
                        ? message.content
                        : JSON.stringify(message.content, null, 2)}
                    </Text>
                  </Box>
                  {/* 简洁分隔 */}
                  <Box marginTop={1} />
                </Box>
              );
            } else if (item.type === 'tool') {
              return (
                <ToolExecutionCard key={item.key} tool={item.data} />
              );
            }
            return null;
          })
        )}
      </Box>

      {/* 底部提示 - 简洁无边框 */}
      <Box paddingX={1} marginTop={1}>
        <Text dim>💡 鼠标选择复制 | 滚轮滚动 | Ctrl+G 返回 | Ctrl+T {showTools ? '隐藏' : '显示'}工具</Text>
      </Box>
    </Box>
  );
});

export default FullscreenConversation;
