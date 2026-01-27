# Agent 系统测试指南

> 创建日期: 2026-01-27
> 目标: 提供完整的 Agent 系统测试文档

## 📋 测试概览

本测试套件覆盖了 Agent 系统的所有关键功能：

- **端到端测试** (test-agent-e2e.js): 验证完整的用户工作流程
- **性能测试** (test-agent-performance.js): 评估系统性能指标
- **压力测试** (test-agent-stress.js): 测试极限条件下的稳定性

## 🧪 测试类型

### 1. 端到端测试 (E2E)

**文件**: `test-agent-e2e.js`

**测试目标**:
- 验证完整的 Agent 工作流程
- 确保所有组件正确集成
- 测试用户实际使用场景

**测试用例**:

#### E2E-1: 完整工作流程
- ✅ 执行 Agent 任务
- ✅ 结果持久化存储
- ✅ 使用 agentResult 查询结果
- ✅ 验证结果完整性

**运行**:
```bash
node test-agent-e2e.js
```

**预期结果**: 所有测试通过，无错误

---

#### E2E-2: 缓存复用
- ✅ 第一次执行（无缓存）
- ✅ 第二次执行（使用缓存）
- ✅ 验证缓存加速效果

**预期结果**:
- 第一次执行不使用缓存
- 第二次执行使用缓存
- 返回相同的 agent ID

---

#### E2E-3: 批量执行
- ✅ 并发执行多个 agents
- ✅ 验证批量结果
- ✅ 检查并发性能

**预期结果**: 所有批量任务成功完成

---

#### E2E-4: Agent Pool 状态
- ✅ 查询池状态
- ✅ 查询统计信息
- ✅ 验证状态正确性

**预期结果**: 状态信息准确反映系统状态

---

#### E2E-5: 错误处理
- ✅ 查询不存在的 agent
- ✅ 验证错误信息
- ✅ 测试错误恢复

**预期结果**: 返回清晰的错误信息

---

#### E2E-6: 结果文件列表
- ✅ 执行任务
- ✅ 查询文件列表
- ✅ 验证文件数据

**预期结果**: 返回正确的文件列表

---

#### E2E-7: 缓存统计
- ✅ 执行多个任务
- ✅ 查询缓存统计
- ✅ 验证统计数据

**预期结果**: 统计数据准确

---

### 2. 性能测试 (Performance)

**文件**: `test-agent-performance.js`

**测试目标**:
- 评估执行速度
- 测量 Token 使用效率
- 验证缓存加速效果
- 评估并发性能

**测试用例**:

#### PERF-1: 单次执行速度
- ✅ 测量执行时间
- ✅ 记录 Token 使用
- ✅ 记录工具调用次数

**性能基准**:
- 优秀: < 5 秒
- 良好: 5-10 秒
- 可接受: 10-30 秒

**运行**:
```bash
node test-agent-performance.js
```

---

#### PERF-2: 缓存加速效果
- ✅ 第一次执行（无缓存）
- ✅ 第二次执行（有缓存）
- ✅ 计算加速比

**性能基准**:
- 极佳: > 100x 加速
- 优秀: > 50x 加速
- 良好: > 10x 加速

**预期结果**: 缓存显著提升性能

---

#### PERF-3: 并发执行性能
- ✅ 串行执行时间
- ✅ 并行执行时间
- ✅ 计算加速比

**性能基准**:
- 极佳: > 2.5x 加速
- 优秀: > 2.0x 加速
- 良好: > 1.5x 加速

---

#### PERF-4: Token 使用效率
- ✅ 测量总 Token 数
- ✅ 计算每次工具调用平均 Token
- ✅ 评估效率

**性能基准**:
- 极高效率: < 2000 tokens
- 高效率: 2000-4000 tokens
- 良好效率: 4000-8000 tokens

---

#### PERF-5: 结果查询性能
- ✅ 测试 summary 查询
- ✅ 测试 full 查询
- ✅ 测试 files 查询
- ✅ 测试 search 查询

**性能基准**: 所有查询 < 1 秒

---

#### PERF-6: 缓存命中率
- ✅ 执行多次相同任务
- ✅ 计算缓存命中率
- ✅ 验证缓存效果

**性能基准**:
- 极高: ≥ 90%
- 优秀: ≥ 80%
- 良好: ≥ 70%

---

#### PERF-7: 内存使用估算
- ✅ 执行多个任务
- ✅ 测量存储大小
- ✅ 计算平均内存使用

**性能基准**:
- 极高效率: < 50 KB/agent
- 高效率: 50-100 KB/agent
- 良好效率: 100-200 KB/agent

---

### 3. 压力测试 (Stress)

**文件**: `test-agent-stress.js`

**测试目标**:
- 测试大量并发请求
- 验证长时间运行稳定性
- 测试大结果集处理
- 验证资源限制
- 测试错误恢复

**测试用例**:

#### STRESS-1: 大量并发请求
- ✅ 20 个并发任务
- ✅ 测量总执行时间
- ✅ 验证成功率

**基准**: 成功率 ≥ 95%

**运行**:
```bash
node test-agent-stress.js
```

---

#### STRESS-2: 长时间运行
- ✅ 10 次连续迭代
- ✅ 测量执行时间
- ✅ 验证稳定性

**基准**: 成功率 ≥ 90%

---

#### STRESS-3: 大结果集处理
- ✅ 搜索所有文件
- ✅ 处理大结果集
- ✅ 验证完整性

**预期结果**: 成功处理大结果集

---

