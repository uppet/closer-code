# Cloco Skills 功能 - 最终设计文档

## 概述

Cloco Skills 是一个基于 Markdown 的技能系统，允许用户用自然语言定义技能，AI 可以自动发现、加载并使用这些技能。

### 核心特性

- ✅ **简单易用**: YAML front-matter + Markdown 格式
- ✅ **AI 自主**: 自动发现和加载技能
- ✅ **动态加载**: 按需加载，优化性能
- ✅ **行业标准**: 与 OpenAI、Cursor 等一致

## 技能格式

### 标准格式

基于行业标准（OpenAI、Cursor、Windsurf），使用 YAML front-matter：

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
- Be ready to go back and clarify when something doesn't make sense
```

### 必需字段

```yaml
---
name: skill-name              # 必需：技能唯一标识符
description: "描述"           # 必需：告诉 AI 何时使用
---
```

### 可选字段

可以在 front-matter 中添加更多元数据（但系统不解析，仅供参考）：

```yaml
---
name: skill-name
description: "描述"
category: "git | code | files | deploy | analysis | general"
version: "1.0.0"
author: "作者"
tags: ["tag1", "tag2"]
---
```

## 解析机制

### 最小化解析原则

**只解析必需字段**：
- `name`: 技能名称
- `description`: 技能描述

**完整内容传递给 AI**：
- 所有 Markdown 内容
- AI 自然理解并使用

### 解析逻辑

```javascript
class SkillParser {
  /**
   * 解析技能文件
   */
  async parse(skillPath) {
    const content = await fs.readFile(skillPath, 'utf-8');

    // 提取 YAML front-matter
    const frontmatter = this.extractFrontmatter(content);
    
    // 移除 front-matter，保留完整内容
    const contentWithoutFrontmatter = this.removeFrontmatter(content);

    return {
      // 解析的字段
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
   * 提取 YAML front-matter
   */
  extractFrontmatter(content) {
    const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
    if (!match) {
      throw new Error('Invalid skill format: missing frontmatter');
    }

    // 简单解析 name 和 description
    const result = {};
    const lines = match[1].split('\n');

    for (const line of lines) {
      const m = line.match(/^(\w+):\s*"?(.+?)"?$/);
      if (m) {
        result[m[1]] = m[2].replace(/^"|"$/g, '').replace(/^'|"$/g, '');
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
  }

  /**
   * 移除 front-matter
   */
  removeFrontmatter(content) {
    return content.replace(/^---\r?\n[\s\S]+?\r?\n---\r?\n?/, '');
  }
}
```

### 数据结构

```javascript
{
  name: "brainstorming",
  description: "You MUST use this before any creative work...",
  content: "# Brainstorming Ideas Into Designs\n\n## Overview\n\n...",
  path: "/Users/user/.closer-code/skills/brainstorming/skill.md",
  directory: "/Users/user/.closer-code/skills/brainstorming"
}
```

## 动态加载机制

### 核心工具

#### Tool 1: skillDiscover

发现可用的技能。

```javascript
{
  name: 'skillDiscover',
  description: `发现可用的技能。

当用户需求可能需要特定技能时，使用此工具查看可用的技能列表。

**使用场景**：
- 用户提到特定领域（如 Git、部署、代码审查）
- 当前工具无法满足用户需求
- 需要了解有哪些专业能力可用

**返回**：
- 技能列表（名称、描述）
- 技能总数
- 搜索关键词匹配`,

  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '搜索关键词（可选）'
      },
      category: {
        type: 'string',
        description: '筛选分类（可选）'
      }
    }
  },

  run: async (input) => {
    const skills = await skillRegistry.discover(input);
    
    return {
      success: true,
      skills: skills.map(s => ({
        name: s.name,
        description: s.description
      })),
      total: skills.length,
      query: input.query
    };
  }
}
```

#### Tool 2: skillLoad

加载指定的技能。

```javascript
{
  name: 'skillLoad',
  description: `加载指定的技能，使其在当前对话中可用。

**使用时机**：
1. 通过 skillDiscover 发现相关技能后
2. 用户明确提到某个技能名称
3. 当前工具无法完成用户需求

**加载成功后**：
- 技能的完整内容将被添加到系统上下文
- 模型可以使用技能描述中说明的能力

**失败处理**：
- 如果技能不存在或加载失败，使用原有能力解决问题`,

  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: '技能名称（必需）'
      }
    },
    required: ['name']
  },

  run: async (input) => {
    try {
      const skill = await skillRegistry.loadByName(input.name);

      if (!skill) {
        return {
          success: false,
          error: `技能 "${input.name}" 未找到`,
          hint: '使用 skillDiscover 查看可用技能'
        };
      }

      // 添加到会话状态
      conversationState.addSkill(skill);

      return {
        success: true,
        skill: {
          name: skill.name,
          description: skill.description,
          content: skill.content
        },
        message: `技能 "${skill.name}" 已加载。`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        hint: '使用原有能力解决问题'
      };
    }
  }
}
```

### 加载流程

```
用户请求
    ↓
