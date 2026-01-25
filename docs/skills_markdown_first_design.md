# Skills 设计 - Markdown 优先方案

## 核心理念

**用户用自然语言描述技能，AI 理解并执行**

```
┌─────────────────────────────────────────────────────┐
│  传统方案（JSON）                                    │
├─────────────────────────────────────────────────────┤
│  用户 → 写 JSON Schema → 系统解析 → 执行            │
│                                                     │
│  问题：                                             │
│  - JSON 难以编写和维护                              │
│  - 需要学习 Schema 语法                             │
│  - 表达能力受限                                     │
│  - 不支持丰富的文档                                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Markdown 优先方案                                  │
├─────────────────────────────────────────────────────┤
│  用户 → 写 Markdown → AI 理解 → 执行                │
│                                                     │
│  优势：                                             │
│  - 自然语言，易于编写                               │
│  - 支持丰富的文档和示例                             │
│  - 可包含代码片段和图表                             │
│  - 人类可读，AI 可理解                              │
└─────────────────────────────────────────────────────┘
```

## 目录结构

```
~/.closer-code/skills/              # 全局技能目录
│
├── git-commit/                     # 技能单元（目录）
│   ├── skill.md                    # 技能说明（Markdown）
│   ├── commit.sh                   # 可选：参考脚本
│   └── commit-template.txt         # 可选：模板文件
│
├── code-review/                    # 技能单元
│   ├── skill.md                    # 技能说明
│   ├── checklist.md                # 可选：检查清单
│   └── examples/                   # 可选：示例目录
│       └── before-after.js
│
├── deploy-app/                     # 技能单元
│   ├── skill.md
│   ├── deploy.sh
│   ├── config.example.json
│   └── README.md                   # 额外文档
│
└── _categories/                    # 可选：分类索引
    ├── git.md
    └── code.md

.closer-code/skills/                # 项目本地技能
│
├── test-runner/
│   ├── skill.md
│   └── test-config.json
│
└── deploy-production/
    ├── skill.md
    └── deploy.sh
```

## skill.md 模板

### 最小化模板

```markdown
# 技能名称

一句话描述这个技能做什么。

## 类型
command | skill | workflow

## 使用方式

简单说明如何使用这个技能。
```

### 完整模板

```markdown
# 技能名称

简短描述（1-2 句话）。

## 详细描述

更详细的说明，可以包含：
- 技能的用途
- 适用场景
- 注意事项
- 最佳实践

## 类型
`command` | `skill` | `workflow`

## 执行模式
`deterministic` | `reasoning` | `hybrid`

## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| name | string | ✅ | - | 参数说明 |
| age | number | ❌ | 18 | 参数说明 |

## 使用示例

### 示例 1：基本用法
\`\`\`bash
/skill-name --param1=value1
\`\`\`

### 示例 2：高级用法
\`\`\`bash
/skill-name --param1=value1 --param2=value2
\`\`\`

## 执行步骤

1. 第一步做什么
2. 第二步做什么
3. 第三步做什么

## 注意事项

- ⚠️ 注意事项 1
- ⚠️ 注意事项 2

## 依赖

- 需要安装的工具
- 需要的权限
- 前置条件

## 相关文件

- `script.sh`: 参考脚本
- `config.json`: 配置示例

## 变更日志

- **1.0.0** (2024-01-01): 初始版本
```

## 实际示例

### 示例 1：Git Commit（命令型）

**文件：`~/.closer-code/skills/git-commit/skill.md`**

