# Skills 功能 - 完整设计总结

## 设计演进

```
第一阶段：Commands 和 Skills 分离
    ↓ 发现本质相同
第二阶段：统一为 Skills（JSON）
    ↓ 发现用户需要更简单的编写方式
第三阶段：Markdown 优先
    ↓ 发现需要动态加载以优化性能
最终方案：Markdown + 动态自动发现
```

## 核心设计决策

### 1. 数据结构：Markdown 优先 ✅

**理由**：
- 用户友好：自然语言，易于编写
- AI 友好：易于理解和执行
- 表达力强：支持丰富的文档和示例
- 支持附件：可包含脚本、配置等参考文件

**解析策略**：
- ✅ 最小化解析：只读取标题、描述、类型
- ✅ AI 理解：完整 Markdown 传递给 AI
- ✅ 灵活自由：不受固定字段限制

**结构**：
```
skill-name/
├── skill.md              # 必须：技能说明（Markdown）
├── script.sh             # 可选：参考脚本
├── config.json           # 可选：配置示例
└── examples/             # 可选：示例文件
```

### 2. 类型统一：三种类型 ✅

| 类型 | 执行模式 | 用途 | 示例 |
|------|----------|------|------|
| `command` | deterministic | 确定性脚本操作 | git-commit, backup |
| `skill` | reasoning | AI 推理分析 | code-review, analysis |
| `workflow` | hybrid | 多步骤工作流 | deploy-app, ci-cd |

### 3. 加载机制：动态自动发现 ✅

**核心工具**：
- `skillDiscover`: 发现可用技能
- `skillLoad`: 加载指定技能

**流程**：
```
用户请求 → AI 识别需求 → skillDiscover → skillLoad → 使用技能
                ↓
            需要特定技能？
                ↓
            是：发现并加载
            否：使用现有工具
```

**优势**：
- ✅ 短 Prompt（只传递常驻+已加载技能）
- ✅ 快启动（不加载所有技能）
- ✅ 高灵活（对话中动态加载）
- ✅ AI 自主（模型自己决定）

## 解析机制

### 最小化解析原则

**系统只解析必需的元数据**：
```javascript
{
  name: "从 # 标题提取",
  description: "从第一段提取",
  type: "从 ## 类型提取",
  category: "推断或默认",
  markdown: "完整内容（AI 理解）"
}
```

**AI 理解完整内容**：
- 参数表格
- 使用示例
- 执行步骤
- 注意事项

**优势**：
- ✅ 解析简单稳定
- ✅ 信息完整保留
- ✅ AI 自然理解
- ✅ 灵活易扩展

详见：[简化解析设计](./skills_simplified_parser_design.md)

## 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                    Cloco Skills 系统                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │           Skill Registry (技能注册表)           │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │    │
│  │  │ 常驻技能 │  │ 可用技能 │  │ 已加载   │      │    │
│  │  └──────────┘  └──────────┘  └──────────┘      │    │
│  └────────────────────────────────────────────────┘    │
│                    ↓                                     │
│  ┌────────────────────────────────────────────────┐    │
│  │     Auto Discovery (自动发现机制)              │    │
│  │  • skillDiscover tool                          │    │
│  │  • skillLoad tool                              │    │
│  │  • 智能推荐                                     │    │
│  └────────────────────────────────────────────────┘    │
│                    ↓                                     │
│  ┌────────────────────────────────────────────────┐    │
│  │    Markdown Parser (Markdown 解析器)           │    │
│  │  • 提取元数据                                   │    │
│  │  • 解析参数表                                   │    │
│  │  • 提取示例和步骤                               │    │
│  └────────────────────────────────────────────────┘    │
│                    ↓                                     │
│  ┌────────────────────────────────────────────────┐    │
│  │   Skill Executor (技能执行器)                  │    │
│  │  • Deterministic Executor (脚本执行)           │    │
│  │  • Reasoning Executor (AI 推理)                │    │
│  │  • Hybrid Executor (工作流)                    │    │
│  └────────────────────────────────────────────────┘    │
│                    ↓                                     │
│  ┌────────────────────────────────────────────────┐    │
│  │   AI Client Integration (AI 集成)              │    │
│  │  • 动态更新 System Prompt                      │    │
│  │  • 工具调用处理                                 │    │
│  │  • 会话状态管理                                 │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 数据流

### 1. 初始化阶段

```
系统启动
    ↓
加载配置 (config.json)
    ↓
初始化 SkillRegistry
    ↓
扫描技能目录（快速，只读元数据）
    ↓
加载常驻技能（完整解析）
    ↓
准备就绪
```

### 2. 对话阶段

```
用户消息
    ↓
AI 分析需求
    ↓
需要特定技能？
    ├─ 否 → 使用现有工具
    └─ 是 → 调用 skillDiscover
            ↓
        返回可用技能列表
            ↓
        AI 选择技能
            ↓
        调用 skillLoad
            ↓
        解析 skill.md
            ↓
        添加到会话状态
            ↓
        更新 System Prompt
            ↓
        AI 使用技能
            ↓
        返回结果
```

## 文件组织

### 目录结构

```
~/.closer-code/                    # 全局配置
├── config.json                     # 配置文件
├── skills/                         # 全局技能
│   ├── git-commit/
│   │   └── skill.md
│   ├── code-review/
│   │   ├── skill.md
│   │   └── checklist.md
│   └── deploy-app/
│       ├── skill.md
│       └── deploy.sh
│
└── logs/                           # 日志

.closer-code/                       # 项目本地
├── config.json                     # 项目配置
└── skills/                         # 项目技能
    ├── test-runner/
    │   └── skill.md
    └── deploy-prod/
        └── skill.md
```