AI 分析需求
    ↓
需要特定技能？
    ├─ 否 → 使用现有工具
    └─ 是 → skillDiscover
            ↓
        返回可用技能列表
            ↓
        AI 选择技能
            ↓
        skillLoad
            ↓
        解析 skill.md
            ↓
        添加到会话状态
            ↓
        更新 System Prompt
            ↓
        AI 阅读并理解
            ↓
        使用技能
```

### System Prompt 更新

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

## 文件组织

### 目录结构

```
~/.closer-code/skills/              # 全局技能目录
│
├── brainstorming/
│   └── skill.md
│
├── git-commit/
│   ├── skill.md
│   └── commit.sh                  # 可选：参考脚本
│
├── code-review/
│   ├── skill.md
│   └── checklist.md               # 可选：检查清单
│
└── deploy-app/
    ├── skill.md
    ├── deploy.sh                  # 可选：部署脚本
    └── config.example.json        # 可选：配置示例

.closer-code/skills/                # 项目本地技能
│
├── test-runner/
│   └── skill.md
│
└── deploy-prod/
    └── skill.md
```

### 优先级

**项目本地 > 全局**

同名技能时，项目本地的优先。

## 配置

### config.json

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
      "file-read",
      "file-write"
    ]
  }
}
```

### 配置说明

- `enabled`: 是否启用技能系统
- `directories.global`: 全局技能目录
- `directories.project`: 项目本地技能目录
- `resident`: 常驻技能列表（始终加载，无需动态加载）

## 使用示例

### 示例 1: 创建技能

```bash
# 1. 创建目录
mkdir -p ~/.closer-code/skills/hello-world

# 2. 创建 skill.md
cat > ~/.closer-code/skills/hello-world/skill.md << 'EOF'
---
name: hello-world
description: "Say hello to the world or a specific person"
---

# Hello World

## Overview

This skill says hello to the world or a specific person.

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| name | string | ❌ | World | Name to greet |

## Examples

### Greet the world
\`\`\`bash
/hello-world
\`\`\`

### Greet a specific person
\`\`\`bash
/hello-world --name=Alice
\`\`\`

## Process

1. Read the `name` parameter (default: "World")
2. Output "Hello, {name}!"
EOF

# 3. 完成！
```

### 示例 2: 使用技能

```
用户: 帮我使用 hello-world 技能

AI: 我来加载 hello-world 技能。

[调用 skillLoad({ name: 'hello-world' })]

系统返回：
{
  success: true,
  skill: {
    name: "hello-world",
    description: "Say hello to the world...",
    content: "# Hello World\n\n## Overview\n..."
  }
}

[System Prompt 更新：添加完整的技能内容]

AI 阅读 System Prompt 中的技能文档...

AI: 已加载 hello-world 技能。根据文档，我可以向你打招呼！
默认是 "Hello, World!"，需要指定名字吗？

用户: 叫 Alice

AI: Hello, Alice!
```

### 示例 3: 自动发现和加载

```
用户: 帮我提交代码

AI: 我可以使用 Git 相关技能。让我先查看可用的技能。

[调用 skillDiscover({ query: 'git commit' })]

系统返回：
{
  skills: [
    { name: 'git-commit', description: 'Quickly commit and push...' },
    { name: 'git-commit-push', description: 'Commit and push...' }
  ],
  total: 2
}

AI: 我找到了 git-commit 技能，让我加载它。

[调用 skillLoad({ name: 'git-commit' })]

系统返回：{ success: true, ... }

AI: 已加载 git-commit 技能。请提供提交消息。

用户: 修复登录bug

AI: 好的，执行 git-commit 技能：
1. git add .
2. git commit -m "修复登录bug"
3. git push origin main

✓ 完成
```

## 技术架构

### 核心组件

