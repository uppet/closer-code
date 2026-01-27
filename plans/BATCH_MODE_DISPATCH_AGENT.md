# Batch 模式开发指南 - Dispatch Agent

> 创建日期: 2026-01-25
> 目的: 使用 batch 模式持续开发 dispatch_agent 功能

## ✅ 可行性分析

**结论**: 完全可行！batch 模式非常适合持续开发。

### 核心机制

1. **自动加载对话历史**
   - 每次 batch 运行会自动加载该项目的对话历史
   - 历史基于项目路径隔离（`~/.closer-code/history/{project-hash}.json`）
   - 最多保留 100 条消息

2. **支持 /clear 命令**
   - batch 模式内置斜杠命令支持
   - 使用 `/clear` 可以重置当前项目的对话历史

3. **独立上下文**
   - 每次 batch 运行创建新的 conversation 实例
   - 但会从历史文件恢复之前的对话

## 🚀 推荐工作流程

### 方案 1: 无人值守自动推进模式（推荐）

```bash
# 使用相同的提示词连续运行 5 次
# 每次运行都会：
# 1. 加载历史对话（包括之前的进度）
# 2. 读取计划文档
# 3. 判断当前进度
# 4. 找到下一个未完成的任务
# 5. 完成该任务
# 6. 总结进度

closer-batch "继续实现 dispatch_agent。读取 DISPATCH_AGENT_PLAN.md，找到下一个未完成的 Phase 或任务，完成它。完成后总结进度。"

closer-batch "继续实现 dispatch_agent。读取 DISPATCH_AGENT_PLAN.md，找到下一个未完成的 Phase 或任务，完成它。完成后总结进度。"

closer-batch "继续实现 dispatch_agent。读取 DISPATCH_AGENT_PLAN.md，找到下一个未完成的 Phase 或任务，完成它。完成后总结进度。"

closer-batch "继续实现 dispatch_agent。读取 DISPATCH_AGENT_PLAN.md，找到下一个未完成的 Phase 或任务，完成它。完成后总结进度。"

closer-batch "继续实现 dispatch_agent。读取 DISPATCH_AGENT_PLAN.md，找到下一个未完成的 Phase 或任务，完成它。完成后总结进度。"
```

**优势**：
- ✅ **容错性强** - 如果某次运行异常退出，下次会自动恢复
- ✅ **自动化** - AI 自动判断进度，无需人工干预
- ✅ **状态保持** - 历史对话记录了所有已完成的任务
- ✅ **灵活推进** - 根据 token 限制和错误情况自动调整

**适用场景**：
- 无人值守批量运行
- 网络不稳定环境
- Token 限制不确定
- 长时间运行的任务

### 方案 2: 手动推进模式（调试用）

```bash
# 人工指定具体任务，适合调试和验证
closer-batch "实现 Phase 1.1: 创建 src/agents/agent-executor.js 的基础结构。"

# 下次运行时需要重新说明背景
closer-batch "继续实现 Phase 1.2: 创建 agent-tools.js。"
```

**适用场景**：
- 调试特定功能
- 验证某个实现
- 手动控制进度

## 📝 使用技巧

### 1. 提供明确的阶段性指令

```bash
# ✅ 好的指令
closer-batch "实现 Phase 1.1: 创建 src/agents/agent-executor.js，包含 AgentExecutor 类的基本结构。"

# ❌ 不好的指令
closer-batch "实现 agent 功能。"  # 太模糊
```

### 2. 引用计划文档

```bash
# 明确引用文档中的特定部分
closer-batch "根据 DISPATCH_AGENT_PLAN.md 的 Phase 1，实现 agent-executor.js。参考文档第 50-80 行的架构设计。"
```

### 3. 请求状态报告

```bash
# 定期检查进度
closer-batch "列出当前 dispatch_agent 功能的实现进度，对比 DISPATCH_AGENT_PLAN.md 中的各个 Phase。"
```

### 4. 测试驱动开发