```markdown
# Git Commit

快速提交并推送 Git 更改。

## 描述

这个技能可以帮你：
- 添加所有更改到暂存区
- 创建提交
- 推送到远程分支

适用于日常的 Git 提交流程。

## 类型
`command`

## 执行模式
`deterministic`

## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| message | string | ✅ | - | 提交消息 |
| branch | string | ❌ | main | 目标分支 |
| amend | boolean | ❌ | false | 是否修正上次提交 |

## 使用示例

### 快速提交
\`\`\`bash
/git-commit --message="修复登录bug"
\`\`\`

### 提交到特定分支
\`\`\`bash
/git-commit --message="新功能" --branch=develop
\`\`\`

### 修正上次提交
\`\`\`bash
/git-commit --message="更新描述" --amend=true
\`\`\`

## 执行步骤

1. 执行 `git add .` 添加所有更改
2. 执行 `git commit -m "提交消息"`
3. 执行 `git push origin 分支名`

## 注意事项

- ⚠️ 确保已配置 Git 用户信息
- ⚠️ 提交前请检查更改内容
- ⚠️ `--amend` 会修改历史，谨慎使用

## 相关文件

- `commit.sh`: 实际执行的 Git 脚本
- `commit-template.txt`: 推荐的提交消息格式

## 常见问题

**Q: 如何撤销提交？**
A: 使用 `git reset HEAD~1` 撤销最后一次提交。

**Q: 如何修改提交消息？**
A: 使用 `--amend` 参数。
```

**文件：`~/.closer-code/skills/git-commit/commit.sh`**
```bash
#!/bin/bash
# 参考脚本，仅供参考
git add .
git commit -m "$1"
git push origin ${2:-main}
```

---

### 示例 2：代码审查（技能型）

**文件：`~/.closer-code/skills/code-review/skill.md`**

```markdown
# Code Review

对代码进行全面的审查，提供改进建议。

## 描述

这是一个智能代码审查技能，可以：

- 🔍 检测代码质量问题
- 🐛 发现潜在的 bug
- 🔒 识别安全风险
- ⚡ 提供性能优化建议
- 📝 检查代码风格一致性

适用于各种编程语言和项目类型。

## 类型
`skill`

## 执行模式
`reasoning`

## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| file | string | ✅ | - | 要审查的文件路径 |
| focus | string | ❌ | all | 审查重点：security / performance / style / all |
| level | string | ❌ | normal | 详细程度：brief / normal / detailed |

## 使用示例

### 全面审查
\`\`\`bash
/code-review --file=src/app.js
\`\`\`

### 专注安全审查
\`\`\`bash
/code-review --file=src/auth.js --focus=security
\`\`\`

### 简要审查
\`\`\`bash
/code-review --file=src/utils.js --level=brief
\`\`\`

## 审查维度

### 🔒 安全性
- SQL 注入风险
- XSS 漏洞
- 认证和授权问题
- 敏感数据泄露

### ⚡ 性能
- 算法复杂度
- 资源使用效率
- 缓存策略
- 并发处理

### 📝 代码风格
- 命名规范
- 代码格式
- 注释质量
- 结构清晰度

### 🐛 潜在 Bug
- 边界条件
- 错误处理
- 空值检查
- 类型安全

## 审查流程

1. 读取目标文件内容
2. 根据指定的 focus 分析代码
3. 生成详细的审查报告
4. 提供具体的改进建议

## 输出格式

审查报告包含：
- 📊 总体评分
- 🔴 严重问题（必须修复）
- 🟡 警告（建议修复）
- 💡 优化建议
- ✅ 做得好的地方

## 注意事项

- ⚠️ 对于大型文件，审查可能需要较长时间
- ⚠️ AI 审查不能完全替代人工 Code Review
- ⚠️ 建议结合单元测试和静态分析工具

## 相关文件

- `checklist.md`: 代码审查清单
- `examples/before-after.js`: 改进前后对比

## 最佳实践

1. **提交前审查**：在提交 PR 前进行审查
2. **定期审查**：定期审查核心代码
3. **团队协作**：结合团队 Code Review 流程
```

