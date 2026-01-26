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

  // 将消息和工具执行按顺序混合
  const getMixedContent = () => {
    const content = [];
    const usedToolIndices = new Set(); // 记录已使用的工具索引

    // 遍历消息，将工具执行插入到对应的助手消息后面
    messages.forEach((message, msgIndex) => {
      // 添加消息
      content.push({
        type: 'message',
        data: message,
        key: message.key || `msg-${msgIndex}`,
        timestamp: message.timestamp || msgIndex
      });

      // 如果是助手消息且有工具调用，添加相关的工具执行
      if (message.role === 'assistant' && showTools) {
        // 找到所有属于这条消息的工具（通过 messageIndex 匹配）
        toolExecutions.forEach((tool, toolIdx) => {
          // 如果工具的 messageIndex 等于当前消息索引，且未被使用过
          if (tool.messageIndex === msgIndex && !usedToolIndices.has(toolIdx)) {
            content.push({
              type: 'tool',
              data: tool,
              key: tool.id || `tool-${toolIdx}`,
              timestamp: tool.startTime || tool.id || Date.now()
            });
            usedToolIndices.add(toolIdx);
          }
        });
      }
    });

    // 添加剩余的工具执行（没有关联到任何消息的工具）
    if (showTools) {
      toolExecutions.forEach((tool, toolIdx) => {
        if (!usedToolIndices.has(toolIdx)) {
          content.push({
            type: 'tool',
            data: tool,
            key: tool.id || `tool-${toolIdx}`,
            timestamp: tool.startTime || tool.id || Date.now()
          });
        }
      });
    }

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
                  <Box width="100%" paddingLeft={1}>
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
