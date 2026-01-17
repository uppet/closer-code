# 项目历史隔离功能

## 概述

新版本实现了**项目级别的对话历史隔离**，解决了之前所有项目共享一个历史文件导致上下文混淆的问题。

## 问题背景

**之前的问题：**
- 所有项目的对话历史都保存在 `~/.closer-code/history.json` 文件中
- 在项目A对话后切换到项目B，AI会看到项目A的上下文
- 不同项目的代码、技术栈、业务逻辑会相互干扰
- 难以管理和追溯特定项目的历史记录

**解决方案：**
- 每个项目拥有独立的历史文件
- 基于项目路径自动隔离历史记录
- 支持历史管理和查询

## 技术实现

### 文件结构

```
~/.closer-code/
├── config.json                        # 配置文件
├── memory.json                        # 项目知识库
└── history/                           # 历史目录（新增）
    ├── {md5-hash}-{dir-name}.json     # 项目历史文件
    └── {md5-hash}-{dir-name}.meta.json # 项目元数据

示例文件：
├── 06aecb89a562f1a6038cca327538315e-project-beta.json
├── 06aecb89a562f1a6038cca327538315e-project-beta.meta.json
├── f5617862fb3ca8fbbc2f3ff26b106cf6-my-awesome-app.json
└── f5617862fb3ca8fbbc2f3ff26b106cf6-my-awesome-app.meta.json
```

### 核心机制

1. **路径哈希化**
   - 使用项目路径的MD5哈希作为文件名前缀
   - 添加目录名作为后缀，便于人类识别
   - 避免路径特殊字符导致的文件系统问题
   - 确保路径唯一性

   **文件命名格式**: `{md5-hash}-{directory-name}.json`
   
   示例：
   - `06aecb89a562f1a6038cca327538315e-project-beta.json`
   - `f5617862fb3ca8fbbc2f3ff26b106cf6-my-awesome-app.json`
   
   优势：
   - ✅ 哈希前缀确保唯一性
   - ✅ 目录名后缀便于查阅
   - ✅ 特殊字符自动处理（如 `data.processor` → `data_processor`）

2. **元数据管理**
   - 每个项目对应两个文件：
     - `{hash}.json`: 实际历史数据
     - `{hash}.meta.json`: 元数据（路径、消息数、更新时间）
   - 便于快速查询和管理

3. **自动隔离**
   - 基于当前工作目录自动识别项目
   - 无需手动配置，自动加载正确的历史

## API 使用

### 基本函数

```javascript
import {
  loadHistory,
  saveHistory,
  clearHistory,
  listHistory,
  migrateHistory
} from './config.js';

// 加载指定项目的历史
const history = loadHistory('/path/to/project');

// 保存历史（自动使用当前工作目录）
saveHistory(messages);

// 保存到指定项目
saveHistory(messages, '/path/to/project');

// 清除项目历史
clearHistory('/path/to/project');

// 列出所有项目的历史
const projects = listHistory();
// 返回: [{ projectPath, messageCount, lastUpdated }, ...]

// 迁移旧的历史文件
migrateHistory();
```

### 在 Conversation 类中使用

```javascript
export class Conversation {
  async initialize() {
    // 自动加载当前项目的历史
    const projectPath = this.config.behavior.workingDir;
    const history = loadHistory(projectPath);
    this.messages = history;
    // ...
  }

  async sendMessage(userMessage) {
    // ... 处理消息
    
    // 保存到当前项目
    const projectPath = this.config.behavior.workingDir;
    saveHistory(this.messages, projectPath);
  }
}
```

## 命令行工具

### 查看所有项目历史

```bash
node src/commands/history.js list
```

输出示例：
```
📚 所有项目历史

1. /home/user/project-alpha
   消息数: 42
   最后更新: 2026/1/18 10:30:15

2. /home/user/project-beta
   消息数: 18
   最后更新: 2026/1/17 15:20:30
```

### 查看指定项目历史

```bash
node src/commands/history.js show /path/to/project
```

### 清除项目历史