**文件：`~/.closer-code/skills/code-review/checklist.md`**
```markdown
# 代码审查清单

## 基础检查
- [ ] 代码是否可读？
- [ ] 变量和函数命名是否清晰？
- [ ] 是否有必要的注释？

## 安全检查
- [ ] 是否有用户输入验证？
- [ ] 是否有 SQL 注入风险？
- [ ] 敏感数据是否加密？

## 性能检查
- [ ] 是否有不必要的循环？
- [ ] 是否有内存泄漏风险？
- [ ] 数据库查询是否优化？

## 测试检查
- [ ] 是否有单元测试？
- [ ] 测试覆盖率是否足够？
- [ ] 是否有边界条件测试？
```

---

### 示例 3：部署应用（工作流型）

**文件：`~/.closer-code/skills/deploy-app/skill.md`**

```markdown
# Deploy App

完整的自动化部署流程。

## 描述

这个技能执行完整的部署流程：

1. ✅ 运行测试
2. 🔨 构建项目
3. 📝 代码审查（如果有更改）
4. 🚀 部署到指定环境
5. ✅ 部署验证

适用于 Web 应用、API 服务等。

## 类型
`workflow`

## 执行模式
`hybrid`

## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| env | string | ✅ | - | 部署环境：dev / staging / prod |
| skipTests | boolean | ❌ | false | 是否跳过测试 |
| skipReview | boolean | ❌ | false | 是否跳过代码审查 |
| version | string | ❌ | auto | 版本号（默认自动生成） |

## 使用示例

### 部署到开发环境
\`\`\`bash
/deploy-app --env=dev
\`\`\`

### 完整生产部署
\`\`\`bash
/deploy-app --env=prod
\`\`\`

### 快速部署（跳过测试）
\`\`\`bash
/deploy-app --env=staging --skipTests=true
\`\`\`

### 指定版本部署
\`\`\`bash
/deploy-app --env=prod --version=v1.2.3
\`\`\`

## 工作流步骤

### 1. 运行测试
- 执行单元测试
- 执行集成测试
- 检查测试覆盖率

### 2. 构建项目
- 清理旧的构建文件
- 安装依赖
- 执行构建
- 生成构建产物

### 3. 代码审查（可选）
- 检查代码更改
- 运行代码审查技能
- 生成审查报告

### 4. 部署
- 连接到服务器
- 上传构建产物
- 更新服务
- 重启应用

### 5. 部署验证
- 健康检查
- 冒烟测试
- 监控指标

## 环境配置

### 开发环境（dev）
- 服务器：dev.example.com
- 自动部署：✅
- 需要审批：❌

### 预发布环境（staging）
- 服务器：staging.example.com
- 自动部署：✅
- 需要审批：❌

### 生产环境（prod）
- 服务器：prod.example.com
- 自动部署：❌
- 需要审批：✅

## 注意事项

- ⚠️ 生产环境部署需要审批
- ⚠️ 确保所有测试通过后再部署
- ⚠️ 部署前建议先部署到 staging 验证
- ⚠️ 部署期间会有短暂的服务中断

## 回滚策略

如果部署失败：
1. 自动回滚到上一个版本
2. 通知相关人员
3. 生成错误报告

## 相关文件

- `deploy.sh`: 部署脚本
- `config.example.json`: 配置示例
- `rollback.sh`: 回滚脚本

## 监控和日志

部署完成后：
- 查看应用日志：`/logs --app=myapp --tail=100`
- 检查监控：`/monitor --app=myapp`
- 性能指标：`/metrics --app=myapp`

## 故障排查

**部署失败**
- 检查服务器连接
- 检查磁盘空间
- 查看部署日志

**测试失败**
- 本地运行测试：`npm test`
- 查看测试报告

**应用启动失败**
- 检查配置文件
- 查看应用日志
- 检查端口占用
```

**文件：`~/.closer-code/skills/deploy-app/deploy.sh`**
```bash
#!/bin/bash
# 参考部署脚本
ENV=$1
VERSION=${2:-auto}

echo "Deploying to $ENV..."

# 实际部署逻辑
# ...
```

---

## 技能发现和加载

### 1. 扫描技能目录