### skill.md 模板

```markdown
# 技能名称

一句话描述。

## 类型
`command` | `skill` | `workflow`

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

## 配置示例

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
    ],
    "autoLoad": {
      "keywords": {
        "git": ["git-commit", "git-push"],
        "deploy": ["deploy-app"]
      }
    }
  }
}
```

## 使用示例

### 示例 1：基本使用

```bash
# 用户创建技能
mkdir -p ~/.closer-code/skills/backup
cat > ~/.closer-code/skills/backup/skill.md << 'EOF'
# Backup

备份项目文件。

## 类型
`command`

## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| output | string | ❌ | backup.tar.gz | 输出文件 |

## 执行步骤

1. 创建 tar 压缩包
2. 保存到指定位置
EOF

# 在对话中使用
用户: 帮我备份项目

AI: 我可以使用 backup 技能。让我加载它...
[调用 skillLoad]
已加载 backup 技能，正在执行...
✓ 备份完成：backup.tar.gz
```

### 示例 2：AI 技能

```markdown
# Code Review

智能代码审查。

## 类型
`skill`

## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| file | string | ✅ | - | 文件路径 |
| focus | string | ❌ | all | 审查重点 |

## 能力

- 检测安全漏洞
- 性能优化建议
- 代码风格检查
```

```
用户: 审查一下 auth.js 的安全性

AI: 让我加载 code-review 技能...
[调用 skillLoad]
正在执行安全审查...
发现 2 个潜在问题：
1. SQL 注入风险（第 45 行）
2. 未验证输入（第 78 行）
```

## 实现优先级

### Phase 1: 核心（MVP）
- [x] 数据结构设计
- [x] Markdown 解析器
- [ ] Skill Registry
- [ ] skillDiscover tool
- [ ] skillLoad tool
- [ ] 基础执行器（deterministic）
- [ ] 常驻技能支持

### Phase 2: 增强
- [ ] Reasoning 执行器
- [ ] Hybrid 执行器
- [ ] 会话状态管理
- [ ] 自动加载规则
- [ ] 技能验证

### Phase 3: 优化
- [ ] 智能推荐
- [ ] 缓存优化
- [ ] 性能监控
- [ ] 技能分享
- [ ] 版本管理

## 关键代码结构

```
src/
├── skills/
│   ├── skill-registry.js      # 技能注册表
│   ├── skill-loader.js        # 技能加载器
│   ├── skill-parser.js        # Markdown 解析
│   ├── skill-executor.js      # 技能执行器
│   ├── tools/
│   │   ├── skill-discover.js  # skillDiscover tool
│   │   └── skill-load.js      # skillLoad tool
│   └── executors/
│       ├── deterministic.js   # 脚本执行
│       ├── reasoning.js       # AI 推理
│       └── hybrid.js          # 工作流
│
├── conversation-state.js      # 会话状态
├── config.js                  # 配置（添加 skills 节）
└── ai-client.js               # AI 集成
```

## 测试计划

### 单元测试
- [ ] Markdown 解析器
- [ ] 技能加载器
- [ ] 参数验证
- [ ] 执行器

### 集成测试
- [ ] skillDiscover 流程
- [ ] skillLoad 流程
- [ ] 会话状态更新
- [ ] AI 调用技能

### 端到端测试
- [ ] 完整对话流程
- [ ] 技能失败降级
- [ ] 多技能协作

## 性能考虑

### 优化策略
1. **延迟加载**：只加载常驻技能，其他按需加载
2. **元数据缓存**：快速扫描时只读元数据
3. **智能预加载**：根据对话历史预测需要的技能
4. **会话隔离**：不同对话独立管理技能状态

### Token 优化
- 常驻技能：~500 tokens
- 每个动态技能：~200 tokens
- 预估：同时加载 5-10 个技能 = 1500-2500 tokens

## 安全考虑

### 权限控制
- ⚠️ 危险操作需要确认
- 🔒 敏感操作需要权限
- 📝 记录所有技能执行

### 沙箱执行
- 🛡️ 脚本在受限环境执行
- ⏱️ 超时保护
- 🚫 禁止危险命令

## 未来扩展

### 可能的增强
- [ ] 技能市场（分享和发现）
- [ ] 技能模板库
- [ ] 可视化技能编辑器
- [ ] 技能依赖管理
- [ ] 技能版本控制
- [ ] 团队技能共享

### 暂不考虑
- ❌ RAG（大量技能检索）
- ❌ 分布式技能库
- ❌ 技能市场交易

## 相关文档

1. [技术方案研究](./commands_and_skills_study.md) - 初始研究
2. [Commands 数据结构](./commands_data_structure_design.md) - 原始设计
3. [统一数据结构](./unified_skills_data_structure.md) - 统一方案
4. [Markdown 优先设计](./skills_markdown_first_design.md) - Markdown 方案
5. [快速上手指南](./skills_quick_start.md) - 用户指南
6. [自动发现机制](./skills_auto_discovery_design.md) - 动态加载

## 总结

**最终方案特点**：
- ✅ 简单：Markdown 编写，自然语言
- ✅ 智能：AI 自动发现和加载
- ✅ 高效：动态加载，节省 Token
- ✅ 灵活：三种类型，适应不同场景
- ✅ 可扩展：易于添加新技能

**设计原则**：
- 用户友好优先
- AI 自主性
- 性能优化
- 向后兼容
- 渐进增强

---

**版本**: 1.0.0
**最后更新**: 2025-01-XX
