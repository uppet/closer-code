/**
 * Enhanced TextInput Component
 *
 * Forked from ink-text-input with the following enhancements:
 * - Added cursorPosition prop for external cursor control
 * - Added onCursorChange callback to notify cursor position changes
 * - Implemented Ctrl+A (jump to start)
 * - Implemented Ctrl+E (jump to end)
 * - Implemented Ctrl+B (move back one character)
 * - Implemented Ctrl+F (move forward one character)
 * - Implemented Ctrl+U (delete to start)
 * - Implemented Ctrl+K (delete to end)
 * - Implemented Ctrl+W (delete previous word)
 */

import React, { useState, useEffect } from 'react';
import { Text, useInput } from 'ink';
import chalk from 'chalk';
import { supportsJobControl } from '../../utils/platform.js';

export function EnhancedTextInput({
  value: originalValue = '',
  placeholder = '',
  focus = true,
  mask,
  highlightPastedText = false,
  showCursor = true,
  cursorPosition: externalCursorPosition,
  onCursorChange,
  onChange,
  onSubmit,
  enableShortcuts = true
}) {
  // 初始化光标位置
  const getInitialCursorOffset = () => {
    if (externalCursorPosition !== undefined) {
      return externalCursorPosition;
    }
    return (originalValue || '').length;
  };

  const [state, setState] = useState({
    cursorOffset: getInitialCursorOffset(),
    cursorWidth: 0
  });

  const { cursorOffset, cursorWidth } = state;

  // 同步外部 cursorPosition 变化
  useEffect(() => {
    if (externalCursorPosition !== undefined && externalCursorPosition !== cursorOffset) {
      setState({
        cursorOffset: externalCursorPosition,
        cursorWidth: 0
      });
    }
  }, [externalCursorPosition]);

  // 当 value 变化时，调整光标位置
  useEffect(() => {
    setState(previousState => {
      if (!focus || !showCursor) {
        return previousState;
      }

      const newValue = originalValue || '';

      // 如果光标超出范围，调整到末尾
      if (previousState.cursorOffset > newValue.length) {
        const newOffset = newValue.length;
        // 通知父组件
        if (onCursorChange) {
          onCursorChange(newOffset);
        }
        return {
          cursorOffset: newOffset,
          cursorWidth: 0
        };
      }

      return previousState;
    });
  }, [originalValue, focus, showCursor, onCursorChange]);

  const cursorActualWidth = highlightPastedText ? cursorWidth : 0;
  const value = mask ? mask.repeat(originalValue.length) : originalValue;

  let renderedValue = value;
  let renderedPlaceholder = placeholder ? chalk.grey(placeholder) : undefined;

  // 渲染光标（fake cursor）
  if (showCursor && focus) {
    renderedPlaceholder =
      placeholder.length > 0
        ? chalk.inverse(placeholder[0]) + chalk.grey(placeholder.slice(1))
        : chalk.inverse(' ');

    renderedValue = value.length > 0 ? '' : chalk.inverse(' ');

    let i = 0;
    for (const char of value) {
      renderedValue +=
        i >= cursorOffset - cursorActualWidth && i <= cursorOffset
          ? chalk.inverse(char)
          : char;
      i++;
    }

    if (value.length > 0 && cursorOffset === value.length) {
      renderedValue += chalk.inverse(' ');
    }
  }

  useInput((input, key) => {
    // 不处理的按键（由主组件处理）
    if (key.upArrow ||
        key.downArrow ||
        (key.ctrl && input === 'c') ||
        (key.ctrl && input === 'z') ||
        (key.ctrl && input === 't') ||
        (key.ctrl && input === 'g') ||
        key.tab ||
        (key.shift && key.tab)) {
      return;
    }

    // Enter 键
    if (key.return) {
      if (onSubmit) {
        onSubmit(originalValue);
      }
      return;
    }

    let nextCursorOffset = cursorOffset;
    let nextValue = originalValue;
    let nextCursorWidth = 0;

    // 快捷键处理
    if (enableShortcuts && key.ctrl) {
      // Ctrl+A: 跳到行首
      if (input === 'a') {
        nextCursorOffset = 0;
        setState({
          cursorOffset: nextCursorOffset,
          cursorWidth: 0
        });
        if (onCursorChange) {
          onCursorChange(nextCursorOffset);
        }
        return;
      }

      // Ctrl+E: 跳到行尾
      if (input === 'e') {
        nextCursorOffset = originalValue.length;
        setState({
          cursorOffset: nextCursorOffset,
          cursorWidth: 0
        });
        if (onCursorChange) {
          onCursorChange(nextCursorOffset);
        }
        return;
      }

      // Ctrl+B: 向后移动一个字符（相当于左箭头）
      if (input === 'b') {
        nextCursorOffset = Math.max(0, cursorOffset - 1);
        setState({
          cursorOffset: nextCursorOffset,
          cursorWidth: 0
        });
        if (onCursorChange) {
          onCursorChange(nextCursorOffset);
        }
        return;
      }

      // Ctrl+F: 向前移动一个字符（相当于右箭头）
      if (input === 'f') {
        nextCursorOffset = Math.min(originalValue.length, cursorOffset + 1);
        setState({
          cursorOffset: nextCursorOffset,
          cursorWidth: 0
        });
        if (onCursorChange) {
          onCursorChange(nextCursorOffset);
        }
        return;
      }

      // Ctrl+U: 删除到行首
      if (input === 'u') {
        if (cursorOffset > 0) {
          nextValue = originalValue.slice(cursorOffset);
          onChange(nextValue);
          nextCursorOffset = 0;
          setState({
            cursorOffset: nextCursorOffset,
            cursorWidth: 0
          });
          if (onCursorChange) {
            onCursorChange(nextCursorOffset);
          }
        }
        return;
      }

      // Ctrl+K: 删除到行尾
      if (input === 'k') {
        if (cursorOffset < originalValue.length) {
          nextValue = originalValue.slice(0, cursorOffset);
          onChange(nextValue);
          setState({
            cursorOffset: nextCursorOffset,
            cursorWidth: 0
          });
        }
        return;
      }

      // Ctrl+W: 删除前一个单词
      if (input === 'w') {
        if (cursorOffset > 0) {
          const beforeCursor = originalValue.slice(0, cursorOffset);
          const afterCursor = originalValue.slice(cursorOffset);

          // 找到前一个单词的边界
          const newBefore = beforeCursor.replace(/\S+\s*$/, '');
          nextCursorOffset = newBefore.length;
          nextValue = newBefore + afterCursor;

          onChange(nextValue);
          setState({
            cursorOffset: nextCursorOffset,
            cursorWidth: 0
          });
          if (onCursorChange) {
            onCursorChange(nextCursorOffset);
          }
        }
        return;
      }
    }

    // 左箭头
    if (key.leftArrow) {
      if (showCursor) {
        nextCursorOffset--;
      }
    }
    // 右箭头
    else if (key.rightArrow) {
      if (showCursor) {
        nextCursorOffset++;
      }
    }
    // Backspace 或 Delete
    else if (key.backspace || key.delete) {
      if (cursorOffset > 0) {
        nextValue =
          originalValue.slice(0, cursorOffset - 1) +
            originalValue.slice(cursorOffset, originalValue.length);
        nextCursorOffset--;
      }
    }
    // 普通字符输入
    else {
      nextValue =
        originalValue.slice(0, cursorOffset) +
          input +
          originalValue.slice(cursorOffset, originalValue.length);
      nextCursorOffset += input.length;

      if (input.length > 1) {
        nextCursorWidth = input.length;
      }
    }

    // 边界检查
    if (nextCursorOffset < 0) {
      nextCursorOffset = 0;
    }

    if (nextCursorOffset > nextValue.length) {
      nextCursorOffset = nextValue.length;
    }

    setState({
      cursorOffset: nextCursorOffset,
      cursorWidth: nextCursorWidth
    });

    // 通知父组件光标位置变化
    if (onCursorChange && nextCursorOffset !== cursorOffset) {
      onCursorChange(nextCursorOffset);
    }

    // 通知父组件值变化
    if (nextValue !== originalValue) {
      onChange(nextValue);
    }
  }, { isActive: focus });

  return (
    <Text>
      {placeholder
        ? value.length > 0
          ? renderedValue
          : renderedPlaceholder
        : renderedValue}
    </Text>
  );
}

export default EnhancedTextInput;