```javascript
class SkillLoader {
  async discoverSkills() {
    const skills = new Map();
    
    const scanDir = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = path.join(dir, entry.name);
          const skillMdPath = path.join(skillPath, 'skill.md');
          
          if (await fs.exists(skillMdPath)) {
            const skill = await this.parseSkillMarkdown(skillMdPath);
            skills.set(skill.name, skill);
          }
        }
      }
    };
    
    // 扫描全局技能
    await scanDir('~/.closer-code/skills');
    
    // 扫描项目技能
    await scanDir('.closer-code/skills');
    
    return skills;
  }
}
```

### 2. 解析 Markdown

```javascript
async function parseSkillMarkdown(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  
  // 使用 front-matter 或正则提取元数据
  const metadata = extractMetadata(content);
  
  return {
    name: metadata.name || extractTitle(content),
    type: metadata.type || 'skill',
    executionMode: metadata.executionMode || inferMode(content),
    description: metadata.description || extractDescription(content),
    parameters: parseParametersTable(content),
    examples: extractCodeBlocks(content),
    steps: extractSteps(content),
    warnings: extractWarnings(content),
    relatedFiles: await listRelatedFiles(path.dirname(filePath)),
    markdown: content  // 保留原始 Markdown
  };
}
```

### 3. AI 理解和执行

```javascript
class SkillExecutor {
  async execute(skillName, params, context) {
    const skill = this.registry.get(skillName);
    
    // 将技能的 Markdown 和参数发送给 AI
    const prompt = `
你是一个技能执行器。请根据以下技能描述执行任务：

## 技能说明
${skill.markdown}

## 用户参数
${JSON.stringify(params, null, 2)}

## 项目上下文
- 工作目录：${context.workingDir}
- Git 状态：${context.gitStatus}
- 可用工具：${context.availableTools.join(', ')}

请执行这个技能，并返回执行结果。
`;
    
    // AI 理解并执行
    const result = await this.aiClient.chat({
      messages: [{ role: 'user', content: prompt }],
      tools: context.availableTools
    });
    
    return result;
  }
}
```

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
    "autoReload": true,
    "maxSkills": 100,
    "defaultType": "skill",
    "defaultExecutionMode": "reasoning"
  }
}
```

## 使用流程

### 用户创建技能

```bash
# 1. 创建技能目录
mkdir -p ~/.closer-code/skills/my-skill

# 2. 编写 skill.md
cat > ~/.closer-code/skills/my-skill/skill.md << 'EOF'
# My Skill

我的技能描述。

## 类型
`skill`

## 使用方式

使用这个技能做...
EOF

# 3. （可选）添加参考脚本
cat > ~/.closer-code/skills/my-skill/script.sh << 'EOF'
#!/bin/bash
# 参考脚本
echo "Doing something..."
EOF

# 4. 完成！技能自动加载
```

### 用户调用技能

```bash
# 在对话中
用户: 帮我提交代码
AI: 我可以使用 git-commit 技能。请提供提交消息。

用户: 修复登录bug
AI: 好的，执行 git-commit 技能...
     [执行过程]
     ✓ 完成
```

## 优势总结

| 方面 | JSON 方案 | Markdown 方案 |
|------|-----------|---------------|
| 易用性 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 表达能力 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 可读性 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| AI 理解 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 扩展性 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 附件支持 | ❌ | ✅ |

## 实现优先级

### Phase 1: 基础
- [ ] Markdown 技能解析
- [ ] 基本的技能发现
- [ ] AI 理解和执行

### Phase 2: 增强
- [ ] 参数表格解析
- [ ] 代码示例提取
- [ ] 相关文件处理

### Phase 3: 高级
- [ ] 技能模板和生成
- [ ] 技能分享和导入
- [ ] 技能版本管理

---

**结论**：Markdown 优先的设计让技能编写更简单、更自然，同时保持了强大的表达能力。

**相关文档**：
- [统一数据结构](./unified_skills_data_structure.md)
- [Commands 设计](./commands_data_structure_design.md)
