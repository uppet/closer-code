# Closer Code

> AI 编程助理 - 通过对话完成编码、调试和任务规划

Closer Code 是一个强大的命令行 AI 编程助理，可以帮助开发者：
- 📝 编写和编辑代码
- 🐛 调试和修复错误
- 📋 规划和执行复杂任务
- 🔍 搜索和理解代码库
- ⚡ 运行测试和命令

## 功能特性

### 对话式交互
- 自然语言交互，无需记忆复杂命令
- 上下文感知的对话历史
- 支持流式响应

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

### 项目学习
- 自动学习项目结构和模式
- 适应项目的编码风格
- 持久化项目知识

## 安装

### 前置要求
- Node.js >= 18.0.0
- npm 或 yarn

### 安装步骤

```bash
# 克隆仓库
git clone <repository-url>
cd spawnbash

# 安装依赖
npm install

# 构建项目
npm run build

# 启动应用
npm start
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

### 启动

```bash
npm start
```

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

## 架构

```
src/
├── closer-cli.jsx    # 主 UI 组件
├── ai-client.js       # AI 客户端（支持多个提供商）
├── conversation.js    # 对话管理器
├── planner.js         # 任务规划器
├── tools.js           # 工具执行器
├── search.js          # 代码搜索
├── config.js          # 配置管理
└── bash-runner.js     # Bash 执行器
```

## 开发

### 构建

```bash
npm run build
```

### 开发模式（自动重建）

```bash
npm run dev
```

### 测试

```bash
npm test
```

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
