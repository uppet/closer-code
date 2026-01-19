# MCP 快速开始指南

## 5 分钟快速上手

### 步骤 1: 安装依赖（已完成）

```bash
npm install @modelcontextprotocol/sdk
```

### 步骤 2: 配置 MCP Server

编辑 `~/.closer-code/config.json`，添加 MCP 配置：

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

### 步骤 3: 启动 Closer Code

```bash
cloco
```

你会看到：

```
[MCP] Initializing MCP Client...
[MCP] ✓ Loaded 3 tools from MCP Servers
[MCP] Available MCP tools:
  - filesystem_read_file [from filesystem]
  - filesystem_write_file [from filesystem]
  - filesystem_list_directory [from filesystem]
```

### 步骤 4: 使用 MCP 工具

```
❯ 读取 /home/user/projects/package.json
❯ 列出 /home/user/projects/src 目录的文件
```

## 常见配置示例

### Git 操作

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

**使用**：
```
❯ 查看当前分支的提交历史
❞ 创建新分支 feature/new-feature
```

### PostgreSQL 数据库

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

**使用**：
```
❯ 查询 users 表中的所有记录
❞ 统计每个用户的订单数量
```

### Brave 搜索

```json
{
  "mcp": {
    "enabled": true,
    "servers": {
      "brave-search": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-brave-search"],
        "env": {
          "BRAVE_API_KEY": "your-brave-api-key"
        }
      }
    }
  }
}
```

**使用**：
```
❯ 搜索最新的 Node.js 性能优化技巧
❞ 查找 MCP 协议的最佳实践
```

### GitHub API

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
❞ 查看 repo 的 issue 列表
```

## 测试配置

运行测试验证配置：

```bash
npm run test:mcp
```

输出示例：

```
=== MCP Client 测试 ===

📋 配置的 MCP Servers:
  ✅ 启用 filesystem
     命令: npx
     参数: -y @modelcontextprotocol/server-filesystem /home/user/projects

🔗 正在连接到 MCP Servers...

✓ 已连接到 MCP Server: filesystem (3 个工具)
[MCP] MCP Servers 连接完成: 1 个服务器成功连接

📊 连接状态:
  已连接服务器: filesystem
  总工具数: 3

🛠️  可用的 MCP 工具 (3 个):

  • filesystem_read_file
    来源: filesystem
    描述: Read the contents of a file

  • filesystem_write_file
    来源: filesystem
    描述: Write content to a file

  • filesystem_list_directory
    来源: filesystem
    描述: List files in a directory
```

## 故障排查

### 问题: MCP Server 连接失败

**错误信息**：
```
[MCP] ✗ 连接 MCP Server 失败: filesystem - Error: Command failed: npx
```

**解决方案**：
1. 确保已安装 Node.js 和 npm
2. 检查网络连接（首次运行需要下载包）
3. 尝试手动运行命令测试：
   ```bash
   npx -y @modelcontextprotocol/server-filesystem /path
   ```

### 问题: 工具调用失败

**错误信息**：
```
[MCP] MCP 工具调用失败: filesystem_read_file - Permission denied
```

**解决方案**：
1. 检查文件路径权限
2. 确保配置的路径正确
3. 使用绝对路径而非相对路径

### 问题: 找不到工具

**错误信息**：
```
Tool filesystem_read_file not found
```

**解决方案**：
1. 检查 MCP Server 是否成功连接
2. 查看启动时的工具列表
3. 运行 `npm run test:mcp` 诊断

## 最佳实践

### 1. 路径配置

使用绝对路径：
```json
{
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/projects"]
}
```

而非相对路径：
```json
{
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "./projects"]  // ❌ 不推荐
}
```

### 2. 环境变量

敏感信息使用环境变量：
```json
{
  "env": {
    "DATABASE_URL": "postgresql://user:pass@localhost/db"
  }
}
```

或在 shell 中导出：
```bash
export DATABASE_URL="postgresql://user:pass@localhost/db"
```

### 3. 按需启用

只启用需要的 Servers：
```json
{
  "mcp": {
    "servers": {
      "postgres": {
        "enabled": false  // 暂时禁用
      }
    }
  }
}
```

## 下一步

- 📖 阅读完整文档：[MCP 集成指南](./MCP_INTEGRATION.md)
- 🛠️ 开发自定义 MCP Server
- 🤝 分享你的 MCP Servers

## 获取帮助

- 📚 [MCP 官方文档](https://modelcontextprotocol.io/)
- 💬 [GitHub Issues](https://github.com/modelcontextprotocol/typescript-sdk/issues)
- 📖 [示例配置](../config.mcp.example.json)
