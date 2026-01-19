# OpenAI 客户端快速开始指南

## 安装

```bash
npm install
```

**注意**: 由于 `@openai/agents` 与 `zod@3.25.68+` 的兼容性问题，安装时使用了 `--legacy-peer-deps` 选项。

## 配置

### 方式 1: 环境变量

```bash
export OPENAI_API_KEY=sk-your_api_key_here
```

### 方式 2: 配置文件

创建或编辑 `~/.closer-code/config.json`:

```json
{
  "ai": {
    "provider": "openai",
    "openai": {
      "apiKey": "sk-your_api_key_here",
      "baseURL": "https://api.openai.com/v1",
      "model": "gpt-4o",
      "maxTokens": 8192
    }
  }
}
```

## 使用

### 基础对话

```bash
# 启动 CLI
closer

# 或者
node dist/index.js
```

### 代码示例

```javascript
import { createAIClient } from './src/ai-client.js';

const config = {
  ai: {
    provider: 'openai',
    openai: {
      apiKey: 'sk-your_api_key_here',
      model: 'gpt-4o',
      maxTokens: 8192
    }
  }
};

const client = createAIClient(config);

// 简单对话
const response = await client.chat(
  [{ role: 'user', content: 'Hello, OpenAI!' }],
  { temperature: 0.7 }
);

console.log(response.content);
```

### 使用工具

```javascript
import { bashTool, readFileTool } from './src/tools.js';

const result = await client.chatWithTools(
  [{ role: 'user', content: 'List files in current directory' }],
  [bashTool, readFileTool],
  { temperature: 0.7 }
);
```

### 流式响应

```javascript
await client.chatStream(
  [{ role: 'user', content: 'Tell me a story' }],
  {},
  (chunk) => {
    if (chunk.type === 'text') {
      process.stdout.write(chunk.delta);
    }
  }
);
```

## 测试

```bash
# 运行测试
export OPENAI_API_KEY=your_key
node test/test-openai-client.js
```

## 切换 Provider

在配置文件中更改 `provider` 字段即可在 Anthropic 和 OpenAI 之间切换：

```json
{
  "ai": {
    "provider": "anthropic",  // 或 "openai"
    "anthropic": {
      "apiKey": "sk-ant-..."
    },
    "openai": {
      "apiKey": "sk-..."
    }
  }
}
```

## 支持的模型

### OpenAI
- `gpt-4o` (推荐)
- `gpt-4o-mini`
- `gpt-4-turbo`
- `gpt-3.5-turbo`

### Anthropic
- `claude-sonnet-4-5-20250929` (推荐)
- `claude-opus-4-5-20251101`
- `claude-haiku-4-5-20251101`

## 常见问题

### 1. 安装失败

如果遇到 zod 版本冲突，使用：

```bash
npm install --legacy-peer-deps
```

### 2. API 密钥错误

确保设置了正确的环境变量或配置文件中的 API 密钥。

### 3. 模型不存在

检查配置文件中的 `model` 字段是否为您有权限访问的模型。

## 更多信息

- [详细实现文档](./docs/OPENAI_CLIENT.md)
- [实现总结](./IMPLEMENTATION_SUMMARY.md)
- [OpenAI Agents SDK 文档](https://www.npmjs.com/package/@openai/agents)
