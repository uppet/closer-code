# Closer Code

> AI 编程助理 - 通过对话完成编码、调试和任务规划

Closer Code 是一个强大的命令行 AI 编程助理，可以帮助开发者：
- 📝 编写和编辑代码
- 🐛 调试和修复错误
- 📋 规划和执行复杂任务
- 🔍 搜索和理解代码库
- ⚡ 运行测试和命令

**命令**: `cloco` (closer + code)

## 功能特性

### 对话式交互
- 自然语言交互，无需记忆复杂命令
- 上下文感知的对话历史
- 支持流式响应

### 批处理模式 🚀
- 非交互式命令执行
- 支持脚本集成和 CI/CD
- 多种输出格式（text/json/verbose）

### 任务规划与执行
- 自动将复杂任务分解为可执行步骤
- 可视化任务进度
- 支持任务依赖管理

### 工具集成
- **Bash 执行**: 运行任意 shell 命令
- **文件操作**: 读取、写入、编辑文件
- **代码搜索**: 按模式搜索文件和代码
- **错误诊断**: 智能分析和解决错误
- **测试运行**: 自动检测并运行测试

### 快捷操作 ⚡
20+ 预定义快捷操作，提高开发效率：
- **文件**: `ls`, `cat`, `pwd` - 快速文件操作
- **Git**: `gs`, `ga`, `gc`, `gp`, `gl` - Git 常用命令
- **项目**: `build`, `test`, `clean`, `install` - 项目管理
- **搜索**: `find`, `grep` - 代码搜索
- **AI**: `explain`, `fix`, `refactor`, `review` - AI 辅助

### 代码片段管理 📦
- 创建、编辑、删除代码片段
- 按标签、语言、内容搜索
- 使用统计和最近使用追踪
- 导入/导出功能
- 7+ 预定义模板（React、Express、Python 等）

### Git 集成 🎯
- Git 仓库状态查询
- 分支管理（创建、切换、删除）
- 提交历史查看
- 远程仓库管理
- 智能提交助手
- 仓库统计信息

### 项目学习
- 自动学习项目结构和模式
- 适应项目的编码风格
- 持久化项目知识

## 安装

### 前置要求
- Node.js >= 18.0.0
- npm 或 yarn

### 全局安装

```bash
# 克隆仓库
git clone <repository-url>
cd closer-code

# 安装依赖
npm install

# 构建项目
npm run build

# 全局安装
npm install -g .

# 使用命令
cloco
```

### 本地开发

```bash
# 克隆仓库
git clone <repository-url>
cd closer-code

# 安装依赖
npm install

# 构建项目
npm run build

# 启动应用
npm start
# 或直接运行
node dist/index.js
```

## 配置

### AI 提供商

Closer Code 支持多个 AI 提供商：

#### 1. Anthropic Claude (推荐)
```bash
export ANTHROPIC_API_KEY='your-api-key'
```

#### 2. OpenAI
```bash
export OPENAI_API_KEY='your-api-key'
```

#### 3. Ollama (本地运行)
```bash
# 确保 Ollama 服务运行在 localhost:11434
ollama serve
```

### 配置文件

配置文件位于 `~/.closer-code/config.json`：

```json
{
  "ai": {
    "provider": "anthropic",
    "anthropic": {
      "apiKey": "your-api-key",
      "model": "claude-sonnet-4-5-20250929",
      "maxTokens": 8192
    }
  },
  "behavior": {
    "autoPlan": true,
    "autoExecute": false,
    "confirmDestructive": true
  },
  "tools": {
    "enabled": [
      "bash",
      "readFile",
      "writeFile",
      "editFile",
      "searchFiles",
      "searchCode",
      "listFiles",
      "analyzeError",
      "runTests",
      "planTask"
    ]
  }
}
```

## 使用方法

### 命令概览

```bash
# 交互模式（默认）
cloco                              # 首次使用会自动运行配置向导

# 批处理模式
cloco -b "分析代码"                 # 短选项
cloco --batch "列出文件"            # 长选项
cloco -b --json "生成代码" > out.js # JSON 格式输出
cloco -b --file prompt.txt         # 从文件读取提示词

# 配置管理
cloco config                       # 查看当前配置
cloco config set <key> <value>     # 设置配置项
cloco config edit                  # 打开配置文件编辑器

# 其他命令
cloco setup                        # 手动运行配置向导
cloco upgrade                      # 检查版本更新
cloco version                      # 显示版本信息
cloco help                         # 显示帮助
```

### 交互模式

启动交互式对话：

