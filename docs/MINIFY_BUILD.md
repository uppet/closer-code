# 压缩构建 (Minify Build)

## 📦 概述

`npm run minify-build` 是一个用于生产环境的压缩构建选项，它可以显著减小打包后的文件大小。

## 🚀 使用方法

### 压缩所有组件
```bash
npm run minify-build
```

### 压缩单个组件
```bash
# 只压缩主程序
npm run minify-build:main

# 只压缩 CLI
npm run minify-build:cli

# 只压缩 Bash Runner
npm run minify-build:bash

# 只压缩 Batch CLI
npm run minify-build:batch
```

## 📊 文件大小对比

### 主程序 (dist/index.js)

| 构建类型 | 文件大小 | 压缩率 |
|---------|---------|--------|
| 普通构建 | 656.4 kb | - |
| 压缩构建 | 270.6 kb | **58.8%** |

**节省空间**：385.8 kb (约 59%)

### CLI (dist/closer-cli.js)

| 构建类型 | 文件大小 | 压缩率 |
|---------|---------|--------|
| 普通构建 | ~1.2 mb | - |
| 压缩构建 | 1.0 mb | **~16.7%** |

### Batch CLI (dist/batch-cli.js)

| 构建类型 | 文件大小 | 压缩率 |
|---------|---------|--------|
| 普通构建 | ~1.2 mb | - |
| 压缩构建 | 1023.3 kb | **~14.7%** |

### Bash Runner (dist/bash-runner.js)

| 构建类型 | 文件大小 | 压缩率 |
|---------|---------|--------|
| 普通构建 | ~3 kb | - |
| 压缩构建 | 1.6 kb | **~46.7%** |

## 🎯 何时使用压缩构建

### 推荐使用场景
- ✅ **生产部署**：减小分发体积
- ✅ **CI/CD**：加快传输速度
- ✅ **Docker 镜像**：减小镜像大小
- ✅ **云函数**：减少冷启动时间

### 不推荐使用场景
- ❌ **开发调试**：代码不可读
- ❌ **错误排查**：堆栈信息不清晰
- ❌ **本地测试**：构建时间稍长

## 🔍 压缩技术

esbuild 的 `--minify` 选项包含以下优化：

1. **空白压缩**：移除不必要的空格、换行
2. **标识符缩短**：将变量名缩短为单字符
3. **语法优化**：简化代码结构
4. **死代码消除**：移除未使用的代码

## 📝 构建脚本对比

### 普通构建
```json
{
  "build": "npm run build:main && npm run build:cli && npm run build:bash && npm run build:batch"
}
```

### 压缩构建
```json
{
  "minify-build": "npm run minify-build:main && npm run minify-build:cli && npm run minify-build:bash && npm run minify-build:batch"
}
```

## ⚙️ 可用的构建命令

| 命令 | 说明 | 是否压缩 |
|------|------|---------|
| `npm run build` | 构建所有组件 | ❌ |
| `npm run build:main` | 构建主程序 | ❌ |
| `npm run build:cli` | 构建 CLI | ❌ |
| `npm run build:bash` | 构建 Bash Runner | ❌ |
| `npm run build:batch` | 构建 Batch CLI | ❌ |
| `npm run minify-build` | **压缩构建所有组件** | ✅ |
| `npm run minify-build:main` | **压缩构建主程序** | ✅ |
| `npm run minify-build:cli` | **压缩构建 CLI** | ✅ |
| `npm run minify-build:bash` | **压缩构建 Bash Runner** | ✅ |
| `npm run minify-build:batch` | **压缩构建 Batch CLI** | ✅ |

## 💡 使用建议

### 开发环境
```bash
# 使用普通构建，便于调试
npm run build
npm start
```

### 生产环境
```bash
# 使用压缩构建，减小体积
npm run minify-build
npm start
```

### CI/CD 流程
```yaml
# .github/workflows/deploy.yml
- name: Build and Minify
  run: npm run minify-build

- name: Deploy
  run: # 部署命令
```

## 🚨 注意事项

1. **代码可读性**
   - 压缩后的代码不可读
   - 调试时建议使用普通构建

2. **Source Maps**
   - 当前未启用 source maps
   - 如需调试，可以使用普通构建

3. **构建时间**
   - 压缩构建时间稍长（通常 < 2 秒）
   - 但运行时性能不受影响

4. **兼容性**
   - 压缩不影响功能
   - 所有功能与普通构建完全相同

## 📈 性能影响

### 构建时间
- 普通构建：~450ms
- 压缩构建：~450ms（几乎相同）

### 运行时性能
- **无影响**：Node.js 会解析压缩代码
- **启动速度**：可能稍快（文件更小）

### 内存占用
- **无影响**：运行时内存占用相同

## 🎉 总结

`npm run minify-build` 提供了一个快速、简单的方式来减小生产环境的文件大小：

- ✅ **显著减小文件大小**：平均减少 30-60%
- ✅ **保持功能完整**：所有功能正常工作
- ✅ **构建快速**：与普通构建时间相近
- ✅ **易于使用**：一条命令完成所有压缩

**推荐在生产环境中使用压缩构建！** 🚀
