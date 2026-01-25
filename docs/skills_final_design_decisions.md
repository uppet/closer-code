# Skills 功能 - 最终设计决策总结

## 讨论和决策过程

### 1. 初始问题：Commands vs Skills

**问题**：很多 AI 助手支持 commands 和 skills 两个功能，如何设计？

**讨论**：
- Commands：预定义的指令/工具，类似函数调用
- Skills：领域特定的能力集合

**发现**：本质相同，都是"能力"（Capabilities）

### 2. 第一次统一：统一为 Skills（JSON）

**决策**：合并 Commands 和 Skills，统一为 Skills

**数据结构**：
```json
{
  "name": "skill-name",
  "type": "command | skill | workflow",
  "executionMode": "deterministic | reasoning | hybrid",
  "parameters": { ... },
  "execution": { ... }
}
```

**优势**：
- 统一的数据结构
- 统一的加载机制
- 更好的扩展性

### 3. 第二次优化：Markdown 优先

**用户反馈**：用户编写技能应该用自然语言（Markdown），而不是 JSON

**决策**：Markdown 作为默认格式

**结构**：
```
skill-name/
└── skill.md    # Markdown 格式
```

**优势**：
- 更易用：自然语言编写
- 更灵活：不受字段限制
- 更强大：AI 可以理解

### 4. 第三次简化：最小化解析

**用户反馈**：markdown 解析支持读取头部的 description 即可，commands 的内容应该让 AI 模型去理解

**决策**：只解析必需元数据，完整内容由 AI 理解

**解析内容**：
- ✅ 标题（# 标题）
- ✅ 描述（第一段）
- ✅ 类型（## 类型）
- ✅ 完整 Markdown（传递给 AI）

**不解析**：
- ❌ 参数表格（AI 理解）
- ❌ 使用示例（AI 理解）
- ❌ 执行步骤（AI 理解）
- ❌ 注意事项（AI 理解）

**优势**：
- 解析逻辑简单
- 信息完整保留
- AI 自然理解
- 易于维护

### 5. 第四次增强：动态自动发现

**设计**：模型自主发现和加载技能

**核心工具**：
- `skillDiscover`: 发现可用技能
- `skillLoad`: 加载指定技能

**流程**：
```
用户请求 → AI 识别需求 → skillDiscover → skillLoad → 使用技能
```

**优势**：
- 短 Prompt（只传递常驻+已加载）
- 快启动（不加载所有技能）
- 高灵活（对话中动态加载）
- AI 自主（模型自己决定）

## 最终方案

### 数据格式

**文件结构**：
```
skill-name/
├── skill.md              # 必须：技能说明（Markdown）
├── script.sh             # 可选：参考脚本
├── config.json           # 可选：配置示例
└── examples/             # 可选：示例文件
```

**skill.md 最小格式**：
```markdown
# 技能名称

描述。

## 类型
`command`
```

**skill.md 推荐格式**：
```markdown
# 技能名称

一句话描述。

## 类型
`command` | `skill` | `workflow`

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

### 技能类型

| 类型 | 执行模式 | 说明 | 示例 |
|------|----------|------|------|
| `command` | deterministic | 确定性脚本操作 | git-commit, backup |
| `skill` | reasoning | AI 推理分析 | code-review, analysis |
| `workflow` | hybrid | 多步骤工作流 | deploy-app, ci-cd |

### 解析机制

**系统解析**（最小化）：
```javascript
{
  name: "git-commit",           // 从 # 标题提取
  description: "快速提交...",   // 从第一段提取
  type: "command",              // 从 ## 类型提取
  category: "git",              // 推断
  markdown: "# Git Commit..."   // 完整内容
}
```

**AI 理解**（完整内容）：
- 参数表格
- 使用示例
- 执行步骤
- 注意事项
- 相关文件

### 动态加载

**工具**：
1. `skillDiscover`: 发现可用技能
   - 输入：query, category
   - 输出：技能列表（名称、描述、类型）

2. `skillLoad`: 加载指定技能
   - 输入：name
   - 输出：完整技能信息（包含 markdown）

**流程**：
```
用户: 帮我提交代码
  ↓
AI: 需要特定技能？
  ↓
是 → skillDiscover({ query: 'git commit' })
  ↓
返回：[{ name: 'git-commit', ... }]
  ↓
skillLoad({ name: 'git-commit' })
  ↓
返回：{ success: true, markdown: "..." }
  ↓
System Prompt 更新（添加完整 markdown）
  ↓
