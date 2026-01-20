/**
 * 增强型输入组件
 *
 * 功能：
 * - 支持历史记录导航（上下箭头）
 * - 支持快捷键（Ctrl+A/E/U/K/W等）
 * - 显示历史记录状态
 * - 使用自定义的 EnhancedTextInputCore（支持光标位置控制）
 */

import React, { useState, useRef, useEffect } from 'react';
import { EnhancedTextInput as EnhancedTextInputCore } from '../components/ink-text-input';
import { Text } from 'ink';

export function EnhancedTextInput({
  value = '',
  onChange,
  onSubmit,
  placeholder = '',
  history,
  focus = true,
  showHistoryIndicator = true,
  ...props
}) {
  const [internalValue, setInternalValue] = useState(value);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isBrowsingHistory, setIsBrowsingHistory] = useState(false);
  const inputRef = useRef('');

  // 同步外部 value 变化
  useEffect(() => {
    if (!isBrowsingHistory) {
      setInternalValue(value);
    }
  }, [value, isBrowsingHistory]);

  // 处理值变化
  const handleChange = (newValue) => {
    setInternalValue(newValue);
    inputRef.current = newValue;
    
    // 如果用户正在编辑，退出历史浏览模式
    if (isBrowsingHistory) {
      setIsBrowsingHistory(false);
      setHistoryIndex(-1);
    }
    
    if (onChange) {
      onChange(newValue);
    }
  };

  // 处理提交
  const handleSubmit = (submittedValue) => {
    const trimmed = submittedValue.trim();
    
    // 添加到历史记录
    if (history && trimmed) {
      history.add(trimmed);
    }
    
    // 重置历史浏览状态
    setIsBrowsingHistory(false);
    setHistoryIndex(-1);
    
    // 清空输入
    setInternalValue('');
    inputRef.current = '';
    
    if (onSubmit) {
      onSubmit(submittedValue);
    }
  };

  // 处理历史记录导航
  const handleHistoryNavigation = (direction) => {
    if (!history) {
      return;
    }

    const result = history.navigate(direction, internalValue);
    
    if (result !== null) {
      setInternalValue(result);
      inputRef.current = result;
      setIsBrowsingHistory(true);
      
      // 更新历史索引显示
      const stats = history.getStats();
      setHistoryIndex(stats.currentIndex);
      
      if (onChange) {
        onChange(result);
      }
    }
  };

  // 生成历史记录指示器
  const renderHistoryIndicator = () => {
    if (!showHistoryIndicator || !history) {
      return null;
    }

    const stats = history.getStats();
    const currentIndex = stats.currentIndex;
    
    // 只有在浏览历史时才显示指示器
    if (currentIndex === -1) {
      return null;
    }

    const position = currentIndex + 1;
    const total = stats.total;

    return (
      <Text dim color="gray"> [history: {position}/{total}]</Text>
    );
  };

  return (
    <>
      <EnhancedTextInputCore
        value={internalValue}
        onChange={handleChange}
        onSubmit={handleSubmit}
        placeholder={placeholder}
        focus={focus}
        enableShortcuts={true}
        {...props}
      />
      {renderHistoryIndicator()}
    </>
  );
}

/**
 * 增强型输入组件 - 带快捷键支持
 *
 * 支持的快捷键：
 * - Ctrl+A: 跳到行首
 * - Ctrl+E: 跳到行尾
 * - Ctrl+U: 删除到行首
 * - Ctrl+K: 删除到行尾
 * - Ctrl+W: 删除前一个单词
 * - ↑/↓: 历史记录导航
 */
export function EnhancedTextInputWithShortcuts({
  value = '',
  onChange,
  onSubmit,
  placeholder = '',
  history,
  focus = true,
  showHistoryIndicator = true,
  ...props
}) {
  const [internalValue, setInternalValue] = useState(value);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef('');

  // 同步外部 value 变化
  useEffect(() => {
    // 始终同步外部 value（包括历史记录导航）
    setInternalValue(value);
  }, [value]);

  // 处理值变化
  const handleChange = (newValue) => {
    setInternalValue(newValue);
    inputRef.current = newValue;

    // 如果用户开始编辑，重置历史记录导航
    if (history && history.currentIndex !== -1) {
      history.resetNavigation();
    }

    if (onChange) {
      onChange(newValue);
    }
  };

  // 处理光标位置变化
  const handleCursorChange = (newPosition) => {
    setCursorPosition(newPosition);
  };

  // 处理提交
  const handleSubmit = (submittedValue) => {
    const trimmed = submittedValue.trim();

    // 添加到历史记录
    if (history && trimmed) {
      history.add(trimmed);
    }

    // 清空输入
    setInternalValue('');
    setCursorPosition(0);
    inputRef.current = '';

    if (onSubmit) {
      onSubmit(submittedValue);
    }
  };

  // 生成历史记录指示器
  const renderHistoryIndicator = () => {
    if (!showHistoryIndicator || !history) {
      return null;
    }

    const stats = history.getStats();
    const currentIndex = stats.currentIndex;

    // 只有在浏览历史时才显示指示器
    if (currentIndex === -1) {
      return null;
    }

    const position = currentIndex + 1;
    const total = stats.total;

    return (
      <Text dim color="gray"> [history: {position}/{total}]</Text>
    );
  };

  return (
    <>
      <EnhancedTextInputCore
        value={internalValue}
        cursorPosition={cursorPosition}
        onChange={handleChange}
        onCursorChange={handleCursorChange}
        onSubmit={handleSubmit}
        placeholder={placeholder}
        focus={focus}
        enableShortcuts={true}
        {...props}
      />
      {renderHistoryIndicator()}
    </>
  );
}

export default EnhancedTextInputWithShortcuts;
