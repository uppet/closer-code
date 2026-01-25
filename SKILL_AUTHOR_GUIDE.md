# 🎯 Skill Author - 使用指南

## 概述

`skill-author` 是一个专门帮助用户创建、编写和改进 Cloco skills 的元技能（meta-skill）。它提供了完整的模板、最佳实践、示例和故障排除指南。

## 技能信息

**名称**: `skill-author`
**描述**: Expert at helping users create, structure, and write Cloco skills. Provides templates, best practices, and guidance for skill development.
**位置**: `.closer-code/skills/skill-author/skill.md`
**大小**: 14,091 bytes
**内容**: 755行，124个标题，34个代码块，26个表格

## 功能特性

### 1. 📝 技能结构指导
- 解释必需的 skill.md 格式
- 描述 front-matter 字段（name, description）
- 展示如何组织技能内容
- 提供技能目录结构

### 2. 🎨 模板生成
- 基础技能模板
- 高级技能模板（带参数）
- 专用模板（工具、分析、自动化）
- 快速开始模板

### 3. ✨ 最佳实践
- 命名约定
- 描述写作技巧
- 内容组织
- 参数文档
- 示例创建

### 4. 🔧 故障排除
- 常见技能格式错误
- Front-matter 验证
- 内容结构问题
- 加载问题

## 使用方法

### 方法1: 通过 AI 助手使用

```
用户: 我想创建一个新的 Cloco skill，能帮我吗？

AI: 当然可以！让我加载 skill-author 技能来帮助你。

[AI 加载 skill-author 技能]

AI: 现在我可以使用 skill-author 的专业知识来帮助你创建技能。
你想创建什么类型的技能？它应该做什么？
```

### 方法2: 直接参考文档

你也可以直接查看 `.closer-code/skills/skill-author/skill.md` 文件，获取完整的指导。

## 技能内容结构

skill-author skill 包含以下主要部分：

### 1. Overview（概述）
- 技能的核心能力
- 适用场景

### 2. Skill Structure（技能结构）
- 必需的格式
- 目录结构
- skill.md 格式

### 3. Front-Matter Fields（Front-matter 字段）
- 必需字段（name, description）
- 可选字段
- 字段验证规则

### 4. Skill Templates（技能模板）
- 模板1: 基础技能（最小）
- 模板2: 高级技能（带参数）
- 模板3: 工具/实用技能

### 5. Best Practices（最佳实践）
- 命名约定
- 描述写作
- 内容组织
- 示例创建
- 参数文档
- 测试技能

### 6. Common Mistakes（常见错误）
- Front-matter 错误
- 缺少必需字段
- 命名不当
- 描述模糊

### 7. Skill Categories（技能分类）
- 开发技能
- 文档技能
- 自动化技能
- 数据技能
- DevOps技能

### 8. Advanced Features（高级特性）
- 多文件技能
- 动态内容
- 版本控制

### 9. Examples by Use Case（用例示例）
- 代码分析技能
- 文档技能
- 自动化技能

### 10. Troubleshooting（故障排除）
- 技能未加载
- Front-matter 无效
- 性能问题

## 快速开始

### 创建你的第一个技能

1. **使用 skill-author 获取指导**
   ```
   用户: 帮我创建一个代码审查技能
   
   AI: [加载 skill-author]
   
   根据 skill-author 的指导，我们需要：
   1. 创建技能目录
   2. 编写 skill.md 文件
   3. 定义 front-matter
   4. 编写技能内容
   ```

2. **使用基础模板**
   ```markdown
   ---
   name: code-reviewer
   description: "Reviews code for bugs, security issues, and best practices"
   ---
   
   # Code Reviewer
   
   ## Overview
   [描述]
   
   ## When to Use
   [使用场景]
   
   ## Examples
   [示例]
   ```

3. **测试技能**
   ```bash
   # 技能应该自动被发现
   node -e "import { SkillRegistry } from './src/skills/registry.js'; 
            const r = new SkillRegistry({ projectDir: '.closer-code/skills' });
            r.initialize().then(() => r.discover().then(s => 
              console.log(s.map(x => x.name))))"
   ```

## 技能模板参考

### 最小技能模板

```markdown
---
name: your-skill
description: "Brief description"
---

# Skill Title

## Overview
[Purpose]

## When to Use
[Use cases]

## Examples
[Examples]
```

### 完整技能模板

参见 skill-author skill 中的"Template 2: Advanced Skill"部分。

## 最佳实践摘要

### ✅ DO（推荐）

1. **命名**: 使用 kebab-case
   - ✅ `code-reviewer`
   - ✅ `api-tester`

2. **描述**: 清晰具体
   - ✅ `"Analyzes code for bugs and security issues"`

3. **结构**: 完整组织
   - Overview → When to Use → Parameters → Examples → Best Practices

### ❌ DON'T（避免）

1. **命名**: 避免错误格式
   - ❌ `CodeReviewer`（错误大小写）
   - ❌ `code_reviewer`（使用连字符，不用下划线）
   - ❌ `helper`（太模糊）

2. **描述**: 避免模糊
   - ❌ `"A helpful tool"`（太模糊）
   - ❌ `"This skill does..."`（浪费空间）

## 验证清单

创建技能后，使用此清单验证：

- [ ] 文件名是 `skill.md`（大小写不敏感）
- [ ] Front-matter 包含 `name` 和 `description`
- [ ] `name` 使用 kebab-case
- [ ] `description` 清晰具体（50-150字符）
- [ ] 内容包含 Overview, When to Use, Examples
- [ ] 至少包含一个使用示例
- [ ] YAML 格式正确
- [ ] Markdown 格式正确
- [ ] 技能可以被发现
- [ ] 技能可以完整加载

## 常见问题

### Q: 技能未被发现？

**A**: 检查：
1. 文件是否在正确的目录（`.closer-code/skills/your-skill/skill.md`）
2. 文件名是否正确（`skill.md`，大小写不敏感）
3. Front-matter 是否有效
4. 是否包含必需字段

### Q: Front-matter 解析错误？

**A**: 检查：
1. YAML 格式是否正确
2. 字段值是否用引号包裹
3. 是否有未闭合的引号
4. 缩进是否正确

### Q: 描述应该多长？

**A**: 
- 最小: 50 字符
- 推荐: 100-150 字符
- 最大: 200 字符
- 格式: 纯文本，无 markdown

## 相关资源

### 官方文档
- Cloco Skills 系统: [参见 SKILLS_README.md]
- Skills API: [参见源代码 src/skills/]

### 示例技能
- `docs-tidy`: 文档整理技能
- `hello-world`: 简单示例技能
- `skill-author`: 本技能（元技能）

### 工具
- YAML 验证器: https://www.yamllint.com/
- Markdown Linter: https://markdownlint.com/

## 贡献

如果你改进了技能模板或发现了新的最佳实践，欢迎更新 skill-author skill！

## 更新日志

### v1.0.0 (2025-01-18)
- ✅ 初始版本
- ✅ 3个技能模板
- ✅ 完整的最佳实践指南
- ✅ 故障排除部分
- ✅ 多个示例

## 作者

**Created by**: Cloco AI Assistant
**Date**: 2025-01-18
**Version**: 1.0.0

---

**享受创建 Cloco skills 的乐趣！** 🎉

如有问题，使用 skill-author 技能获取帮助！