```bash
# 实现一部分，测试一部分
closer-batch "实现 dispatchAgentTool 的基本结构，然后创建一个简单的测试脚本验证工具定义是否正确。"
```

### 5. 使用 /clear 重置

```bash
# 当对话变得混乱时
closer-batch "/clear"
closer-batch "重新开始，我们按照 DISPATCH_AGENT_INTEGRATION.md 的步骤重新实现。"
```

## 🎯 无人值守自动推进原理

### 核心机制

```
第 1 次运行:
  加载历史 (空) 
    → 读取 DISPATCH_AGENT_PLAN.md 
    → 发现 Phase 1 未完成 
    → 完成 Phase 1.1 
    → 保存到历史

第 2 次运行:
  加载历史 (包含 Phase 1.1 已完成)
    → 读取 DISPATCH_AGENT_PLAN.md 
    → 发现 Phase 1.2 未完成 
    → 完成 Phase 1.2 
    → 保存到历史

第 3 次运行:
  加载历史 (包含 Phase 1.1, 1.2 已完成)
    → 读取 DISPATCH_AGENT_PLAN.md 
    → 发现 Phase 1.3 未完成 
    → 完成 Phase 1.3 
    → 保存到历史

... 依次类推

第 N 次运行:
  如果异常退出 (第 3 次运行到一半)
    → 下次运行加载历史
    → 发现 Phase 1.3 部分完成
    → 继续完成 Phase 1.3
    → 保存到历史
```

### AI 的判断逻辑

AI 会执行以下步骤：

1. **读取历史对话**
   - 查看之前完成了哪些任务
   - 识别当前进度状态

2. **读取计划文档**
   - 解析 DISPATCH_AGENT_PLAN.md
   - 识别所有 Phase 和任务

3. **对比进度**
   - 找到第一个未完成的任务
   - 检查是否有部分完成的工作

4. **执行任务**
   - 完成该任务的代码实现
   - 验证结果（如果可能）

5. **总结进度**
   - 明确说明完成了什么
   - 说明下一步应该做什么

### 异常处理

| 异常情况 | AI 如何处理 |
|---------|-----------|
| **Token 溢出** | 检测到错误，记录到历史，下次继续 |
| **编译错误** | 尝试修复，如果失败则记录，下次重试 |
| **运行时异常** | 记录到历史，下次运行时恢复 |
| **部分完成** | 在历史中标记部分完成，下次继续 |

## 🎯 推荐的 Batch 开发流程

### 阶段 0: 准备（一次性）

```bash
# 确认计划文档存在
closer-batch "检查 DISPATCH_AGENT_PLAN.md 和相关文档是否存在。"

# 创建进度追踪文件（可选）
closer-batch "创建 PROGRESS.md，用于追踪 dispatch_agent 的实现进度。"
```

### 阶段 1: 无人值守批量运行（核心）

```bash
# 1. 确认计划文档已创建
closer-batch "列出 DISPATCH_AGENT_PLAN.md 和 DISPATCH_AGENT_PERSISTENCE_PLAN.md 中的所有 Phase。"

# 2. 确认当前项目状态
closer-batch "检查 src/tools.js 中是否已有 dispatchAgentTool 和 agentResultTool 的定义。"
```

### 阶段 2: 逐步实现

```bash
# Phase 1.1: 创建目录和基础文件
closer-batch "实现 Phase 1.1: 创建 src/agents/ 目录，实现 agent-executor.js 的基础结构。只创建类框架，不需要完整实现。"

# Phase 1.2: 工具子集
closer-batch "实现 Phase 1.2: 创建 agent-tools.js，定义只读工具集（GlobTool, GrepTool, LS, View）。"

# Phase 1.3: 基础工具
closer-batch "实现 Phase 1.3: 在 tools.js 中添加 dispatchAgentTool，只实现基础框架，不连接实际的 agent 执行器。"

# 验证进度
closer-batch "总结当前 dispatch_agent 的实现进度，列出已创建的文件和实现的功能。"
```

### 阶段 3: 集成和测试

