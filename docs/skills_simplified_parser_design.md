# Skills 简化解析设计

## 核心理念

**最小化解析，最大化 AI 理解**

```
┌─────────────────────────────────────────────────────────┐
│  复杂方案（过度解析）                                    │
├─────────────────────────────────────────────────────────┤
│  解析 Markdown → 提取所有字段 → 结构化数据 → 传递给 AI  │
│                                                     │
│  问题：                                             │
│  - 解析逻辑复杂                                       │
│  - 容易丢失信息                                       │
│  - 不够灵活                                           │
│  - 维护成本高                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  简化方案（AI 理解）                                    │
├─────────────────────────────────────────────────────────┤
│  读取头部元数据 → 完整 Markdown → 传递给 AI 理解        │
│                                                     │
│  优势：                                             │
│  - 解析逻辑简单                                       │
│  - 保留完整信息                                       │
│  - AI 自然理解                                        │
│  - 易于维护                                           │
└─────────────────────────────────────────────────────────┘
```

## 最小化解析

### 只解析必需的元数据

```javascript
class SkillParser {
  /**
   * 最小化解析：只提取头部元数据
   */
  async parse(skillPath) {
    const content = await fs.readFile(skillPath, 'utf-8');
    const lines = content.split('\n');

    return {
      // 基本信息（从头部提取）
      name: this.extractTitle(lines),           // # 标题
      description: this.extractDescription(lines), // 描述段落
      type: this.extractType(lines),            // ## 类型
      category: this.inferCategory(content),    // 推断分类

      // 完整内容（保留原样，让 AI 理解）
      markdown: content,

      // 文件信息
      path: skillPath,
      directory: path.dirname(skillPath),

      // 相关文件（可选）
      relatedFiles: await this.listRelatedFiles(path.dirname(skillPath))
    };
  }

  /**
   * 提取标题（第一个 # 标题）
   */
  extractTitle(lines) {
    for (const line of lines) {
      if (line.startsWith('# ')) {
        return line.substring(2).trim();
      }
    }
    return path.basename(this.path, '.md');
  }

  /**
   * 提取描述（标题后的第一段文字）
   */
  extractDescription(lines) {
    let foundTitle = false;
    const descriptions = [];

    for (const line of lines) {
      if (line.startsWith('# ')) {
        foundTitle = true;
        continue;
      }

      if (foundTitle) {
        // 跳过空行和标题
        if (line.trim() === '' || line.startsWith('#')) {
          continue;
        }
        // 收集描述段落
        if (line.trim()) {
          descriptions.push(line.trim());
        }
        // 收集 2-3 句话即可
        if (descriptions.length >= 3) {
          break;
        }
      }
    }

    return descriptions.join(' ');
  }

  /**
   * 提取类型（## 类型后的内容）
   */
  extractType(lines) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('## 类型') || lines[i].startsWith('## Type')) {
        // 下一行应该包含类型
        const nextLine = lines[i + 1];
        if (nextLine) {
          const content = nextLine.trim()
            .replace(/`/g, '')  // 移除 markdown 代码标记
            .toLowerCase();
          if (content.includes('command')) return 'command';
          if (content.includes('skill')) return 'skill';
          if (content.includes('workflow')) return 'workflow';
        }
      }
    }
    return 'skill'; // 默认类型
  }

  /**
   * 推断分类（基于内容和目录名）
   */
  inferCategory(content) {
    const lower = content.toLowerCase();

    // 关键词推断
    if (lower.includes('git')) return 'git';
    if (lower.includes('deploy')) return 'deploy';
    if (lower.includes('review') || lower.includes('code')) return 'code';
    if (lower.includes('test')) return 'test';
    if (lower.includes('file')) return 'files';

    return 'general';
  }

  /**
   * 列出相关文件（可选）
   */
  async listRelatedFiles(skillDir) {
    const files = [];
    try {
      const entries = await fs.readdir(skillDir);

      for (const entry of entries) {
        // 跳过 skill.md 本身
        if (entry === 'skill.md') continue;

        const fullPath = path.join(skillDir, entry);
        const stat = await fs.stat(fullPath);

        if (stat.isFile()) {
          files.push({
            name: entry,
            path: fullPath,
            type: path.extname(entry).substring(1)
          });
        }
      }
    } catch (error) {
      // 目录不存在或无法读取
    }

    return files;
  }
}
```

## skill.md 格式约定

### 必需部分

```markdown
# 技能名称

一句话描述技能做什么。

## 类型
`command` | `skill` | `workflow`
```

### 可选部分（AI 理解）

```markdown
## 详细描述

