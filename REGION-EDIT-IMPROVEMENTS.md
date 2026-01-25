# regionConstrainedEdit 工具改进说明

> 日期: 2026-01-23
> 问题: AI 模型经常遇到 "Text not found in region" 错误，但使用 sed 却能成功
> 原因: 精确匹配要求，空格/缩进差异导致匹配失败
> 解决方案: 改进错误提示，强调精确匹配要求

## 🔍 问题分析

### 原始问题
1. **精确匹配太严格**: `oldText` 必须与文件内容完全一致（包括空格、制表符）
2. **错误信息不够详细**: 只说 "Text not found"，没有说明具体原因
3. **AI 模型难以调试**: 不知道哪里不匹配

### 为什么 sed 能成功
```bash
# sed 使用更灵活的匹配
sed -i 's/console\.log.*/console.log("Updated");' file.js

# regionConstrainedEdit 要求精确匹配
regionConstrainedEdit({
  oldText: "console.log('Hello');",  # 必须完全一致，包括空格
  newText: "console.log('Updated');"
})
```

## ✅ 已实施的改进

### 1. 改进工具描述

**强调精确匹配要求**:
```markdown
**⚠️ CRITICAL - Exact match required:**
- The `oldText` parameter must match the file content EXACTLY (including whitespace, indentation)
- If you get "Text not found in region" error:
  1. Check for trailing/leading whitespace differences
  2. Check for tabs vs spaces
  3. Consider using `isRegex: true` for more flexible matching
  4. Use `editFile` tool instead for simple replacements
```

**更新参数描述**:
```javascript
oldText: z.string().describe('Text to find - MUST match exactly including whitespace')
```

### 2. 改进错误信息

**原始错误信息**:
```json
{
  "success": false,
  "error": "Text not found in region",
  "region": { "begin": 10, "end": 20 },
  "hint": "Check if the text exists in the specified line range."
}
```

**改进后的错误信息**:
```json
{
  "success": false,
  "error": "Text not found in region",
  "region": { "begin": 10, "end": 20 },
  "expectedText": "console.log('Hello');",
  "expectedLength": 22,
  "regionPreview": "function test() {\n  console.log('Hello');\n  return 42;\n}",
  "regionLength": 55,
  "similarTexts": [
    {
      "line": 11,
      "content": "  console.log('Hello');",
      "differences": {
        "leadingSpace": true,
        "trailingSpace": false,
        "tabs": false
      }
    }
  ],
  "suggestion": "Found similar text(s) in the region. Check for whitespace differences.",
  "troubleshooting": [
    "1. Check for trailing/leading whitespace differences",
    "2. Check for tabs vs spaces",
    "3. Consider using isRegex: true for more flexible matching",
    "4. Use editFile tool instead for simple replacements",
    "5. Read the file first to see the exact content"
  ]
}
```

### 3. 相似文本检测

**检测逻辑**:
1. 去除 `oldText` 的首尾空格
2. 在区域内搜索包含 trimmed 文本的行
3. 检测空格/制表符差异
4. 返回相似文本及其差异信息

**示例**:
```javascript
// 用户输入
oldText: "console.log('Hello');"  // 没有前导空格

// 实际文件内容
"  console.log('Hello');"  // 有两个前导空格

// 返回相似文本
{
  "line": 11,
  "content": "  console.log('Hello');",
  "differences": {
    "leadingSpace": true,   // 检测到前导空格差异
    "trailingSpace": false,
    "tabs": false
  }
}
```

## 📊 使用建议

### 对于 AI 模型

**1. 优先使用 editFile**
```javascript
// ✅ 推荐：简单替换使用 editFile
editFile({
  filePath: "app.js",
  oldText: "console.log('Hello');",
  newText: "console.log('Updated');"
})

// ⚠️ 谨慎使用：regionConstrainedEdit 需要精确匹配
regionConstrainedEdit({
  filePath: "app.js",
  begin: 10,
  end: 20,
  oldText: "  console.log('Hello');",  // 必须包括前导空格
  newText: "  console.log('Updated');"
})
```

**2. 使用正则表达式增加灵活性**
```javascript
// ✅ 使用正则表达式
regionConstrainedEdit({
  filePath: "app.js",
  begin: 10,
  end: 20,
  oldText: "console\\.log\\('Hello'\\);",  // 转义特殊字符
  newText: "console.log('Updated');",
  isRegex: true
})
```

**3. 先读取文件确认内容**
```javascript
// Step 1: 读取文件
const content = readFile({ filePath: "app.js" });

// Step 2: 从内容中复制精确的文本
regionConstrainedEdit({
  filePath: "app.js",
  begin: 10,
  end: 20,
  oldText: content.split('\n')[9],  // 从读取的内容中复制
  newText: "new text"
})
```

**4. 遇到错误时使用建议**
```javascript
// 如果收到 "Text not found in region" 错误
// 1. 检查 similarTexts 字段
// 2. 查看 troubleshooting 建议
// 3. 考虑使用 isRegex: true
// 4. 降级使用 editFile 工具
```

## 🎯 预期效果

### 改进前
- AI 模型经常失败
- 错误信息不明确
- 退化为使用 sed

### 改进后
- ✅ 详细的错误信息帮助调试
- ✅ 相似文本检测提示空格差异
- ✅ 明确的使用建议
- ✅ 鼓励使用 editFile 作为替代方案
- ✅ 支持正则表达式增加灵活性

## 📝 测试验证

已测试场景:
1. ✅ 精确匹配 - 成功
2. ✅ 空格不匹配 - 失败，提供详细错误信息
3. ✅ 正则表达式 - 成功
4. ✅ 文本不在区域 - 失败，提供区域信息

## 🔄 后续改进建议

1. **智能空格处理**: 自动忽略前导/尾随空格差异
2. **模糊匹配**: 使用字符串相似度算法
3. **自动重试**: 失败时自动尝试使用正则表达式
4. **更好的集成**: 与 editFile 工具协同工作
