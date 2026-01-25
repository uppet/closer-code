# Skills 功能 - 文档索引

## 快速导航

### 🎯 最终设计
- **[Skills 最终设计决策](./skills_final_design_decisions.md)** ⭐ 设计讨论和决策过程
  - 适合：所有人
  - 内容：设计演进、最终方案、核心原则

### 🚀 快速开始
- **[Skills 快速上手指南](./skills_quick_start.md)** - 5 分钟创建你的第一个技能
  - 适合：用户、开发者
  - 内容：模板、示例、最佳实践

### 📚 完整设计
- **[Skills 完整设计总结](./skills_complete_design_summary.md)** - 整体架构和实现计划
  - 适合：开发者、架构师
  - 内容：技术架构、数据流、实现优先级

### 🔍 详细设计
- **[最终格式规范](./skills_final_format_spec.md)** ⭐ YAML front-matter 格式（基于 example_skill.md）
  - 适合：所有人
  - 内容：格式标准、解析策略、示例文件

- **[简化解析设计](./skills_simplified_parser_design.md)** - 最小化解析，AI 理解
  - 适合：开发者
  - 内容：只解析头部，完整内容由 AI 理解

- **[Markdown 优先设计](./skills_markdown_first_design.md)** - Markdown 技能格式
  - 适合：开发者
  - 内容：skill.md 模板、解析逻辑、AI 理解

- **[自动发现机制](./skills_auto_discovery_design.md)** - 动态加载设计
  - 适合：开发者
  - 内容：skillDiscover、skillLoad、系统提示词

- **[统一数据结构](./unified_skills_data_structure.md)** - Skills 统一方案
  - 适合：开发者
  - 内容：Type/ExecutionMode、与 Commands 的对比

### 📖 历史文档
- **[Commands 和 Skills 研究](./commands_and_skills_study.md)** - 初始技术方案研究
- **[Commands 数据结构设计](./commands_data_structure_design.md)** - 原始 JSON 方案
- **[Commands 快速参考](./commands_quick_reference.md)** - Commands 快速参考
- **[Skills 统一指南](./skills_unification_guide.md)** - 统一方案对比

## 文档关系图

```
skills_documentation_index.md (本文档)
    │
    ├─ 🚀 快速开始
    │   └─ skills_quick_start.md
    │       └─ 用户：如何创建技能
    │
    ├─ 📚 完整设计
    │   └─ skills_complete_design_summary.md
    │       ├─ 技术架构
    │       ├─ 数据流
    │       └─ 实现计划
    │
    ├─ 🔍 详细设计
    │   ├─ skills_markdown_first_design.md (Markdown 格式)
    │   ├─ skills_auto_discovery_design.md (动态加载)
    │   └─ unified_skills_data_structure.md (统一方案)
    │
    └─ 📖 历史文档
        ├─ commands_and_skills_study.md (初始研究)
        ├─ commands_data_structure_design.md (JSON 方案)
        ├─ commands_quick_reference.md (快速参考)
        └─ skills_unification_guide.md (统一对比)
```

## 按角色查阅

### 👤 用户（使用技能）

1. **先读**：[Skills 快速上手指南](./skills_quick_start.md)
   - 学习如何创建技能
   - 了解基本模板
   - 查看实际示例

2. **深入**：[Markdown 优先设计](./skills_markdown_first_design.md)
   - 学习高级格式
   - 了解参数定义
   - 掌握最佳实践

### 👨‍💻 开发者（实现功能）

1. **先读**：[Skills 完整设计总结](./skills_complete_design_summary.md)
   - 理解整体架构
   - 了解技术栈
   - 查看实现计划

2. **深入**：
   - [Markdown 优先设计](./skills_markdown_first_design.md) - 解析器实现
   - [自动发现机制](./skills_auto_discovery_design.md) - 动态加载实现
   - [统一数据结构](./unified_skills_data_structure.md) - 数据模型

### 🏗️ 架构师（设计系统）

1. **先读**：[Commands 和 Skills 研究](./commands_and_skills_study.md)
   - 理解设计背景
   - 了解技术选型

2. **深入**：
   - [Skills 完整设计总结](./skills_complete_design_summary.md) - 架构设计
   - [Skills 统一指南](./skills_unification_guide.md) - 方案对比
   - [统一数据结构](./unified_skills_data_structure.md) - 数据模型

## 按主题查阅

