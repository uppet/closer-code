# 源码级调试配置 - 简要说明

## ✅ 已配置

所有构建命令已添加 `--sourcemap` 参数，生成 `.map` 文件。

## 🔧 使用方法

### 1. 构建项目
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

1. 在 `src/` 目录源文件中设置断点
2. 按 `F5` 启动调试
3. 断点会映射到源代码位置

## 🎯 效果

- ✅ 在源代码层级设置断点
- ✅ 查看原始变量名
- ✅ 单步执行源代码
- ✅ 完整调用栈

不再需要在编译后的文件中调试！
