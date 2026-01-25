# Bash Result 工具优化建议

> **日期**: 2026-01-22
> **状态**: 设计优化

## 🎯 优化建议

### 1️⃣ 过期时间：5 分钟 → 10 分钟

**原因**：
- AI 任务有时需要思考
- 复杂任务可能需要多轮对话
- 5 分钟可能太短

**修改**：
```javascript
class BashResultCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100;
    this.maxAge = 600000;  // ✅ 改为 10 分钟
  }
}
```

---

### 2️⃣ 新增 lineRange 模式

**用途**：
- 获取指定行号范围
- 例如：{startLine: 100, endLine: 200}
- 更灵活的查询方式

**接口定义**：
```javascript
inputSchema: z.object({
  result_id: z.string(),
  action: z.enum(['head', 'tail', 'lineRange', 'grep', 'full']),  // ✅ 添加 lineRange
  lines: z.number().optional(),
  startLine: z.number().optional().describe('Start line (1-based, for lineRange)'),
  endLine: z.number().optional().describe('End line (exclusive, for lineRange)'),
  pattern: z.string().optional()
})
```

**实现代码**：
```javascript
case 'lineRange':
  if (!input.startLine || !input.endLine) {
    return JSON.stringify({
      success: false,
      error: 'startLine and endLine are required for lineRange action'
    });
  }
  
  const startIndex = input.startLine - 1;  // 转换为 0-based
  const endIndex = input.endLine - 1;
  const totalLines = result.stdout.split('\n').length;
  
  // 验证行号
  if (startIndex < 0 || startIndex >= totalLines) {
    return JSON.stringify({
      success: false,
      error: `Invalid startLine: ${input.startLine}. Valid range: 1-${totalLines}`
    });
  }
  
  if (endIndex < startIndex || endIndex > totalLines) {
    return JSON.stringify({
      success: false,
      error: `Invalid endLine: ${input.endLine}. Valid range: ${input.startLine}-${totalLines}`
    });
  }
  
  const rangeOutput = result.stdout.split('\n').slice(startIndex, endIndex).join('\n');
  return JSON.stringify({
    success: true,
    stdout: rangeOutput,
    action: 'lineRange',
    startLine: input.startLine,
    endLine: input.endLine,
    lineCount: endIndex - startIndex,
    totalLines: totalLines
  });
```

**使用示例**：
```javascript
// 获取第 100-200 行
bashResult({
  result_id: "res_xxx",
  action: "lineRange",
  startLine: 100,
  endLine: 200
})
```

---

### 3️⃣ 改进错误提示

**当前**：
```javascript
{
  success: false,
  error: "result_id not found or expired"
}
```

**改进后**：
```javascript
{
  success: false,
  error: "result_id expired after 10 minutes",
  expired: true,
  hint: "Re-execute the bash command to get a new result_id",
  explanation: "The result you're looking for is no longer available. This can happen when: (1) More than 10 minutes have passed since the command was executed, or (2) The cache has been evicted due to size limits. Please run the command again to get fresh results.",
  suggestion: "Run the same bash command again to get a new result_id with fresh results."
}
```

**实现代码**：
```javascript
if (!cached) {
  const now = Date.now();
  const timeSinceCreation = now - (cached?.timestamp || 0);
  const isExpired = timeSinceCreation > this.maxAge;
  
  return JSON.stringify({
    success: false,
    error: isExpired 
      ? `result_id "${input.result_id}" expired after 10 minutes`
      : `result_id "${input.result_id}" not found`,
    expired: isExpired,
    hint: 'result_id expires after 10 minutes',
    suggestion: 'Re-execute the bash command to get a new result_id',
    explanation: `The result you're looking for is no longer available. ${isExpired ? 'More than 10 minutes have passed since the command was executed.' : 'The cache has been evicted due to size limits.'} Please run the command again to get fresh results.`
  });
}
```

---

## 📝 工具描述更新

```javascript
description: `Retrieve more content from a previous bash command result.

Use this tool when you have a result_id from a truncated bash output.

**Actions**:
- head: Get first N lines (default: 100)
- tail: Get last N lines (default: 100)
- lineRange: Get specific line range (e.g., lines 100-200)
- grep: Search for a pattern (requires 'pattern' parameter)
- full: Get complete output

**Example**:
\`\`\`javascript
// Get last 100 lines
bashResult({ result_id: "res_123", action: "tail", lines: 100 })

// Get line range 100-200
bashResult({ result_id: "res_123", action: "lineRange", startLine: 100, endLine: 200 })

// Search for pattern
bashResult({ result_id: "res_123", action: "grep", pattern: "ERROR" })

// Get full output
bashResult({ result_id: "res_123", action: "full" })
\`\`\`

**Note**: result_id expires after 10 minutes (AI tasks sometimes need time to think).`
```

---

## ✅ 优化总结

1. ✅ 过期时间：5 分钟 → 10 分钟
2. ✅ 新增 lineRange 模式
3. ✅ 改进错误提示（更友好、更详细）

这些优化让 bashResult 工具更灵活、更易用！