```bash
# 添加到配置
closer-batch "在 config.js 的 tools.enabled 中添加 'dispatch_agent' 和 'agentResult'。"

# 添加使用指南
closer-batch "在 prompt-builder.js 中添加 dispatch_agent 的使用指南，参考 DISPATCH_AGENT_INTEGRATION.md。"

# 创建测试脚本
closer-batch "创建 test/test-dispatch-agent.js，编写一个简单的测试验证工具是否正确注册。"
```

### 阶段 4: 验证

```bash
# 编译检查
closer-batch "运行 npm run build，检查是否有编译错误。"

# 功能测试
closer-batch "运行测试脚本，验证 dispatch_agent 工具是否可以正常调用。"
```

## ⚠️ 注意事项

### 1. Token 限制和自动清理

**问题**：历史过长会导致 token 溢出

**AI 自动处理**：
- 检测到 token 接近限制时，自动总结进度
- 将历史压缩为关键进度点
- 释放 token 空间

**手动干预**（可选）：
```bash
# 如果 AI 没有自动清理，手动重置
closer-batch "/clear"
closer-batch "重新开始，读取 PROGRESS.md 恢复进度。"
```

### 2. 如何使用 /clear 命令

**在 batch 模式中使用 /clear**：

```bash
# 方法 1: 直接发送 /clear 命令
closer-batch "/clear"

# 方法 2: /clear 后立即开始新任务
closer-batch "/clear && 继续实现 dispatch_agent。读取 DISPATCH_AGENT_PLAN.md，找到下一个未完成的任务。"

# 方法 3: 在批量脚本中重置
cat > reset-and-continue.sh <<'EOF'
#!/bin/bash
echo "=== 重置对话历史 ==="
closer-batch "/clear"

echo "=== 重新开始 ==="
closer-batch "继续实现 dispatch_agent。读取 DISPATCH_AGENT_PLAN.md，找到下一个未完成的 Phase 或任务，完成它。完成后总结进度。"
EOF

chmod +x reset-and-continue.sh
./reset-and-continue.sh
```

**/clear 的作用**：
- ✅ 清空当前项目的对话历史
- ✅ 重置所有已加载的上下文
- ✅ 释放 token 空间
- ✅ 重新开始新的对话

**何时使用 /clear**：

| 场景 | 是否需要 /clear | 原因 |
|------|----------------|------|
| AI 说"我不记得之前的讨论了" | ✅ 需要 | Token 溢出，上下文丢失 |
| 历史过长导致响应变慢 | ✅ 需要 | 历史消息太多，影响性能 |
| 想重新开始某个任务 | ✅ 需要 | 清除旧上下文，避免干扰 |
| 正常推进，AI 记得进度 | ❌ 不需要 | 保持上下文连续性 |
| 异常恢复后继续 | ❌ 不需要 | 历史包含恢复信息 |

**示例：完整的清理和恢复流程**

```bash
# 第 1 次：检测到问题
closer-batch "继续实现 dispatch_agent。读取 DISPATCH_AGENT_PLAN.md，找到下一个未完成的 Phase 或任务，完成它。"
# 输出: "抱歉，我不记得之前的讨论了。"

# 第 2 次：清理并恢复
closer-batch "/clear"
closer-batch "读取 PROGRESS.md，恢复 dispatch_agent 的实现进度。然后继续下一个未完成的任务。"

# 第 3 次：继续正常推进
closer-batch "继续实现 dispatch_agent。读取 DISPATCH_AGENT_PLAN.md，找到下一个未完成的 Phase 或任务，完成它。"
# 输出: "读取历史，发现 Phase 1.1-1.3 已完成。继续 Phase 1.4..."
```

### 2. 异常恢复

**场景 1：编译错误**
```
第 3 次运行: 实现 Phase 1.3
  → 编译错误
  → AI 记录错误到历史
  → 尝试修复

第 4 次运行:
  → 加载历史，发现 Phase 1.3 有编译错误
  → 修复错误
  → 完成 Phase 1.3
```

