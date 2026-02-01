# 🎭 Dispatch Agent 生动演示 - 快速入门

## 🚀 一分钟体验

运行演示脚本，快速了解 Dispatch Agent 的强大功能：

```bash
node demo-dispatch-agent.js
```

## 📋 演示内容

演示包含 8 个场景，全面展示 Dispatch Agent 系统的功能：

### 🔍 场景 1: 基础搜索
- 搜索配置文件
- 展示基本的文件查找能力
- 性能指标：搜索耗时

### 🧠 场景 2: 代码搜索
- 搜索代码中的关键词
- 展示代码内容搜索能力
- 显示匹配结果预览

### 📊 场景 3: Agent Pool 状态
- 查看并发池状态
- 监控执行统计
- 成功率和性能指标

### ⚡ 场景 4: 工具白名单
- 展示安全控制机制
- 列出允许和禁止的工具
- 验证安全性

### ⏱️ 场景 5: 智能缓存
- 缓存命中/未命中测试
- 性能提升对比
- 缓存统计信息

### 📁 场景 6: 目录探索
- 展示目录结构分析
- 文件和目录分类
- 大小信息显示

### 📈 场景 7: 性能对比
- Agent vs 直接搜索
- 性能分析
- 使用场景建议

### 🔥 场景 8: 高级特性
- 持久化存储
- 插件系统
- 错误恢复机制

## 🎯 演示亮点

### 🎨 彩色输出
- 使用丰富的颜色和表情符号
- 清晰的视觉层次
- 易于理解的结果展示

### 📊 实时统计
- 执行时间
- 成功率
- 缓存命中率
- 性能对比

### 🔒 安全演示
- 工具白名单验证
- 权限控制展示
- 安全机制说明

## 🎓 学习路径

### 1️⃣ 快速体验（5 分钟）
```bash
node demo-dispatch-agent.js
```

### 2️⃣ 深入了解（15 分钟）
```bash
# 查看系统指南
cat AGENT_SYSTEM_GUIDE.md

# 查看测试指南
cat AGENT_TESTING_GUIDE.md
```

### 3️⃣ 实践测试（30 分钟）
```bash
# 运行基础测试
node test-agent-executor.js

# 运行并发测试
node test-agent-pool.js

# 运行压力测试（100 并发）
node test-agent-stress-100.js
```

### 4️⃣ 源码学习（1 小时）
```bash
# 查看核心代码
ls -la src/agents/

# 阅读执行器
cat src/agents/agent-executor.js

# 阅读池管理
cat src/agents/agent-pool.js
```

## 💡 使用技巧

### 调整演示内容

编辑 `demo-dispatch-agent.js`，自定义演示场景：

```javascript
// 注释掉不需要的场景
// await demoScenario1();

// 只运行特定场景
await demoAgentPool();
await demoToolWhitelist();
```

### 添加自定义场景

```javascript
async function demoMyScenario() {
  printSection('我的自定义场景', emojis.star);
  
  // 你的代码
  const result = await someFunction();
  printSuccess(`结果: ${result}`);
}

// 在 runDemo() 中调用
await demoMyScenario();
```

## 🔗 相关资源

- **系统指南**: [AGENT_SYSTEM_GUIDE.md](AGENT_SYSTEM_GUIDE.md)
- **测试指南**: [AGENT_TESTING_GUIDE.md](AGENT_TESTING_GUIDE.md)
- **实现计划**: [DISPATCH_AGENT_PLAN.md](DISPATCH_AGENT_PLAN.md)
- **测试报告**: [PHASE6_STRESS_TEST_REPORT.md](PHASE6_STRESS_TEST_REPORT.md)

## 🎉 开始体验

现在就运行演示，感受 Dispatch Agent 的强大功能！

```bash
node demo-dispatch-agent.js
```

---

**提示**: 演示脚本使用了彩色输出，确保你的终端支持 ANSI 颜色代码。
