# Skills 快速上手指南

## 5 分钟创建你的第一个技能

### Step 1: 创建技能目录

```bash
mkdir -p ~/.closer-code/skills/hello-world
```

### Step 2: 编写 skill.md

```bash
cat > ~/.closer-code/skills/hello-world/skill.md << 'EOF'
# Hello World

向世界打招呼！

## 类型
`command`

## 使用方式

运行这个技能会输出 "Hello, World!"。

## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| name | string | ❌ | World | 打招呼的对象 |

## 示例

```bash
/hello-world
# 输出：Hello, World!

/hello-world --name=Alice
# 输出：Hello, Alice!
```

## 执行步骤

1. 读取参数 name
2. 输出 "Hello, {name}!"
EOF
```

**注意**：系统只会解析标题和描述，完整内容会由 AI 理解。

### Step 3: 完成！

现在你可以在对话中使用这个技能：

```
你: 帮我使用 hello-world 技能
AI: 我来加载 hello-world 技能...
[加载技能，AI 阅读完整文档]
AI: 根据技能文档，我可以向你打招呼。默认是 "Hello, World!"，需要指定名字吗？

你: 叫 Alice
AI: Hello, Alice!
```

---

## 重要说明

### 解析方式

**系统只解析必需的元数据**：
- ✅ 标题（# 标题）
- ✅ 描述（第一段）
- ✅ 类型（## 类型）

**完整内容由 AI 理解**：
- 📖 参数表格
- 📖 使用示例
- 📖 执行步骤
- 📖 注意事项

**这意味着**：
- 你可以自由编写 Markdown
- 不受固定字段限制
- AI 会理解你的意图
- 更灵活、更强大

### 最小格式

```markdown
# 技能名称

描述。

## 类型
`command`
```

只要包含这三部分，系统就能识别！

---

## 常用模板

### 模板 1: 简单命令

```markdown
# 技能名称

一句话描述。

## 类型
`command`

## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| param1 | string | ✅ | - | 说明 |

## 示例

```bash
/skill-name --param1=value
```

## 执行步骤

1. 步骤 1
2. 步骤 2
```

### 模板 2: AI 技能

```markdown
# 技能名称

描述这个 AI 技能做什么。

## 类型
`skill`

## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| target | string | ✅ | - | 目标 |

## 能力

这个技能可以：
- 能力 1
- 能力 2
- 能力 3

## 示例

```bash
/skill-name --target=file.js
```

## 注意事项

- ⚠️ 注意事项 1
- ⚠️ 注意事项 2
```

### 模板 3: 工作流

```markdown
# 技能名称

描述这个工作流。

## 类型
`workflow`

## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| env | string | ✅ | - | 环境 |

## 工作流步骤

1. **步骤 1**: 描述
2. **步骤 2**: 描述
3. **步骤 3**: 描述

## 示例

```bash
/skill-name --env=prod
```

## 故障排查

- 问题 1：解决方案
- 问题 2：解决方案
```

---

## 实用示例

### 示例 1: Git 快捷操作

**文件：`~/.closer-code/skills/gc/skill.md`**

```markdown
# GC (Git Commit)

快速 Git 提交。

## 类型
`command`

## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| msg | string | ✅ | - | 提交消息 |

## 示例

```bash
/gc --msg="修复bug"
```

## 执行步骤

1. git add .
2. git commit -m "{msg}"
```

### 示例 2: 代码格式化

**文件：`~/.closer-code/skills/fmt/skill.md`**

```markdown
# Format Code

格式化项目代码。

## 类型
`command`

## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| check | boolean | ❌ | false | 只检查不修复 |

## 示例

```bash
/fmt                    # 格式化代码
/fmt --check=true       # 检查格式
```

## 执行步骤

1. 运行格式化工具（Prettier/ESLint 等）
2. 如果有错误，显示需要修复的文件
```

### 示例 3: 日志查看

**文件：`~/.closer-code/skills/logs/skill.md`**

```markdown
# View Logs

查看应用日志。

## 类型
`skill`

## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| app | string | ❌ | - | 应用名称 |
| tail | number | ❌ | 50 | 显示行数 |
| filter | string | ❌ | - | 过滤关键词 |

## 示例

```bash
/logs --app=myapp --tail=100
/logs --filter=ERROR
```

## 注意事项

- 需要日志目录的读取权限
- 大量日志可能需要时间加载
```

