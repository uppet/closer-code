# Project Local Configuration

## 概述

Closer Code 支持 **项目本地配置**，允许你为不同项目配置不同的 MCP Servers 和行为。

## 配置优先级

```
项目本地配置 > 全局配置 > 默认配置
```

## 配置文件位置

### 项目本地配置

Closer Code 会按以下顺序查找项目配置文件：

1. `.closer-code.json`
2. `.closer-code/config.json`
3. `closer-code.json`
4. `.closer-code.local.json`

### 全局配置

```
~/.closer-code/config.json
```

## 使用场景

### 场景 1: 不同项目使用不同的数据库

**项目 A** (`.closer-code.json`):
```json
{
  "mcp": {
    "enabled": true,
    "servers": {
      "postgres": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/project_a_db"]
      }
    }
  }
}
```

**项目 B** (`.closer-code.json`):
```json
{
  "mcp": {
    "enabled": true,
    "servers": {
      "postgres": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/project_b_db"]
      }
    }
  }
}
```

### 场景 2: 项目特定的文件系统访问

**前端项目** (`.closer-code.json`):
```json
{
  "mcp": {
    "enabled": true,
    "servers": {
      "filesystem": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/frontend/src"]
      }
    }
  }
}
```

**后端项目** (`.closer-code.json`):
```json
{
  "mcp": {
    "enabled": true,
    "servers": {
      "filesystem": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/backend/api"]
      }
    }
  }
}
```

### 场景 3: 敏感信息隔离

**生产环境项目** (`.closer-code.json`):
```json
{
  "mcp": {
    "enabled": true,
    "servers": {
      "github": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
        "env": {
          "GITHUB_TOKEN": "ghp_production_token_xxx"
        }
      }
    }
  }
}
```

**个人项目** (`.closer-code.json`):
```json
{
  "mcp": {
    "enabled": true,
    "servers": {
      "github": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
        "env": {
          "GITHUB_TOKEN": "ghp_personal_token_yyy"
        }
      }
    }
  }
}
```

## 配置示例

### 基本配置

```json
{
  "mcp": {
    "enabled": true,
    "servers": {
      "filesystem": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
      }
    }
  }
}
```

### 完整配置

```json
{
  "mcp": {
    "enabled": true,
    "servers": {
      "filesystem": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
        "env": {}
      },
      "git": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-git"],
        "env": {}
      },
      "postgres": {
        "enabled": false,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://..."],
        "env": {}
      }
    }
  },
  "behavior": {
    "workingDir": ".",
    "autoPlan": true,
    "autoExecute": false
  }
}
```

### 仅覆盖 MCP 配置

```json
{
  "mcp": {
    "enabled": true,
    "servers": {
      "my-custom-server": {
        "enabled": true,
        "command": "node",
        "args": ["./scripts/my-mcp-server.js"],
        "env": {
          "API_KEY": "project-specific-key"
        }
      }
    }
  }
}
```

## 快速开始

### 1. 创建项目配置

```bash
# 在项目根目录创建配置文件
cp .closer-code.example.json .closer-code.json
```

### 2. 编辑配置

```bash
vim .closer-code.json
```

### 3. 启动 Closer Code

```bash
cloco
```

你会看到：

```
[Config] Loaded project config from: /path/to/project/.closer-code.json
[Config] Project path: /path/to/project
[Config] Using merged config (project + global)
[MCP] Initializing MCP Client...
[MCP] Using project-local MCP configuration
[MCP] ✓ Loaded 5 tools from MCP Servers
```

## 配置合并规则

### 合并策略

配置使用 **深度合并** 策略：