更多说明...

## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| name | string | ✅ | - | 说明 |

## 使用示例

\`\`\`bash
/skill-name --param=value
\`\`\`

## 执行步骤

1. 步骤 1
2. 步骤 2

## 注意事项

- ⚠️ 注意事项
```

## 数据结构

### 解析结果

```javascript
{
  // 解析的元数据
  name: "git-commit",
  description: "快速提交并推送 Git 更改",
  type: "command",
  category: "git",

  // 完整内容（AI 理解）
  markdown: "# Git Commit\n\n...完整内容...",

  // 文件信息
  path: "/Users/user/.closer-code/skills/git-commit/skill.md",
  directory: "/Users/user/.closer-code/skills/git-commit",

  // 相关文件
  relatedFiles: [
    {
      name: "commit.sh",
      path: "/Users/user/.closer-code/skills/git-commit/commit.sh",
      type: "sh"
    }
  ]
}
```

## AI 理解技能

### skillLoad 工具实现

```javascript
{
  name: 'skillLoad',
  description: `加载指定的技能。

加载成功后，技能的完整 Markdown 文档将被添加到上下文中，
你可以理解并使用这个技能的能力。`,

  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: '技能名称' }
    },
    required: ['name']
  },

  run: async (input) => {
    // 1. 查找技能
    const skillInfo = await skillRegistry.loadByName(input.name);

    if (!skillInfo) {
      return {
        success: false,
        error: `技能 "${input.name}" 未找到`,
        hint: '使用 skillDiscover 查看可用技能'
      };
    }

    // 2. 添加到会话状态
    conversationState.addSkill(skillInfo);

    // 3. 返回技能信息（包含完整 Markdown）
    return {
      success: true,
      skill: {
        name: skillInfo.name,
        description: skillInfo.description,
        type: skillInfo.type,
        markdown: skillInfo.markdown,  // 完整 Markdown
        relatedFiles: skillInfo.relatedFiles
      },
      message: `技能 "${skillInfo.name}" 已加载。请阅读下面的技能文档，理解其能力后使用。`
    };
  }
}
```

### System Prompt 更新

```javascript
function buildSystemPrompt(activeSkills) {
  let prompt = baseSystemPrompt;

  // 添加已加载的技能（完整 Markdown）
  if (activeSkills.length > 0) {
    prompt += '\n\n## 已加载的技能\n\n';
    prompt += '以下是已加载技能的完整文档，请仔细阅读并理解：\n\n';

    for (const skill of activeSkills) {
      prompt += `### ${skill.name}\n\n`;
      prompt += `${skill.markdown}\n\n`;

      // 提示相关文件
      if (skill.relatedFiles.length > 0) {
        prompt += `**相关文件**：\n`;
        for (const file of skill.relatedFiles) {
          prompt += `- ${file.name}: ${file.path}\n`;
        }
        prompt += '\n';
      }

      prompt += '---\n\n';
    }

    prompt += '现在你可以使用这些技能了。根据技能文档中的说明，理解其能力、参数和使用方式，然后帮助用户完成任务。\n';
  }

  return prompt;
}
```

## 使用示例

### 示例 1：加载并使用技能

```
用户: 帮我提交代码

AI: 我可以加载 git-commit 技能来帮你。

[调用 skillLoad({ name: 'git-commit' })]

系统返回：
{
  success: true,
  skill: {
    name: 'git-commit',
    markdown: `
# Git Commit

快速提交并推送 Git 更改。

## 类型
\`command\`

## 描述

这个技能可以帮你：
- 添加所有更改到暂存区
- 创建提交
- 推送到远程分支

## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| message | string | ✅ | - | 提交消息 |
| branch | string | ❌ | main | 目标分支 |

## 执行步骤

1. git add .
2. git commit -m "{message}"
3. git push origin {branch}
`
  }
}

[System Prompt 更新：添加完整的 git-commit Markdown]

AI 阅读 System Prompt 中的技能文档...

AI: 已加载 git-commit 技能。根据文档，我需要提交消息。

请提供提交消息。

用户: 修复登录bug

AI: 好的，根据技能文档的执行步骤：
1. git add .
2. git commit -m "修复登录bug"
3. git push origin main

正在执行...
✓ 完成
```

### 示例 2：AI 理解复杂技能

```
[加载 code-review 技能]

AI 收到完整的技能文档：

# Code Review

智能代码审查专家。

