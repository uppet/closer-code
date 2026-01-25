# Skills 自动发现和加载机制

## 设计理念

**模型自主发现和加载技能，按需扩展能力**

```
┌─────────────────────────────────────────────────────────┐
│  传统方式（静态加载）                                    │
├─────────────────────────────────────────────────────────┤
│  启动时加载所有 skills → 传递给模型 → 模型使用           │
│                                                     │
│  问题：                                             │
│  - Prompt 过长（所有技能描述都要传递）                │
│  - 加载慢（需要扫描和解析所有技能）                   │
│  - 不灵活（无法动态添加技能）                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  智能方式（动态加载）                                    │
├─────────────────────────────────────────────────────────┤
│  常驻技能 + skillDiscover + skillLoad → 模型按需加载    │
│                                                     │
│  优势：                                             │
│  - Prompt 短（只传递常驻技能）                        │
│  - 启动快（不加载所有技能）                           │
│  - 更灵活（对话中动态加载）                           │
│  - AI 自主（模型自己决定何时加载）                    │
└─────────────────────────────────────────────────────────┘
```

## 核心工具

### Tool 1: skillDiscover - 发现可用技能

让模型了解有哪些技能可以加载。

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
- 技能列表（名称、描述、类型）
- 技能分类
- 推荐技能（基于用户意图）`,
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '搜索关键词（可选）',
        optional: true
      },
      category: {
        type: 'string',
        description: '筛选分类（可选）',
        enum: ['git', 'code', 'files', 'deploy', 'analysis', 'all'],
        optional: true
      }
    }
  },
  run: async (input) => {
    // 搜索并返回可用技能列表
    const skills = await skillRegistry.discover(input);
    return {
      success: true,
      skills: skills.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        type: s.type,
        category: s.category,
        tags: s.metadata?.tags || []
      })),
      total: skills.length,
      query: input.query
    };
  }
}
```

### Tool 2: skillLoad - 加载技能

让模型加载指定的技能。

```javascript
{
  name: 'skillLoad',
  description: `加载指定的技能，使其在当前对话中可用。

**使用时机**：
1. 通过 skillDiscover 发现相关技能后
2. 用户明确提到某个技能名称
3. 当前工具无法完成用户需求

**加载成功后**：
- 技能的完整信息将被添加到系统上下文
- 模型可以使用技能描述中说明的能力
- 可以像使用工具一样使用这个技能

**失败处理**：
- 如果技能不存在或加载失败，使用原有能力解决问题
- 向用户说明情况

