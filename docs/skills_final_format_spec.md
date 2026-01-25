# Skills 格式规范（最终版）

## 格式标准

基于行业标准（OpenAI、Cursor 等），使用 YAML front-matter：

```markdown
---
name: brainstorming
description: "You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation."
---

# Brainstorming Ideas Into Designs

## Overview

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

...更多内容...
```

## 解析策略

### 最小化解析

**只解析两个必需字段**：
- `name`: 技能名称
- `description`: 技能描述

**其余全部作为 content 传递给 AI**：
- Overview
- Process
- Examples
- Notes
- 等等...

### 解析逻辑

```javascript
class SkillParser {
  /**
   * 最小化解析：只提取 name 和 description
   */
  async parse(skillPath) {
    const content = await fs.readFile(skillPath, 'utf-8');

    // 提取 YAML front-matter（前几行）
    const frontmatter = this.extractFrontmatter(content);

    // 移除 front-matter，剩余是完整内容
    const contentWithoutFrontmatter = this.removeFrontmatter(content);

    return {
      // 只解析这两个字段
      name: frontmatter.name,
      description: frontmatter.description,

      // 完整内容（AI 理解）
      content: contentWithoutFrontmatter,

      // 文件信息
      path: skillPath,
      directory: path.dirname(skillPath)
    };
  }

  /**
   * 提取 YAML front-matter（--- ... ---）
   */
  extractFrontmatter(content) {
    const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
    if (!match) {
      throw new Error('Invalid skill format: missing frontmatter');
    }

    try {
      // 只解析 name 和 description
      const yaml = match[1];
      const lines = yaml.split('\n');
      const result = {};

      for (const line of lines) {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          const [, key, value] = match;
          // 移除引号
          result[key] = value.replace(/^"|"$/g, '').replace(/^'|"$/g, '');
        }
      }

      // 验证必需字段
      if (!result.name) {
        throw new Error('Missing required field: name');
      }
      if (!result.description) {
        throw new Error('Missing required field: description');
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to parse frontmatter: ${error.message}`);
    }
  }

  /**
   * 移除 front-matter
   */
  removeFrontmatter(content) {
    return content.replace(/^---\r?\n[\s\S]+?\r?\n---\r?\n?/, '');
  }
}
```

### 使用 YAML 解析库（可选）

如果需要更健壮的解析，可以使用 js-yaml：

```bash
npm install js-yaml
```

```javascript
import yaml from 'js-yaml';

extractFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
  if (!match) {
    throw new Error('Invalid skill format: missing frontmatter');
  }

  try {
    const frontmatter = yaml.parse(match[1]);

    // 验证必需字段
    if (!frontmatter.name) {
      throw new Error('Missing required field: name');
    }
    if (!frontmatter.description) {
      throw new Error('Missing required field: description');
    }

    return {
      name: frontmatter.name,
      description: frontmatter.description
    };
  } catch (error) {
    throw new Error(`Failed to parse frontmatter: ${error.message}`);
  }
}
```

## 数据结构

### 解析结果

```javascript
{
  name: "brainstorming",
  description: "You MUST use this before any creative work...",
  content: "# Brainstorming Ideas Into Designs\n\n## Overview\n\n...",
  path: "/Users/user/.closer-code/skills/brainstorming/skill.md",
  directory: "/Users/user/.closer-code/skills/brainstorming"
}
```

### skillDiscover 返回

```javascript
{
  success: true,
  skills: [
    {
      name: "brainstorming",
      description: "You MUST use this before any creative work..."
    },
    {
      name: "git-commit",
      description: "Quickly commit and push Git changes."
    }
  ],
  total: 2
}
```

### skillLoad 返回

```javascript
{
  success: true,
  skill: {
    name: "brainstorming",
    description: "You MUST use this before any creative work...",
    content: "# Brainstorming Ideas Into Designs\n\n## Overview\n\n..."
  },
  message: "技能 brainstorming 已加载。"
}
```

## System Prompt 更新

```javascript
function buildSystemPrompt(activeSkills) {
  let prompt = baseSystemPrompt;

  if (activeSkills.length > 0) {
    prompt += '\n\n## 已加载的技能\n\n';
    prompt += '以下是已加载技能的完整文档：\n\n';

    for (const skill of activeSkills) {
      prompt += `### ${skill.name}\n\n`;
      prompt += `${skill.description}\n\n`;
      prompt += `${skill.content}\n\n`;
      prompt += '---\n\n';
    }

    prompt += '现在你可以使用这些技能了。请仔细阅读技能文档，理解其能力和使用方式，然后帮助用户完成任务。\n';
  }

  return prompt;
}
```

## 示例文件

### 示例 1: brainstorming（行业标准）

**文件：`~/.closer-code/skills/brainstorming/skill.md`**

```markdown
---
name: brainstorming
description: "You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation."
---

# Brainstorming Ideas Into Designs

## Overview

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

Start by understanding the current project context, then ask questions one at a time to refine the idea. Once you understand what you're building, present the design in small sections (200-300 words), checking after each section whether it looks right so far.

## The Process

**Understanding the idea:**
- Check out the current project state first (files, docs, recent commits)
- Ask questions one at a time to refine the idea
- Prefer multiple choice questions when possible, but open-ended is fine too
- Only one question per message - if a topic needs more exploration, break it into multiple questions
- Focus on understanding: purpose, constraints, success criteria

**Exploring approaches:**
- Propose 2-3 different approaches with trade-offs
- Present options conversationally with your recommendation and reasoning
- Lead with your recommended option and explain why

**Presenting the design:**
- Once you believe you understand what you're building, present the design
- Break it into sections of 200-300 words
- Ask after each section whether it looks right so far
- Cover: architecture, components, data flow, error handling, testing
- Be ready to go back and clarify if something doesn't make sense

