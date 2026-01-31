# Chrome DevTools 调试指南 - 无需 VS Code

## ✅ 可以使用 chrome://inspect

Chrome DevTools 完全支持源码级调试，不需要 VS Code。

## 🔧 使用步骤

### 1. 构建项目（带 source map）

```bash
npm run build
```

确保生成 `.map` 文件：
```bash
ls -la dist/*.map
```

### 2. 启动 Node.js 调试模式

```bash
# 方式 1: 从一开始就启动调试
node --inspect-brk dist/index.js

# 方式 2: 先启动，再附加调试器
node dist/index.js
# 然后在另一个终端：
node --inspect <pid>
```

### 3. 打开 Chrome DevTools

在 Chrome 浏览器地址栏输入：
```
chrome://inspect
```

### 4. 点击 "Configure" 按钮

如果看不到你的进程：
- 点击 "Configure" 按钮
- 确保 "Discover network targets" 已启用
- 添加 `localhost:9229` 作为目标
- 点击 "Done"

### 5. 点击 "inspect" 链接

在 "Remote Target" 列表中找到你的进程，点击 "inspect"

### 6. 打开 Sources 面板

- 点击顶部的 "Sources" 标签
- 在左侧文件树中展开：
  ```
  📁 webpack://
    📁 src/
      📁 conversation/
      📁 tools/
      📁 ...
  ```

### 7. 设置断点

在源文件中点击行号设置断点：
```
src/conversation/core.js:120  ← 点击这里
src/tools.js:345            ← 点击这里
```

## 🎯 Chrome DevTools 优势

### 相比 VS Code 的优势

1. **无需配置文件** - 不需要 `.vscode/launch.json`
2. **更好的 UI** - Chrome DevTools 调试界面强大
3. **性能分析** - 自带 Profiler 和 Memory 工具
4. **网络调试** - 如果有 HTTP 请求可以同时调试
5. **跨平台** - 任何有 Chrome 的系统都能用

### 调试功能

- ✅ 断点调试
- ✅ 单步执行（F10/F11）
- ✅ 查看变量
- ✅ 调用栈
- ✅ Console 执行代码
- ✅ 性能分析
- ✅ 内存快照
- ✅ 网络监控

## 📝 实际调试示例

### 调试主程序

```bash
# 终端 1：启动调试
node --inspect-brk dist/index.js

# 终端 2：查看 PID
ps aux | grep "node dist/index.js"
# 输出：joyer 12345 ... node dist/index.js

# 终端 2：附加调试器（可选）
node --inspect 12345
```

然后：
1. 打开 `chrome://inspect`
2. 点击 "inspect"
3. 在 Sources 面板找到 `src/` 目录
4. 设置断点
5. 触发功能

### 调试 CLI 程序

```bash
node --inspect-brk dist/closer-cli.js
```

然后：
1. 打开 `chrome://inspect`
2. 点击 "inspect"
3. 在 `src/` 源文件中设置断点
4. 在 DevTools Console 中输入命令触发功能

## 🔍 Source Map 支持

Chrome DevTools 会自动读取 `.map` 文件：

```
dist/index.js + dist/index.js.map
    ↓ Chrome 读取 map
    ↓ 映射到源代码
src/index.js  ← 在这里设置断点
```

## ⚙️ 高级配置

### 修改调试端口

默认端口是 9229，如果冲突可以修改：

```bash
node --inspect=0.0.0.0:9229 dist/index.js
```

### 允许外部访问

```bash
node --inspect=0.0.0.0:9229 --inspect-publish-url=0.0.0.0 dist/index.js
```

### 只监听本地

```bash
node --inspect=127.0.0.1:9229 dist/index.js
```

## 🎯 快速调试流程

```bash
# 1. 构建
npm run build

# 2. 启动调试
node --inspect-brk dist/index.js
# 等待输出：Debugger listening on ws://127.0.0.1:9229/...

# 3. 打开 Chrome
chrome://inspect

# 4. 点击 "inspect" 按钮

# 5. 在 Sources 面板
# 展开 webpack:// → src/
# 在源文件中设置断点

# 6. 触发功能
# 在 DevTools Console 或程序中触发
```

## 💡 调试技巧

### 1. 条件断点

在源代码中：
```javascript
debugger;  // 程序会在这里暂停
```

### 2. Console 调试

在 DevTools Console 中：
```javascript
// 查看变量
variableName

// 执行函数
someFunction()

// 修改值
global.config.behavior.autoPlan = false
```

### 3. 监控表达式

在断点处右键 → "Add watch"：
```
variableName
config.ai.provider
messages.length
```

## 🎉 总结

**完全不需要 VS Code**！

- ✅ 使用 `chrome://inspect`
- ✅ Source map 自动工作
- ✅ 在源代码中设置断点
- ✅ 强大的调试工具
- ✅ 性能分析
- ✅ 无需配置文件

**Commit**: 7b79a4f