**示例**：
\`\`\`javascript
// 发现 Git 相关技能
skillDiscover({ query: 'git' })
// 返回：[{ name: 'git-commit', ... }, { name: 'git-push', ... }]

// 加载 git-commit 技能
skillLoad({ name: 'git-commit' })
// 返回：{ success: true, skill: {...} }

// 现在可以使用 git-commit 的能力了
\`\`\``,
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: '技能名称（必需）'
      },
      version: {
        type: 'string',
        description: '技能版本（可选，默认最新）',
        optional: true
      }
    },
    required: ['name']
  },
  run: async (input) => {
    try {
      // 加载技能
      const skill = await skillRegistry.loadByName(input.name);

      if (!skill) {
        return {
          success: false,
          error: `Skill "${input.name}" not found`,
          hint: '使用 skillDiscover 查看可用技能'
        };
      }

      // 解析 Markdown
      const skillInfo = await parseSkillMarkdown(skill.markdownPath);

      // 添加到当前会话的技能列表
      conversationState.addSkill(skillInfo);

      return {
        success: true,
        skill: {
          name: skillInfo.name,
          description: skillInfo.description,
          type: skillInfo.type,
          parameters: skillInfo.parameters,
          examples: skillInfo.examples,
          steps: skillInfo.steps
        },
        message: `技能 "${skillInfo.name}" 已加载，现在可以使用这个能力了。`
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

## 系统提示词设计

### 初始系统提示词（只包含常驻技能）

```markdown
你是一个 AI 编程助手，名为 Cloco。

## 可用工具

你现在可以使用以下工具：
{tools_list}

## 可用技能

### 常驻技能（始终可用）

{resident_skills_description}

### 动态技能（按需加载）

除了常驻技能外，你还可以通过以下工具发现和加载更多技能：

1. **skillDiscover**: 发现可用的技能
   - 使用场景：当用户需求可能需要特定领域技能时
   - 例如：用户提到 Git、部署、代码审查等

2. **skillLoad**: 加载指定的技能
   - 使用场景：发现相关技能后，加载到当前对话
   - 加载后，技能的能力将为你所用

**使用流程**：
1. 识别用户需求是否需要特定技能
2. 使用 skillDiscover 查看可用技能
3. 使用 skillLoad 加载相关技能
4. 使用加载的技能完成任务

## 工作原则

1. **优先使用现有工具**：如果当前工具可以完成任务，直接使用
2. **按需加载技能**：只在需要时才加载技能
3. **失败降级处理**：如果技能加载失败，使用原有能力
4. **用户友好**：向用户说明正在使用的技能
```

### 加载技能后的系统提示词更新

```markdown
## 当前已加载的技能

{loaded_skills_list}

这些技能的能力现在为你所用。
```

## 常驻技能配置

### config.json

```json
{
  "skills": {
    "enabled": true,
    "resident": [
      // 常驻技能列表（始终加载）
      "git-status",
      "file-read",
      "file-write"
    ],
    "autoLoad": {
      // 自动加载规则（可选）
      "keywords": {
        "git": ["git-commit", "git-push", "git-branch"],
        "deploy": ["deploy-app", "deploy-service"],
        "review": ["code-review", "security-scan"]
      }
    }
  }
}
```

### 常驻技能定义

**文件：`~/.closer-code/skills/git-status/skill.md`**

```markdown
# Git Status

查看 Git 仓库状态。

## 类型
`command`

## 描述

显示当前 Git 仓库的状态信息：
- 修改的文件
- 暂存的文件
- 未跟踪的文件
- 当前分支

## 常驻
✅ 此技能始终可用，无需加载。

## 使用示例

```bash
/git-status
```

## 执行步骤

1. 运行 `git status`
2. 解析输出
3. 格式化显示
```

## 对话流程示例

### 示例 1：发现并加载技能

```
用户: 帮我提交代码

AI 思考：
- 用户要提交代码
- 我有 git-status 常驻技能，但没有 git-commit
- 应该先发现相关技能

AI: 我可以帮你提交代码。让我先查看有哪些 Git 相关技能可用。

[调用 skillDiscover({ query: 'git commit' })]

系统返回：
{
  skills: [
    { name: 'git-commit', description: '快速提交并推送' },
    { name: 'git-commit-push', description: '提交并推送' }
  ]
}

AI: 我找到了 git-commit 技能，让我加载它。

[调用 skillLoad({ name: 'git-commit' })]

系统返回：
{
  success: true,
  skill: {
    name: 'git-commit',
    description: '快速提交并推送 Git 更改',
    parameters: {
      message: { type: 'string', required: true },
      branch: { type: 'string', default: 'main' }
    }
  }
}

AI: 已加载 git-commit 技能。请提供提交消息。

用户: 修复登录bug

AI: 好的，执行 git-commit 技能：
1. git add .
2. git commit -m "修复登录bug"

[执行技能...]

AI: ✓ 代码已提交！
```

### 示例 2：技能加载失败，降级处理

```
用户: 帮我部署到生产环境

AI: 我需要加载部署技能。让我先查看可用的部署技能。

[调用 skillDiscover({ query: 'deploy' })]

系统返回：
{
  skills: [
    { name: 'deploy-app', description: '完整部署流程' }
  ]
}

AI: 找到了 deploy-app 技能，正在加载...

[调用 skillLoad({ name: 'deploy-app' })]

系统返回：
{
  success: false,
  error: 'deploy-app.sh not found'
}

AI: 技能加载失败，但我可以用其他方式帮你部署。

让我使用现有的工具来完成部署：
1. 运行测试：npm test
2. 构建项目：npm run build
3. ...

[使用 bash 工具手动执行部署步骤]

AI: 虽然专用技能不可用，但我已经帮你完成了部署。
```

### 示例 3：自动识别和加载

```
用户: 帮我审查这段代码的安全性

AI 思考：
- 用户要求代码安全审查
- 这可能需要专门的技能
- 先发现相关技能

[调用 skillDiscover({ query: 'security review' })]

系统返回：
{
  skills: [
    { name: 'security-scan', description: '安全漏洞扫描' },
    { name: 'code-review', description: '代码审查（支持安全重点）' }
  ]
}

AI: 我可以加载 security-scan 技能来帮你。

[调用 skillLoad({ name: 'security-scan' })]

系统返回：{ success: true, ... }

AI: 已加载 security-scan 技能。请告诉我文件路径。

用户: src/auth.js

AI: 好的，正在执行安全扫描...
[使用技能分析代码]

AI: 安全扫描完成，发现 2 个潜在问题：
1. SQL 注入风险（第 45 行）
2. 未验证的用户输入（第 78 行）

建议修复方案：...
```

## 实现架构

### 1. Skill Registry（技能注册表）

```javascript
class SkillRegistry {
  constructor() {
    this.residentSkills = new Map();    // 常驻技能
    this.availableSkills = new Map();   // 可用技能（未加载）
    this.loadedSkills = new Map();      // 已加载技能
  }

  // 初始化：加载常驻技能
  async initialize(config) {
    for (const name of config.skills.resident) {
      const skill = await this.loadByName(name);
      this.residentSkills.set(name, skill);
    }

    // 扫描可用技能（不加载详情）
    await this.scanAvailableSkills();
  }

  // 发现技能
  async discover(options = {}) {
    let skills = Array.from(this.availableSkills.values());

    // 按关键词搜索
    if (options.query) {
      const query = options.query.toLowerCase();
      skills = skills.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.tags?.some(t => t.toLowerCase().includes(query))
      );
    }

    // 按分类筛选
    if (options.category && options.category !== 'all') {
      skills = skills.filter(s => s.category === options.category);
    }

    return skills;
  }

  // 加载技能
  async loadByName(name) {
    // 如果已加载，直接返回
    if (this.loadedSkills.has(name)) {
      return this.loadedSkills.get(name);
    }

    // 查找技能
    const skillPath = this.findSkillPath(name);
    if (!skillPath) {
      return null;
    }

    // 解析 Markdown
    const skillInfo = await parseSkillMarkdown(skillPath);

    // 缓存
    this.loadedSkills.set(name, skillInfo);

    return skillInfo;
  }

  // 扫描可用技能
  async scanAvailableSkills() {
    const dirs = [
      '~/.closer-code/skills',
      '.closer-code/skills'
    ];

    for (const dir of dirs) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillMdPath = path.join(dir, entry.name, 'skill.md');
          if (await fs.exists(skillMdPath)) {
            // 只读取元数据，不加载完整内容
            const metadata = await this.extractMetadata(skillMdPath);
            this.availableSkills.set(entry.name, {
              name: entry.name,
              path: skillMdPath,
              ...metadata
            });
          }
        }
      }
    }
  }

  // 提取元数据（快速，不解析完整 Markdown）
  async extractMetadata(markdownPath) {
    const content = await fs.readFile(markdownPath, 'utf-8');
    const lines = content.split('\n');

    return {
      description: this.extractDescription(lines),
      type: this.extractType(lines),
      category: this.extractCategory(lines),
      tags: this.extractTags(lines)
    };
  }
}
```

### 2. Conversation State（会话状态）

```javascript
class ConversationState {
  constructor() {
    this.activeSkills = new Map();  // 当前会话激活的技能
  }

  // 添加技能
  addSkill(skill) {
    this.activeSkills.set(skill.name, skill);
  }

  // 获取激活的技能描述
  getActiveSkillsDescription() {
    const skills = Array.from(this.activeSkills.values());
    return skills.map(s =>
      `### ${s.name}\n${s.description}\n\n参数：${this.formatParameters(s.parameters)}`
    ).join('\n\n');
  }

  // 格式化参数
  formatParameters(parameters) {
    if (!parameters || !parameters.properties) return '无';

    return Object.entries(parameters.properties)
      .map(([name, info]) => `- ${name}: ${info.type || 'string'}${info.required ? ' (必需)' : ''}`)
      .join('\n');
  }
}
```

### 3. AI Client 集成

```javascript
class AIClient {
  async chat(messages, options = {}) {
    // 构建系统提示词
    const systemPrompt = this.buildSystemPrompt(options);

    // 添加常驻技能和已加载技能
    const tools = [
      ...builtinTools,
      skillDiscoverTool,
      skillLoadTool
    ];

    // 调用 AI
    const response = await this.anthropic.messages.create({
      system: systemPrompt,
      messages: messages,
      tools: tools,
      max_tokens: 4096
    });

    // 处理工具调用
    if (response.stop_reason === 'tool_use') {
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const result = await this.executeTool(block);
          // 更新会话状态（如果加载了技能）
          if (block.name === 'skillLoad' && result.success) {
            this.conversationState.addSkill(result.skill);
          }
        }
      }
    }

    return response;
  }

  buildSystemPrompt(options) {
    let prompt = baseSystemPrompt;

    // 添加常驻技能
    prompt += '\n\n## 常驻技能\n\n';
    prompt += this.formatResidentSkills();

    // 添加已加载的技能
    if (this.conversationState.hasActiveSkills()) {
      prompt += '\n\n## 已加载的技能\n\n';
      prompt += this.conversationState.getActiveSkillsDescription();
    }

    return prompt;
  }
}
```

## 优势总结

| 特性 | 静态加载 | 动态加载 |
|------|----------|----------|
| Prompt 长度 | 长（所有技能） | 短（常驻+已加载） |
| 启动速度 | 慢 | 快 |
| 灵活性 | 低 | 高 |
| Token 消耗 | 高 | 低 |
| AI 自主性 | 无 | 有 |

## 实现优先级

### Phase 1: 核心
- [ ] skillDiscover 工具实现
- [ ] skillLoad 工具实现
- [ ] 常驻技能配置
- [ ] 基础会话状态管理

### Phase 2: 增强
- [ ] 智能推荐（基于用户意图）
- [ ] 自动加载规则
- [ ] 技能依赖管理

### Phase 3: 优化
- [ ] 技能预加载（预测）
- [ ] 缓存优化
- [ ] 性能监控

---

**结论**：动态加载机制让系统更智能、更高效，同时保持简单（不需要 RAG）。

**相关文档**：
- [Markdown 优先设计](./skills_markdown_first_design.md)
- [统一数据结构](./unified_skills_data_structure.md)
