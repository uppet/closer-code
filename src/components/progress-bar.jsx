/**
 * 进度条组件
 * 
 * 支持确定进度（百分比）和不确定进度（动画）
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

/**
 * 进度条组件
 * 
 * @param {Object} props
 * @param {number} props.percent - 进度百分比 (0-100)，不传则显示不确定进度动画
 * @param {number} props.width - 进度条宽度（字符数）
 * @param {string} props.color - 进度条颜色
 * @param {string} props.label - 进度条标签
 * @param {boolean} props.showPercent - 是否显示百分比
 */
export function ProgressBar({ 
  percent, 
  width = 30, 
  color = 'cyan',
  label = '',
  showPercent = true
}) {
  const [animationFrame, setAnimationFrame] = useState(0);
  
  // 不确定进度动画
  useEffect(() => {
    if (percent !== undefined) return;
    
    const timer = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % width);
    }, 100);
    
    return () => clearInterval(timer);
  }, [percent, width]);
  
  // 确定进度
  if (percent !== undefined) {
    const safePercent = Math.max(0, Math.min(100, percent));
    const filled = Math.round((safePercent / 100) * width);
    const empty = width - filled;
    
    return (
      <Box>
        <Text color={color}>{'▓'.repeat(filled)}</Text>
        <Text dim>{'░'.repeat(empty)}</Text>
        {showPercent && <Text dim> {safePercent.toFixed(0)}%</Text>}
        {label && <Text dim> {label}</Text>}
      </Box>
    );
  }
  
  // 不确定进度（动画效果）
  const animWidth = 6;
  const bar = Array(width).fill('░');
  
  for (let i = 0; i < animWidth; i++) {
    const pos = (animationFrame + i) % width;
    bar[pos] = '▓';
  }
  
  return (
    <Box>
      <Text color={color}>{bar.join('')}</Text>
      {label && <Text dim> {label}</Text>}
    </Box>
  );
}

/**
 * 执行状态指示器
 * 
 * @param {Object} props
 * @param {string} props.status - 状态：pending | running | success | error
 * @param {number} props.duration - 执行时长（毫秒）
 */
export function StatusIndicator({ status, duration }) {
  const [elapsed, setElapsed] = useState(0);
  
  // 运行中时显示计时
  useEffect(() => {
    if (status !== 'running') return;
    
    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);
    
    return () => clearInterval(timer);
  }, [status]);
  
  const config = {
    pending: { icon: '⏳', color: 'gray', text: '等待中' },
    running: { icon: '⚡', color: 'yellow', text: `执行中 ${(elapsed / 1000).toFixed(1)}s` },
    success: { icon: '✓', color: 'green', text: duration ? `完成 ${duration}ms` : '完成' },
    error: { icon: '✗', color: 'red', text: '失败' }
  };
  
  const { icon, color, text } = config[status] || config.pending;
  
  return (
    <Box>
      <Text color={color}>{icon} </Text>
      <Text color={color}>{text}</Text>
    </Box>
  );
}

/**
 * 简单的 Spinner 组件
 */
export function Spinner({ color = 'cyan', label = '' }) {
  const [frame, setFrame] = useState(0);
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  
  useEffect(() => {
    const timer = setInterval(() => {
      setFrame(prev => (prev + 1) % frames.length);
    }, 80);
    
    return () => clearInterval(timer);
  }, []);
  
  return (
    <Box>
      <Text color={color}>{frames[frame]}</Text>
      {label && <Text> {label}</Text>}
    </Box>
  );
}

export default ProgressBar;
