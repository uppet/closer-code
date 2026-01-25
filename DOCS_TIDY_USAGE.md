# 📚 Docs Tidy 技能 - 使用指南

## 技能概述

**docs-tidy** 是一位文档整理高手，它可以：
- 🔍 扫描指定目录下的所有文档
- 📊 分析文档的过时和多余程度
- 📝 生成详细的整理报告
- 💡 提供具体的清理建议

## 快速开始

### 1. 验证技能已安装

```bash
node test-docs-tidy-skill.js
```

你应该看到：
```
✅ docs-tidy 技能已成功创建！
✓ 发现 2 个技能:
  - hello-world
  - docs-tidy
```

### 2. 启动 Closer Code

```bash
node src/closer-cli.jsx
```

### 3. 使用技能

#### 方式一：分步使用

```
你: 请加载 docs-tidy 技能

AI: [加载技能并显示内容]

你: 请使用 docs-tidy 技能分析 docs 目录

AI: [执行分析，生成报告]
```

#### 方式二：一次性使用

```
你: 帮我整理一下 docs 目录下的文档

AI: 我来使用 docs-tidy 技能帮你分析文档...

[扫描 → 分析 → 生成报告]

✓ 已生成整理报告：docs_tidy_report.md
```

## 使用示例

### 示例 1：分析 docs 目录

```
你: 请使用 docs-tidy 技能分析 docs 目录

AI: 我来分析 docs 目录的文档情况。

[技能执行过程]

✓ 分析完成！报告已保存到：docs_tidy_report.md

📊 分析结果：
  - 扫描文件：23 个
  - 需要审查：5 个
  - 建议合并：2 个
  - 标记过时：1 个
  - 可以删除：0 个

详细建议请查看报告文件。
```

### 示例 2：分析特定子目录

```
你: 分析 src/docs 下的文档，输出到 src_docs_report.md

AI: 好的，我将分析 src/docs 目录并生成报告。

✓ 报告已生成：src_docs_report.md
```

### 示例 3：使用严格模式

```
你: 用严格模式分析 docs 目录

AI: 我将使用严格模式（high severity）进行分析。

✓ 报告已生成：docs_tidy_report.md
  注：严格模式会标记更多潜在问题
```

## 报告格式

生成的 `docs_tidy_report.md` 包含：

### 1. 执行摘要
```markdown
## Docs Tidy Report

**Analyzed**: docs/
**Files Scanned**: 23
**Issues Found**: 8
**Generated**: 2026-01-25

### Quick Stats
- ✅ Keep: 18 files
- ⚠️  Review: 5 files
- 🔀 Merge: 2 files
- ⚠️  Deprecate: 1 file
- ❌ Delete: 0 files
```

### 2. 详细分析

#### 需要审查的文件
```markdown
## Files to Review

### old-guide.md
- **Category**: REVIEW
- **Reason**: Similar content to new-guide.md
- **Similarity**: 85%
- **Recommendation**: 比较并合并独特内容
- **Confidence**: High
```

#### 建议合并的文件
```markdown
## Files to Merge

### tutorial-part1.md + tutorial-part2.md
- **Reason**: Sequential parts of same tutorial
- **Recommendation**: 合并为完整教程
- **New Name**: complete-tutorial.md
```

#### 过时的文件
```markdown
## Files to Deprecate

### api-v1.md
- **Category**: DEPRECATE
- **Reason**: 引用已弃用的 API v1.0
- **Last Updated**: 2023-01-15
- **Replacement**: api-v2.md
- **Confidence**: High
```

## 分析标准

### 多余程度判断

| 程度 | 相似度 | 说明 |
|------|--------|------|
| 高度多余 | 90%+ | 几乎完全重复 |
| 中度多余 | 70-90% | 大部分内容相似 |
| 轻度多余 | 50-70% | 部分内容重叠 |

### 过时程度判断

| 程度 | 时间 | 说明 |
|------|------|------|
| 严重过时 | >2年 | 内容明显过时 |
| 中度过时 | 1-2年 | 可能需要更新 |
| 轻度过时 | <1年 | 近期未更新 |

## 参数说明

### directory (必需)
要分析的目录路径
- 默认：`docs`
- 示例：`docs`, `src/docs`, `documentation`

### outputFile (可选)
输出报告文件名
- 默认：`docs_tidy_report.md`
- 示例：`cleanup_report.md`, `src_docs_analysis.md`

### severity (可选)
分析严格程度
- `low` - 宽松：只标记明显问题
- `medium` - 中等：平衡模式（推荐）
- `high` - 严格：标记所有潜在问题

## 最佳实践

### 1. 分析前
✅ 备份文档目录
✅ 确保有写权限
✅ 先用 medium 模式

### 2. 分析后
✅ 仔细阅读报告
✅ 不要立即删除
✅ 征求团队意见
✅ 使用版本控制

### 3. 清理时
✅ 先移动到 `deprecated/` 文件夹
✅ 添加弃用通知
✅ 更新内部链接
✅ 保留历史记录

## 常见问题

**Q: 技能会自动删除文件吗？**
A: 不会！它只生成建议报告。你需要手动审查和删除。

**Q: 如何恢复被删除的文件？**
A: 使用 Git 恢复：`git checkout -- <file>`

**Q: 可以分析非 Markdown 文件吗？**
A: 可以，但对 .md, .txt, .rst 文件效果最好。

**Q: 报告为空说明什么？**
A: 说明文档组织良好！可以尝试降低 severity 级别。

**Q: 相似度是如何计算的？**
A: 基于文本内容相似度，忽略常见标题和格式。

## 技能特性

### ✅ 智能分析
- 文本相似度检测
- 日期和版本分析
- 链接完整性检查
- 内容质量评估

### ✅ 详细报告
- 分类建议
- 具体原因
- 置信度评分
- 操作建议

### ✅ 安全优先
- 只提供建议
- 不自动删除
- 保留所有文件
- 需人工确认

## 进阶使用

### 自定义分析范围
```
你: 只分析 docs 目录下的 .md 文件，忽略 draft 文件夹

AI: 好的，我将自定义分析范围...
```

### 结合其他技能
```
你: 先用 docs-tidy 分析，然后用 file-organizer 整理

AI: 我将先分析文档，然后根据建议进行整理...
```

### 定期维护
```
你: 每月用 docs-tidy 检查一次文档

AI: 好的，我建议设置定期检查...
```

## 故障排除

**问题：技能未被发现**
```bash
# 检查文件是否存在
ls -la .closer-code/skills/docs-tidy/skill.md

# 重新测试
node test-docs-tidy-skill.js
```

**问题：报告未生成**
- 检查目录写权限
- 查看错误日志
- 确认目录路径正确

**问题：分析结果不准确**
- 尝试调整 severity 级别
- 检查文档格式
- 手动审查建议

## 相关文件

- **技能文件**：`.closer-code/skills/docs-tidy/skill.md`
- **测试脚本**：`test-docs-tidy-skill.js`
- **生成报告**：`docs_tidy_report.md`（运行后生成）

## 反馈和改进

如果你有任何建议或发现问题，欢迎：
1. 查看技能文件：`.closer-code/skills/docs-tidy/skill.md`
2. 修改分析标准
3. 调整报告格式
4. 添加新的分析维度

---

**祝文档整理愉快！📚✨**