---

## 技能文件组织

### 推荐结构

```
skill-name/
├── skill.md              # 必须：技能说明
├── script.sh             # 可选：参考脚本
├── config.json           # 可选：配置示例
├── README.md             # 可选：详细文档
└── examples/             # 可选：示例目录
    ├── example1.txt
    └── example2.txt
```

### 文件说明

| 文件 | 必需 | 说明 |
|------|------|------|
| `skill.md` | ✅ | 技能主文档 |
| `script.sh` | ❌ | 参考脚本（不会被自动执行） |
| `config.json` | ❌ | 配置示例 |
| `README.md` | ❌ | 额外文档 |
| `examples/` | ❌ | 示例文件 |

---

## Markdown 编写技巧

### 1. 使用表格定义参数

```markdown
## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| name | string | ✅ | - | 名称 |
| count | number | ❌ | 1 | 数量 |
| flag | boolean | ❌ | false | 标志 |
```

### 2. 使用代码块展示示例

```markdown
## 示例

\`\`\`bash
/skill-name --param=value
\`\`\`

\`\`\`javascript
// 代码示例
const result = await skill.execute();
\`\`\`
```

### 3. 使用列表说明步骤

```markdown
## 执行步骤

1. 第一步
2. 第二步
3. 第三步
```

### 4. 使用表情符号增强可读性

```markdown
## 注意事项

- ⚠️ 警告信息
- ✅ 推荐做法
- ❌ 避免做法
- 💡 提示信息
- 🔍 检查项
```

### 5. 使用引用块强调

```markdown
## 重要提示

> 这个技能会修改文件，请确保已备份！
```

---

## 技能类型选择指南

### 什么时候用 `command`？

✅ 确定性操作
✅ 脚本化任务
✅ 不需要 AI 推理

示例：
- Git 操作
- 文件管理
- 系统命令

### 什么时候用 `skill`？

✅ 需要 AI 分析
✅ 需要推理判断
✅ 复杂的决策

示例：
- 代码审查
- 问题诊断
- 数据分析

### 什么时候用 `workflow`？

✅ 多步骤流程
✅ 组合多个技能
✅ 条件分支

示例：
- 完整部署
- CI/CD 流程
- 复杂任务

---

## 调试技巧

### 1. 验证技能加载

```bash
# 列出所有技能
/skills --list

# 查看技能详情
/skills --show=git-commit
```

### 2. 测试技能

```bash
# 在对话中测试
你: 帮我测试 git-commit 技能
AI: 好的，执行 git-commit...
```

### 3. 查看日志

```bash
# 查看技能执行日志
cat ~/.closer-code/logs/skills.log
```

---

## 最佳实践

### ✅ 推荐做法

1. **清晰的命名**
   - ✅ `git-commit`, `code-review`
   - ❌ `gc`, `cr`

2. **详细的描述**
   - ✅ 说明做什么、怎么做、注意什么
   - ❌ 只有简单一句话

3. **实用的示例**
   - ✅ 提供真实可用的示例
   - ❌ 只有语法说明

4. **合理的类型**
   - ✅ 根据实际选择合适的类型
   - ❌ 滥用某一种类型

### ❌ 避免做法

1. **过于复杂的技能**
   - 一个技能只做一件事
   - 复杂任务拆分成多个技能

2. **缺少参数说明**
   - 必须说明每个参数的用途
   - 提供默认值和示例

3. **没有注意事项**
   - 危险操作必须警告
   - 说明前置条件

---

## 常见问题

**Q: 技能文件必须叫 skill.md 吗？**
A: 是的，系统只识别 `skill.md` 文件。

**Q: 可以嵌套技能目录吗？**
A: 不建议，所有技能应该直接放在 skills/ 目录下。

**Q: 如何分享技能？**
A: 直接分享技能目录，其他人放到他们的 skills/ 目录即可。

**Q: 技能可以用中文吗？**
A: 可以！支持任何语言的 Markdown。

**Q: 如何更新技能？**
A: 直接编辑 skill.md 文件，系统会自动重新加载。

---

## 下一步

1. 创建你的第一个技能
2. 在对话中测试
3. 根据需要调整
4. 分享给团队

---

**相关文档**：
- [Markdown 优先设计](./skills_markdown_first_design.md)
- [统一数据结构](./unified_skills_data_structure.md)
