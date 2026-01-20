# Region Constrained Edit 工具设计

## 📋 需求分析

### 当前问题

AI 在编辑文件时经常遇到：
- ❌ 相同文本在多处出现，难以精确定位
- ❌ 担心误替换其他位置的内容
- ❌ 需要反复确认修改位置
- ❌ 对大文件编辑时缺乏信心

### 解决方案

**`regionConstrainedEdit`** - 限定区域的精确编辑工具

**优势**：
- ✅ 精确定位修改范围
- ✅ 避免误替换
- ✅ AI 编辑更自信
- ✅ 减少来回确认

---

## 🎯 工具设计

### 基本签名

```javascript
regionConstrainedEdit({
  filePath: string,      // 文件路径
  begin: number,         // 起始行号（1-based，包含）
  end?: number,          // 结束行号（1-based，不包含，可选）
  oldText: string,       // 要替换的文本
  newText: string,       // 新文本
  isRegex?: boolean,     // 是否使用正则表达式
  replaceAll?: boolean   // 在区域内是否全部替换
})
```

### 参数说明

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `filePath` | string | ✅ | 文件路径（相对或绝对） |
| `begin` | number | ✅ | 起始行号（1-based，从1开始） |
| `end` | number | ❌ | 结束行号（1-based，不包含，默认到文件末尾） |
| `oldText` | string | ✅ | 要查找的文本（或正则表达式） |
| `newText` | string | ✅ | 替换的文本 |
| `isRegex` | boolean | ❌ | 是否将 oldText 视为正则表达式（默认 false） |
| `replaceAll` | boolean | ❌ | 在区域内是否全部替换（默认 false） |

### 返回值

```javascript
{
  success: boolean,
  filePath: string,
  region: {
    begin: number,
    end: number,
    lines: number
  },
  replacements: number,
  preview: {
    before: string,  // 替换前的片段
    after: string    // 替换后的片段
  },
  warning?: string   // 警告信息
}
```

---

## 💡 使用场景

### 场景 1：精确替换函数

```javascript
// 文件内容（100行）
function oldFunction() {
  // ... 50行代码 ...
}

function oldFunction() {  // 第80行，同名函数
  // ... 代码 ...
}

// AI 只想修改第一个函数
regionConstrainedEdit({
  filePath: 'src/app.js',
  begin: 1,
  end: 60,
  oldText: 'function oldFunction()',
  newText: 'function newFunction()',
  replaceAll: false
})

// 结果：
// ✅ 第1行的函数被替换
// ✅ 第80行的函数不受影响
```

### 场景 2：修改配置文件特定段

```javascript
// package.json（50行）
{
  "name": "my-app",
  "scripts": {
    "build": "webpack",
    "test": "jest"
  },
  "dependencies": { ... },
  "devDependencies": { ... }
}

// 只修改 scripts 部分（第3-6行）
regionConstrainedEdit({
  filePath: 'package.json',
  begin: 3,
  end: 7,
  oldText: '"build": "webpack"',
  newText: '"build": "webpack --mode production"',
  replaceAll: false
})
```

### 场景 3：使用正则表达式

```javascript
// 在第100-200行内，替换所有 console.log
regionConstrainedEdit({
  filePath: 'src/app.js',
  begin: 100,
  end: 200,
  oldText: 'console\\.log\\(.+?\\)',
  newText: '// console.log removed',
  isRegex: true,
  replaceAll: true
})
```

### 场景 4：负数行号（从末尾）

```javascript
// 修改最后10行
regionConstrainedEdit({
  filePath: 'src/app.js',
  begin: -10,  // 倒数第10行
  end: null,   // 到文件末尾
  oldText: 'TODO',
  newText: 'DONE',
  replaceAll: true
})
```

---

## 🔧 实现方案

### 方案 A：纯字符串操作

```javascript
export const regionConstrainedEditTool = betaZodTool({
  name: 'regionConstrainedEdit',
  description: `Edit a file within a specific line range. Perfect for precise edits.

Use cases:
- Replace text in a specific function
- Modify configuration sections
- Edit code blocks without affecting other parts