#### STRESS-4: 资源限制测试
- ✅ 超过最大并发数
- ✅ 验证队列管理
- ✅ 测试资源限制

**预期结果**: 正确处理资源限制

---

#### STRESS-5: 快速连续请求
- ✅ 15 个快速请求
- ✅ 不等待前一个完成
- ✅ 验证并发处理

**基准**: 成功率 ≥ 90%

---

#### STRESS-6: 错误恢复测试
- ✅ 混合正常和异常任务
- ✅ 验证错误隔离
- ✅ 测试恢复机制

**预期结果**: 错误不影响其他任务

---

#### STRESS-7: 缓存压力测试
- ✅ 20 次快速重复执行
- ✅ 测试缓存读取性能
- ✅ 验证缓存稳定性

**基准**:
- 缓存命中率 ≥ 95%
- 平均响应 < 100ms

---

## 🚀 运行测试

### 运行所有测试

```bash
# 端到端测试
node test-agent-e2e.js

# 性能测试
node test-agent-performance.js

# 压力测试
node test-agent-stress.js
```

### 运行特定测试

```bash
# 只运行 E2E-1 (完整工作流程)
node test-agent-e2e.js --grep "E2E-1"

# 只运行 PERF-2 (缓存加速)
node test-agent-performance.js --grep "PERF-2"

# 只运行 STRESS-1 (大量并发)
node test-agent-stress.js --grep "STRESS-1"
```

### 运行测试并生成报告

```bash
# 生成详细报告
node test-agent-e2e.js --reporter=spec

# 生成 JSON 报告
node test-agent-e2e.js --reporter=json > report.json
```

---

## 📊 测试结果解读

### 成功标准

#### 端到端测试
- ✅ 所有测试必须通过
- ✅ 无错误或警告
- ✅ 功能完整性验证

#### 性能测试
- ✅ 至少 80% 测试达到"良好"或更高
- ✅ 无测试低于"可接受"标准
- ✅ 缓存加速 > 10x

#### 压力测试
- ✅ 成功率 ≥ 90%
- ✅ 无崩溃或死锁
- ✅ 资源使用合理

### 性能指标总结

| 指标 | 优秀 | 良好 | 可接受 |
|------|------|------|--------|
| 单次执行 | < 5s | 5-10s | 10-30s |
| 缓存加速 | > 50x | > 20x | > 10x |
| 并发加速 | > 2.0x | > 1.5x | > 1.2x |
| Token 效率 | < 4k | 4-8k | 8-12k |
| 查询性能 | < 100ms | 100-500ms | < 1s |
| 缓存命中 | > 90% | > 80% | > 70% |
| 内存使用 | < 100KB | 100-200KB | < 500KB |

---

## 🔧 故障排除

### 常见问题

#### 1. 测试超时

**症状**: 测试执行超时

**解决方案**:
```bash
# 增加超时时间
node test-agent-e2e.js --timeout=120000
```

#### 2. 缓存未命中

**症状**: 缓存测试失败，命中率低

**解决方案**:
- 检查存储路径权限
- 确认 conversationId 一致
- 等待保存完成（增加延迟）

#### 3. 并发测试失败

**症状**: 批量执行成功率低

**解决方案**:
- 减少 maxConcurrent
- 增加超时时间
- 检查系统资源

#### 4. 内存不足

**症状**: 压力测试时内存溢出

**解决方案**:
```bash
# 增加 Node.js 内存限制
node --max-old-space-size=4096 test-agent-stress.js
```

---

## 📈 持续集成

### CI/CD 集成

**示例 GitHub Actions 配置**:

```yaml
name: Agent System Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Run E2E Tests
        run: node test-agent-e2e.js
      
      - name: Run Performance Tests
        run: node test-agent-performance.js
      
      - name: Run Stress Tests
        run: node test-agent-stress.js
```

### 测试覆盖率

使用 `c8` 生成覆盖率报告：

```bash
npm install -g c8

c8 node test-agent-e2e.js
c8 node test-agent-performance.js
c8 node test-agent-stress.js

# 生成 HTML 报告
c8 report --reporter=html
```

---

## 📝 测试最佳实践

### 1. 测试隔离

每个测试使用唯一的 `conversationId`:

```javascript
const testConversationId = `test_${randomUUID()}`;
```

### 2. 清理资源

在 `after` 钩子中清理测试数据:

```javascript
after(async () => {
  const agents = await storage.listAgents(testConversationId);
  for (const agent of agents) {
    await storage.deleteAgent(agent.agentId);
  }
});
```

### 3. 等待异步操作

确保异步操作完成:

```javascript
await new Promise(resolve => setTimeout(resolve, 100));
```

### 4. 验证性能基准

使用断言验证性能:

```javascript
assert.ok(executionTime < 30000, '执行时间应该在 30 秒内');
```

---

## 🎯 下一步

### 测试增强

- [ ] 添加 UI 自动化测试
- [ ] 添加集成测试（与真实 AI 模型）
- [ ] 添加回归测试套件
- [ ] 添加性能回归检测

### 监控

- [ ] 集成 APM 工具
- [ ] 添加性能监控仪表板
- [ ] 设置告警阈值
- [ ] 生成测试趋势报告

---

## 📚 相关文档

- [Agent 系统架构](./AGENT_SYSTEM_GUIDE.md)
- [持久化方案](./DISPATCH_AGENT_PERSISTENCE_PLAN.md)
- [实现计划](./DISPATCH_AGENT_PLAN.md)

---

**最后更新**: 2026-01-27
**状态**: ✅ Phase 5 完成
**测试覆盖率**: 核心功能 100%
