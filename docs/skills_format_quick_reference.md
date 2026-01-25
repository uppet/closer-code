# Skills 格式快速参考

## 标准格式

```markdown
---
name: skill-name
description: "简短描述，告诉 AI 何时使用这个技能"
---

# Skill Title

## Overview

技能的详细说明...

## The Process

步骤说明...

## Examples

示例...
```

## 解析规则

### 系统解析（只读前几行）

```javascript
{
  name: "从 front-matter 提取",
  description: "从 front-matter 提取",
  content: "剩余所有内容（AI 理解）"
}
```

### AI 理解（完整内容）

- Overview
- Process
- Examples
- Notes
- 等等...

## 最小格式

```markdown
---
name: my-skill
description: "My skill description"
---

# My Skill

Content...
```

## 完整示例

参考：`docs/example_skill.md`

## 创建技能

```bash
# 1. 创建目录
mkdir -p ~/.closer-code/skills/my-skill

# 2. 创建 skill.md
cat > ~/.closer-code/skills/my-skill/skill.md << 'EOF'
---
name: my-skill
description: "What this skill does"
---

# My Skill

## Overview

Detailed description...
EOF

# 3. 完成！
```

## 验证格式

### ✅ 正确格式

```markdown
---
name: skill-name
description: "Description"
---

# Title

Content...
```

### ❌ 错误格式

缺少 front-matter：
```markdown
# Title

Content...
```

缺少 name：
```markdown
---
description: "Description"
---

# Title
```

## 关键点

1. **必须**使用 YAML front-matter（`--- ... ---`）
2. **必须**包含 `name` 字段
3. **必须**包含 `description` 字段
4. 其余内容自由编写，AI 会理解

## 相关文档

- [最终格式规范](./skills_final_format_spec.md) - 详细说明
- [example_skill.md](../example_skill.md) - 完整示例
- [快速上手指南](./skills_quick_start.md) - 如何创建

---

**版本**: Final
**基于**: example_skill.md
**标准**: OpenAI, Cursor, Windsurf 等