Line numbers are 1-based. Negative numbers count from the end (-1 = last line).`,
  inputSchema: z.object({
    filePath: z.string().describe('File path'),
    begin: z.number().describe('Start line (1-based, negative for from end)'),
    end: z.number().optional().describe('End line (exclusive, default: end of file)'),
    oldText: z.string().describe('Text to find (or regex pattern)'),
    newText: z.string().describe('Replacement text'),
    isRegex: z.boolean().optional().describe('Treat oldText as regex pattern'),
    replaceAll: z.boolean().optional().describe('Replace all occurrences in region')
  }),
  run: async (input) => {
    const fullPath = path.resolve(toolExecutorContext.workingDir, input.filePath);
    const content = await fs.readFile(fullPath, 'utf-8');

    // 分割为行数组
    const lines = content.split('\n');
    const totalLines = lines.length;

    // 计算实际行号（处理负数）
    const startLine = input.begin < 0
      ? totalLines + input.begin + 1
      : input.begin;
    const endLine = input.end === undefined
      ? totalLines
      : (input.end < 0 ? totalLines + input.end + 1 : input.end);

    // 验证行号
    if (startLine < 1 || startLine > totalLines) {
      return JSON.stringify({
        success: false,
        error: `Invalid start line: ${startLine}. File has ${totalLines} lines.`
      });
    }

    if (endLine < startLine || endLine > totalLines) {
      return JSON.stringify({
        success: false,
        error: `Invalid end line: ${endLine}. Must be between ${startLine} and ${totalLines}.`
      });
    }

    // 提取区域内容（转换为 0-based）
    const beforeRegion = lines.slice(0, startLine - 1).join('\n');
    const regionLines = lines.slice(startLine - 1, endLine - 1);
    const afterRegion = lines.slice(endLine - 1).join('\n');
    let regionContent = regionLines.join('\n');

    // 保存替换前内容（用于预览）
    const beforePreview = regionContent.substring(0, 200);

    // 在区域内执行替换
    let replacements = 0;
    if (input.isRegex) {
      const regex = new RegExp(input.oldText, input.replaceAll ? 'g' : '');
      const matches = regionContent.match(regex);
      replacements = matches ? matches.length : 0;
      regionContent = regionContent.replace(regex, input.newText);
    } else {
      if (input.replaceAll) {
        const parts = regionContent.split(input.oldText);
        replacements = parts.length - 1;
        regionContent = parts.join(input.newText);
      } else {
        if (!regionContent.includes(input.oldText)) {
          return JSON.stringify({
            success: false,
            error: 'Text not found in region',
            region: { begin: startLine, end: endLine },
            hint: 'Check if the text exists in the specified line range.'
          });
        }
        replacements = 1;
        regionContent = regionContent.replace(input.oldText, input.newText);
      }
    }

    // 重组文件内容
    const newContent = [beforeRegion, regionContent, afterRegion].join('\n');

    // 写入文件
    await fs.writeFile(fullPath, newContent, 'utf-8');

    // 生成预览（替换后）
    const afterPreview = regionContent.substring(0, 200);

    return JSON.stringify({
      success: true,
      filePath: fullPath,
      region: {
        begin: startLine,
        end: endLine,
        lines: endLine - startLine + 1
      },
      replacements,
      preview: {
        before: beforePreview + (beforePreview.length >= 200 ? '...' : ''),
        after: afterPreview + (afterPreview.length >= 200 ? '...' : '')
      }
    });
  }
});
```

### 方案 B：使用 replace-in-file（推荐）

```javascript
import { replaceInFile } from 'replace-in-file';

export const regionConstrainedEditTool = betaZodTool({
  // ... 同上 ...

  run: async (input) => {
    const fullPath = path.resolve(toolExecutorContext.workingDir, input.filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n');
    const totalLines = lines.length;

    // 计算行号
    const startLine = input.begin < 0 ? totalLines + input.begin + 1 : input.begin;
    const endLine = input.end === undefined ? totalLines : input.end;

    // 读取文件
    const fileContent = await fs.readFile(fullPath, 'utf-8');
    const fileLines = fileContent.split('\n');

    // 提取区域
    const beforeLines = fileLines.slice(0, startLine - 1);
    const regionLines = fileLines.slice(startLine - 1, endLine - 1);
    const afterLines = fileLines.slice(endLine - 1);

    // 执行替换
    let regionContent = regionLines.join('\n');
    const beforePreview = regionContent;

    if (input.isRegex) {
      const flags = input.replaceAll ? 'g' : '';
      const regex = new RegExp(input.oldText, flags);
      const matches = regionContent.match(regex);
      const replacements = matches ? matches.length : 0;

      regionContent = regionContent.replace(regex, input.newText);

      // 重组并写入
      const newContent = [...beforeLines, ...regionContent.split('\n'), ...afterLines].join('\n');
      await fs.writeFile(fullPath, newContent, 'utf-8');

      return JSON.stringify({
        success: true,
        filePath: fullPath,
        region: { begin: startLine, end: endLine },
        replacements,
        preview: {
          before: beforePreview.substring(0, 200),
          after: regionContent.substring(0, 200)
        }
      });
    } else {
      // 非正则表达式替换
      // ... 类似方案 A ...
    }
  }
});
```

