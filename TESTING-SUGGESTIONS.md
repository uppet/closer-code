# 测试建议 - 全面验证优化效果

> 日期: 2026-01-23
> 目的: 验证所有提示词和工具优化的实际效果

## 🧪 测试场景

### 1. 文件读取优化

**测试目标**: 验证 AI 模型使用正确的文件读取工具

**测试用例**:
```javascript
// 场景 1: 读取小文件
用户: "读取 package.json 文件"
预期: 使用 readFile 工具

// 场景 2: 读取指定行
用户: "读取 app.js 的第 10-50 行"
预期: 使用 readFileLines 工具

// 场景 3: 读取日志文件末尾
用户: "查看 error.log 的最后 100 行"
预期: 使用 readFileTail 工具

// 场景 4: 读取 minify 文件
用户: "读取 bundle.min.js 文件"
预期: 
  - 检测到 hasLongLine: true
  - 使用 readFileChunk 或建议格式化文件

// 场景 5: 读取大文件
用户: "读取 large-data.json 文件"
预期:
  - 文件被截断
  - 提供使用 readFileLines 或 readFileChunk 的建议
```

### 2. 文件写入优化

**测试目标**: 验证 AI 模型写入后不验证

**测试用例**:
```javascript
// 场景 1: 写入新文件
用户: "创建一个新的 config.js 文件，内容是..."
预期:
  - 使用 writeFile 工具
  - 不调用 readFile 验证

// 场景 2: 编辑文件
用户: "修改 app.js 中的 console.log 为 logger.log"
预期:
  - 使用 editFile 工具
  - 不调用 readFile 验证

// 场景 3: 精确编辑
用户: "修改 app.js 第 10-20 行的函数名"
预期:
  - 使用 regionConstrainedEdit 工具
  - 不调用 readFile 验证
```

### 3. bash 工具优化

**测试目标**: 验证 AI 模型正确使用 bash 和 bashResult

**测试用例**:
```javascript
// 场景 1: 运行测试
用户: "运行 npm test"
预期: 使用 bash 工具

// 场景 2: 大输出使用 bashResult
用户: "执行 find /usr -name '*.h'，然后查看最后 100 行"
预期:
  - 使用 bash 执行 find
  - 输出被截断，返回 result_id
  - 使用 bashResult 获取最后 100 行
  - 不重新执行 find 命令

// 场景 3: Git 操作
用户: "查看 git 状态"
预期: 使用 bash 工具执行 git status
```

### 4. 搜索操作优化

**测试目标**: 验证 AI 模型使用专用搜索工具

**测试用例**:
```javascript
// 场景 1: 搜索文件
用户: "查找所有 .js 文件"
预期: 使用 searchFiles 工具

// 场景 2: 搜索内容
用户: "在所有文件中搜索 TODO 注释"
预期: 使用 searchCode 工具

// 场景 3: 不使用 bash grep
用户: "在 src 目录搜索 function 关键字"
预期: 使用 searchCode，不使用 bash grep
```

### 5. Minify 文件处理

**测试目标**: 验证 AI 模型正确处理 minify 文件

**测试用例**:
```javascript
// 场景 1: 检测 minify 文件
用户: "读取 bundle.min.js 文件"
预期:
  - 返回 hasLongLine: true
  - 返回 maxLineLength: 很大的数字
  - 提供使用 readFileChunk 的建议

// 场景 2: 格式化后读取
用户: "查看 bundle.min.js 的内容"
预期（方案 1）:
  - 建议格式化: bash({ command: "npx prettier --write bundle.min.js" })
  - 然后使用 readFileLines

预期（方案 2）:
  - 直接使用 readFileChunk

预期（方案 3）:
  - 使用 readFileLines({ handleLongLines: "split" })
```

### 6. regionConstrainedEdit 改进

**测试目标**: 验证改进后的错误提示

**测试用例**:
```javascript
// 场景 1: 精确匹配成功
用户: "修改 app.js 第 10 行的代码"
预期:
  - AI 先读取文件获取精确内容
  - 使用精确的 oldText（包括空格）
  - 成功替换

// 场景 2: 空格不匹配
用户: "修改 app.js 第 10 行"
条件: AI 提供的 oldText 缺少前导空格
预期:
  - 返回 "Text not found in region" 错误
  - 错误信息包含 similarTexts
  - 显示空格差异
  - 提供 5 条故障排除建议
  - 建议使用 editFile 或 isRegex: true

// 场景 3: 使用正则表达式
用户: "将 app.js 中所有的 console.log 替换为 logger.log"
预期:
  - 使用 regionConstrainedEdit + isRegex: true
  - 或使用 editFile（更简单）
```

## 📊 成功标准

### Token 使用
- 写入文件后不读取验证: 节省 ~2000 tokens/次
- 使用 bashResult: 节省 ~500 tokens/次
- 使用专用工具: 节省 ~100-500 tokens/次

### 工具选择
- 文件操作: 100% 使用专用工具
- 搜索操作: 100% 使用专用工具
- bash: 仅用于适当的场景（测试、git、构建等）

### 错误处理
- regionConstrainedEdit: 错误时提供详细的调试信息
- Minify 文件: 自动检测并提供处理建议
- 超长行: 自动检测并提供多种处理选项

## 🎯 关键指标

1. **Token 使用量**: 对比优化前后的 token 使用
2. **工具选择正确率**: AI 是否选择正确的工具
3. **错误率**: regionConstrainedEdit 失败率是否降低
4. **响应速度**: 是否减少不必要的命令执行
5. **用户体验**: 错误信息是否更有帮助

## 📝 测试记录

建议记录每个测试场景的结果：
- ✅ 通过
- ❌ 失败
- ⚠️ 部分通过
- 📝 备注

测试完成后，分析结果并进一步优化。