**场景 2：部分完成**
```
第 5 次运行: 实现 Phase 2.1 (大任务)
  → 完成了一半
  → 异常退出

第 6 次运行:
  → 加载历史，发现 Phase 2.1 部分完成
  → 继续完成剩余部分
```

**场景 3：Token 溢出**
```
第 7 次运行: 历史太长，token 溢出
  → AI 检测到错误
  → 自动压缩历史
  → 继续任务

第 8 次运行:
  → 加载压缩后的历史
  → 继续推进
```

### 3. 进度判断准确性

**AI 如何判断进度**：

1. **读取历史对话**
   - 查找"已完成"、"完成"、"✓"等关键词
   - 识别已创建的文件
   - 识别已实现的功能

2. **读取计划文档**
   - 解析 Phase 列表
   - 识别每个 Phase 的任务清单
   - 匹配 [ ] 和 [x] 标记

3. **对比和决策**
   - 找到第一个未完成的任务
   - 检查依赖关系
   - 选择下一个任务

**提高准确性**：
- 在计划文档中使用明确的标记：`[ ]` 未完成，`[x]` 已完成
- 在总结时明确说明："已完成 Phase 1.1"
- 创建 PROGRESS.md 作为额外追踪

### 4. 文件修改冲突

**问题**：多次运行可能修改同一文件

**AI 处理**：
- 检查文件当前状态
- 追加修改，而不是覆盖
- 使用 regionConstrainedEdit 精确修改

**预防措施**：
- 不同任务修改不同文件
- 使用精确的区域编辑
- 定期 git 提交

## 📊 进度追踪建议

### 创建进度文件

```bash
# 初始化进度文件
closer-batch "创建 PROGRESS.md，记录 dispatch_agent 的实现进度。"

# 更新进度
closer-batch "更新 PROGRESS.md，记录 Phase 1 已完成，开始 Phase 2。"
```

### 使用 Git 提交

```bash
# 每个 Phase 完成后提交
closer-batch "运行 git add . 和 git commit，提交 Phase 1 的实现。"

# 查看提交历史
closer-batch "运行 git log --oneline -5，查看最近的提交。"
```

## 🎯 最佳实践总结

### DO ✅

1. **逐步推进** - 每次 batch 完成一个明确的子任务
2. **引用文档** - 明确引用计划文档的特定部分
3. **定期总结** - 定期请求 AI 总结当前进度
4. **使用 /clear** - 对话混乱时及时重置
5. **验证结果** - 每个阶段完成后验证代码

### DON'T ❌

1. **不要一次实现太多** - 单次 batch 完成整个 Phase 可能导致质量问题
2. **不要假设 AI 记得** - 明确提供必要的背景信息
3. **不要忽略错误** - 遇到错误立即修复，不要累积
4. **不要跳过测试** - 每个功能完成后都要测试

## 📋 示例 Batch 命令序列

### 无人值守批量运行（5 次）

```bash
# 创建一个 shell 脚本，连续运行 5 次
cat > run-dispatch-agent.sh <<'EOF'
#!/bin/bash
for i in {1..5}; do
  echo "=== 第 $i 次运行 ==="
  closer-batch "继续实现 dispatch_agent。读取 DISPATCH_AGENT_PLAN.md，找到下一个未完成的 Phase 或任务，完成它。完成后总结进度。"
  echo "第 $i 次运行完成"
  echo ""
  sleep 1  # 避免过快的连续调用
done
EOF

chmod +x run-dispatch-agent.sh
./run-dispatch-agent.sh
```

### 预期执行流程

