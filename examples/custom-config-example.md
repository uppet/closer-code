# 自定义配置文件使用示例

## 场景：测试不同的配置

在开发和测试时，你可能需要使用不同的配置而不修改全局配置文件。这时可以使用 `--config` 参数。

## 示例 1：创建测试配置

创建一个测试配置文件 `test-config.json`：

```json
{
  "ai": {
    "provider": "anthropic",
    "anthropic": {
      "apiKey": "test-api-key",
      "model": "claude-sonnet-4-5-20250929",
      "maxTokens": 8192
    }
  },
  "behavior": {
    "autoPlan": true,
    "autoExecute": false,
    "maxRetries": 5,
    "timeout": 60000,
    "customSystemPrompt": "You are a test assistant. Be concise."
  }
}
```

## 示例 2：使用自定义配置运行

```bash
# 交互模式
cloco --config test-config.json

# 批处理模式
cloco -b --config test-config.json "列出当前目录的文件"

# 极简模式
cloco -s --config test-config.json
```

## 示例 3：不同的测试场景

### 场景 A：快速测试（小 token 限制）

`config-quick-test.json`:
```json
{
  "ai": {
    "anthropic": {
      "maxTokens": 1024
    }
  },
  "behavior": {
    "timeout": 10000
  }
}
```

```bash
cloco -b --config config-quick-test.json "简单测试"
```

### 场景 B：完整测试（大 token 限制）

`config-full-test.json`:
```json
{
  "ai": {
    "anthropic": {
      "maxTokens": 8192
    }
  },
  "behavior": {
    "timeout": 60000
  }
}
```

```bash
cloco -b --config config-full-test.json "复杂测试"
```

### 场景 C：使用不同的 AI 提供商

`config-openai.json`:
```json
{
  "ai": {
    "provider": "openai",
    "openai": {
      "apiKey": "sk-openai-key",
      "model": "gpt-4o"
    }
  }
}
```

```bash
cloco -b --config config-openai.json "使用 OpenAI 测试"
```

## 示例 4：配置文件管理

### 创建配置目录

```bash
mkdir -p ~/.closer-code/configs
```

### 保存不同的配置

```bash
# 开发配置
cp config.example.json ~/.closer-code/configs/dev-config.json

# 测试配置
cp config.example.json ~/.closer-code/configs/test-config.json

# 生产配置
cp config.example.json ~/.closer-code/configs/prod-config.json
```

### 使用配置

```bash
# 开发环境
cloco --config ~/.closer-code/configs/dev-config.json

# 测试环境
cloco --config ~/.closer-code/configs/test-config.json

# 生产环境
cloco --config ~/.closer-code/configs/prod-config.json
```

## 示例 5：结合项目配置

项目配置 `.closer-code.json`:
```json
{
  "behavior": {
    "workingDir": "/path/to/project"
  }
}
```

自定义配置 `custom-config.json`:
```json
{
  "ai": {
    "anthropic": {
      "model": "claude-sonnet-4-5-20250929"
    }
  }
}
```

最终配置 = 默认配置 + 自定义配置 + 项目配置

```bash
cloco --config custom-config.json
```

## 注意事项

1. **配置优先级**：项目本地 > 自定义配置 > 全局配置 > 默认配置
2. **路径支持**：相对路径和绝对路径都支持
3. **错误处理**：文件不存在或 JSON 格式错误会提示并退出
4. **向后兼容**：不影响现有的配置加载机制

## 最佳实践

1. **为不同环境创建不同的配置文件**
2. **使用有意义的文件名**（如 `dev-config.json`, `test-config.json`）
3. **将配置文件保存在统一的位置**（如 `~/.closer-code/configs/`）
4. **使用版本控制管理配置文件**（但不包含敏感信息）
5. **使用环境变量管理敏感信息**（如 API Key）

## 故障排查

### 问题：配置文件未找到

```
❌ [FATAL ERROR] Custom config file not found: /path/to/config.json
```

**解决方案**：检查文件路径是否正确

### 问题：JSON 格式错误

```
❌ [FATAL ERROR] Failed to parse custom config file: /path/to/config.json

JSON Parse Error: Unexpected token } in JSON at position 123
```

**解决方案**：使用 JSON 验证工具检查配置文件格式

### 问题：配置未生效

**解决方案**：
1. 检查配置优先级
2. 确认项目本地配置没有覆盖自定义配置
3. 查看日志输出，确认配置文件已加载
