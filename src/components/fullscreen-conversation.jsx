/**
 * 全屏对话组件
 *
 * 特点：
 * - 占满整个屏幕
 * - 不限制高度，自然滚动
 * - 方便查看完整历史和复制内容
 * - 使用终端自带滚动
 */

import React from 'react';
import { Box, Text } from 'ink';

/**
 * 全屏对话组件
 */
function FullscreenConversation({ messages, tokenStats }) {

  // 计算token使用颜色
  const getTokenColor = () => {
    const percentage = tokenStats.percentage || 0;
    if (percentage < 70) return 'green';
    if (percentage < 90) return 'yellow';
    return 'red';
  };

  return (
    <Box flexDirection="column" height="100%" paddingX={1}>
      {/* 消息列表 - 不限制高度 */}
      <Box flexDirection="column" flexGrow={1}>
        {messages.length === 0 ? (
          <Box justifyContent="center" alignItems="center">
            <Text dim>暂无消息</Text>
          </Box>
        ) : (
          messages.map((message, index) => {
            const isUser = message.role === 'user';
            const isSystem = message.role === 'system';
            const isError = message.role === 'error';

            const color = isUser ? 'cyan' : isError ? 'red' : isSystem ? 'yellow' : 'white';

            return (
              <Box key={message.key || index} flexDirection="column" marginBottom={1} width="100%">
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
                {/* 消息分隔线 */}
                {index < messages.length - 1 && (
                  <Box width="100%">
                    <Text dim color="gray">{'─'.repeat(Math.min(80, process.stdout.columns || 80))}</Text>
                  </Box>
                )}
              </Box>
            );
          })
        )}
      </Box>

      {/* 顶部提示栏 - 放在对话区下面 */}
      <Box
        borderStyle="double"
        borderColor="cyan"
        paddingX={1}
        marginTop={1}
        marginBottom={1}
        justifyContent="space-between"
      >
        <Box>
          <Text bold color="cyan">📺 全屏对话模式</Text>
          <Text dim> - 按 Ctrl+G 退出</Text>
        </Box>
        <Box>
          <Text color={getTokenColor()}>
            Tokens: {tokenStats.total?.toLocaleString() || 0}/{tokenStats.limit?.toLocaleString() || 4096}
          </Text>
        </Box>
      </Box>

      {/* 底部提示 */}
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dim>
          💡 提示：使用鼠标选择文本复制 | 滚轮或方向键滚动 | Ctrl+G 返回分屏模式
        </Text>
      </Box>
    </Box>
  );
}

export default FullscreenConversation;
