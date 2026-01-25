# Skills Quick Start Guide

## 快速开始

### 1. 验证安装

首先运行单元测试，确保系统正常工作：

```bash
node test-skills-phase1.js
```

你应该看到所有测试通过：

```
✅ All tests passed!
Test Results:
  - Config: ✓
  - Parser: ✓
  - Registry: ✓
  - Conversation State: ✓
  - Tools: ✓
```

### 2. 查看示例技能

系统已经创建了一个示例技能：`hello-world`

```bash
cat ~/.closer-code/skills/hello-world/skill.md
```

### 3. 测试技能发现

启动 Closer Code：

```bash
node src/closer-cli.jsx
```

然后尝试以下对话：

```
你: 请使用 skillDiscover 工具查看可用的技能

AI: [应该列出 hello-world 技能]
```

### 4. 测试技能加载

```
你: 请加载 hello-world 技能

AI: [应该加载技能并显示内容]
```

### 5. 测试技能使用

```
你: 请使用 hello-world 技能打招呼

AI: Hello, World!
```

## 创建自己的技能

### 步骤 1：创建目录

```bash
mkdir -p ~/.closer-code/skills/my-skill
```

### 步骤 2：创建 skill.md

```bash
cat > ~/.closer-code/skills/my-skill/skill.md << 'EOF'
---
name: my-skill
description: "A brief description of what this skill does and when to use it"
---

# My Skill Title

## Overview

Provide a clear overview of what this skill does.

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| param1 | string | ✅ | - | Description |
| param2 | number | ❌ | 10 | Description |

## Examples

### Example 1
Description of example 1
```
Code or command example
```

### Example 2
Description of example 2
```
Code or command example
```

## Process

Step-by-step instructions for the AI to follow:

1. First step
2. Second step
3. Third step

## Notes

Additional notes, warnings, or best practices.
EOF
```

### 步骤 3：测试技能

```bash
# 重新启动 Closer Code
node src/closer-cli.jsx

# 尝试发现新技能
你: 请使用 skillDiscover 查看可用的技能

# 应该能看到你的新技能
```

## 技能最佳实践

### 1. 描述要清晰

```yaml
---
# ❌ 不好的描述
description: "A git skill"

# ✅ 好的描述
description: "Use this when user wants to commit, push, or check Git status. Handles common Git operations."
---
```

### 2. 结构要清晰

```markdown
## Overview
简短说明（2-3句话）

## Process
分步骤说明

## Examples
提供具体示例

## Notes
注意事项
```

### 3. 使用表格

参数、选项等使用表格格式，更易读：

```markdown
## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| name | string | ✅ | - | Name to greet |
| loud | boolean | ❌ | false | Use uppercase |
```

### 4. 提供示例

给 AI 提供具体的使用示例：

```markdown
## Examples

### Greet the world
User: Say hello
AI: Hello, World!

### Greet loudly
User: Say hello loudly
AI: HELLO, WORLD!
```

## 常见问题

### Q: 技能没有被发现？

A: 检查以下几点：
1. 文件名必须是 `skill.md`
2. 文件必须在技能子目录中：`skills/my-skill/skill.md`
3. front-matter 格式必须正确：`---\nname: ...\ndescription: ...\n---`
4. name 和 description 字段不能为空

### Q: 技能加载失败？

A: 查看错误信息：
1. 检查 front-matter 格式
2. 确保 name 字段唯一
3. 查看 Console 日志获取详细错误

### Q: System Prompt 太长？

A: 这是正常的。技能的完整内容会被添加到 System Prompt 中。
- 技能内容通常只有几百到几千字符
- AI 模型（如 Claude）可以处理长 Prompt
- 只加载已使用的技能，不会加载所有技能

### Q: 如何调试技能？

A: 使用以下方法：
1. 运行单元测试：`node test-skills-phase1.js`
2. 检查 Console 日志
3. 使用 `skillDiscover` 验证技能被发现
4. 使用 `skillLoad` 验证技能可以加载

## 项目本地技能

你可以在项目中创建本地技能（优先级高于全局）：

```bash
# 在项目目录中
mkdir -p .closer-code/skills/project-skill
cat > .closer-code/skills/project-skill/skill.md << 'EOF'
---
name: project-skill
description: "Project-specific skill"
---

# Project Skill

This skill is specific to this project.
EOF
```

## 下一步

1. **创建更多技能**：为常用工作流创建技能
2. **分享技能**：与团队分享有用的技能
3. **优化技能**：根据使用反馈优化技能描述
4. **查看示例**：参考 `~/.closer-code/skills/hello-world/skill.md`

## 获取帮助

- 查看设计文档：`docs/cloco_skills_final_design.md`
- 查看格式规范：`docs/skills_final_format_spec.md`
- 查看示例技能：`~/.closer-code/skills/hello-world/skill.md`

---

**Happy Coding! 🚀**
