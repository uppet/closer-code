# 源码级调试 - 快速指南

## ✅ 已配置

所有构建命令添加 `--sourcemap`，生成 `.map` 文件。

## 🔧 使用步骤

### 1. 构建
```bash
npm run build
```

### 2. VS Code 配置

创建 `.vscode/launch.json`：

```json
{
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/dist/index.js",
  "sourceMaps": true,
  "outFiles": ["${workspaceFolder}/dist/**/*.js"]
}
```

### 3. 调试

- 在 `src/` 源文件中设置断点
- 按 `F5` 启动调试
- 断点自动映射到源代码位置

## 📝 Commit

`7b79a4f` - 为所有构建命令添加 source map 支持
