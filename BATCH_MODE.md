# 批处理非交互模式 - 使用指南

## 概述

批处理模式（Batch Mode）允许你在不启动交互式 UI 的情况下使用 AI 编程助理。这适用于自动化脚本、CI/CD 集成、以及快速验证 AI 助理能力等场景。

## 安装

```bash
npm run build
```

## 基本用法

### 1. 命令行参数

```bash
# 直接使用命令行参数
node dist/batch-cli.js "你好"

# 或者使用 npm 脚本
npm run batch -- "你好"
```

### 2. 从文件读取

```bash
# 从文件读取提示词
node dist/batch-cli.js --file prompt.txt
```

### 3. 标准输入

```bash
# 从标准输入读取
echo "列出当前目录的文件" | node dist/batch-cli.js
```

## 输出格式

### Text 模式（默认）

纯文本输出，只显示 AI 的响应内容：

```bash
node dist/batch-cli.js "2 + 2 等于几？"
```

### JSON 模式

以 JSON 格式输出，包含完整信息：

```bash
node dist/batch-cli.js --json "分析 package.json"
```

输出示例：
```json
{
  "success": true,
  "content": "AI的响应内容...",
  "toolCalls": [
    {
      "tool": "readFile",
      "success": true,
      "result": {...}
    }
  ],
  "metadata": {
    "duration": 1234,
    "toolCount": 1,
    "timestamp": "2025-01-17T..."
  }
}
```

### Verbose 模式

详细输出，显示工具调用过程：

```bash
node dist/batch-cli.js --verbose "使用 bash 列出文件"
```

输出示例：
```
[INFO] 初始化配置...
[INFO] 创建对话会话...
[INFO] 发送消息到 AI...
[INFO] 执行工具: bash
[TOOL] bash
  ✓ Success
AI的响应内容...

---
工具调用: 1 次
耗时: 1234ms
```

## 调试

### 启用调试日志

```bash
# 方式 1: 使用 --debug 参数
node dist/batch-cli.js --debug "你的问题"

# 方式 2: 设置环境变量
CLOSER_DEBUG_LOG=1 node dist/batch-cli.js "你的问题"
```

调试日志保存在 `~/.closer-code/logs/` 目录下。

## 配置

批处理模式使用与交互模式相同的配置文件：`~/.closer-code/config.json`

### 环境变量

| 变量 | 说明 |
|------|------|
| `CLOSER_AI_PROVIDER` | AI 提供商 (anthropic, openai, ollama) |
| `CLOSER_ANTHROPIC_API_KEY` | Anthropic API Key |
| `CLOSER_OPENAI_API_KEY` | OpenAI API Key |
| `CLOSER_DEBUG_LOG` | 启用调试日志 (设为 1) |

## 退出码

| 退出码 | 说明 |
|--------|------|
| 0 | 成功 |
| 1 | 错误 |
| 2 | 参数错误 |

## 测试

运行测试脚本验证功能：

```bash
npm run test:batch
```

测试脚本会检查：
- 配置是否正确
- API Key 是否存在
- 基础对话功能
- 工具调用功能
- 文件读取功能
- JSON 输出格式

## 使用场景

### 1. 快速提问

```bash
node dist/batch-cli.js "解释这个函数的作用"
```

### 2. 代码生成

```bash
node dist/batch-cli.js --file code-request.txt > output.js
```

### 3. CI/CD 集成

```bash
# 在 CI 脚本中
node dist/batch-cli.js --json "运行测试并分析结果" | jq '.success'
```

### 4. 日志分析

```bash
# 启用调试日志以获取详细记录
node dist/batch-cli.js --debug "你的问题"
cat ~/.closer-code/logs/closer_debug_log_*.log
```

## 完整示例

```bash
# 1. 创建提示词文件
cat > prompt.txt << 'EOF'
读取 package.json 文件，然后：
1. 列出所有依赖
2. 分析项目结构
EOF

# 2. 运行批处理模式
node dist/batch-cli.js --file prompt.txt

# 3. 以 JSON 格式获取结果
node dist/batch-cli.js --json --file prompt.txt > result.json

# 4. 启用调试模式查看详细信息
node dist/batch-cli.js --debug --file prompt.txt
```

## 故障排查

### 问题: 提示 API Key 未配置

```bash
# 设置环境变量
export CLOSER_ANTHROPIC_API_KEY="your-api-key-here"
```

### 问题: 输出为空

检查：
1. API Key 是否正确
2. 是否启用了调试日志查看错误
3. 使用 `--verbose` 模式查看详细信息

### 问题: 工具调用失败

使用 `--debug` 查看详细日志：
```bash
node dist/batch-cli.js --debug "使用 bash 列出文件"
```