### 📝 数据结构
- [统一数据结构](./unified_skills_data_structure.md) - 最终方案
- [Commands 数据结构设计](./commands_data_structure_design.md) - 原始方案
- [Skills 统一指南](./skills_unification_guide.md) - 迁移指南

### 🎨 编写格式
- [Markdown 优先设计](./skills_markdown_first_design.md) - 完整说明
- [Skills 快速上手](./skills_quick_start.md) - 快速模板

### ⚙️ 加载机制
- [自动发现机制](./skills_auto_discovery_design.md) - 动态加载
- [Skills 完整设计总结](./skills_complete_design_summary.md) - 架构

### 🔄 演进历史
- [Commands 和 Skills 研究](./commands_and_skills_study.md) - 初始研究
- [Commands 数据结构设计](./commands_data_structure_design.md) - 第一版
- [统一数据结构](./unified_skills_data_structure.md) - 第二版
- [Markdown 优先设计](./skills_markdown_first_design.md) - 第三版

## 核心概念速查

### 技能类型

| 类型 | 执行模式 | 说明 | 示例 |
|------|----------|------|------|
| `command` | deterministic | 确定性脚本 | git-commit |
| `skill` | reasoning | AI 推理 | code-review |
| `workflow` | hybrid | 工作流 | deploy-app |

### 核心工具

| 工具 | 用途 | 使用时机 |
|------|------|----------|
| `skillDiscover` | 发现可用技能 | 需要特定能力时 |
| `skillLoad` | 加载技能 | 发现相关技能后 |

### 文件结构

```
skill-name/
├── skill.md              # 必须：技能说明
├── script.sh             # 可选：参考脚本
├── config.json           # 可选：配置示例
└── examples/             # 可选：示例文件
```

## 实现检查清单

### Phase 1: 核心（MVP）
- [ ] Markdown 解析器
  - [ ] 提取元数据（标题、描述、类型）
  - [ ] 解析参数表
  - [ ] 提取代码示例
  - [ ] 提取执行步骤

- [ ] Skill Registry
  - [ ] 扫描技能目录
  - [ ] 加载常驻技能
  - [ ] 快速发现（只读元数据）
  - [ ] 完整加载（解析 Markdown）

- [ ] Tools
  - [ ] skillDiscover tool
  - [ ] skillLoad tool

- [ ] Executor
  - [ ] Deterministic Executor（脚本执行）

- [ ] AI 集成
  - [ ] 系统提示词更新
  - [ ] 会话状态管理

### Phase 2: 增强
- [ ] Reasoning Executor（AI 推理）
- [ ] Hybrid Executor（工作流）
- [ ] 技能验证
- [ ] 错误处理和降级

### Phase 3: 优化
- [ ] 智能推荐
- [ ] 缓存优化
- [ ] 性能监控

## 常见问题

**Q: 为什么选择 Markdown 而不是 JSON？**
A: Markdown 更易编写、更易理解、AI 更容易解析。详见 [Markdown 优先设计](./skills_markdown_first_design.md)。

**Q: 为什么要统一 Commands 和 Skills？**
A: 它们本质相同，统一简化架构。详见 [Skills 统一指南](./skills_unification_guide.md)。

**Q: 如何实现动态加载？**
A: 通过 skillDiscover 和 skillLoad 工具。详见 [自动发现机制](./skills_auto_discovery_design.md)。

**Q: 技能文件必须叫 skill.md 吗？**
A: 是的，系统只识别 `skill.md` 文件。

**Q: 可以嵌套技能目录吗？**
A: 不建议，所有技能应该直接放在 skills/ 目录下。

**Q: 如何分享技能？**
A: 直接分享技能目录，其他人放到他们的 skills/ 目录即可。

## 贡献指南

### 添加新技能
1. 创建技能目录
2. 编写 skill.md
3. 测试技能
4. 分享给团队

### 改进文档
1. 更新相关文档
2. 保持索引同步
3. 添加示例

### 实现功能
1. 查看实现检查清单
2. 按优先级实现
3. 添加测试
4. 更新文档

## 版本历史

- **v1.0.0** (2025-01-XX): 初始版本
  - Markdown 优先设计
  - 动态自动发现
  - 三种技能类型

## 联系方式

如有问题或建议，请：
- 提交 Issue
- 发起 Discussion
- 查看 FAQ

---

**最后更新**: 2025-01-XX
**维护者**: Cloco Team