```
第 1 次运行:
  输出: "读取 DISPATCH_AGENT_PLAN.md，发现 Phase 1 未开始。"
  输出: "创建 src/agents/ 目录..."
  输出: "完成 Phase 1.1: 创建目录结构"
  输出: "进度总结: ✓ Phase 1.1 已完成"

第 2 次运行:
  输出: "读取历史，发现 Phase 1.1 已完成。"
  输出: "读取 DISPATCH_AGENT_PLAN.md，发现 Phase 1.2 未完成。"
  输出: "创建 src/agents/agent-executor.js..."
  输出: "完成 Phase 1.2: 基础执行器"
  输出: "进度总结: ✓ Phase 1.1, 1.2 已完成"

第 3 次运行:
  输出: "读取历史，发现 Phase 1.1, 1.2 已完成。"
  输出: "读取 DISPATCH_AGENT_PLAN.md，发现 Phase 1.3 未完成。"
  输出: "创建 src/agents/agent-tools.js..."
  输出: "完成 Phase 1.3: 工具子集"
  输出: "进度总结: ✓ Phase 1.1, 1.2, 1.3 已完成"

... 依次类推

第 5 次运行:
  输出: "读取历史，发现 Phase 1.1-1.5 已完成。"
  输出: "读取 DISPATCH_AGENT_PLAN.md，发现 Phase 2 未开始。"
  输出: "创建 src/agents/agent-client.js..."
  输出: "完成 Phase 2.1: AI 客户端"
  输出: "进度总结: ✓ Phase 1 已全部完成，✓ Phase 2.1 已完成"
  输出: "建议: 继续运行 5 次以完成 Phase 2"
```

### 异常恢复示例

```
第 3 次运行 (异常):
  输出: "读取历史，发现 Phase 1.1, 1.2 已完成。"
  输出: "读取 DISPATCH_AGENT_PLAN.md，发现 Phase 1.3 未完成。"
  输出: "创建 src/agents/agent-tools.js..."
  输出: "错误: 编译失败，缺少依赖"
  输出: "记录错误到历史，等待下次恢复"
  [异常退出]

第 4 次运行 (自动恢复):
  输出: "读取历史，发现 Phase 1.3 有编译错误。"
  输出: "修复编译错误，添加缺失的导入"
  输出: "验证: 编译成功"
  输出: "完成 Phase 1.3: 工具子集"
  输出: "进度总结: ✓ Phase 1.1, 1.2, 1.3 已完成"
```

## 🚀 开始开发

### 准备工作

```bash
# 1. 确认计划文档存在
ls -la DISPATCH_AGENT*.md

# 2. 创建批量运行脚本
cat > run-5-times.sh <<'EOF'
#!/bin/bash
for i in {1..5}; do
  echo "=== 第 $i 次运行 ==="
  closer-batch "继续实现 dispatch_agent。读取 DISPATCH_AGENT_PLAN.md，找到下一个未完成的 Phase 或任务，完成它。完成后总结进度。"
  echo "完成时间: $(date)"
  echo ""
  sleep 1
done
EOF

chmod +x run-5-times.sh
```

### 开始无人值守运行

```bash
# 方案 1: 直接运行 5 次
./run-5-times.sh

# 方案 2: 后台运行
nohup ./run-5-times.sh > dispatch-agent.log 2>&1 &

# 方案 3: 监控模式
watch -n 10 'tail -20 dispatch-agent.log'

# 方案 4: 单次测试
closer-batch "继续实现 dispatch_agent。读取 DISPATCH_AGENT_PLAN.md，找到下一个未完成的 Phase 或任务，完成它。完成后总结进度。"
```

### 监控进度

```bash
# 查看日志
tail -f dispatch-agent.log

# 查看当前进度
cat PROGRESS.md

# 查看历史文件
ls -la ~/.closer-code/history/

# 查看代码变更
git status
git diff --stat
```

### 预期结果

运行 5 次后，应该完成：
- ✅ Phase 1: 基础架构（完整）
- ✅ Phase 2: 执行引擎（部分或完整）
- ✅ 所有代码已编译通过
- ✅ PROGRESS.md 记录了完整进度

如果未完成，可以再运行 5 次：
```bash
./run-5-times.sh  # 继续推进
```

---

**最后更新**: 2026-01-25
**状态**: ✅ 准备就绪
**下一步**: 开始 Phase 1 实现
