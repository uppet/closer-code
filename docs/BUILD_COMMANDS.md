# 构建命令快速参考

## 📦 所有构建命令

### 普通构建（开发环境）

```bash
# 构建所有组件
npm run build

# 构建单个组件
npm run build:main      # 主程序
npm run build:cli       # CLI 界面
npm run build:bash      # Bash Runner
npm run build:batch     # Batch CLI
npm run build:sdk       # SDK 组件
```

### 压缩构建（生产环境）

```bash
# 压缩构建所有组件
npm run minify-build

# 压缩构建单个组件
npm run minify-build:main      # 主程序
npm run minify-build:cli       # CLI 界面
npm run minify-build:bash      # Bash Runner
npm run minify-build:batch     # Batch CLI
```

## 🎯 推荐使用场景

| 场景 | 推荐命令 | 原因 |
|------|---------|------|
| 本地开发 | `npm run build` | 代码可读，便于调试 |
| 生产部署 | `npm run minify-build` | 文件更小，传输更快 |
| CI/CD | `npm run minify-build` | 减小分发体积 |
| Docker | `npm run minify-build` | 减小镜像大小 |

## 📊 文件大小对比

| 文件 | 普通构建 | 压缩构建 | 压缩率 |
|------|---------|---------|--------|
| dist/index.js | 656.4 kb | 270.6 kb | **58.8%** ↓ |
| dist/closer-cli.js | ~1.2 mb | 1.0 mb | **16.7%** ↓ |
| dist/batch-cli.js | ~1.2 mb | 1023.3 kb | **14.7%** ↓ |
| dist/bash-runner.js | ~3 kb | 1.6 kb | **46.7%** ↓ |

## 🚀 快速开始

### 开发环境
```bash
# 构建
npm run build

# 启动
npm start
```

### 生产环境
```bash
# 压缩构建
npm run minify-build

# 启动
npm start
```

## 💡 提示

- 压缩构建不影响功能
- 压缩构建时间与普通构建相近
- 调试时建议使用普通构建
- 生产环境推荐使用压缩构建

## 📚 更多信息

详细文档：[MINIFY_BUILD.md](./MINIFY_BUILD.md)
