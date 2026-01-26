# Closer Code - AI 助理项目级提示词

本文件为 AI 助理（Claude Code、Closer 等）提供在处理本项目时需要遵循的指导原则。

## 项目本质

**Closer Code** 是一个 AI 编程助理 CLI 工具，通过对话式 AI 帮助开发者完成编程任务。

**核心机制**：
- 使用 `@anthropic-ai/sdk` 的 `betaZodTool` 定义工具
- 通过 `toolRunner` 自动处理工具调用循环
- 支持流式响应和实时工具执行
- 集成 MCP (Model Context Protocol) 扩展能力

## 项目架构理解

### 关键模块

```
src/
├── conversation/core.js          # 对话主控制器
├── conversation/tool-executor.js # 工具执行引擎
├── conversation/stream-handler.js # 流式响应处理
├── tools.js                      # 工具定义（betaZodTool）
├── skills/                       # 技能系统
│   ├── registry.js               # 技能发现和加载
│   └── conversation-state.js     # 技能状态管理
├── commands/slash-commands.js    # 斜杠命令
├── ai-client.js                  # Anthropic AI 客户端
├── ai-client-openai.js           # OpenAI AI 客户端
├── bash-runner.js                # Bash 命令执行器
└── config.js                     # 配置管理
```

### 工具系统设计

**重要**: 项目使用 `@anthropic-ai/sdk` 的官方工具定义方式：
- 所有工具使用 `betaZodTool` 定义
- 使用 Zod schema 进行输入验证
- SDK 自动处理工具调用循环（无需手工解析）
- 工具定义在 `src/tools.js` 中

**内置工具**: bash, readFile, writeFile, editFile, searchFiles, searchCode, listFiles, skillDiscover, skillLoad 等

### 技能系统

**技能目录**:
- 全局: `~/.closer-code/skills/`
- 项目: `.closer-code/skills/`

**技能格式**: `skill-name/SKILL.md` (Markdown + YAML front-matter)

**可用技能**:
- `relax_master` - 帮助用户放松
- `skill-author` - 帮助创建技能

## AI 助理工作规范

### 代码修改原则

**1. 工具选择优先级**:
```
regionConstrainedEdit > editFile > writeFile
```

- `regionConstrainedEdit`: 精确的区域编辑（推荐）
- `editFile`: 简单的全文替换
- `writeFile`: 完整重写文件

**2. 文件操作规范**:
- ✅ **写入后不要验证**: 工具已返回明确的成功/失败信息
- ✅ **假设成功**: 除非工具返回错误
- ❌ **不要用 readFile 验证**: 浪费 token

**3. Bash 使用规范**:
- ✅ 用于: 测试、构建、Git 操作、系统操作
- ❌ 避免: 文件读写、代码搜索（使用专用工具）

**4. 错误处理**:
- 连续重试 3 次仍失败 → 停下来请求用户协助
- 提供详细的错误信息和修复建议

### Git 提交规范

当 AI 助理参与代码修改时，在 commit message 末尾添加：
```
Co-Authored-By: GLM-4.7 & cloco(Closer)
```

**重要**: 修改代码后不要自动 commit，等待用户查阅同意。

### 文件读取策略

**根据文件类型选择工具**:

| 文件类型 | 推荐工具 | 原因 |
|---------|---------|------|
| 小文件 (< 10KB) | `readFile` | 读取全部 |
| 中等文件 (10-100KB) | `readFileLines` | 按行读取 |
| 大文件 (> 100KB) | `readFileLines` / `readFileChunk` | 分段读取 |
| Minified JS/CSS | `readFileChunk` | 单行文件，按字节读取 |
| 日志文件 | `readFileTail` | 从末尾读取 |

**检测超长行**: 文件包含 > 10000 字符的行时，工具会自动警告

### Bash 输出处理

**大输出机制**:
- 输出 > 100 行 → 返回 `result_id`
- 完整结果缓存 10 分钟
- 使用 `bashResult` 工具获取更多内容

**正确做法**:
```javascript
// ❌ 不要重新运行
bash({ command: "npm list | head -50" })

// ✅ 使用 bashResult
bashResult({ result_id: "res_123", action: "head", lines: 50 })
```

## 开发指导

### 添加新工具

在 `src/tools.js` 中定义：
```javascript
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

export const myTool = betaZodTool({
  name: 'myTool',
  description: '工具描述',
  inputSchema: z.object({
    param1: z.string().describe('参数描述')
  }),
  run: async (input) => {
    // 工具逻辑
    return JSON.stringify({ success: true, data: ... });
  }
});
```

添加到 `TOOLS_MAP` 和配置的 `tools.enabled` 数组。

### 创建新技能

1. 创建目录: `~/.closer-code/skills/my-skill/`
2. 创建文件: `SKILL.md`
3. 格式:
```markdown
---
name: my-skill
description: 技能描述
category: 分类
---

# 技能内容

描述技能的能力和使用方法。
```

### 斜杠命令

在 `src/commands/slash-commands.js` 中添加命令：
```javascript
export function myCommand(options = {}) {
  const { markdown = true } = options;
  return {
    success: true,
    content: markdown ? '中文输出' : 'English output'
  };
}
```

注册到 `COMMAND_REGISTRY`。

## 配置理解

**配置优先级**: 项目配置 > 全局配置 > 环境变量

**关键配置项**:
- `ai.provider`: AI 提供商 (anthropic/openai/deepseek)
- `behavior.autoPlan`: 自动任务规划
- `behavior.autoExecute`: 自动执行工具
- `skills.enabled`: 启用技能系统
- `skills.resident`: 常驻技能列表
- `mcp.servers`: MCP 服务器配置

## MCP 集成

**MCP 工具自动加载**: 启用后，MCP 工具会自动添加到工具列表。

**配置位置**: `config.json` 的 `mcp.servers` 数组

## 测试和调试

**运行测试**:
```bash
npm test              # 模块测试
npm run test:mcp      # MCP 测试
npm run check         # 检查编译
```

**调试技巧**:
- 使用 `/config` 查看当前配置
- 使用 `/skills` 查看技能状态
- 使用 `/status` 查看对话摘要

## 重要提示

1. **不要破坏功能**: 修改后至少检查编译 (`npm run check`)
2. **保持简洁**: 代码应该简洁明了，避免过度复杂化
3. **类型安全**: 使用 Zod schema 确保类型安全
4. **错误友好**: 提供清晰的错误信息和修复建议
5. **中文优先**: 注释和文档使用中文

## 项目信息

- **仓库**: https://github.com/uppet/closer-code
- **主入口**: `src/index.js`
- **CLI 入口**: `src/closer-cli.jsx`
- **批处理**: `src/batch-cli.js`
- **Node 版本**: >= 18.0.0

---

**核心原则**: 让 AI 助理能够快速理解项目结构，遵循开发规范，高效完成任务。