```
┌─────────────────────────────────────────────────────────┐
│                    Cloco Skills 系统                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │     Skill Registry (技能注册表)                │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │    │
│  │  │ 常驻技能 │  │ 可用技能 │  │ 已加载   │      │    │
│  │  └──────────┘  └──────────┘  └──────────┘      │    │
│  └────────────────────────────────────────────────┘    │
│                    ↓                                     │
│  ┌────────────────────────────────────────────────┐    │
│  │     Skill Parser (技能解析器)                  │    │
│  │  • 提取 YAML front-matter                      │    │
│  │  • 解析 name 和 description                    │    │
│  │  • 保留完整 content                            │    │
│  └────────────────────────────────────────────────┘    │
│                    ↓                                     │
│  ┌────────────────────────────────────────────────┐    │
│  │     Auto Discovery (自动发现)                  │    │
│  │  • skillDiscover tool                          │    │
│  │  • skillLoad tool                              │    │
│  └────────────────────────────────────────────────┘    │
│                    ↓                                     │
│  ┌────────────────────────────────────────────────┐    │
│  │     Conversation State (会话状态)              │    │
│  │  • 管理已加载的技能                            │    │
│  │  • 更新 System Prompt                          │    │
│  └────────────────────────────────────────────────┘    │
│                    ↓                                     │
│  ┌────────────────────────────────────────────────┐    │
│  │     AI Client (AI 集成)                        │    │
│  │  • 动态更新 System Prompt                      │    │
│  │  • 处理工具调用                                │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 关键类

```javascript
// 技能解析器
class SkillParser {
  async parse(skillPath) { /* ... */ }
}

// 技能注册表
class SkillRegistry {
  async initialize() { /* 加载常驻技能 */ }
  async discover(options) { /* 发现可用技能 */ }
  async loadByName(name) { /* 加载指定技能 */ }
}

// 会话状态
class ConversationState {
  addSkill(skill) { /* 添加技能 */ }
  getActiveSkills() { /* 获取已加载技能 */ }
  hasActiveSkills() { /* 检查是否有已加载技能 */ }
}
```

## 实现计划

### Phase 1: 核心（MVP）

**目标**: 实现基本的技能系统

- [ ] **Skill Parser**
  - [ ] 解析 YAML front-matter
  - [ ] 提取 name 和 description
  - [ ] 保留完整 content
  - [ ] 错误处理和验证

- [ ] **Skill Registry**
  - [ ] 扫描技能目录
  - [ ] 快速发现（只读 front-matter）
  - [ ] 完整加载（包含 content）
  - [ ] 常驻技能支持

- [ ] **Tools**
  - [ ] skillDiscover tool 实现
  - [ ] skillLoad tool 实现

- [ ] **AI 集成**
  - [ ] System Prompt 动态更新
  - [ ] 会话状态管理
  - [ ] 工具调用处理

### Phase 2: 增强

**目标**: 提升用户体验

- [ ] **会话管理**
  - [ ] 技能生命周期管理
  - [ ] 技能卸载
  - [ ] 技能状态查询

- [ ] **错误处理**
  - [ ] 技能加载失败降级
  - [ ] 友好的错误提示
  - [ ] 技能验证

- [ ] **性能优化**
  - [ ] 技能缓存
  - [ ] 快速扫描优化

### Phase 3: 高级特性

**目标**: 高级功能和优化

- [ ] **智能推荐**
  - [ ] 基于上下文推荐技能
  - [ ] 自动加载规则

- [ ] **监控和调试**
  - [ ] 技能使用统计
  - [ ] 性能监控
  - [ ] 调试日志

- [ ] **扩展功能**
  - [ ] 技能依赖管理
  - [ ] 技能版本控制
  - [ ] 技能分享机制

## 核心原则

### 1. 简单优先

- YAML front-matter 格式（行业标准）
- 只需 name 和 description 两个必需字段
- Markdown 内容自由编写
- 最小化解析逻辑

### 2. AI 自主

- AI 自动识别需求
- AI 自主发现和加载技能
- AI 自然理解技能内容
- AI 根据技能文档执行任务

### 3. 性能优化

- 动态加载（按需）
- 短 Prompt（只传递已加载技能）
- 快启动（不加载所有技能）
- 智能缓存

### 4. 用户友好

- 自然语言编写
- 不受固定字段限制
- 易于维护和更新
- 灵活扩展

## 技术栈

- **Node.js**: 运行时
- **Anthropic API**: AI 理解和执行
- **Markdown**: 技能格式
- **YAML front-matter**: 元数据格式
- **文件系统**: 技能存储

## 参考资源

- **示例文件**: `docs/example_skill.md`
- **格式规范**: `docs/skills_final_format_spec.md`
- **快速参考**: `docs/skills_format_quick_reference.md`

## 总结

Cloco Skills 是一个简单、智能、高效的技能系统：

- ✅ **格式简单**: YAML front-matter + Markdown
- ✅ **解析简单**: 只提取 name 和 description
- ✅ **AI 自主**: 自动发现、加载、理解、使用
- ✅ **动态加载**: 按需加载，优化性能
- ✅ **行业标准**: 与 OpenAI、Cursor 等一致

**核心思想**: 让 AI 做它擅长的事（理解自然语言），让系统做它擅长的事（解析结构化数据）。

---

**版本**: 1.0.0
**状态**: 设计完成，待实现
**最后更新**: 2025-01-XX