AI 阅读、理解、使用
```

### 配置

**config.json**：
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

## 核心原则

### 1. 简单优先
- ✅ Markdown 编写（自然语言）
- ✅ 最小化解析（只读头部）
- ✅ AI 理解（完整内容）

### 2. AI 自主
- ✅ 自动发现需求
- ✅ 自主加载技能
- ✅ 理解并执行

### 3. 性能优化
- ✅ 动态加载（按需）
- ✅ 短 Prompt（常驻+已加载）
- ✅ 快启动（不加载所有）

### 4. 用户友好
- ✅ 自由编写（不受限制）
- ✅ 易于维护（修改即生效）
- ✅ 灵活扩展（任意格式）

## 实现优先级

### Phase 1: 核心（MVP）
- [ ] Markdown 最小化解析
  - [ ] 提取标题、描述、类型
  - [ ] 保留完整 Markdown
- [ ] Skill Registry
  - [ ] 快速扫描（只读元数据）
  - [ ] 完整加载（包含 Markdown）
- [ ] skillDiscover tool
- [ ] skillLoad tool
- [ ] 常驻技能支持
- [ ] System Prompt 动态更新

### Phase 2: 增强
- [ ] Reasoning Executor（AI 推理）
- [ ] Hybrid Executor（工作流）
- [ ] 技能验证和错误处理
- [ ] 会话状态管理

### Phase 3: 优化
- [ ] 智能推荐
- [ ] 缓存优化
- [ ] 性能监控

## 技术栈

### 核心技术
- **Node.js**: 运行时
- **Anthropic API**: AI 理解和执行
- **Markdown**: 技能格式
- **文件系统**: 技能存储

### 不使用
- ❌ JSON Schema: 太复杂
- ❌ 复杂解析器: 不必要
- ❌ RAG: 暂不需要（大量技能）

## 文档结构

```
docs/
├── skills_final_design_decisions.md    # 本文档：最终决策
├── skills_simplified_parser_design.md  # 简化解析
├── skills_markdown_first_design.md     # Markdown 格式
├── skills_auto_discovery_design.md     # 动态加载
├── skills_complete_design_summary.md   # 完整总结
├── skills_quick_start.md               # 快速上手
├── skills_documentation_index.md       # 文档索引
├── unified_skills_data_structure.md    # 统一数据结构
└── commands_and_skills_study.md        # 初始研究
```

## 使用示例

### 创建技能

```bash
# 1. 创建目录
mkdir -p ~/.closer-code/skills/my-skill

# 2. 编写 skill.md
cat > ~/.closer-code/skills/my-skill/skill.md << 'EOF'
# My Skill

我的技能描述。

## 类型
`command`

## 使用方式

使用这个技能做...
EOF

# 3. 完成！
```

### 使用技能

```
用户: 帮我使用 my-skill
AI: 我来加载 my-skill 技能...
[skillLoad → 返回完整 Markdown]
AI 阅读 System Prompt 中的技能文档...
AI: 根据技能文档，我可以帮你...
```

## 关键代码

### 解析器（最小化）

```javascript
class SkillParser {
  async parse(skillPath) {
    const content = await fs.readFile(skillPath, 'utf-8');
    const lines = content.split('\n');

    return {
      name: this.extractTitle(lines),
      description: this.extractDescription(lines),
      type: this.extractType(lines),
      category: this.inferCategory(content),
      markdown: content  // 完整内容
    };
  }
}
```

### skillLoad 工具

```javascript
{
  name: 'skillLoad',
  run: async (input) => {
    const skill = await skillRegistry.loadByName(input.name);
    conversationState.addSkill(skill);
    return {
      success: true,
      markdown: skill.markdown  // 完整 Markdown
    };
  }
}
```

### System Prompt 更新

```javascript
function buildSystemPrompt(activeSkills) {
  let prompt = baseSystemPrompt;

  for (const skill of activeSkills) {
    prompt += `### ${skill.name}\n\n`;
    prompt += `${skill.markdown}\n\n`;  // 完整内容
  }

  return prompt;
}
```

## 总结

**最终方案特点**：
1. ✅ **简单**: Markdown 编写，自然语言
2. ✅ **智能**: AI 自动发现和加载
3. ✅ **高效**: 动态加载，节省 Token
4. ✅ **灵活**: 三种类型，适应不同场景
5. ✅ **易维护**: 最小化解析，AI 理解

**设计演进**：
```
Commands + Skills (分离)
    ↓
统一为 Skills (JSON)
    ↓
Markdown 优先
    ↓
最小化解析 + AI 理解
    ↓
动态自动发现
```

**核心原则**：
- 用户友好优先
- AI 自主性
- 性能优化
- 保持简单

---

**版本**: Final
**最后更新**: 2025-01-XX
**状态**: 设计完成，待实现