```bash
node src/commands/history.js clear /path/to/project
```

### 导出项目历史

```bash
node src/commands/history.js export /path/to/project
# 导出为: history-export-2026-01-18T10-30-15.json
```

### 迁移旧历史

```bash
node src/commands/history.js migrate
```

## 测试验证

### 运行单元测试

```bash
node test/test-history-isolation.js
```

测试覆盖：
- ✓ 保存和加载历史
- ✓ 项目隔离验证
- ✓ 独立更新测试
- ✓ 清除历史测试
- ✓ 列出所有历史
- ✓ 元数据验证

### 运行真实场景测试

```bash
node test/test-real-scenario.js
```

模拟场景：
- 在项目A中开发React组件
- 切换到项目B开发Node.js API
- 回到项目A，验证上下文正确
- 验证两个项目互不影响

## 迁移指南

### 从旧版本升级

如果你有旧版本的历史文件：

1. **备份（自动）**
   - 旧文件会自动备份为 `history.json.backup`

2. **迁移**
   ```bash
   node src/commands/history.js migrate
   ```
   - 旧历史会迁移到当前项目
   - 保留原始文件作为备份

3. **验证**
   ```bash
   node src/commands/history.js list
   ```

### 兼容性

- 旧版 `history.json` 文件仍然保留
- 新旧系统可以共存
- 建议迁移后手动删除旧文件（确认迁移成功后）

## 优势总结

### 对用户的好处

1. **上下文纯净**
   - 每个项目的对话历史独立
   - AI不会混淆不同项目的代码和逻辑

2. **更好的体验**
   - 切换项目时自动加载正确的历史
   - 无需手动清理历史

3. **易于管理**
   - 可以查看、清除、导出特定项目的历史
   - 了解每个项目的对话活跃度

4. **性能优化**
   - 只加载当前项目的历史，内存占用更小
   - 历史文件更小，读写更快

### 对开发的好处

1. **代码隔离**
   - 不同项目的代码讨论不会相互干扰
   - AI可以更好地理解项目特定的上下文

2. **调试便利**
   - 可以快速查看特定项目的对话历史
   - 便于追溯问题和理解决策过程

3. **团队协作**
   - 每个团队成员可以有独立的项目历史
   - 便于知识管理和经验积累

## 注意事项

1. **路径敏感性**
   - 项目路径必须完全一致才会识别为同一项目
   - 符号链接和相对路径会被规范化

2. **历史限制**
   - 每个项目最多保留最近100条消息
   - 超出限制的消息会被自动裁剪

3. **存储位置**
   - 历史文件存储在 `~/.closer-code/history/`
   - 请确保有足够的磁盘空间

4. **隐私保护**
   - 历史文件包含对话内容，可能包含敏感信息
   - 导出历史时注意文件权限

## 未来改进

可能的增强功能：

1. **历史搜索**
   - 在所有项目历史中搜索关键词
   - 查找相关的对话记录

2. **历史合并**
   - 支持合并多个项目的历史
   - 便于项目重构后的历史迁移

3. **历史分析**
   - 统计项目对话频率
   - 分析常见问题和解决方案

4. **云同步**
   - 支持跨设备同步历史
   - 团队共享项目知识库

## 常见问题

**Q: 切换项目后历史会丢失吗？**
A: 不会。每个项目的历史独立保存，切换回来时会自动加载。

**Q: 如何删除所有历史？**
A: 删除 `~/.closer-code/history/` 目录即可。

**Q: 历史文件会占用多少空间？**
A: 每条消息约1-5KB，100条消息约100-500KB。

**Q: 可以禁用历史保存吗？**
A: 目前不支持，但可以通过 `clearHistory()` 随时清除。

**Q: 如何查看当前项目的历史？**
A: `node src/commands/history.js show $(pwd)`

## 总结

项目历史隔离功能确保了不同项目的对话上下文完全独立，大大提升了多项目开发的体验。AI助手现在能够更准确地理解每个项目的特定上下文，提供更精准的帮助。