```bash
cloco
```

首次使用会自动运行配置向导。

### 批处理模式

批处理模式适用于自动化脚本和 CI/CD 集成：

```bash
# 基本使用
cloco -b "解释这个函数"

# JSON 输出（便于脚本处理）
cloco -b --json "生成代码" > output.json

# 详细输出（包含工具调用过程）
cloco -b --verbose "分析项目结构"

# 从文件读取提示词
cloco -b --file prompt.txt

# 标准输入
echo "列出当前目录的文件" | cloco -b
```

**输出格式**：

- **text**（默认）：纯文本输出
- **json**：结构化 JSON，包含工具调用和元数据
- **verbose**：详细输出，显示工具执行过程

### 基本对话

直接输入你的问题或任务：

```
❯ 帮我添加一个用户认证功能
```

```
❯ 为什么我的测试失败了？
```

```
❯ 重构这个组件，使其更易维护
```

### 命令

| 命令 | 描述 |
|------|------|
| `/help` | 显示帮助信息 |
| `/clear` | 清除对话历史 |
| `/plan <task>` | 创建并执行任务计划 |
| `/learn` | 学习项目模式 |
| `/status` | 显示对话统计 |

### 快捷操作

直接输入快捷命令（无需斜杠）：

```
❯ ls                    # 列出当前目录
❯ cat package.json      # 读取文件
❯ gs                    # Git 状态
❯ build                 # 运行构建
❯ test                  # 运行测试
❯ find "TODO"           # 搜索代码
```

### 代码片段

```
❯ 使用 React 组件模板创建一个新组件
```

```
❯ 保存这段代码为 snippet
```

```
❯ 搜索所有 JavaScript 片段
```

### Git 操作

```
❯ 创建新分支 feature/new-api
❯ 切换到 develop 分支
❯ 显示最近 5 次提交
❯ 智能提交当前更改
```

### 任务规划示例

```
❯ /plan 创建一个 REST API
```

这将：
1. 分析项目结构
2. 创建详细的执行计划
3. 逐步执行每个步骤
4. 显示进度和结果

### 工具使用示例

AI 可以自动使用工具，你也可以明确要求：

```
❯ 读取 package.json 文件
```

```
❯ 搜索所有包含 'TODO' 的文件
```

```
❯ 运行测试并告诉我结果
```

## AI 智能执行能力 🤖

Closer Code 的 AI 助理具备强大的任务规划和执行能力，能够自动完成复杂的多步骤任务。

### 自动工具调用

AI 会根据你的请求自动选择和使用合适的工具：

```
❯ 这个目录里有什么？
→ AI 自动调用 bash ls -la

❯ 帮我看看 package.json
→ AI 自动调用 readFile 读取文件

❯ 搜索所有 TODO 注释
→ AI 自动调用 searchCode 搜索代码
```

### 多步骤任务执行

对于复杂任务，AI 会自动规划并执行所有必要的步骤：

#### 完整项目分析

```
❯ 把整个项目读一遍，告诉我它是做什么的，有什么性能隐患
```

AI 会自动：
1. ✅ 列出 src/ 目录的所有文件
2. ✅ 读取 README.md、package.json 等配置文件
3. ✅ **逐个读取所有源代码文件** (.js, .jsx, .ts, .tsx)
4. ✅ 分析代码架构和模块关系
5. ✅ 识别性能瓶颈和安全问题
6. ✅ 提供详细的分析报告

**注意**：AI 会读取所有源文件，不会只读 1-2 个就停止。

#### 代码调试

```
❯ 帮我调试这个错误：TypeError: Cannot read property 'x' of undefined
```

AI 会自动：
1. 分析错误信息和堆栈跟踪
2. 搜索相关的代码文件
3. 读取问题代码
4. 识别根本原因
5. 提出修复方案
6. 在你确认后实施修复

#### 代码重构

```
❯ 重构这个组件，使其更易维护
```

AI 会自动：
1. 读取组件代码
2. 分析现有实现
3. 识别可改进的地方
4. 提出重构方案
5. 实施重构（需确认）
6. 验证重构后的代码

### 实时活动反馈

在执行任务时，界面会显示当前活动状态：

- 📤 发送消息到 AI...
- 🤔 AI 正在思考...
- ✍️ AI 正在输入...
- ⚡ 执行工具: bash...
- 📊 处理工具结果...

### 任务完成标准

AI 认为任务完成当且仅当：
1. ✅ 收集了所有必要的信息
2. ✅ 彻底分析了数据
3. ✅ 提供了可操作的见解或结果
4. ✅ 回答了你的具体问题

