# Cloco Skills 功能设计

## 快速了解

Cloco Skills 是一个基于 Markdown 的技能系统，让用户可以用自然语言定义技能，AI 自动发现、加载并使用。

### 核心特性

- ✅ **简单**: YAML front-matter + Markdown
- ✅ **智能**: AI 自动发现和加载
- ✅ **高效**: 动态加载，优化性能
- ✅ **标准**: 行业通用格式

## 技能格式

### 标准格式

```markdown
---
name: brainstorming
description: "You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation."
---

# Brainstorming Ideas Into Designs

## Overview

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

## The Process

**Understanding the idea:**
- Check out the current project state first (files, docs, recent commits)
- Ask questions one at a time to refine the idea
- Prefer multiple choice questions when possible, but open-ended is fine too
```

### 最小格式

```markdown
---
name: my-skill
description: "What this skill does"
---

# My Skill

Content...
```

## 工作原理

### 解析策略

**系统解析**（只读前几行）：
- 提取 `name`
- 提取 `description`

**AI 理解**（完整内容）：
- 所有 Markdown 内容
- 自然理解并使用

### 动态加载

```
用户请求
  ↓
AI 识别需求
  ↓
skillDiscover（发现技能）
  ↓
skillLoad（加载技能）
  ↓
AI 阅读、理解、使用
```

## 快速开始

### 1. 创建技能

```bash
mkdir -p ~/.closer-code/skills/my-skill

cat > ~/.closer-code/skills/my-skill/skill.md << 'EOF'
---
name: my-skill
description: "What this skill does"
---

# My Skill

## Overview

Detailed description...
EOF
```

### 2. 使用技能

```
用户: 帮我使用 my-skill

AI: 我来加载 my-skill 技能...
[skillLoad → AI 阅读文档]
AI: 根据技能文档，我可以帮你...
```

## 核心工具

### skillDiscover

发现可用的技能。

```javascript
skillDiscover({ query: 'git' })
// 返回：[{ name: 'git-commit', description: '...' }]
```

### skillLoad

加载指定的技能。

```javascript
skillLoad({ name: 'git-commit' })
// 返回：{ success: true, skill: { name, description, content } }
```

## 技术架构

```
Skill Parser (解析器)
  ↓
Skill Registry (注册表)
  ↓
Auto Discovery (自动发现)
  ↓
Conversation State (会话状态)
  ↓
AI Client (AI 集成)
```

## 文件组织

```
~/.closer-code/skills/      # 全局技能
├── brainstorming/
│   └── skill.md
├── git-commit/
│   └── skill.md
└── code-review/
    └── skill.md

.closer-code/skills/        # 项目本地技能
└── my-skill/
    └── skill.md
```

## 配置

```json
{
  "skills": {
    "enabled": true,
    "directories": {
      "global": "~/.closer-code/skills",
      "project": ".closer-code/skills"
    },
    "resident": [
      "git-status",
      "file-read"
    ]
  }
}
```

## 实现计划

### Phase 1: 核心（MVP）
- [ ] YAML front-matter 解析
- [ ] Skill Registry
- [ ] skillDiscover tool
- [ ] skillLoad tool
- [ ] System Prompt 更新

### Phase 2: 增强
- [ ] 会话状态管理
- [ ] 错误处理
- [ ] 性能优化

### Phase 3: 高级
- [ ] 智能推荐
- [ ] 监控和调试
- [ ] 扩展功能

## 核心原则

1. **简单优先**: 最小化解析，AI 理解
2. **AI 自主**: 自动发现和加载
3. **性能优化**: 动态加载，短 Prompt
4. **用户友好**: 自然语言编写

## 文档

- **[最终设计文档](./cloco_skills_final_design.md)** - 完整设计
- **[格式规范](./skills_final_format_spec.md)** - 详细格式
- **[快速参考](./skills_format_quick_reference.md)** - 一页纸参考
- **[示例文件](./example_skill.md)** - 完整示例

## 总结

**Cloco Skills = 简单格式 + AI 自主 + 动态加载**

- 格式：YAML front-matter + Markdown
- 解析：只提取 name 和 description
- AI：理解完整内容并使用
- 加载：按需动态加载

---

**版本**: 1.0.0
**状态**: 设计完成，待实现
