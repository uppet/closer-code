# Ctrl+Z 挂起功能说明

## 📋 概述

Cloco 现在支持使用 **Ctrl+Z** 挂起程序，就像其他 Linux 程序一样。

## 🔍 问题原因

之前无法使用 Ctrl+Z 挂起程序的原因：

```javascript
useInput((input, key) => {
  // ...
}, { capture: true }); // ❌ 拦截所有键盘输入，包括 Ctrl+Z
```

`capture: true` 会捕获所有键盘事件，包括控制字符，导致操作系统无法接收到 SIGTSTP 信号。

## ✅ 解决方案

在 `useInput` 中添加 Ctrl+Z 检测，并手动发送 SIGTSTP 信号：

```javascript
useInput((input, key) => {
  // 处理 Ctrl+Z - 挂起程序
  if (key.ctrl && input === 'z') {
    console.log('\n⏸️  程序已挂起 (按 fg 命令恢复)\n');
    process.kill(process.pid, 'SIGTSTP');
    return;
  }
  // ...
}, { capture: true });
```

## 🎯 使用方法

### 挂起程序
```
按 Ctrl+Z
```

程序会显示：
```
⏸️  程序已挂起 (按 fg 命令恢复)

[1]+  Stopped  npm start
```

### 恢复程序

在终端中输入：
```bash
fg
```

程序会恢复运行，所有状态（对话历史、消息等）都会保留。

## 📚 相关命令

| 命令 | 说明 |
|------|------|
| `Ctrl+Z` | 挂起前台程序 |
| `fg` | 恢复最近挂起的程序 |
| `bg` | 在后台运行挂起的程序 |
| `jobs` | 查看所有挂起的任务 |
| `kill %1` | 终止任务编号为 1 的挂起任务 |

## 💡 使用场景

### 场景 1：临时切换到其他任务
```bash
# 1. 运行 Cloco
npm start

# 2. 使用中需要暂时离开
按 Ctrl+Z

# 3. 在终端做其他事情
ls -la
git status

# 4. 恢复 Cloco
fg
```

### 场景 2：运行多个任务
```bash
# 终端 1：运行 Cloco
npm start
# 按 Ctrl+Z 挂起

# 终端 2：运行测试
npm test

# 回到终端 1，恢复 Cloco
fg
```

### 场景 3：检查系统状态
```bash
# Cloco 运行中
按 Ctrl+Z

# 检查系统资源
top
htop

# 恢复 Cloco
fg
```

## ⚙️ 技术细节

### SIGTSTP 信号
- **信号名称**：SIGTSTP (Signal Terminal Stop)
- **信号编号**：20 (Linux), 18 (macOS)
- **默认行为**：挂起进程
- **可捕获**：是

### 进程状态
- **运行中 (Running)**：程序正在执行
- **已停止 (Stopped)**：程序被挂起
- **后台运行 (Background)**：程序在后台执行

## 🚨 注意事项

1. **状态保留**
   - ✅ 对话历史保留
   - ✅ 消息保留
   - ✅ 状态保留
   - ✅ 可以无缝恢复

2. **网络连接**
   - ⚠️ 长时间挂起可能导致网络超时
   - ⚠️ AI 响应可能会中断
   - 💡 建议不要在 AI 处理时挂起

3. **定时器**
   - ⚠️ setTimeout/setInterval 可能会受影响
   - 💡 恢复后定时器会继续

4. **限制**
   - ❌ 不能在 Windows 上使用（Windows 不支持 SIGTSTP）
   - ✅ Linux/macOS 完全支持

## 🧪 测试

### 基本测试
```bash
# 1. 启动程序
npm start

# 2. 按 Ctrl+Z
# 应该看到：⏸️  程序已挂起 (按 fg 命令恢复)

# 3. 输入 fg
# 程序应该恢复，所有状态保留
```

### AI 处理中测试
```bash
# 1. 发送一个长任务
> 请帮我分析整个项目

# 2. 在处理中按 Ctrl+Z
# ⚠️ 可能会导致 AI 响应中断

# 3. 恢复后可能需要重新发送
```

## 📊 与其他快捷键对比

| 快捷键 | 功能 | 可恢复 |
|--------|------|--------|
| `Ctrl+C` | 中止任务/退出 | ❌ |
| `Ctrl+Z` | 挂起程序 | ✅ |
| `Ctrl+D` | 退出输入 | ❌ |
| `ESC` | 退出程序 | ❌ |

## 🎉 总结

添加 Ctrl+Z 支持后，Cloco 的行为更符合 Linux 程序的惯例：

- ✅ 可以像其他程序一样挂起和恢复
- ✅ 所有状态都会保留
- ✅ 用户体验更流畅
- ✅ 支持多任务切换

**现在可以在 Linux/macOS 上正常使用 Ctrl+Z 挂起 Cloco 了！** 🚀
