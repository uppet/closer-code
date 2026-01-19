# MCP 集成指南

## 概述

Closer Code 现在支持作为 **MCP Client** 连接到外部的 MCP Servers，从而扩展 AI 助理的能力。

### 什么是 MCP？

MCP (Model Context Protocol) 是一个开放协议，允许 AI 应用与外部数据源和工具进行标准化通信。

### 支持的 MCP Servers

你可以连接到任何符合 MCP 标准的服务器，包括：

- **官方 MCP Servers**:
  - `@modelcontextprotocol/server-filesystem` - 文件系统访问
  - `@modelcontextprotocol/server-git` - Git 操作
  - `@modelcontextprotocol/server-postgres` - PostgreSQL 数据库
  - `@modelcontextprotocol/server-sqlite` - SQLite 数据库
  - `@modelcontextprotocol/server-brave-search` - Brave 搜索
  - `@modelcontextprotocol/server-github` - GitHub API

- **自定义 MCP Servers**:
  - 任何你自己开发的 MCP Server
  - 第三方 MCP Servers

## 配置

### 1. 启用 MCP

在配置文件 `~/.closer-code/config.json` 中添加 MCP 配置：

```json
{
  "mcp": {
    "enabled": true,
    "servers": {
      "filesystem": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/allowed/path"],
        "env": {}
      }
    }
  }
}
```

### 2. 配置示例

#### 文件系统 MCP Server

```json
{
  "mcp": {
    "enabled": true,
    "servers": {
      "filesystem": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/projects"],
        "env": {}
      }
    }
  }
}
```

#### Git MCP Server

```json
{
  "mcp": {
    "enabled": true,
    "servers": {
      "git": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-git"],
        "env": {}
      }
    }
  }
}
```

#### PostgreSQL MCP Server

```json
{
  "mcp": {
    "enabled": true,
    "servers": {
      "postgres": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://user:password@localhost:5432/mydb"],
        "env": {}
      }
    }
  }
}
```

#### 自定义 MCP Server

```json
{
  "mcp": {
    "enabled": true,
    "servers": {
      "my-custom-server": {
        "enabled": true,
        "command": "node",
        "args": ["/path/to/custom-mcp-server.js"],
        "env": {
          "API_KEY": "your-api-key",
          "API_ENDPOINT": "https://api.example.com"
        }
      }
    }
  }
}
```

### 3. 完整配置示例

参考 `config.mcp.example.json` 文件获取完整的配置示例。

## 使用方法

### 启动 Closer Code

```bash
# 交互模式
cloco

# 批处理模式
cloco -b "查询数据库中的用户表"
```

### 使用 MCP 工具

启动后，AI 会自动加载所有启用的 MCP 工具。你可以直接使用：

```
❯ 查询 PostgreSQL 数据库中的所有用户
❯ 读取 /home/user/projects/config.json 文件
❯ 获取 GitHub 仓库的 issue 列表
❯ 使用 Brave 搜索最新新闻
```

### 查看可用的 MCP 工具

启动时会显示加载的 MCP 工具：

```
[MCP] Initializing MCP Client...
[MCP] ✓ Loaded 15 tools from MCP Servers
[MCP] Available MCP tools:
  - filesystem_read_file [from filesystem]
  - filesystem_write_file [from filesystem]
  - filesystem_list_directory [from filesystem]
  - git_clone [from git]
  - git_commit [from git]
  - postgres_query [from postgres]
  ...
```

## 工具命名规则

MCP 工具在 Closer Code 中使用以下命名格式：

```
{serverName}_{toolName}
```

例如：
- `filesystem_read_file`
- `git_clone`
- `postgres_query`

## 开发自定义 MCP Server

### 基本结构

```javascript
// custom-mcp-server.js
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server(
  { name: 'my-custom-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// 注册工具
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'my_tool',
      description: 'My custom tool',
      inputSchema: {
        type: 'object',
        properties: {
          param1: { type: 'string', description: 'Parameter 1' }
        },
        required: ['param1']
      }
    }
  ]
}));

// 处理工具调用
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'my_tool') {
    // 执行你的逻辑
    const result = doSomething(args.param1);

    return {
      content: [{ type: 'text', text: JSON.stringify(result) }]
    };
  }

  throw new Error(`Tool ${name} not found`);
});

// 启动服务器
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 在 Closer Code 中使用

```json
{
  "mcp": {
    "enabled": true,
    "servers": {
      "my-custom": {
        "enabled": true,
        "command": "node",
        "args": ["/path/to/custom-mcp-server.js"],
        "env": {}
      }
    }
  }
}
```

## 故障排查

### MCP Server 连接失败

```
[MCP] ✗ 连接 MCP Server 失败: postgres - Error: Connection refused
```

**解决方案**：
1. 检查 MCP Server 是否正确安装
2. 验证命令和参数是否正确
3. 查看环境变量配置

### 工具调用失败

```
[MCP] MCP 工具调用失败: postgres_query - relation "users" does not exist
```

**解决方案**：
1. 检查工具参数是否正确
2. 验证 MCP Server 的配置
3. 查看 MCP Server 的日志

### 性能问题

如果连接多个 MCP Servers 导致性能问题：

1. **禁用不需要的 Servers**:
   ```json
   {
     "mcp": {
       "servers": {
         "unneeded-server": {
           "enabled": false
         }
       }
     }
   }
   ```

2. **优化 Server 配置**:
   - 减少 Server 数量
   - 使用本地 Server 而非远程

## 最佳实践

### 1. 安全性

- ⚠️ **谨慎授予权限**: 只授予必要的文件系统路径
- 🔒 **保护敏感信息**: 使用环境变量存储 API Keys
- 🚫 **禁用未使用的 Servers**: 减少攻击面

### 2. 性能优化

- ✅ **按需启用**: 只启用需要的 MCP Servers
- ✅ **本地优先**: 优先使用本地 MCP Servers
- ✅ **缓存结果**: 对于重复查询，考虑缓存

### 3. 工具命名

- 📝 **描述性名称**: 使用清晰的工具名称
- 🏷️ **前缀规范**: 使用 serverName 作为前缀避免冲突

## 示例场景

### 场景 1：数据库查询助手

```json
{
  "mcp": {
    "enabled": true,
    "servers": {
      "postgres": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://user:pass@localhost:5432/mydb"]
      }
    }
  }
}
```

**使用**：
```
❯ 查询所有订单状态为 "pending" 的记录
❯ 统计每个用户的订单数量
❯ 查找最近 7 天的销售额
```

### 场景 2：GitHub 代码审查助手

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
          "GITHUB_TOKEN": "your-github-token"
        }
      }
    }
  }
}
```

**使用**：
```
❯ 获取我的所有 open pull requests
❯ 查看 repo 中的 issue 列表
❞ 检查某个 PR 的代码变更
```

### 场景 3：多数据源分析

```json
{
  "mcp": {
    "enabled": true,
    "servers": {
      "postgres": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://..."]
      },
      "filesystem": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/data"]
      },
      "brave-search": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-brave-search"],
        "env": {
          "BRAVE_API_KEY": "your-api-key"
        }
      }
    }
  }
}
```

**使用**：
```
❯ 从数据库读取用户数据，从文件系统读取日志，然后分析异常
❞ 搜索最新的技术文档，然后结合项目代码给出建议
```

## 相关资源

- [MCP 官方文档](https://modelcontextprotocol.io/)
- [MCP SDK GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
- [官方 MCP Servers](https://github.com/modelcontextprotocol/servers)

## 贡献

如果你开发了自定义的 MCP Server 并希望与社区分享，欢迎提交 PR！

## 许可证

MIT License
