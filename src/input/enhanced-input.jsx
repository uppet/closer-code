/**
 * 增强型输入组件
 *
 * 功能：
 * - 全程多行输入
 * - 支持历史记录导航（上下箭头）
 * - Enter 发送，Ctrl+Enter 换行
 * - 显示历史记录状态
 */

import React, { useState, useRef, useEffect } from 'react';
import { MultilineTextInput } from '../components/multiline-text-input.jsx';
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
    const total = stats.total;

    // 始终显示历史记录指示器
    if (currentIndex === -1) {
      // 没有浏览历史时，显示总数量
      if (total === 0) {
        return <Text dim color="gray"> [history: empty]</Text>;
      }
      return <Text dim color="gray"> [history: {total} entries, ↑/↓ to browse]</Text>;
    }

    // 正在浏览历史，显示当前位置
    const position = currentIndex + 1;
    return (
      <Text dim color="gray"> [history: {position}/{total}]</Text>
    );
  };

  return (
    <>
      <MultilineTextInput
        initialValue={internalValue}
        onChange={handleChange}
        onSubmit={handleSubmit}
        placeholder={placeholder}
        focus={focus}
        onHistoryNavigation={handleHistoryNavigation}
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
  maxHeight = 10,
  ...props
}) {
  const [internalValue, setInternalValue] = useState(value);
  const [historyKey, setHistoryKey] = useState(0);  // 用于强制刷新历史指示器
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

  // 处理提交
  const handleSubmit = (submittedValue) => {
    const trimmed = submittedValue.trim();

    // 添加到历史记录
    if (history && trimmed) {
      history.add(trimmed);
    }

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
      
      // 强制刷新历史指示器
      setHistoryKey(prev => prev + 1);
      
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
    const total = stats.total;

    // 始终显示历史记录指示器
    if (currentIndex === -1) {
      // 没有浏览历史时，显示总数量
      if (total === 0) {
        return <Text dim color="gray"> [history: empty]</Text>;
      }
      return <Text dim color="gray"> [history: {total} entries, ↑/↓ to browse]</Text>;
    }

    // 正在浏览历史，显示当前位置
    const position = currentIndex + 1;
    return (
      <Text dim color="gray"> [history: {position}/{total}]</Text>
    );
  };

  // 全程多行模式
  return (
    <>
      <MultilineTextInput
        initialValue={internalValue}
        onChange={handleChange}
        onSubmit={handleSubmit}
        maxHeight={maxHeight}
        focus={focus}
        placeholder={placeholder || '输入消息... (Enter发送, Ctrl+Enter换行, Ctrl+L清空)'}
        onHistoryNavigation={handleHistoryNavigation}
      />
      {renderHistoryIndicator()}
    </>
  );
}

export default EnhancedTextInputWithShortcuts;
