# 源码级调试配置指南

## 🎯 目标

在源代码层级设置断点调试，而不是在编译后的打包文件中调试。

## ✅ 已完成的配置

已在 `package.json` 的所有构建命令中添加 `--sourcemap` 参数：

```json
{
  "build:main": "... --sourcemap ...",
  "build:cli": "... --sourcemap ...",
  "build:bash": "... --sourcemap",
  "build:batch": "... --sourcemap ..."
}
```

## 📦 构建结果

现在构建会生成 source map 文件：

```bash
npm run build
```

生成的文件：
```
dist/
├── index.js              # 主程序
├── index.js.map          # ✅ Source map
├── closer-cli.js         # CLI 程序
├── closer-cli.js.map     # ✅ Source map
├── bash-runner.js        # Bash 运行器
├── bash-runner.js.map    # ✅ Source map
├── batch-cli.js          # 批处理程序
└── batch-cli.js.map     # ✅ Source map
```

## 🔧 VS Code 调试配置

### 1. 创建 launch.json

在 `.vscode/launch.json` 中添加：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Main Program",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/dist/index.js",
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Launch CLI",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/dist/closer-cli.js",
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "args": []
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Batch",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/dist/batch-cli.js",
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "sourceMaps": true,
      "outFiles": ["workspaceFolder}/dist/**/*.js"],
      "args": ["test", "batch"]
    }
  ]
}
```

### 2. 关键配置项说明

- **`sourceMaps: true`**: 启用 source map 支持
- **`outFiles`**: 告诉 VS Code 映射到哪些编译后的文件
- **`skipFiles`**: 跳过 Node.js 内部文件

## 🎯 调试步骤

### 1. 构建项目

```bash
npm run build
```

### 2. 在源代码中设置断点

在 `src/` 目录下的任何文件中点击行号左侧设置断点：

```
src/conversation/core.js:    // 在这里设置断点
src/tools.js:               // 在这里设置断点
src/ai-client-legacy.js:   // 在这里设置断点
```

### 3. 启动调试

按 `F5` 或点击 "Run and Debug"，选择配置：

- **Launch Main Program** - 调试主程序
- **Launch CLI** - 调试 CLI 界面
- **Launch Batch** - 调试批处理程序

### 4. 开始调试

程序会在断点处暂停，你可以：
- 查看变量值
- 单步执行（F10/F11）
- 查看调用栈
- 在 Debug Console 中执行代码

## 📊 Source Map 工作原理

```
源代码（src/index.js）
    ↓ 设置断点
    ↓ 编译
打包文件（dist/index.js） + Source Map（dist/index.js.map）
    ↓ 运行
    ↓ VS Code 读取 Source Map
映射回源代码断点位置 ✅
```

## ⚙️ 其他调试器配置

### Chrome DevTools

如果使用 Chrome DevTools 调试：

1. 运行程序：
```bash
node --inspect-brk dist/index.js
```

2. 打开 Chrome DevTools：
   - 访问 `chrome://inspect`
   - 点击 "inspect" 按钮

3. 在 Sources 面板中：
   - 打开 `src/` 目录
   - 在源文件中设置断点

### WebStorm / IntelliJ IDEA

1. 打开 Run/Debug Configurations
2. 添加 Node.js 配置
3. 设置：
   - Node parameters: `--inspect`
   - JavaScript file: `dist/index.js`
   - Working directory: 项目根目录
4. 勾选 "Source Maps"
   - 设置 "Path mappings": `dist/index.js.map` → `src/index.js`

## 🎯 调试技巧

### 1. 条件断点

在源代码中添加：
```javascript
// 设置条件断点
debugger;  // 程序会在这里暂停
```

### 2. 日志调试

```javascript
console.log('变量值:', variable);
console.error('错误信息:', error);
console.trace('调用栈:');
```

### 3. 只调试特定模块

在 `.vscode/launch.json` 中使用 `runtimeArgs`：

```json
{
  "runtimeArgs": ["--inspect-brk"],
  "args": ["test", "batch"]
}
```

## ✅ 验证 Source Map

构建后检查：

```bash
ls -la dist/*.map
```

应该看到：
- `index.js.map`
- `closer-cli.js.map`
- `bash-runner.js.map`
- `batch-cli.js.map`

## 🎉 总结

现在你可以：
- ✅ 在源代码中设置断点
- ✅ 在 VS Code 中调试
- ✅ 查看原始变量名
- ✅ 单步执行源代码
- ✅ 查看完整的调用栈

不再需要在打包文件中调试了！
