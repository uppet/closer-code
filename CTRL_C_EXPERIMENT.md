# Ctrl+C 双击退出功能实现

## 问题描述
在 Ink (React CLI) 应用中实现标准的 Ctrl+C 双击退出行为：
- 第一次 Ctrl+C：显示退出提示（1.5秒后消失）
- 1.5秒内第二次 Ctrl+C：退出程序
- 超时后重置计时器

## 解决方案

### 核心实现

使用 `ink` 的 `useInput` hook 配合 `{ capture: true }` 选项来捕获 Ctrl+C：

```jsx
import { useInput } from 'ink';

function App() {
  const [lastCtrlC, setLastCtrlC] = useState(0);
  const [showExitHint, setShowExitHint] = useState(false);

  useInput((input, key) => {
    if ((key.ctrl && input === 'c') || key.escape) {
      const now = Date.now();

      if (now - lastCtrlC < 1500) {
        // 1.5秒内第二次按下 - 退出
        console.log('\n👋 再见！\n');
        process.exit(0);
      } else {
        // 第一次按下 - 显示提示
        setShowExitHint(true);
        setLastCtrlC(now);
        setTimeout(() => setShowExitHint(false), 1500);
      }
      return;
    }
  }, { capture: true }); // 关键：capture: true 确保捕获 Ctrl+C

  // UI 显示提示
  return (
    <>
      {showExitHint && (
        <Box borderStyle="round" borderColor="red" paddingX={1}>
          <Text bold color="red">⚠️ 再次按 Ctrl+C 或 ESC 退出程序 (1.5秒内)</Text>
        </Box>
      )}
    </>
  );
}

// 启动应用时禁用默认的 Ctrl+C 处理
render(<App />, { exitOnCtrlC: false });
```

### 关键要点

1. **`{ capture: true }`**：这是关键配置，确保 `useInput` 能捕获 Ctrl+C 而不是传递给终端

2. **`exitOnCtrlC: false`**：在 `render()` 调用时禁用 Ink 的默认 Ctrl+C 处理

3. **不使用 SIGINT 处理器**：如果在代码中设置 `process.on('SIGINT', ...)` 会导致第一次 Ctrl+C 就触发退出，破坏双击逻辑

4. **时间窗口**：使用 `Date.now()` 记录上次按键时间，1.5秒内的第二次按键才触发退出

### 测试文件

完整的测试实现见 `test-ctrl-c.jsx`，运行方式：
```bash
node test-ctrl-c.jsx
```

## 实际应用

该方案已成功应用于 `src/closer-cli.jsx`，支持：
- 空闲状态下的双击退出
- AI 执行过程中的单次中止（第一次 Ctrl+C 中止任务，不退出程序）
- ESC 键与 Ctrl+C 相同的行为

## 经验总结

**失败的尝试：**
- ❌ 使用 `process.on('SIGINT', ...)` - 会导致立即退出
- ❌ 使用 `process.once('SIGINT', ...)` - 同样会立即退出
- ❌ 在 SIGINT 中设置 `event.preventDefault()` - 无效

**正确的做法：**
- ✅ 使用 `useInput` + `{ capture: true }`
- ✅ 在 render 时设置 `exitOnCtrlC: false`
- ✅ 不设置任何 SIGINT 处理器
