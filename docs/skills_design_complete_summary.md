# Skills 功能设计 - 完成总结

## 设计历程

我们经过充分的讨论和迭代，完成了 Cloco Skills 功能的完整设计：

### 1. 初始问题：Commands vs Skills
- 讨论了 AI 助手的 commands 和 skills 功能
- 发现本质相同，都是"能力"（Capabilities）

### 2. 第一次统一：统一为 Skills（JSON）
- 合并 Commands 和 Skills
- 统一数据结构和加载机制

### 3. 第二次优化：Markdown 优先
- 用户反馈：应该用自然语言编写
- 采用 Markdown 格式，更易用

### 4. 第三次简化：最小化解析
- 用户反馈：只解析头部，内容让 AI 理解
- 简化解析逻辑

### 5. 第四次标准化：YAML Front-matter
- 参考行业标准（OpenAI、Cursor 等）
- 采用 YAML front-matter 格式
- 只解析 name 和 description

## 最终方案

### 格式标准

```markdown
---
name: brainstorming
description: "You MUST use this before any creative work..."
---

# Brainstorming Ideas Into Designs

## Overview

Help turn ideas into fully formed designs...

## The Process

**Understanding the idea:**
- Check out the current project state
- Ask questions one at a time
...
```

### 解析策略

**系统解析**（最小化）：
```javascript
{
  name: "从 front-matter 提取",
  description: "从 front-matter 提取",
  content: "完整 Markdown（AI 理解）"
}
```

**AI 理解**（完整内容）：
- 所有 Markdown 内容
- 参数表格
- 使用示例
- 执行步骤
- 注意事项

### 动态加载

**核心工具**：
1. `skillDiscover`: 发现可用技能
2. `skillLoad`: 加载指定技能

**流程**：
```
用户请求 → AI 识别需求 → skillDiscover → skillLoad → AI 理解并使用
```

## 核心特性

### ✅ 简单
- YAML front-matter 格式（行业标准）
- 只需 name 和 description
- Markdown 内容自由编写

### ✅ 智能
- AI 自动发现需求
- 自主加载技能
- 理解并执行

### ✅ 高效
- 动态加载（按需）
- 短 Prompt（只传递已加载技能）
- 快启动（不加载所有技能）

### ✅ 标准
- 与 OpenAI、Cursor 等一致
- YAML front-matter 格式
- 易于分享和迁移

## 文档体系

### 核心文档（必读）

1. **[最终格式规范](./skills_final_format_spec.md)** ⭐
   - 基于 example_skill.md
   - 格式标准、解析策略
   - 完整示例

2. **[格式快速参考](./skills_format_quick_reference.md)**
   - 一页纸参考
   - 快速查阅

3. **[最终设计决策](./skills_final_design_decisions.md)**
   - 设计演进过程
   - 最终方案总结

4. **[快速上手指南](./skills_quick_start.md)**
   - 5 分钟创建技能
   - 模板和示例

### 详细文档

5. **[简化解析设计](./skills_simplified_parser_design.md)**
   - 最小化解析原则
   - AI 理解完整内容

6. **[自动发现机制](./skills_auto_discovery_design.md)**
   - skillDiscover 和 skillLoad
   - 动态加载流程

7. **[完整设计总结](./skills_complete_design_summary.md)**
   - 技术架构
   - 数据流
   - 实现计划

### 历史文档

8. **[Commands 和 Skills 研究](./commands_and_skills_study.md)**
9. **[统一数据结构](./unified_skills_data_structure.md)**
10. **[Markdown 优先设计](./skills_markdown_first_design.md)**
11. **[Skills 统一指南](./skills_unification_guide.md)**

### 索引和参考

12. **[文档索引](./skills_documentation_index.md)**
    - 所有文档导航
    - 按角色查阅

13. **[SKILLS_DESIGN_README](./SKILLS_DESIGN_README.md)**
    - 文档总览
    - 快速开始

## 实现优先级

### Phase 1: 核心（MVP）

