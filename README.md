# Closer Code

<div align="center">

**AI 编程助理 - 让编码像对话一样简单**

[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[English](#english) | [中文](#中文)

</div>

---

## ✨ 特性

### 🤖 智能对话
- 自然语言交互，无需记忆复杂命令
- 多轮对话，理解上下文
- 实时流式响应

### 🛠️ 自动执行
- **自动工具调用**：AI 自动选择合适的工具完成任务
- **任务规划**：将复杂任务分解为可执行步骤
- **错误修复**：AI 自我诊断并修复错误

### 🔌 多 AI 支持
- ✅ Anthropic Claude (推荐)
- ✅ OpenAI GPT
- ✅ DeepSeek

### 📦 工具集成
- 📝 文件操作：读取、写入、编辑文件
- ⚡ Bash 执行：运行任意 shell 命令
- 🔍 代码搜索：搜索文件和代码内容
- 🧪 测试运行：自动检测并运行测试
- 🐛 错误诊断：智能分析和解决错误

### 🚀 批处理模式
- 非交互式命令执行
- 支持 CI/CD 集成
- 多种输出格式（text/json/verbose）

### 🌐 MCP 集成
- 连接到外部 MCP Servers
- 扩展更多能力（文件系统、Git、数据库等）
- 项目本地配置

---

## 📦 快速开始

### 安装

```bash
# 克隆仓库
git clone <repository-url>
cd closer-code

# 安装依赖
npm install

# 构建
npm run build

# 全局安装
npm install -g .
```

### 配置

#### 方法 1：配置文件（推荐）

创建配置文件 `~/.closer-code/config.json`：

```bash
# 创建配置目录
mkdir -p ~/.closer-code

# 复制示例配置
cp config.example.json ~/.closer-code/config.json

# 编辑配置文件
nano ~/.closer-code/config.json
```

配置示例：

```json
{
  "ai": {
    "provider": "anthropic",
    "anthropic": {
      "apiKey": "sk-ant-xxx",
      "baseURL": "https://api.anthropic.com",
      "model": "claude-sonnet-4-5-20250929",
      "maxTokens": 8192
    },
    "openai": {
      "apiKey": "sk-xxx",
      "baseURL": "https://api.openai.com/v1",
      "model": "gpt-4o",
      "maxTokens": 4096,
      "enableReasoning": false
    }
  }
}
```

> **注意**：`enableReasoning` 参数用于 DeepSeek 推理模型（如 `deepseek-reasoner`），普通 OpenAI 模型设置为 `false`。

切换提供商：修改 `"provider"` 字段为 `"openai"` 或 `"anthropic"`

#### 方法 2：环境变量

```bash
# Anthropic Claude
export CLOSER_ANTHROPIC_API_KEY='your-api-key'

# OpenAI
export CLOSER_OPENAI_API_KEY='your-api-key'
```

### 运行

```bash
# 启动交互模式
cloco

# 批处理模式
cloco -b "列出当前目录的文件"

# 查看帮助
cloco help
```

---

## 💡 使用示例

### 日常开发

```bash
# 启动对话
cloco

# 直接输入你的问题或任务
❯ 帮我添加一个用户认证功能
❯ 为什么我的测试失败了？
❯ 重构这个组件，使其更易维护
```

### 自动执行任务

```bash
# AI 自动规划并执行所有步骤
❯ 分析整个项目的性能瓶颈

# AI 会自动：
# 1. 列出所有源文件
# 2. 读取代码文件
# 3. 分析架构和性能
# 4. 生成详细报告
```

### 批处理模式

```bash
# 生成代码
cloco -b "创建一个 React 组件"

# JSON 输出（便于脚本处理）
cloco -b --json "分析代码" > output.json

# 从文件读取提示词
cloco -b --file prompt.txt
```

### 快捷命令

```bash
# 文件操作
❯ ls                    # 列出当前目录
❯ cat package.json      # 读取文件

# Git 操作
❯ gs                    # Git 状态
❯ build                 # 运行构建

# 代码搜索
❯ find "TODO"           # 搜索代码
```

---

## 🎯 核心优势

### 1. 自动化程度高
- AI 自动选择和使用工具
- 自动规划和执行复杂任务
- 自我诊断和修复错误

### 2. 代码简洁
- 使用官方 SDK，代码量减少 35%
- 类型安全的工具定义
- 内置错误处理和重试

### 3. 灵活性强
- 支持多个 AI 提供商
- 可自定义工具和配置
- 交互式和批处理模式

### 4. 项目隔离
- 每个项目独立的对话历史
- 避免上下文混淆
- 支持项目本地配置

---

## 📚 文档

- [快速开始](#-快速开始)
- [配置指南](#-配置)
- [使用示例](#-使用示例)
- [MCP 集成](docs/MCP_QUICKSTART.md)
- [API 文档](API_GUIDE.md)

---

## 🛠️ 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 开发模式（自动重建）
npm run dev

# 运行测试
npm test

# 检查编译
npm run check
```

---

## 🤝 贡献

欢迎贡献！请先阅读贡献指南。

---

## 📄 许可证

MIT License

---

## 🙏 致谢

Co-Authored-By: Claude & GLM4.7.

---

## ❓ 常见问题

### Q: 支持哪些 AI 模型？
A: 支持 Anthropic Claude、OpenAI GPT 和 DeepSeek。

### Q: 如何切换 AI 提供商？
A: 修改配置文件中的 `ai.provider` 字段。

### Q: 批处理模式如何使用？
A: 使用 `cloco -b "你的提示词"` 命令。

### Q: 如何添加自定义工具？
A: 在配置文件的 `tools.enabled` 字段中添加工具名称。

---

## 📞 联系方式

如有问题或建议，欢迎提交 Issue。

---

<div align="center">

**让编码更简单，让开发更高效** ⚡

</div>