---

## 📊 与其他工具对比

| 工具 | 精确度 | 适用场景 | 限制 |
|------|--------|---------|------|
| `editFile` | 低 | 简单替换，文件较小 | 可能误替换 |
| `regionConstrainedEdit` | **高** | 精确定位，大文件 | 需要知道行号 |
| `readFileLines` + `editFile` | 中 | 两步操作 | 需要两次调用 |

**推荐**：
- 简单替换 → `editFile`
- 精确替换 → `regionConstrainedEdit`
- 复杂多步操作 → `readFileLines` + `editFile`

---

## 🎯 Prompt 引导

```markdown
## 精确文件编辑

### regionConstrainedEdit - 限定区域编辑

当你需要精确修改文件特定区域时，使用此工具：

**优势**：
- ✅ 只在指定行范围内替换
- ✅ 避免影响文件其他部分
- ✅ 适合大文件编辑

**使用流程**：
1. 先用 `readFileLines` 查看文件结构
2. 确定要修改的行号范围
3. 使用 `regionConstrainedEdit` 精确修改

**示例**：
```javascript
// 1. 查看第1-50行
readFileLines({filePath: "src/app.js", startLine: 1, endLine: 50})

// 2. 修改第10-20行内的函数
regionConstrainedEdit({
  filePath: "src/app.js",
  begin: 10,
  end: 20,
  oldText: "function oldName()",
  newText: "function newName()",
  replaceAll: false
})
```

**行号规则**：
- 行号从 1 开始（不是 0）
- 负数从末尾计数（-1 = 最后一行）
- `end` 不包含（end=20 表示到第19行）

**何时使用**：
- ✅ 文件中有多个相同的函数/变量名
- ✅ 只想修改特定代码块
- ✅ 需要精确控制修改范围
- ✅ 文件很大，不想全部读取
```

---

## 🧪 测试用例

### 测试 1：基本替换

```javascript
// 测试文件（test.js）
const a = 1;
const b = 2;
const a = 3;  // 第3行

regionConstrainedEdit({
  filePath: 'test.js',
  begin: 1,
  end: 2,
  oldText: 'const a = 1',
  newText: 'const x = 1'
})

// 预期结果：
// const x = 1;  ← 第1行被替换
// const b = 2;
// const a = 3;  ← 第3行不受影响
```

### 测试 2：正则表达式

```javascript
regionConstrainedEdit({
  filePath: 'test.js',
  begin: 1,
  end: 10,
  oldText: 'const\\s+\\w+\\s*=\\s*\\d+',
  newText: '// removed',
  isRegex: true,
  replaceAll: true
})
```

### 测试 3：负数行号

```javascript
// 修改最后5行
regionConstrainedEdit({
  filePath: 'test.js',
  begin: -5,
  oldText: 'TODO',
  newText: 'DONE',
  replaceAll: true
})
```

---

## ✅ 实施检查清单

- [ ] 实现 `regionConstrainedEditTool`
- [ ] 添加到 `TOOLS_MAP`
- [ ] 更新 Prompt 引导
- [ ] 添加单元测试
- [ ] 更新文档
- [ ] 添加使用示例

---

## 🚀 下一步

1. **实现工具**：使用方案 A（纯字符串）或方案 B（replace-in-file）
2. **添加测试**：覆盖各种场景
3. **更新 Prompt**：引导 AI 使用新工具
4. **文档完善**：添加示例和最佳实践

**准备开始实施吗？** 🚀