- [ ] YAML front-matter 解析
  - [ ] 提取 name 和 description
  - [ ] 验证格式
  - [ ] 错误处理

- [ ] Skill Registry
  - [ ] 扫描技能目录
  - [ ] 快速发现（只读 front-matter）
  - [ ] 完整加载（包含 content）

- [ ] skillDiscover tool
  - [ ] 搜索和筛选
  - [ ] 返回技能列表

- [ ] skillLoad tool
  - [ ] 加载技能
  - [ ] 添加到会话状态

- [ ] System Prompt 更新
  - [ ] 动态添加技能内容
  - [ ] 格式化输出

### Phase 2: 增强

- [ ] 会话状态管理
- [ ] 技能验证
- [ ] 错误处理和降级

### Phase 3: 优化

- [ ] 智能推荐
- [ ] 缓存优化
- [ ] 性能监控

## 关键代码

### 解析器

```javascript
class SkillParser {
  async parse(skillPath) {
    const content = await fs.readFile(skillPath, 'utf-8');

    // 提取 front-matter
    const frontmatter = this.extractFrontmatter(content);
    const contentWithoutFrontmatter = this.removeFrontmatter(content);

    return {
      name: frontmatter.name,
      description: frontmatter.description,
      content: contentWithoutFrontmatter,
      path: skillPath
    };
  }

  extractFrontmatter(content) {
    const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
    if (!match) throw new Error('Invalid format');

    // 简单解析 name 和 description
    const result = {};
    const lines = match[1].split('\n');

    for (const line of lines) {
      const m = line.match(/^(\w+):\s*"?(.+?)"?$/);
      if (m) result[m[1]] = m[2].replace(/^"|"$/g, '');
    }

    if (!result.name) throw new Error('Missing: name');
    if (!result.description) throw new Error('Missing: description');

    return result;
  }

  removeFrontmatter(content) {
    return content.replace(/^---\r?\n[\s\S]+?\r?\n---\r?\n?/, '');
  }
}
```

### skillLoad 工具

```javascript
{
  name: 'skillLoad',
  description: '加载指定的技能',

  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' }
    },
    required: ['name']
  },

  run: async (input) => {
    const skill = await skillRegistry.loadByName(input.name);

    if (!skill) {
      return {
        success: false,
        error: `技能 "${input.name}" 未找到`
      };
    }

    conversationState.addSkill(skill);

    return {
      success: true,
      skill: {
        name: skill.name,
        description: skill.description,
        content: skill.content
      }
    };
  }
}
```

## 使用示例

### 创建技能

```bash
mkdir -p ~/.closer-code/skills/hello-world

cat > ~/.closer-code/skills/hello-world/skill.md << 'EOF'
---
name: hello-world
description: "Say hello to the world"
---

# Hello World

## Overview

This skill says hello to the world.

## Examples

\`\`\`bash
/hello-world
\`\`\`
EOF
```

### 使用技能

```
用户: 帮我使用 hello-world 技能

AI: 我来加载 hello-world 技能...
[skillLoad → 返回完整 content]
AI 阅读 System Prompt 中的技能文档...
AI: 根据技能文档，我可以向你打招呼！
Hello, World!
```

## 总结

### 设计完成度

- ✅ 格式标准：YAML front-matter
- ✅ 解析策略：最小化解析
- ✅ 动态加载：skillDiscover + skillLoad
- ✅ 文档完整：13 个文档
- ✅ 示例丰富：多个完整示例

### 核心原则

1. **简单优先**: YAML front-matter，只解析 name 和 description
2. **AI 自主**: 自动发现和加载，AI 理解完整内容
3. **性能优化**: 动态加载，短 Prompt，快启动
4. **行业标准**: 与 OpenAI、Cursor 等一致

### 下一步

1. 开始实现 Phase 1（MVP）
2. 创建示例技能
3. 编写测试用例
4. 集成到 Cloco

---

**设计状态**: ✅ 完成
**文档状态**: ✅ 完整
**实现状态**: ⏳ 待开始

**版本**: Final
**最后更新**: 2025-01-XX
