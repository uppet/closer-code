# Closer Code 功能增强实现计划

## 任务概述
1. 在系统提示词中引用 cloco.md 作为行为参考
2. 调整 UI 布局：Latest Logs 区域减小一半，新增 Thinking 区域
3. 实现 ESC/Ctrl+C 退出机制：一次退出 AI，两次（1秒内）退出程序

## 实现步骤

### 第一步：读取并集成 cloco.md 到系统提示词
- 修改 `src/conversation.js` 的 `buildSystemPrompt()` 方法
- 在初始化时读取 cloco.md 文件内容
- 将内容添加到系统提示词中，标记为"非常重要"

### 第二步：UI 布局调整
修改 `src/closer-cli.jsx`：
- 将 Latest Logs 区域从 35% 减小到 17.5%
- 新增 Thinking 区域，占 17.5%
- Thinking 区域用于显示 AI 的思考过程

### 第三步：实现双击 Ctrl+C 退出机制
- 添加 Ctrl+C 按键监听
- 记录最后一次按键时间
- 如果 AI 正在执行，第一次 Ctrl+C 中止 AI
- 如果无任务执行，第一次 Ctrl+C 显示提示，1秒内再次按下则退出程序

### 第四步：编译测试
- 使用 npm run build 编译项目
- 创建测试脚本验证功能

## 技术细节

### cloco.md 集成
```javascript
// 在 conversation.js 中
const fs = await import('fs/promises');
const path = await import('path');
const clocoPath = path.join(process.cwd(), 'cloco.md');
const clocoContent = await fs.readFile(clocoPath, 'utf-8');
```

### UI 布局调整
```jsx
{/* Latest Logs - 17.5% */}
<Box flexGrow={17.5} marginBottom={1}>
  <Text bold>📋 Latest Logs</Text>
  {/* 日志内容 */}
</Box>

{/* Thinking - 17.5% */}
<Box flexGrow={17.5} marginBottom={1}>
  <Text bold>🧠 Thinking</Text>
  {/* 思考过程 */}
</Box>

{/* Conversation - 65% */}
<Box flexGrow={65}>
  {/* 对话内容 */}
</Box>
```

### Ctrl+C 处理
```javascript
let lastCtrlC = 0;
let ctrlCPending = false;

useInput((input, key) => {
  if (key.ctrl && input === 'c') {
    const now = Date.now();
    
    if (isProcessing) {
      // 中止 AI
      abortAI();
    } else if (now - lastCtrlC < 1000) {
      // 1秒内再次按下，退出
      process.exit(0);
    } else {
      // 第一次按下，显示提示
      setShowExitHint(true);
      lastCtrlC = now;
      setTimeout(() => setShowExitHint(false), 1000);
    }
  }
});
```

## 验证计划
1. 编译项目：`npm run build`
2. 运行程序：`npm start`
3. 测试 Ctrl+C 机制
4. 验证 UI 布局
5. 检查 cloco.md 是否被正确引用