```javascript
// 全局配置 (~/.closer-code/config.json)
{
  "mcp": {
    "enabled": true,
    "servers": {
      "filesystem": { "enabled": true, ... },
      "git": { "enabled": true, ... }
    }
  }
}

// 项目配置 (.closer-code.json)
{
  "mcp": {
    "servers": {
      "postgres": { "enabled": true, ... }
    }
  }
}

// 最终配置（合并后）
{
  "mcp": {
    "enabled": true,  // 来自全局
    "servers": {
      "filesystem": { "enabled": true, ... },  // 来自全局
      "git": { "enabled": true, ... },          // 来自全局
      "postgres": { "enabled": true, ... }      // 来自项目
    }
  }
}
```

### 覆盖规则

- 项目配置中的字段会覆盖全局配置
- 未指定的字段使用全局配置
- 数组字段会被完全替换（不是合并）

## 查看配置

### 查看当前使用的配置文件

```javascript
import { getConfigPaths } from './config.js';

const paths = getConfigPaths();
console.log('Global config:', paths.global);
console.log('Project config:', paths.project);
console.log('Active config:', paths.active);
```

### 查看合并后的配置

```bash
# 启动时会显示配置来源
cloco
```

输出：
```
[Config] Loaded project config from: /path/to/project/.closer-code.json
[Config] Project path: /path/to/project
[Config] Using merged config (project + global)
```

## 最佳实践

### 1. 敏感信息管理

❌ **不要**将敏感信息提交到版本控制：

```bash
# .gitignore
.closer-code.json
.closer-code.local.json
```

✅ **使用**环境变量或示例文件：

```bash
# 提供示例配置
cp .closer-code.example.json .closer-code.json
```

### 2. 团队协作

**方案 1: 提交示例配置**

```bash
# .closer-code.example.json (提交到 Git)
{
  "mcp": {
    "servers": {
      "database": {
        "comment": "使用环境变量 DATABASE_URL"
      }
    }
  }
}

# .closer-code.local.json (不提交，包含实际配置)
{
  "mcp": {
    "servers": {
      "database": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-postgres", process.env.DATABASE_URL]
      }
    }
  }
}
```

**方案 2: 使用环境变量**

```json
{
  "mcp": {
    "servers": {
      "github": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
        "env": {
          "GITHUB_TOKEN": "${GITHUB_TOKEN}"
        }
      }
    }
  }
}
```

### 3. 项目模板

在项目模板中包含 `.closer-code.example.json`：

```json
{
  "_comment": {
    "title": "Closer Code 项目配置",
    "description": "复制此文件为 .closer-code.json 并根据项目需要修改"
  },
  "mcp": {
    "enabled": true,
    "servers": {
      "filesystem": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "./src"]
      }
    }
  }
}
```

## 故障排查

### 问题: 项目配置未生效

**检查**:
```bash
# 确认配置文件存在
ls -la .closer-code.json

# 确认文件名正确（注意大小写）
```

**解决方案**:
- 确保文件名是 `.closer-code.json`（以点开头）
- 检查文件是否在项目根目录

### 问题: 配置合并不符合预期

**检查**:
```bash
# 查看启动日志
cloco

# 应该看到:
# [Config] Loaded project config from: ...
# [Config] Using merged config (project + global)
```

**解决方案**:
- 检查 JSON 格式是否正确
- 确认使用深度合并规则

### 问题: MCP Servers 未连接

**检查**:
```bash
# 查看日志
[MCP] Using project-local MCP configuration
[MCP] ✓ Loaded X tools from MCP Servers
```

**解决方案**:
- 确认 `mcp.enabled: true`
- 检查 MCP Server 配置是否正确
- 运行 `npm run test:mcp` 诊断

## 相关文档

- [MCP 集成指南](./MCP_INTEGRATION.md)
- [MCP 快速开始](./MCP_QUICKSTART.md)
- [配置文件示例](../config.mcp.example.json)

## 总结

项目本地配置让你能够：

- ✅ 为不同项目配置不同的 MCP Servers
- ✅ 在项目中隔离敏感信息
- ✅ 覆盖全局配置的特定部分
- ✅ 提高团队协作的灵活性

**记住**: 项目配置优先于全局配置！