## 类型
\`skill\`

## 能力

- 🔍 安全漏洞检测
- ⚡ 性能优化建议
- 📝 代码风格检查
- 🐛 潜在 Bug 发现

## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| file | string | ✅ | - | 文件路径 |
| focus | string | ❌ | all | 审查重点 |

## 审查流程

1. 读取文件内容
2. 分析代码质量
3. 生成详细报告

AI 理解：
- 这是一个 skill 类型的技能
- 需要 AI 推理和分析
- 可以使用 readFile 工具
- 需要生成结构化的审查报告

用户: 审查 auth.js 的安全性

AI: 根据技能文档，我将：
1. 使用 readFile 读取 auth.js
2. 重点关注安全漏洞
3. 生成审查报告

[执行审查...]
```

## 优势

### 简化前 vs 简化后

| 方面 | 简化前 | 简化后 |
|------|--------|--------|
| 解析逻辑 | 复杂（提取所有字段） | 简单（只读头部） |
| 信息保留 | 可能丢失 | 完整保留 |
| AI 理解 | 间接（通过结构化数据） | 直接（阅读 Markdown） |
| 灵活性 | 低（固定字段） | 高（任意格式） |
| 维护成本 | 高 | 低 |
| 扩展性 | 受限 | 灵活 |

### 具体优势

1. **更简单**
   - 只需解析标题、描述、类型
   - 不需要复杂的 Markdown 解析
   - 代码更少，bug 更少

2. **更准确**
   - AI 直接阅读原始文档
   - 不会因为解析错误丢失信息
   - AI 可以理解上下文和隐含信息

3. **更灵活**
   - 用户可以自由编写 Markdown
   - 不受固定字段限制
   - 可以添加任意章节

4. **更易维护**
   - 解析逻辑简单稳定
   - 不需要频繁更新解析规则
   - 用户改进文档即生效

## 实现细节

### skillDiscover 工具

```javascript
{
  name: 'skillDiscover',
  description: '发现可用的技能。

返回技能列表（包含名称和描述），帮助你选择合适的技能。',

  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      category: { type: 'string' }
    }
  },

  run: async (input) => {
    // 快速扫描（只读元数据）
    const skills = await skillRegistry.discover(input);

    return {
      success: true,
      skills: skills.map(s => ({
        name: s.name,
        description: s.description,
        type: s.type,
        category: s.category
      })),
      total: skills.length
    };
  }
}
```

### 快速扫描

```javascript
class SkillRegistry {
  /**
   * 快速扫描：只读取头部元数据
   */
  async discover(options = {}) {
    const skills = [];

    // 扫描技能目录
    const dirs = ['~/.closer-code/skills', '.closer-code/skills'];

    for (const dir of dirs) {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillMd = path.join(dir, entry.name, 'skill.md');

          if (await fs.exists(skillMd)) {
            // 快速解析（只读前 50 行）
            const meta = await this.quickParse(skillMd);
            skills.push(meta);
          }
        }
      }
    }

    // 过滤
    return this.filterSkills(skills, options);
  }

  /**
   * 快速解析（只读前 50 行）
   */
  async quickParse(skillPath) {
    const content = await fs.readFile(skillPath, 'utf-8');
    const lines = content.split('\n').slice(0, 50);

    return {
      name: this.extractTitle(lines),
      description: this.extractDescription(lines),
      type: this.extractType(lines),
      path: skillPath
    };
  }
}
```

## 文档规范

### 推荐格式（但不强制）

```markdown
# 技能名称

一句话描述。

## 类型
`command` | `skill` | `workflow`

## 详细描述（可选）

更多说明...

## 参数（可选）

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| name | string | ✅ | - | 说明 |

## 使用示例（可选）

\`\`\`bash
/skill-name --param=value
\`\`\`

## 执行步骤（可选）

1. 步骤 1
2. 步骤 2

## 注意事项（可选）

- ⚠️ 注意事项
```

### 最小格式（必需）

```markdown
# 技能名称

描述。

## 类型
`command`
```

## 总结

**简化解析 = 更好的系统**

- ✅ 解析简单：只读头部元数据
- ✅ AI 理解：完整 Markdown 传递给 AI
- ✅ 灵活自由：用户可以自由编写
- ✅ 易于维护：代码少，bug 少
- ✅ 扩展性强：不受固定字段限制

**核心原则**：
- 最小化解析
- 最大化 AI 理解
- 保持简单

---

**相关文档**：
- [Markdown 优先设计](./skills_markdown_first_design.md)
- [自动发现机制](./skills_auto_discovery_design.md)
- [完整设计总结](./skills_complete_design_summary.md)
