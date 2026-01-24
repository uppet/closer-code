# 快速测试指南：/keys 命令

## 🎯 测试目标

验证新添加的 `/keys` 命令功能是否正常工作。

## 📋 测试步骤

### 1. 启动 Cloco

```bash
# 方式 1: 使用构建后的版本
npm run build:cli
node dist/closer-cli.js

# 方式 2: 使用 npm start
npm start

# 方式 3: 如果已安装到全局
cloco
```

### 2. 测试 /keys 命令

启动后，在输入框中输入：
```
/keys
```

按 `Enter` 发送。

### 3. 验证输出

你应该看到类似以下的输出：

```
快捷键参考：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖥️  模式切换
  Ctrl+G    切换全屏模式
  Ctrl+T    切换工具详情/工具显示
  Tab       开关 Thinking 显示

📝 输入控制
  Enter     发送消息
  Ctrl+Enter 多行模式下换行
  Ctrl+O    切换多行输入模式

🔄 滚动控制
  Alt+↑/↓   精确滚动一行
  PageUp/Down 快速滚动
  Shift+↑/↓ 滚动 Thinking 或切换工具

⚡ 任务控制
  Ctrl+C    单击中止任务 / 双击退出
  Ctrl+Z    挂起程序（Linux/Mac）

❓ 帮助
  /help     显示所有命令
  /keys     显示本快捷键参考
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4. 测试 /help 命令

输入：
```
/help
```

验证 `/keys` 命令是否出现在帮助列表中：

```
Available commands:
/clear - Clear conversation history
/export <filename> - Export conversation to a text file
/plan <task> - Create and execute a task plan
/learn - Learn project patterns
/status - Show conversation summary
/history - Show input history statistics
/keys - Show keyboard shortcuts reference  ← 应该有这一行
/help - Show this help message
```

### 5. 测试快捷键（可选）

尝试使用一些快捷键，验证它们是否与 `/keys` 中描述的一致：

- 按 `Ctrl+G` - 应该切换全屏模式
- 按 `Tab` - 应该切换 Thinking 显示
- 按 `Ctrl+T` - 应该切换工具详情面板

## ✅ 验证标准

- [ ] `/keys` 命令能正常显示快捷键参考
- [ ] 快捷键参考格式清晰，易于阅读
- [ ] 所有快捷键都正确显示
- [ ] `/help` 命令中包含 `/keys` 的说明
- [ ] 快捷键功能与描述一致

## 🐛 问题反馈

如果遇到任何问题，请记录：

1. **问题现象**: 描述具体的问题
2. **复现步骤**: 如何触发问题
3. **预期行为**: 应该发生什么
4. **实际行为**: 实际发生了什么
5. **环境信息**:
   - 操作系统：
   - Node.js 版本：
   - Closer Code 版本：1.0.1

## 📝 测试记录

| 测试项 | 结果 | 备注 |
|--------|------|------|
| /keys 命令显示 | ⬜ 通过 / ❌ 失败 |  |
| /help 包含 /keys | ⬜ 通过 / ❌ 失败 |  |
| 快捷键格式正确 | ⬜ 通过 / ❌ 失败 |  |
| 快捷键功能验证 | ⬜ 通过 / ❌ 失败 |  |

---

**测试日期**: ___________
**测试人员**: ___________
**测试结果**: ___________