### 最佳实践

为了让 AI 更好地帮助你：

✅ **明确的任务描述**
```
好：分析整个项目的性能瓶颈并给出优化建议
好：读取所有源文件，找出所有 console.log 语句
差：看看代码
```

✅ **具体的请求**
```
好：读取 src/ai-client.js 和 src/conversation.js，比较它们的错误处理方式
好：搜索所有包含 'TODO' 的文件并列出来
差：检查一下代码
```

✅ **分步骤的复杂任务**
```
好：第一步列出所有配置文件，第二步读取它们，第三步分析配置是否合理
好：先找到所有测试文件，然后运行测试，最后分析失败的测试
```

## 架构

```
src/
├── index.js            # 统一 CLI 入口（cloco 命令）
├── commands/           # 子命令实现
│   ├── chat.js        # 交互模式
│   ├── batch.js       # 批处理模式
│   ├── config.js      # 配置管理
│   ├── setup.js       # 初始化向导
│   ├── upgrade.js     # 版本更新检查
│   └── help.js        # 帮助文档
├── utils/              # 工具函数
│   ├── cli.js         # CLI 参数解析
│   └── version.js     # 版本信息
├── closer-cli.jsx      # 交互式 UI 组件（保留）
├── batch-cli.js        # 批处理模式（保留，向后兼容）
├── ai-client.js        # AI 客户端（支持多个提供商）
├── conversation.js     # 对话管理器
├── planner.js          # 任务规划器
├── tools.js            # 工具执行器
├── search.js           # 代码搜索
├── shortcuts.js        # 快捷操作管理
├── snippets.js         # 代码片段管理
├── git-helper.js       # Git 集成
├── config.js           # 配置管理
├── setup.js            # 设置向导
├── test-modules.js     # 测试验证
└── bash-runner.js      # Bash 执行器
```

## 开发

### 快速开始

```bash
# 运行设置向导
npm run setup

# 启动应用（使用 cloco 命令）
npm start

# 或直接运行
node dist/index.js
```

### 构建

```bash
# 构建所有文件
npm run build

# 仅构建主入口
npm run build:main

# 仅构建交互模式
npm run build:cli

# 仅构建批处理模式
npm run build:batch
```

### 开发模式（自动重建）

```bash
npm run dev
```

### 测试

```bash
# 测试模块
npm test

# 测试批处理模式
npm run test:batch
```

### 检查编译

```bash
npm run check
```

## 向后兼容

为了平滑过渡，保留了旧的命令：

- `closer` - 等同于 `cloco`（交互模式）
- `closer-batch` - 等同于 `cloco -b`（批处理模式）

旧命令会显示迁移提示但仍然可用。建议新用户直接使用 `cloco` 命令。

## 工作原理

1. **对话循环**
   - 接收用户输入
   - 构建消息上下文
   - 发送到 AI 模型
   - 解析响应和工具调用
   - 执行工具并返回结果

2. **任务规划**
   - 分析用户请求
   - 分解为可执行步骤
   - 处理步骤依赖
   - 执行并验证结果

3. **工具执行**
   - 验证工具权限
   - 执行操作
   - 收集结果
   - 返回给 AI

## 配置选项

### 行为配置

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `autoPlan` | boolean | true | 自动规划任务 |
| `autoExecute` | boolean | false | 自动执行低风险操作 |
| `confirmDestructive` | boolean | true | 危险操作需要确认 |
| `maxRetries` | number | 3 | 失败重试次数 |
| `timeout` | number | 30000 | 操作超时时间(ms) |

### 工具配置

可用工具：
- `bash` - 执行 shell 命令
- `readFile` - 读取文件内容
- `writeFile` - 写入文件
- `editFile` - 编辑文件（替换）
- `searchFiles` - 搜索文件
- `searchCode` - 搜索代码内容
- `listFiles` - 列出目录文件
- `analyzeError` - 分析错误
- `runTests` - 运行测试
- `planTask` - 规划任务

## 故障排查

### API 密钥错误
```
Error: API key not configured
```
确保设置了正确的环境变量或配置文件。

### 构建错误
```bash
rm -rf node_modules dist
npm install
npm run build
```

### 工具执行失败
检查：
1. 工具是否在配置中启用
2. 工作目录是否正确
3. 文件权限是否足够

## 贡献

欢迎贡献！请先阅读贡献指南。

## 许可证

MIT License

## 致谢

Co-Authored-By: Claude & GLM4.7.
