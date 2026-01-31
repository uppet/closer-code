# 使用外部终端调试

## ✅ 已配置

`.vscode/launch.json` 已更新为使用外部终端。

## 🔧 工作原理

### VS Code 内部
- 启动 Node.js 进程
- 在源代码断点处暂停
- 显示变量、调用栈等

### 外部终端
- 程序的输入输出
- 用户交互界面
- CLI 对话

## 📝 使用步骤

### 1. 打开外部终端

在 VS Code 外部打开一个终端：
- **Windows**: PowerShell、CMD 或 Git Bash
- **Linux/macOS**: Terminal

### 2. 按 F5 启动调试

在 VS Code 中：
1. 按 `F5`
2. 选择调试配置（如 "Launch Main Program"）
3. VS Code 会启动 Node.js 进程
4. **在外部终端中**与程序交互

### 3. 设置断点

在 `src/` 源文件中点击行号设置断点

### 4. 触发功能

**在外部终端中**输入命令：
```bash
# 如果调试 CLI
cloco "帮我分析这个项目"

# 如果调试 Batch
closer-batch "test batch"
```

### 5. 断点命中

程序会在 VS Code 中暂停，你可以：
- 查看变量（鼠标悬停）
- 单步执行（F10/F11）
- 查看调用栈
- 在 Debug Console 中执行代码

## 🎯 优势

### 相比集成终端

**外部终端的优势**：
- ✅ 更好的兼容性（Git Bash、PowerShell）
- ✅ 更大的显示区域
- ✅ 可以同时打开多个终端
- ✅ 支持 ANSI 颜色和格式
- ✅ 习惯的终端环境

**集成终端的限制**：
- ❌ Windows 下兼容性问题
- ❌ 显示区域有限
- ❌ 单一终端窗口
- ❌ ANSI 颜色支持有限

## ⚙️ 可用配置

`.vscode/launch.json` 包含 6 个配置：

1. **Launch Main Program** - 主程序调试
2. **Launch CLI** - CLI 界面调试
3. **Launch Batch** - 批处理调试
4. **Attach to Process** - 附加到进程
5. **Debug Tests** - 测试调试
6. **Debug Setup** - 配置向导调试

所有配置都使用外部终端。

## 💡 提示

### 在外部终端中启动程序

如果不想用 VS Code 调试，也可以直接在外部终端启动：

```bash
# 启动主程序
node dist/index.js

# 启动 CLI
node dist/closer-cli.js

# 启动 Batch
node dist/batch-cli.js
```

然后用 `chrome://inspect` 调试。

## 🎉 总结

- ✅ 配置已更新为外部终端
- ✅ VS Code 负责断点和调试
- ✅ 外部终端负责 I/O
- ✅ 两者配合工作