## After the Design

**Documentation:**
- Write the validated design to `docs/plans/YYYY-MM-DD-<topic>-design.md`
- Commit the design document to git

**Implementation (if continuing):**
- Ask: "Ready to set up for implementation?"
- Create isolated workspace
- Create detailed implementation plan

## Key Principles

- **One question at a time** - Don't overwhelm with multiple questions
- **Multiple choice preferred** - Easier to answer than open-ended when possible
- **YAGNI ruthlessly** - Remove unnecessary features from all designs
- **Explore alternatives** - Always propose 2-3 approaches before settling
- **Incremental validation** - Present design in sections, validate each
- **Be flexible** - Go back and clarify when something doesn't make sense
```

### 示例 2: git-commit

**文件：`~/.closer-code/skills/git-commit/skill.md`**

```markdown
---
name: git-commit
description: "Quickly commit and push Git changes. Use this when user wants to save their work to the repository."
---

# Git Commit

## Overview

Quickly commit and push Git changes to the remote repository.

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| message | string | ✅ | - | Commit message |
| branch | string | ❌ | main | Target branch |

## The Process

1. Run `git add .` to stage all changes
2. Run `git commit -m "{message}"` to create commit
3. Run `git push origin {branch}` to push to remote

## Examples

### Basic commit
```bash
/git-commit --message="Fix login bug"
```

### Commit to specific branch
```bash
/git-commit --message="New feature" --branch=develop
```

## Notes

- ⚠️ Ensure Git user info is configured
- ⚠️ Check changes before committing
```

### 示例 3: code-review

**文件：`~/.closer-code/skills/code-review/skill.md`**

```markdown
---
name: code-review
description: "Perform comprehensive code review including security, performance, and style checks. Use this when user wants to review code quality."
---

# Code Review

## Overview

Perform comprehensive code review covering security vulnerabilities, performance optimization opportunities, and style consistency.

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| file | string | ✅ | - | File path to review |
| focus | string | ❌ | all | Review focus: security / performance / style / all |

## The Process

**1. Read the file**
- Use readFile tool to read the file content

**2. Analyze based on focus**

**Security:**
- SQL injection risks
- XSS vulnerabilities
- Authentication issues

**Performance:**
- Algorithm complexity
- Resource usage
- Caching strategies

**Style:**
- Naming conventions
- Code formatting
- Comment quality

**3. Generate report**
- Overall rating
- Critical issues
- Warnings
- Suggestions

## Examples

### Full review
```bash
/code-review --file=src/app.js
```

### Security focused
```bash
/code-review --file=src/auth.js --focus=security
```

## Output Format

📊 **Overall Assessment**
- Security: X/10
- Performance: X/10
- Style: X/10

🔴 **Critical Issues** (Must Fix)
- Issue 1
- Issue 2

🟡 **Warnings** (Should Fix)
- Warning 1
- Warning 2

💡 **Optimizations**
- Suggestion 1
- Suggestion 2

✅ **What's Done Well**
- Good practice 1
- Good practice 2
```

## 文件结构

```
~/.closer-code/skills/
├── brainstorming/
│   └── skill.md
├── git-commit/
│   └── skill.md
├── code-review/
│   └── skill.md
└── deploy-app/
    └── skill.md
```

## 格式验证

### 必需格式

```markdown
---
name: skill-name
description: "Skill description"
---

# Skill Title

Content...
```

### 验证规则

1. **必须以 `---` 开始**
2. **必须包含 `name` 字段**
3. **必须包含 `description` 字段**
4. **必须以 `---` 结束 front-matter**
5. **后面必须跟内容**

### 错误示例

❌ 缺少 front-matter：
```markdown
# Skill Title

Content...
```

❌ 缺少 name：
```markdown
---
description: "Description"
---

# Title
```

❌ 缺少 description：
```markdown
---
name: skill-name
---

# Title
```

## 实现要点

### 1. 简单解析

```javascript
// 只解析前几行
const lines = content.split('\n');
let inFrontmatter = false;
let frontmatterLines = [];

for (const line of lines) {
  if (line === '---') {
    if (!inFrontmatter) {
      inFrontmatter = true;
    } else {
      break; // front-matter 结束
    }
  } else if (inFrontmatter) {
    frontmatterLines.push(line);
  }
}

// 解析 name 和 description
const frontmatter = {};
for (const line of frontmatterLines) {
  const match = line.match(/^(\w+):\s*"?(.+?)"?$/);
  if (match) {
    frontmatter[match[1]] = match[2];
  }
}
```

### 2. 错误处理

```javascript
if (!frontmatter.name) {
  throw new Error('Missing required field: name');
}

if (!frontmatter.description) {
  throw new Error('Missing required field: description');
}
```

### 3. 内容提取

```javascript
// 移除 front-matter，保留所有内容
const contentWithoutFrontmatter = content.replace(
  /^---\r?\n[\s\S]+?\r?\n---\r?\n?/,
  ''
);
```

## 总结

**最终格式规范**：

1. ✅ **YAML front-matter**: 行业标准格式
2. ✅ **只解析 name 和 description**: 最小化解析
3. ✅ **完整内容给 AI**: 其余全部作为 content
4. ✅ **简单可靠**: 不需要复杂解析器
5. ✅ **易于编写**: 用户友好的格式

**核心原则**：
- 解析：只读前几行，提取 name 和 description
- AI 理解：完整 content 传递给模型
- 格式：遵循行业标准（OpenAI、Cursor 等）

---

**相关文档**：
- [example_skill.md](../example_skill.md) - 完整示例
- [最终设计决策](./skills_final_design_decisions.md) - 设计总结
