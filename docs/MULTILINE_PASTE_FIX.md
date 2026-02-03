# 多行文本粘贴问题修复

## 问题

粘贴多行文本时，只有最后一行被粘贴到输入框。

## 根本原因

通过日志分析发现：终端粘贴时，把**整个粘贴内容（包括所有换行符）作为一个 `input` 传入**。

例如粘贴：
```
第一行
第二行
第三行
```

实际收到的 input 是：`"第一行\r第二行\r第三行"`（包含换行符）

但是 `insertChar` 函数只是简单地把整个字符串插入到光标位置，**没有处理内部的换行符**。

## 修复方案

在 `insertChar` 函数中检测并处理包含换行符的输入：

```javascript
const insertChar = (char) => {
  // 如果 char 包含换行符，分割成多行
  if (char.includes('\n') || char.includes('\r')) {
    const normalized = normalizeLineBreaks(char);
    const parts = normalized.split('\n');
    
    const currentLine = lines[cursorPos.row];
    const beforeCursor = currentLine.slice(0, cursorPos.col);
    const afterCursor = currentLine.slice(cursorPos.col);
    const firstPart = parts[0];
    
    const newLines = [...lines];
    // 当前行：beforeCursor + firstPart
    newLines[cursorPos.row] = beforeCursor + firstPart;
    
    if (parts.length > 1) {
      const middleParts = parts.slice(1, -1);
      const lastPart = parts[parts.length - 1];
      
      // 插入中间行
      newLines.splice(cursorPos.row + 1, 0, ...middleParts);
      
      // 最后一行：lastPart + afterCursor
      newLines.splice(cursorPos.row + middleParts.length + 1, 0, lastPart + afterCursor);
      
      // 光标在最后一行的 lastPart 之后
      const newRow = cursorPos.row + middleParts.length + 1;
      const newCol = lastPart.length;
      setLines(newLines);
      setCursorPos({ row: newRow, col: newCol });
      adjustScroll({ row: newRow, col: newCol });
    } else {
      setLines(newLines);
      setCursorPos({ ...cursorPos, col: cursorPos.col + firstPart.length });
    }
    
    notifyChange();
  } else {
    // 普通字符：直接插入
    const currentLine = lines[cursorPos.row];
    const newLine = currentLine.slice(0, cursorPos.col) + char + currentLine.slice(cursorPos.col);
    
    const newLines = [...lines];
    newLines[cursorPos.row] = newLine;
    
    setLines(newLines);
    setCursorPos({ ...cursorPos, col: cursorPos.col + char.length });
    
    notifyChange();
  }
};
```

## 修改文件

- `src/components/multiline-text-input.jsx` - 修改 `insertChar` 函数

## 测试

粘贴多行文本，所有行都应该正确显示在输入框中。

## 状态

✅ 已修复并测试通过
