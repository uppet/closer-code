# Commands 和 Skills 技术方案研究

## 概述

本文档记录了对 AI 助手中 Commands 和 Skills 功能的技术方案研究和讨论。

## 核心概念

### Commands
- **定义**：预定义的指令/工具，类似函数调用
- **特点**：结构化的 API，模型可以通过 JSON 格式调用
- **示例**：搜索文件、执行命令、读写文件等

### Skills
- **定义**：领域特定的能力集合
- **特点**：包含多个相关的工具/功能，针对特定领域
- **示例**：金融分析技能包、代码审查技能包、数据分析技能包

## Skills 加载和传递方案

### 方案一：通过 Tools 参数传递

#### 传递位置
在每次调用模型 API 时，通过 `tools` 参数传递可用的 skills：

```javascript
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: conversationHistory,
  tools: [
    {
      type: "function",
      function: {
        name: "financial_analysis",
        description: "执行金融数据分析",
        parameters: {
          type: "object",
          properties: {
            data: { type: "string", description: "金融数据" }
          }
        }
      }
    }
  ]
});
```

#### 优势
- **标准化**：符合 OpenAI Function Calling 标准
- **类型安全**：结构化的参数定义
- **精确控制**：每次请求可以指定不同的工具集

#### 适用场景
- 需要精确控制模型可用的工具
- 工具参数结构化程度高
- 需要模型主动调用工具

### 方案二：通过 System Prompt 传递

#### 实现方式
在对话过程中动态修改 system prompt，将新的 skill 描述加入：

```javascript
const systemPrompt = `
你是一个 AI 助手，具备以下能力：

## 可用技能

${skills.map(skill => `- ${skill.name}: ${skill.description}`).join('\n')}

当用户需求匹配这些技能时，你应该主动使用它们。
`;

const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    { role: "system", content: systemPrompt },
    ...conversationHistory
  ]
});
```

#### 优势
- **灵活性**：可以描述更复杂的能力和行为
- **上下文丰富**：可以包含使用示例、注意事项等
- **自然语言**：不需要严格的参数结构

#### 适用场景
- 技能描述复杂，难以用结构化参数表示
- 需要指导模型的使用策略
- 技能更多是行为指导而非工具调用

## 动态 Skills 加载策略

### 场景示例

**对话流程**：
1. 用户开始对话（通用技能集）
2. 来回 1-2：通用问答
3. 来回 3：识别出用户需求涉及金融领域
4. **动态加载**：从 skills 字典中找出金融相关技能
5. 后续对话：使用增强后的技能集（通用 + 金融）

### 实现要点

#### 1. 意图识别
```javascript
function detectRequiredSkills(userMessage, conversationHistory) {
  // 分析对话历史，识别需要的领域技能
  const domains = analyzeDomains(conversationHistory);
  
  // 从 skills 字典中匹配
  const requiredSkills = skills.filter(skill =>
    domains.some(domain => skill.domains.includes(domain))
  );
  
  return requiredSkills;
}
```

#### 2. 增量更新
```javascript
let activeSkills = baseSkills; // 基础技能集

// 在对话过程中
const newSkills = detectRequiredSkills(userMessage, history);
activeSkills = mergeSkills(activeSkills, newSkills);

// 后续 API 调用使用更新后的 activeSkills
```

#### 3. 上下文维护
- 保持对话历史的完整性
- 记录技能激活的时机和原因
- 避免重复加载相同技能

### 优势
- **按需加载**：减少不必要的技能描述
- **上下文感知**：根据对话进展动态调整
- **性能优化**：避免 prompt 过长

### 注意事项
- **token 消耗**：动态增加技能会增加 prompt 长度
- **一致性**：确保技能描述在整个对话中保持一致
- **去重**：避免重复添加相同技能

## 两种方案对比

| 特性 | Tools 参数 | System Prompt |
|------|-----------|---------------|
| 标准化程度 | 高（OpenAI 标准） | 低（自定义） |
| 结构化程度 | 高（JSON Schema） | 低（自然语言） |
| 灵活性 | 中 | 高 |
| 模型理解 | 直接映射到函数调用 | 需要理解描述 |
| 适用场景 | 工具调用、API 操作 | 行为指导、复杂能力 |
| Token 效率 | 高（结构化） | 中（自然语言） |

## Cloco 实现建议

### 架构设计

```
┌─────────────────────────────────────────┐
│         Cloco Core System               │
├─────────────────────────────────────────┤
│  ┌─────────────┐    ┌──────────────┐   │
│  │  Commands   │    │   Skills     │   │
│  │  Registry   │    │   Registry   │   │
│  └─────────────┘    └──────────────┘   │
│         ↓                   ↓           │
│  ┌──────────────────────────────┐      │
│  │   Skill Loader & Selector    │      │
│  └──────────────────────────────┘      │
│         ↓                               │
│  ┌──────────────────────────────┐      │
│  │   Context Manager            │      │
│  │  - Track active skills       │      │
│  │  - Detect domain changes     │      │
│  └──────────────────────────────┘      │
└─────────────────────────────────────────┘
```

### 实现步骤

1. **定义 Skills 格式**
   - Skills 元数据结构
   - Commands 定义格式
   - 领域标签系统

2. **实现 Skill Registry**
   - 本地 skills 字典
   - 查找和匹配机制
   - 依赖关系管理

3. **实现动态加载器**
   - 意图识别模块
   - 增量更新逻辑
   - 上下文追踪

4. **集成到 API 调用**
   - Tools 参数构建
   - System prompt 生成
   - 两种方案切换机制

5. **测试和优化**
   - 单元测试
   - Token 使用优化
   - 性能监控

## 下一步行动

- [ ] 设计 Skills 和 Commands 的数据结构
- [ ] 实现 Skill Registry 基础功能
- [ ] 开发动态加载机制
- [ ] 集成到 Cloco 系统
- [ ] 编写测试用例

## 参考资料

- OpenAI Function Calling: https://platform.openai.com/docs/guides/function-calling
- LangChain Tools: https://python.langchain.com/docs/modules/tools/
- MCP (Model Context Protocol) Standards

---

**文档创建时间**: 2025-01-XX
**最后更新**: 2025-01-XX
