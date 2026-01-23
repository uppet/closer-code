
/**
 * 多行文本输入组件
 * 全程多行模式，Enter 发送，Ctrl+Enter 换行
 */

import React, { useState, useRef, useLayoutEffect } from 'react';
import { Text, Box, useInput } from 'ink';

export function MultilineTextInput({
  initialValue = '',
  onChange,
  onSubmit,
  maxHeight = 10,
  focus = true,
  placeholder = '输入消息... (Enter发送, Ctrl+Enter换行, Ctrl+L清空)',
  onHistoryNavigation  // 历史记录导航回调 (direction: 'up' | 'down')
}) {
  // 分行数组
  const [lines, setLines] = useState(() => {
    if (!initialValue) return [''];
    return initialValue.split('\n');
  });
  
  // 光标位置（二维坐标）
  const [cursorPos, setCursorPos] = useState(() => {
    if (!initialValue) return { row: 0, col: 0 };
    const splitLines = initialValue.split('\n');
    return {
      row: splitLines.length - 1,
      col: splitLines[splitLines.length - 1].length
    };
  });
  
  // 滚动偏移
  const [scrollOffset, setScrollOffset] = useState(0);
  
  // 用于跟踪上一次的 initialValue，以检测清空操作
  const prevInitialValueRef = useRef(initialValue);
  
  // 用于跟踪是否是内部更新（避免循环更新）
  const isInternalUpdateRef = useRef(false);
  
  // 同步外部 initialValue 变化
  // 处理两种情况：
  // 1. 提交后清空（从非空到空）
  // 2. 历史记录导航（从空到非空，或从非空到另一个非空）
  useLayoutEffect(() => {
    // 如果是内部更新，跳过处理，避免循环
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      prevInitialValueRef.current = initialValue;
      return;
    }
    
    const prevValue = prevInitialValueRef.current;
    const prevWasEmpty = !prevValue || prevValue === '';
    const currIsEmpty = !initialValue || initialValue === '';
    
    // 情况1：从非空变为空（提交后清空）
    if (prevValue !== undefined && !prevWasEmpty && currIsEmpty) {
      setLines(['']);
      setCursorPos({ row: 0, col: 0 });
      setScrollOffset(0);
      prevLineLengthsRef.current = {};
    }
    // 情况2：从空到非空（历史记录导航）
    // 或者：从非空到另一个非空（继续历史记录导航）
    else if (prevValue !== initialValue && !currIsEmpty) {
      const newLines = initialValue.split('\n');
      setLines(newLines);
      const newRow = newLines.length - 1;
      const newCol = newLines[newRow].length;
      setCursorPos({ row: newRow, col: newCol });
      setScrollOffset(0);
    }
    
    // 更新 ref
    prevInitialValueRef.current = initialValue;
  }, [initialValue]);

  // 获取当前完整文本
  const getFullText = () => lines.join('\n');

  // 通知父组件变化
  const notifyChange = () => {
    if (onChange) {
      // 标记为内部更新，避免 useLayoutEffect 循环处理
      isInternalUpdateRef.current = true;
      onChange(getFullText());
    }
  };

  // 调整滚动位置以确保光标可见
  const adjustScroll = (newCursorPos) => {
    setScrollOffset(prev => {
      let newOffset = prev;
      
      if (newCursorPos.row < newOffset) {
        newOffset = newCursorPos.row;
      }
      
      if (newCursorPos.row >= newOffset + maxHeight) {
        newOffset = newCursorPos.row - maxHeight + 1;
      }
      
      return newOffset;
    });
  };

  // 移动光标到上一行
  const moveCursorUp = () => {
    if (cursorPos.row > 0) {
      const newRow = cursorPos.row - 1;
      const newCol = Math.min(lines[newRow].length, cursorPos.col);
      setCursorPos({ row: newRow, col: newCol });
      adjustScroll({ row: newRow, col: newCol });
    }
  };

  // 移动光标到下一行
  const moveCursorDown = () => {
    if (cursorPos.row < lines.length - 1) {
      const newRow = cursorPos.row + 1;
      const newCol = Math.min(lines[newRow].length, cursorPos.col);
      setCursorPos({ row: newRow, col: newCol });
      adjustScroll({ row: newRow, col: newCol });
    }
  };

  // 移动光标到行内左侧
  const moveCursorLeft = () => {
    if (cursorPos.col > 0) {
      setCursorPos({ ...cursorPos, col: cursorPos.col - 1 });
    } else if (cursorPos.row > 0) {
      const newRow = cursorPos.row - 1;
      const newCol = lines[newRow].length;
      setCursorPos({ row: newRow, col: newCol });
      adjustScroll({ row: newRow, col: newCol });
    }
  };

  // 移动光标到行内右侧
  const moveCursorRight = () => {
    if (cursorPos.col < lines[cursorPos.row].length) {
      setCursorPos({ ...cursorPos, col: cursorPos.col + 1 });
    } else if (cursorPos.row < lines.length - 1) {
      const newRow = cursorPos.row + 1;
      setCursorPos({ row: newRow, col: 0 });
      adjustScroll({ row: newRow, col: 0 });
    }
  };

  // 插入换行符
  const insertNewline = () => {
    const currentLine = lines[cursorPos.row];
    const beforeCursor = currentLine.slice(0, cursorPos.col);
    const afterCursor = currentLine.slice(cursorPos.col);
    
    const newLines = [
      ...lines.slice(0, cursorPos.row),
      beforeCursor,
      afterCursor,
      ...lines.slice(cursorPos.row + 1)
    ];
    
    const newRow = cursorPos.row + 1;
    
    setLines(newLines);
    setCursorPos({ row: newRow, col: 0 });
    adjustScroll({ row: newRow, col: 0 });
    
    notifyChange();
  };

  // 插入字符
  const insertChar = (char) => {
    const currentLine = lines[cursorPos.row];
    const newLine = currentLine.slice(0, cursorPos.col) + char + currentLine.slice(cursorPos.col);
    
    const newLines = [...lines];
    newLines[cursorPos.row] = newLine;
    
    setLines(newLines);
    setCursorPos({ ...cursorPos, col: cursorPos.col + char.length });
    
    notifyChange();
  };

  // 删除字符
  const deleteChar = (direction = 'backward') => {
    if (direction === 'backward') {
      // BackSpace: 删除光标前的字符
      if (cursorPos.col > 0) {
        const currentLine = lines[cursorPos.row];
        const newLine = currentLine.slice(0, cursorPos.col - 1) + currentLine.slice(cursorPos.col);

        const newLines = [...lines];
        newLines[cursorPos.row] = newLine;

        setLines(newLines);
        setCursorPos({ ...cursorPos, col: cursorPos.col - 1 });

        notifyChange();
      } else if (cursorPos.row > 0) {
        // 在行首，合并到上一行
        const prevLine = lines[cursorPos.row - 1];
        const currentLine = lines[cursorPos.row];
        const newCol = prevLine.length;

        const newLines = [
          ...lines.slice(0, cursorPos.row - 1),
          prevLine + currentLine,
          ...lines.slice(cursorPos.row + 1)
        ];

        setLines(newLines);
        setCursorPos({ row: cursorPos.row - 1, col: newCol });
        adjustScroll({ row: cursorPos.row - 1, col: newCol });

        notifyChange();
      }
      // 在文档开头，no-op
    } else {
      // Delete: 删除光标位置的字符
      if (cursorPos.col < lines[cursorPos.row].length) {
        const currentLine = lines[cursorPos.row];
        const newLine = currentLine.slice(0, cursorPos.col) + currentLine.slice(cursorPos.col + 1);

        const newLines = [...lines];
        newLines[cursorPos.row] = newLine;

        setLines(newLines);

        notifyChange();
      } else if (cursorPos.row < lines.length - 1) {
        // 在行尾，合并下一行
        const currentLine = lines[cursorPos.row];
        const nextLine = lines[cursorPos.row + 1];

        const newLines = [
          ...lines.slice(0, cursorPos.row),
          currentLine + nextLine,
          ...lines.slice(cursorPos.row + 2)
        ];

        setLines(newLines);

        notifyChange();
      }
    }
  };

  // 移动到行首 (Ctrl+A)
  const moveCursorToLineStart = () => {
    setCursorPos({ ...cursorPos, col: 0 });
  };

  // 移动到行尾 (Ctrl+E)
  const moveCursorToLineEnd = () => {
    setCursorPos({ ...cursorPos, col: lines[cursorPos.row].length });
  };

  // 查找单词边界
  const findWordBoundary = (text, pos, direction = 'forward') => {
    if (direction === 'forward') {
      // 向前查找下一个单词的开头
      let i = pos;
      // 跳过当前单词
      while (i < text.length && /\w/.test(text[i])) {
        i++;
      }
      // 跳过空白
      while (i < text.length && !/\w/.test(text[i])) {
        i++;
      }
      return i;
    } else {
      // 向后查找上一个单词的开头
      let i = pos - 1;
      // 跳过空白
      while (i >= 0 && !/\w/.test(text[i])) {
        i--;
      }
      // 跳过当前单词
      while (i >= 0 && /\w/.test(text[i])) {
        i--;
      }
      return i + 1;
    }
  };

  // 向前移动一个单词 (Alt+F)
  const moveCursorForwardWord = () => {
    const currentLine = lines[cursorPos.row];
    const newCol = findWordBoundary(currentLine, cursorPos.col, 'forward');
    
    if (newCol <= currentLine.length) {
      setCursorPos({ ...cursorPos, col: newCol });
    } else if (cursorPos.row < lines.length - 1) {
      // 移动到下一行开头
      const newRow = cursorPos.row + 1;
      setCursorPos({ row: newRow, col: 0 });
      adjustScroll({ row: newRow, col: 0 });
    }
  };

  // 向后移动一个单词 (Alt+B)
  const moveCursorBackwardWord = () => {
    const currentLine = lines[cursorPos.row];
    const newCol = findWordBoundary(currentLine, cursorPos.col, 'backward');
    
    if (newCol >= 0) {
      setCursorPos({ ...cursorPos, col: newCol });
    } else if (cursorPos.row > 0) {
      // 移动到上一行末尾
      const newRow = cursorPos.row - 1;
      const newCol = lines[newRow].length;
      setCursorPos({ row: newRow, col: newCol });
      adjustScroll({ row: newRow, col: newCol });
    }
  };

  // 删除到行尾 (Ctrl+K)
  const deleteToLineEnd = () => {
    const currentLine = lines[cursorPos.row];
    const beforeCursor = currentLine.slice(0, cursorPos.col);
    
    const newLines = [...lines];
    newLines[cursorPos.row] = beforeCursor;
    
    setLines(newLines);
    notifyChange();
  };

  // 删除到行首 (Ctrl+U)
  const deleteToLineStart = () => {
    const currentLine = lines[cursorPos.row];
    const afterCursor = currentLine.slice(cursorPos.col);
    const newCol = 0;
    
    const newLines = [...lines];
    newLines[cursorPos.row] = afterCursor;
    
    setLines(newLines);
    setCursorPos({ ...cursorPos, col: newCol });
    notifyChange();
  };

  // 用于跟踪每一行之前渲染的长度（用于清空残留内容）
  const prevLineLengthsRef = useRef({});
  
  // 渲染带光标的行
  const renderLineWithCursor = (line, isCursorRow, lineIndex) => {
    // 确保空行也能被渲染（至少显示一个空格）
    const displayLine = line.length === 0 ? ' ' : line;
    const currentLength = displayLine.length;
    const prevLength = prevLineLengthsRef.current[lineIndex] || 0;
    
    // 如果当前行比之前渲染的行短，需要用空格填充来清空残留内容
    const paddingSpaces = currentLength < prevLength ? ' '.repeat(prevLength - currentLength) : '';
    
    // 更新记录的长度
    prevLineLengthsRef.current[lineIndex] = currentLength;
    
    if (!isCursorRow) {
      return (
        <Text key={`line-${lineIndex}`}>
          {displayLine}{paddingSpaces}
        </Text>
      );
    }
    
    const beforeCursor = displayLine.slice(0, cursorPos.col);
    const cursorChar = displayLine[cursorPos.col] || ' ';
    const afterCursor = displayLine.slice(cursorPos.col + 1);
    
    return (
      <Text key={`line-${lineIndex}`}>
        {beforeCursor}
        <Text inverse>{cursorChar}</Text>
        {afterCursor}
        {paddingSpaces}
      </Text>
    );
  };

  // 计算可见行
  const visibleLines = lines.slice(
    scrollOffset,
    Math.min(lines.length, scrollOffset + maxHeight)
  );

  // 键盘输入处理
  useInput((input, key) => {
    if (!focus) return;

    // ========== 全局快捷键（交给父组件处理） ==========
    // 这些快捷键由主应用处理，不在这里拦截
    if ((key.ctrl && input === 'c') ||  // Ctrl+C: 退出/中止
        (key.ctrl && input === 'z') ||  // Ctrl+Z: 挂起
        (key.ctrl && input === 'g') ||  // Ctrl+G: 全屏模式
        (key.ctrl && input === 't') ||  // Ctrl+T: 工具面板
        key.tab ||                      // Tab: Thinking 开关
        key.escape ||                   // ESC: 退出/中止
        key.pageUp ||                   // PageUp/PageDown: 滚动
        key.pageDown ||
        (key.shift && key.tab)) {       // Shift+Tab: 反向切换
      return false; // 明确返回 false，让父组件处理这些快捷键
    }

    // Enter: 发送消息
    if (key.return) {
      if (onSubmit) {
        onSubmit(getFullText());
      }
      return true;
    }

    // Ctrl+P: 上一行
    if (key.ctrl && input === 'p') {
      moveCursorUp();
      return true;
    }

    // Ctrl+N: 下一行
    if (key.ctrl && input === 'n') {
      moveCursorDown();
      return true;
    }

    // Ctrl+B: 左移
    if (key.ctrl && input === 'b') {
      moveCursorLeft();
      return true;
    }

    // Ctrl+F: 右移
    if (key.ctrl && input === 'f') {
      moveCursorRight();
      return true;
    }

    // Ctrl+A: 移到行首
    if (key.ctrl && input === 'a') {
      moveCursorToLineStart();
      return true;
    }

    // Ctrl+E: 移到行尾
    if (key.ctrl && input === 'e') {
      moveCursorToLineEnd();
      return true;
    }

    // Alt+B: 向后移动一个单词（支持 key.alt 和 key.meta）
    if ((key.alt || key.meta) && (input === 'b' || input === 'B')) {
      moveCursorBackwardWord();
      return true;
    }

    // Alt+F: 向前移动一个单词（支持 key.alt 和 key.meta）
    if ((key.alt || key.meta) && (input === 'f' || input === 'F')) {
      moveCursorForwardWord();
      return true;
    }

    // Ctrl+K: 删除到行尾
    if (key.ctrl && input === 'k') {
      deleteToLineEnd();
      return true;
    }

    // Ctrl+U: 删除到行首
    if (key.ctrl && input === 'u') {
      deleteToLineStart();
      return true;
    }

    // Ctrl+L: 清空所有内容
    if (key.ctrl && input === 'l') {
      setLines(['']);
      setCursorPos({ row: 0, col: 0 });
      setScrollOffset(0);
      prevLineLengthsRef.current = {};
      notifyChange();
      return true;
    }

    // 方向键：智能判断是历史导航还是光标移动
    if (key.upArrow || key.downArrow) {
      const text = getFullText();
      const isEmpty = text.trim() === '';
      const isSingleLine = lines.length <= 1;
      const isFirstLine = cursorPos.row === 0;
      const isLastLine = cursorPos.row === lines.length - 1;
      
      // 判断是否应该触发历史记录导航
      let shouldNavigateHistory = false;
      
      if (isEmpty) {
        // 空输入：总是触发历史导航
        shouldNavigateHistory = true;
      } else if (isSingleLine) {
        // 单行输入：总是触发历史导航
        shouldNavigateHistory = true;
      } else {
        // 多行输入：边界情况触发历史导航
        if (key.upArrow && isFirstLine) {
          shouldNavigateHistory = true;  // 首行按 ↑
        } else if (key.downArrow && isLastLine) {
          shouldNavigateHistory = true;  // 末行按 ↓
        }
      }
      
      if (shouldNavigateHistory && onHistoryNavigation) {
        onHistoryNavigation(key.upArrow ? 'up' : 'down');
        return true;
      }
      
      // 不触发历史导航，执行普通光标移动
      if (key.upArrow) {
        moveCursorUp();
      } else {
        moveCursorDown();
      }
      return true;
    }

    if (key.leftArrow) {
      moveCursorLeft();
      return true;
    }

    if (key.rightArrow) {
      moveCursorRight();
      return true;
    }

    // Backspace 和 Delete 都向后删除字符
    // 原因：很多终端分不清 Del 和 Backspace 键，统一为向后删除更符合直觉
    // 检测多种删除信号：
    // - key.backspace: Ink 标准检测
    // - key.delete: Delete 键（也改为向后删除）
    // - input === '\b': ASCII 退格符 (0x08)
    // - input === '\x7f': ASCII DEL 字符 (0x7F, 127) - 大多数现代终端使用
    const isDeleteKey = key.backspace || key.delete || input === '\b' || input === '\x7f';

    if (isDeleteKey) {
      deleteChar('backward');  // 统一向后删除
      return true;
    }

    // Ctrl+D: 向前删除字符（替代原来的 Delete 功能）
    if (key.ctrl && input === 'd') {
      deleteChar('forward');
      return true;
    }

    // 处理换行符
    if (input === '\n' || input === '\r') {
      insertNewline();
      return true;
    }

    // 普通字符输入
    if (input) {
      insertChar(input);
      return true;
    }
    
    return false;
  }, { isActive: focus });

  // 如果没有内容，显示光标和占位符
  if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
    return (
      <Box flexDirection="column" width="100%">
        <Box width="100%">
          <Text inverse> </Text>
          <Text dim color="cyan"> {placeholder}</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width="100%">
      {visibleLines.map((line, index) => {
        const actualRow = scrollOffset + index;
        const isCursorRow = actualRow === cursorPos.row;
        
        return (
          <Box key={`row-${actualRow}`} width="100%">
            {renderLineWithCursor(line, isCursorRow, actualRow)}
          </Box>
        );
      })}
      
      {/* 滚动提示 */}
      {lines.length > maxHeight && (
        <Box width="100%">
          <Text dim color="cyan">
            {scrollOffset > 0 ? '↑ ' : ''}
            {scrollOffset + 1}-{Math.min(lines.length, scrollOffset + maxHeight)}/{lines.length}
            {scrollOffset + maxHeight < lines.length ? ' ↓' : ''}
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default MultilineTextInput;
