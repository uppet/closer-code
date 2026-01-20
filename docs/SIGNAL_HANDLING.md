# 信号处理快捷键参考

## ⌨️ Cloco 支持的快捷键

### 程序控制

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| `Ctrl+C` | 中止任务/退出 | 第一次按中止任务，1.5秒内再按退出 |
| `Ctrl+Z` | 挂起程序 | 挂起程序，可用 `fg` 恢复 |
| `ESC` | 退出程序 | 同 Ctrl+C |

### 编辑控制

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| `Ctrl+D` | 退出输入 | 结束当前输入（如果输入为空） |
| `Tab` | 切换 Thinking | 开关 AI Thinking 显示 |

### 导航控制

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| `↑/↓` | 历史记录/滚动 | 输入为空时滚动，否则浏览历史 |
| `PageUp/PageDown` | 滚动对话 | 快速滚动对话区域 |
| `Alt+↑/↓` | 滚动对话 | 精确滚动对话区域 |
| `Shift+↑/↓` | 滚动 Thinking | 滚动 AI Thinking 区域 |

## 📋 信号处理详解

### SIGINT (Ctrl+C)
```javascript
// 处理逻辑：
if (isProcessing) {
  // 中止当前任务
  abortCurrentPhase();
} else {
  if (两次按键间隔 < 1.5秒) {
    // 退出程序
    process.exit(0);
  } else {
    // 显示提示
    showExitHint();
  }
}
```

### SIGTSTP (Ctrl+Z)
```javascript
// 处理逻辑：
console.log('⏸️  程序已挂起');
process.kill(process.pid, 'SIGTSTP');
// 程序暂停，等待 SIGCONT 信号恢复
```

### SIGCONT (fg 命令)
```javascript
// 程序恢复后自动继续执行
// 所有状态都会保留
```

## 🎯 使用示例

### 场景 1：中止 AI 任务
```
用户: 请帮我分析整个项目...
AI: [开始分析...]
用户: [按 Ctrl+C]
系统: ⚠️ 正在中止任务...
      ❌ 任务已中止
```

### 场景 2：挂起程序
```
用户: [使用 Cloco 中...]
用户: [按 Ctrl+Z]
系统: ⏸️  程序已挂起 (按 fg 命令恢复)

[1]+  Stopped  npm start

$ fg
[程序恢复，所有状态保留]
```

### 场景 3：退出程序
```
用户: [按 Ctrl+C]
系统: ⚠️ 再次按 Ctrl+C 或 ESC 退出程序 (1.5秒内)

用户: [再按 Ctrl+C]
系统: 👋 再见！
```

## 🔧 技术实现

### useInput 配置
```javascript
useInput((input, key) => {
  // 处理所有快捷键
}, { capture: true }); // 捕获所有键盘输入
```

### 信号处理
```javascript
// Ctrl+Z - 手动发送 SIGTSTP
process.kill(process.pid, 'SIGTSTP');

// Ctrl+C - 处理在 useInput 中
// ESC - 处理在 useInput 中
```

## ⚠️ 注意事项

### Ctrl+C vs Ctrl+Z

| 特性 | Ctrl+C | Ctrl+Z |
|------|--------|--------|
| 功能 | 中止/退出 | 挂起 |
| 可恢复 | ❌ | ✅ |
| 状态保留 | ❌ | ✅ |
| AI 任务 | 中止 | 可能中断 |

### 最佳实践

1. **使用 Ctrl+Z 当**：
   - ✅ 需要临时切换到其他任务
   - ✅ 想要保留当前状态
   - ✅ 计划稍后继续

2. **使用 Ctrl+C 当**：
   - ✅ 想要中止当前 AI 任务
   - ✅ 想要完全退出程序
   - ✅ 不需要保留状态

3. **避免**：
   - ❌ 在 AI 处理时按 Ctrl+Z（可能导致超时）
   - ❌ 长时间挂起程序（网络可能超时）

## 📚 相关文档

- **`CTRL_Z_SUPPORT.md`** - Ctrl+Z 详细说明
- **`CTRL_Z_CHANGELOG.md`** - Ctrl+Z 实现文档
- **`test-ctrl-z.js`** - Ctrl+Z 测试脚本

## 🧪 测试

### 测试 Ctrl+Z
```bash
node test-ctrl-z.js
# 按 Ctrl+Z 挂起
# 输入 fg 恢复
# 按 Ctrl+C 退出
```

### 测试完整功能
```bash
npm start
# 测试所有快捷键
```

## 🎉 总结

Cloco 现在支持完整的 Linux 信号处理：

- ✅ Ctrl+C - 中止/退出
- ✅ Ctrl+Z - 挂起/恢复
- ✅ ESC - 退出
- ✅ 所有状态保留
- ✅ 符合 Linux 惯例

**提供了更好的用户体验！** 🚀
