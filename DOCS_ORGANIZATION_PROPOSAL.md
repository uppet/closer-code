# 📚 文档整理建议

## 📊 当前状况分析

**文档总数**: 101个Markdown文件

**主要问题**:
- ❌ 文档散乱，缺乏组织结构
- ❌ 重复内容多（多个版本的设计文档）
- ❌ 临时性文档未清理（IMPLEMENTATION, TEST, SUMMARY等）
- ❌ 文档命名不统一
- ❌ 缺少统一的索引

---

## 🎯 推荐方案：三级分类法

### 📁 推荐的目录结构

```
docs/
├── 00-getting-started/          # 快速开始
│   ├── README.md                # 项目概述
│   ├── quick-start.md           # 快速开始指南
│   └── installation.md          # 安装指南
│
├── 01-user-guide/               # 用户指南
│   ├── slash-commands.md        # 斜杠命令
│   ├── keyboard-shortcuts.md    # 快捷键
│   ├── configuration.md         # 配置说明
│   └── skills-usage.md          # Skills使用
│
├── 02-development/              # 开发文档
│   ├── architecture.md          # 架构设计
│   ├── api-reference.md         # API参考
│   ├── tools-system.md          # 工具系统
│   ├── skills-system.md         # Skills系统
│   └── mcp-integration.md       # MCP集成
│
├── 03-features/                 # 功能特性
│   ├── thinking-feature.md      # Thinking功能
│   ├── multiline-input.md       # 多行输入
│   ├── task-progress.md         # 任务进度
│   └── bash-result-cache.md     # Bash结果缓存
│
├── 04-maintenance/              # 维护文档
│   ├── build-commands.md        # 构建命令
│   ├── testing-guide.md         # 测试指南
│   ├── troubleshooting.md       # 故障排除
│   └── changelog.md             # 变更日志
│
└── 05-archive/                  # 归档文档
    ├── old-designs/             # 旧设计文档
    ├── implementation-reports/  # 实施报告
    └── experiment-records/      # 实验记录
```

---

## 🗂️ 文档分类原则

### 保留并整理（核心文档）

- ✅ `README.md` - 项目主文档
- ✅ `CLAUDE.md` - 项目行为规范
- ✅ `API_GUIDE.md` - API指南
- ✅ `docs/SLASH_COMMANDS_GUIDE.md` - 命令指南
- ✅ `docs/SKILLS_QUICK_START.md` - Skills快速开始
- ✅ `docs/QUICK_START_HISTORY.md` - 历史记录快速开始

### 合并到新位置

- 📦 skills相关 → `docs/02-development/skills-system.md`
- 📦 thinking相关 → `docs/03-features/thinking-feature.md`
- 📦 mcp相关 → `docs/02-development/mcp-integration.md`
- 📦 commands相关 → `docs/01-user-guide/slash-commands.md`

### 归档（历史文档）

- 📦 所有 `IMPLEMENTATION_*.md` → `docs/05-archive/implementation-reports/`
- 📦 所有 `TEST_*.md` → `docs/05-archive/implementation-reports/`
- 📦 所有 `SUMMARY_*.md` → `docs/05-archive/implementation-reports/`
- 📦 所有 `*_SUMMARY.md` → `docs/05-archive/implementation-reports/`
- 📦 所有 `*_OPTIMIZATION.md` → `docs/05-archive/experiment-records/`
- 📦 所有 `*_DESIGN.md` → `docs/05-archive/old-designs/`

### 删除（临时文件）

- 🗑️ `WORK_SUMMARY.md` - 临时总结
- 🗑️ `FINAL-SUMMARY.md` - 临时总结
- 🗑️ `ds_r1.md` - 临时笔记
- 🗑️ `winfix.md` - 临时笔记

---

## 🚀 实施步骤

### 第一步：创建目录结构

```bash
mkdir -p docs/{00-getting-started,01-user-guide,02-development,03-features,04-maintenance,05-archive/{old-designs,implementation-reports,experiment-records}}
```

### 第二步：移动核心文档

```bash
# 移动用户指南
mv docs/SLASH_COMMANDS_GUIDE.md docs/01-user-guide/slash-commands.md
mv docs/SKILLS_QUICK_START.md docs/01-user-guide/skills-usage.md

# 移动开发文档
mv docs/skills_*.md docs/02-development/
mv docs/mcp_*.md docs/02-development/
mv docs/TOOLS_REFACTOR_PLAN.md docs/02-development/tools-system.md
```

### 第三步：归档历史文档

```bash
mv IMPLEMENTATION_*.md docs/05-archive/implementation-reports/
mv TEST_*.md docs/05-archive/implementation-reports/
mv SUMMARY_*.md docs/05-archive/implementation-reports/
mv *_SUMMARY.md docs/05-archive/implementation-reports/
mv *_OPTIMIZATION.md docs/05-archive/experiment-records/
```

### 第四步：删除临时文件

```bash
rm -f WORK_SUMMARY.md FINAL-SUMMARY.md ds_r1.md winfix.md
```

### 第五步：创建索引

创建 `docs/INDEX.md` 作为主索引。

---

## 📋 文档命名规范

1. **使用小写字母和连字符**
   - ✅ good: `slash-commands.md`
   - ❌ bad: `SLASH_COMMANDS_GUIDE.md`

2. **使用描述性名称**
   - ✅ good: `thinking-feature-optimization.md`
   - ❌ bad: `THINKING_OPTIMIZATION_SUMMARY.md`

3. **避免使用日期**（除非是历史记录）
   - ✅ good: `ui-improvements.md`
   - ❌ bad: `UI_IMPROVEMENTS_2025-01-18.md`

---

## 💡 额外建议

### 1. 创建文档模板

为不同类型的文档创建模板，确保格式统一。

### 2. 设置文档规范

- 规定文档必须包含的章节
- 规定代码示例的格式
- 规定更新日期的标注

### 3. 定期清理

- 每月检查一次文档
- 归档过时的文档
- 删除临时性文档

### 4. 自动化工具

- 使用工具检查文档链接
- 使用工具生成目录
- 使用工具检查拼写

---

## 🎯 推荐理由

采用**三级分类法**，因为：

- ✅ 结构清晰，易于导航
- ✅ 符合用户查找习惯
- ✅ 便于维护和更新
- ✅ 适合中小型项目

---

## 📊 实施优先级

1. 🔴 **高优先级**：创建目录结构，移动核心文档
2. 🟡 **中优先级**：归档历史文档，创建索引
3. 🟢 **低优先级**：删除临时文件，完善文档模板

---

## 🤔 需要你的决策

请告诉我：

1. **是否采用这个方案？** 或者你有其他想法？
2. **是否需要我帮你实施？** 我可以：
   - 创建新的目录结构
   - 移动和重命名文档
   - 创建文档索引
   - 生成整理报告

3. **是否需要调整？** 比如：
   - 修改目录结构
   - 调整分类方式
   - 添加其他分类标准

---

**创建日期**: 2025-01-18
**作者**: Closer AI Assistant
