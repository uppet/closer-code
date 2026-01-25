# 工具使用快速参考

## 🎯 核心原则

**使用专用工具优先，bash 最后**

## 📁 文件操作

| 操作 | 专用工具 | ❌ 不要用 bash |
|------|---------|---------------|
| 读取小文件 | `readFile` | `cat` |
| 读取指定行 | `readFileLines` | `sed -n '1,10p'` |
| 读取末尾 | `readFileTail` | `tail -n 100` |
| 读取字节范围 | `readFileChunk` | (minify 文件必须用这个) |
| 写入文件 | `writeFile` | `echo > file` |
| **简单编辑** | `editFile` | `sed -i` |
| **精确编辑** | `regionConstrainedEdit` | `sed -n '10,20p'` |

## 📝 编辑文件

### editFile vs regionConstrainedEdit

**editFile - 简单编辑（推荐优先使用）**
```javascript
// ✅ 适用于：简单的全文替换
editFile({
  filePath: "app.js",
  oldText: "console.log('Hello');",
  newText: "console.log('Updated');"
})
```

**regionConstrainedEdit - 精确编辑（需要精确匹配）**
```javascript
// ⚠️ 注意：oldText 必须与文件内容完全一致（包括空格、缩进）
regionConstrainedEdit({
  filePath: "app.js",
  begin: 10,
  end: 20,
  oldText: "  console.log('Hello');",  // 必须包括前导空格
  newText: "  console.log('Updated');"
})
```

**⚠️ regionConstrainedEdit 常见问题**

**问题**: "Text not found in region" 错误

**原因**: 空格/缩进不匹配

**解决方案**:
1. **优先使用 editFile** - 更简单，不需要精确匹配
2. **使用正则表达式** - 增加灵活性
   ```javascript
   regionConstrainedEdit({
     filePath: "app.js",
     begin: 10,
     end: 20,
     oldText: "console\\.log\\('Hello'\\);",  // 正则表达式
     newText: "console.log('Updated');",
     isRegex: true
   })
   ```
3. **先读取文件** - 从读取的内容中复制精确的文本
   ```javascript
   const content = readFile({ filePath: "app.js" });
   // 从 content 中复制精确的文本（包括空格）
   ```
4. **查看错误详情** - 工具会返回相似文本和故障排除建议

| 操作 | 专用工具 | ❌ 不要用 bash |
|------|---------|---------------|
| 搜索文件 | `searchFiles` | `find` |
| 搜索内容 | `searchCode` | `grep` |

## 💻 bash 使用场景

### ✅ 适合用 bash

- 运行测试: `npm test`, `pytest`
- Git 操作: `git status`, `git commit`
- 构建命令: `npm run build`, `make`
- 包管理: `npm install`, `pip install`
- 系统操作: `ps`, `kill`, `df`, `top`
- 列出目录: `ls`, `ls -la`, `tree`

### ❌ 不适合用 bash

- 读取文件: 用 `readFile` 工具
- 搜索内容: 用 `searchCode` 工具
- 搜索文件: 用 `searchFiles` 工具
- 编辑文件: 用 `editFile` 工具

## 📦 bashResult 工具

### 何时使用

当 bash 命令输出被截断（>100 行）时，返回 `result_id`

### 使用方法

```javascript
// Step 1: 执行 bash 命令
bash({ command: "find /usr -name '*.h'" })
// Returns: { result_id: "res_123", truncated: true, ... }

// Step 2: 使用 bashResult 获取更多内容
bashResult({ result_id: "res_123", action: "tail", lines: 100 })
```

### 可用操作

- `head`: 获取前 N 行
- `tail`: 获取后 N 行
- `lineRange`: 获取指定行范围
- `grep`: 搜索模式
- `full`: 获取完整输出

### ⚠️ 重要

**❌ 不要** 重新执行 bash 命令
```javascript
// 错误示例
bash({ command: "find /usr -name '*.h' | tail -n 100" })
```

**✅ 应该** 使用 bashResult
```javascript
// 正确示例
bashResult({ result_id: "res_123", action: "tail", lines: 100 })
```

## ✅ 写入后不验证

### 原则

写入文件后，**不要** 立即读取验证

### 工具返回值

`writeFile`, `editFile`, `regionConstrainedEdit` 都返回明确的成功/失败信息

### 正确做法

```javascript
// ✅ 正确
writeFile({ filePath: "test.js", content: "..." })
// 直接继续，假设成功

// ❌ 错误（浪费 tokens）
writeFile({ filePath: "test.js", content: "..." })
readFile({ filePath: "test.js" })  // 不必要的验证
```

### 何时需要验证

- 工具返回错误
- 用户明确要求验证

## ⚠️ Minify 文件处理

### 问题

Minify JS/CSS 文件通常是单行大文件，按行读取不适用

### 解决方案

**方案 1: 使用 readFileChunk（推荐）**
```javascript
readFileChunk({
  filePath: "bundle.min.js",
  startByte: 0,
  endByte: 10240  // 读取前 10KB
})
```

**方案 2: 先格式化，再按行读取**
```javascript
// Step 1: 格式化文件
bash({ command: "npx prettier --write bundle.min.js" })
// 或
bash({ command: "npx js-beautify bundle.min.js -o bundle.formatted.js" })

// Step 2: 按行读取
readFileLines({ filePath: "bundle.min.js", startLine: 1, endLine: 50 })
```

**方案 3: 使用 readFileLines 的 handleLongLines 参数**
```javascript
// 分割超长行（每1000字符一行）
readFileLines({
  filePath: "bundle.min.js",
  startLine: 1,
  endLine: 100,
  handleLongLines: "split"  // "warn" | "split" | "truncate" | "skip"
})

// 截断超长行
readFileLines({
  filePath: "bundle.min.js",
  handleLongLines: "truncate",
  truncateLength: 500
})

// 跳过超长行
readFileLines({
  filePath: "bundle.min.js",
  handleLongLines: "skip"
})
```

### 自动检测

**readFile** 和 **readFileLines** 会自动检测超长行（>10,000 字符）：

```javascript
{
  "hasLongLine": true,
  "maxLineLength": 21500,
  "longLineHandling": {
    "detected": true,
    "maxLineLength": 21500,
    "mode": "warn"  // 或 "split", "truncate", "skip"
  }
}
```

**AI 模型应该**：
- 优先使用 `readFileChunk` 或先格式化文件
- 如需按行处理，使用 `handleLongLines: "split"`

## 📊 Token 节省估算

| 操作 | 节省方式 | 预估节省 |
|------|---------|---------|
| 写入后不验证 | 避免 readFile | ~2000 tokens/次 |
| 使用 bashResult | 避免重新执行 | ~500 tokens/次 |
| 使用专用工具 | 避免 bash 包装 | ~100-500 tokens/次 |

## 🎓 最佳实践

1. **优先使用专用工具** - 更高效、更好的错误处理
2. **信任工具返回值** - 工具会返回明确的成功/失败信息
3. **避免重复执行** - 使用 bashResult 而非重新运行命令
4. **选择正确工具** - minify 文件用 readFileChunk
5. **阅读工具描述** - 每个工具都有详细的使用说明

## 📝 记忆口诀

```
专用工具优先，bash 最后
写入不验证，节省 token
bash 输出大，用 bashResult
minify 文件，按字节读
```
