# Plans 目录

这个目录用于存放项目中所有计划、进度报告、测试报告等临时性质的文档。

## 📋 文档分类

### 1. 计划文档 (PLAN)
- 项目实施计划
- 功能开发计划
- 技术方案设计

**示例**：
- `DISPATCH_AGENT_PLAN.md` - Dispatch Agent 系统实现计划
- `DISPATCH_AGENT_PERSISTENCE_PLAN.md` - 持久化方案计划

### 2. 进度报告 (PROGRESS/SUMMARY)
- 阶段性进度总结
- 工作完成报告
- 里程碑总结

**示例**：
- `DISPATCH_AGENT_PROGRESS_SUMMARY.md` - 进度总结
- `PHASE6_COMPLETION_SUMMARY.md` - Phase 6 完成总结
- `FINAL_WORK_SUMMARY.md` - 最终工作总结

### 3. 测试报告 (TEST/REPORT)
- 功能测试报告
- 性能测试报告
- 验证测试报告

**示例**：
- `AGENT_TEST_REPORT.md` - Agent 测试报告
- `PHASE6_STRESS_TEST_REPORT.md` - 压力测试报告
- `DISPATCH_AGENT_VERIFICATION_REPORT.md` - 验证报告

### 4. 实现方案 (IMPLEMENTATION)
- 功能实现方案
- 技术实现细节
- 集成方案

**示例**：
- `IMPLEMENTATION_CLEAR_COMMAND.md` - /clear 命令实现
- `IMPLEMENTATION_SETUP_WIZARD.md` - 设置向导实现
- `DISPATCH_AGENT_INTEGRATION.md` - 集成方案

### 5. 优化建议 (OPTIMIZATION)
- 性能优化方案
- 代码改进建议
- 架构优化建议

**示例**：
- `THINKING_THROTTLING_OPTIMIZATION.md` - 思考节流优化
- `TOOLS_IMPROVEMENTS_SUMMARY.md` - 工具改进总结

### 6. 实验记录 (EXPERIMENT)
- 功能实验记录
- 技术探索记录
- 问题修复记录

**示例**：
- `CTRL_C_EXPERIMENT.md` - Ctrl+C 处理实验
- `BUG_FIX_regionConstrainedEdit.md` - Bug 修复记录

## 📝 命名规范

### 推荐的命名模式：
- `[FEATURE]_PLAN.md` - 功能计划
- `[FEATURE]_PROGRESS_SUMMARY.md` - 进度总结
- `[FEATURE]_TEST_REPORT.md` - 测试报告
- `[FEATURE]_VERIFICATION_REPORT.md` - 验证报告
- `IMPLEMENTATION_[FEATURE].md` - 实现方案
- `PHASE[N]_SUMMARY.md` - 阶段总结

### 不推荐：
- ❌ 使用中文文件名（可能导致兼容性问题）
- ❌ 过于简短的文件名（如 `plan.md`）
- ❌ 不含功能标识的文件名（如 `report.md`）

## 🗂️ 与根目录文档的区别

### plans/ 目录（这里）：
- 临时性质的文档
- 开发过程中的记录
- 计划和报告
- 不需要长期维护

### 根目录：
- 用户指南（GUIDE）
- API 文档（API_GUIDE）
- 项目说明（README）
- 配置文件（cloco.md）
- 需要长期维护的文档

## 📚 相关文档

- 根目录的 `cloco.md` - 包含文档组织规范的完整说明
- 根目录的 `README.md` - 项目说明
- 根目录的 `AGENT_SYSTEM_GUIDE.md` - 系统使用指南

## 🔍 查找文档

### 按功能查找：
```bash
# 查找 Dispatch Agent 相关
ls plans/DISPATCH_AGENT*

# 查找所有测试报告
ls plans/*TEST*.md

# 查找所有计划
ls plans/*PLAN*.md
```

### 按时间查找：
```bash
# 按修改时间排序
ls -lt plans/*.md | head -20
```

---

**注意**：这些文档主要供开发团队内部使用，记录开发过程和决策历史。用户应参考根目录的用户指南文档。
