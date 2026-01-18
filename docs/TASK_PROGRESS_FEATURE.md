# Task Progress 功能说明

## 功能概述

Task Progress 现在支持两种计划模式，可以实时显示任务执行进度。

## 两种计划模式

### 1. /plan 命令（程序化计划）

用户显式调用 `/plan` 命令来创建和执行任务计划。

**使用方法：**
```
/plan 创建一个 React 组件 Button
```

**工作流程：**
1. AI 分析任务需求
2. 生成详细的执行步骤
3. 逐步执行每个步骤
4. 实时显示进度

**UI 显示：**
```
📋 创建一个 React 组件 Button
[████████████████████████░░░░░░░░] 2/3 (66%)
✓ 创建组件文件
✓ 编写组件代码
→ 添加样式
```

### 2. AI Planning（自动检测）

AI 在处理复杂任务时，会自动创建计划并显示进度。

**触发条件：**
- AI 调用 `writeFile` 工具写入 `.closer_plan/` 目录
- 系统自动检测并创建对应的 plan 对象

**工作流程：**
1. 用户提出复杂任务（如"分析整个项目"）
2. AI 开始分析并写入规划文档到 `.closer_plan/`
3. 系统自动创建 plan 对象
4. 实时显示分析进度

**UI 显示：**
```
🤖 AI 分析整个项目架构
[█████████░░░░░░░░░░░░░░░░░░░░░░░] 1/3 (33%)
→ 读取项目文件
○ 分析代码结构
○ 生成分析文档
```

## Plan 对象结构

```javascript
{
  id: "唯一标识符",
  type: "command" | "auto",
  description: "任务描述",
  status: "pending" | "in_progress" | "completed" | "failed",
  steps: [
    {
      id: "步骤ID",
      description: "步骤描述",
      status: "pending" | "in_progress" | "completed" | "failed",
      result: "执行结果"
    }
  ],
  createdAt: 创建时间戳,
  updatedAt: 更新时间戳,
  metadata: {}
}
```

## 进度显示

### 进度条
```
[████████████████████████░░░░░░░░] 2/3 (66%)
```
- `█` 已完成
- `░` 未完成
- 显示完成数/总数和百分比

### 步骤状态图标
- `✓` 已完成
- `→` 进行中
- `○` 待执行
- `✗` 失败

### Plan 类型标识
- `📋` /plan 命令创建
- `🤖` AI 自动创建

## 实现细节

### 核心文件

1. **src/plan.js**
   - Plan 类定义
   - 步骤管理
   - 进度计算

2. **src/conversation.js**
   - `createPlan()` - 创建计划
   - `planAndExecute()` - /plan 命令实现
   - `detectAIPlanning()` - 检测 AI Planning
   - `updateAIPlanningStep()` - 更新 AI Planning 步骤

3. **src/closer-cli.jsx**
   - TaskProgress 组件增强
   - 支持两种 plan 类型显示
   - 进度事件处理

### 检测机制

AI Planning 检测：
```javascript
// 在 sendMessage 中监听工具调用
if (toolName === 'writeFile' && filePath.includes('.closer_plan/')) {
  // 自动创建 plan 对象
  const plan = this.createPlan(description, PlanType.AUTO);
}
```

## 使用示例

### 示例1：使用 /plan 命令

```
你: /plan 创建一个 Python 脚本读取 CSV 文件

系统:
📋 创建一个 Python 脚本读取 CSV 文件
[█████████░░░░░░░░░░░░░░░░░░░░░░░] 1/4 (25%)
→ 分析任务需求
○ 创建脚本文件
○ 编写读取逻辑
○ 添加错误处理
```

### 示例2：AI 自动 Planning

```
你: 分析整个项目的架构

系统:
🤖 AI 分析整个项目架构
[████████████████████████████░░░░] 4/5 (80%)
✓ 读取项目文件
✓ 分析目录结构
✓ 识别主要模块
✓ 分析依赖关系
→ 生成架构文档
```

## 相关命令

- `/plan <task>` - 创建并执行任务计划
- `/learn` - 学习项目模式
- `/status` - 查看当前状态
- `/clear` - 清除对话历史

## 技术特点

- ✅ 统一的 Plan 对象结构
- ✅ 支持两种计划模式
- ✅ 实时进度更新
- ✅ 自动检测 AI Planning
- ✅ JSON 序列化支持
- ✅ 完整的状态管理

## 注意事项

1. /plan 命令会逐步执行任务，每个步骤都会调用 AI
2. AI Planning 是自动检测的，无需手动触发
3. Plan 对象不会持久化，重启后会丢失
4. 同时只能有一个活动的 plan

## 未来改进

可能的增强功能：
- Plan 持久化（保存到文件）
- Plan 暂停/恢复
- Plan 编辑功能
- Plan 导出功能
- 多 plan 并发支持
