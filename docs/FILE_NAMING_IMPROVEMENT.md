# 文件命名改进说明

## 改进内容

### 之前的问题
只用哈希值命名文件，虽然保证了唯一性，但不便于人类查阅：

```
❌ 旧命名: 06aecb89a562f1a6038cca327538315e.json
❌ 旧命名: e902bcc2a63d1efb2d3c879517a255a3.json
```

当你在 `~/.closer-code/history/` 目录下查看文件时，无法直接知道哪个文件对应哪个项目。

### 改进后的方案
在哈希值后面加上目录名，既保证唯一性又便于识别：

```
✅ 新命名: 06aecb89a562f1a6038cca327538315e-project-beta.json
✅ 新命名: f5617862fb3ca8fbbc2f3ff26b106cf6-my-awesome-app.json
✅ 新命名: aed557b877e451758c55c4d3f7306497-api-server.json
```

## 命名规则

### 格式
```
{md5-hash}-{directory-name}.json
{md5-hash}-{directory-name}.meta.json
```

### 组成部分

1. **MD5哈希前缀** (32个字符)
   - 基于完整项目路径生成
   - 确保文件名唯一性
   - 避免路径冲突

2. **目录名后缀**
   - 提取项目路径的最后一级目录名
   - 便于人类识别和查阅
   - 特殊字符自动处理

3. **特殊字符处理**
   - 非字母数字字符替换为下划线
   - 例如：`data.processor` → `data_processor`

## 实际示例

### 示例1: 简单项目名
```
项目路径: /home/user/project-alpha
文件名:   90e42e971156247007484e3a455f62ed-project-alpha.json
```

### 示例2: 带连字符的项目名
```
项目路径: /home/user/my-awesome-app
文件名:   f5617862fb3ca8fbbc2f3ff26b106cf6-my-awesome-app.json
```

### 示例3: 带点号的项目名
```
项目路径: /home/user/data.processor
文件名:   d8af9338aa986877bcea3aa9d4c1e915-data_processor.json
```

### 示例4: Windows路径
```
项目路径: S:\bld\opencode\closer_code
文件名:   83545f14f3db2e01ee2669719bc705fe-closer_code.json
```

## 优势对比

| 特性 | 旧方案 | 新方案 |
|------|--------|--------|
| 唯一性 | ✅ | ✅ |
| 可读性 | ❌ | ✅ |
| 可识别性 | ❌ | ✅ |
| 特殊字符处理 | ✅ | ✅ |
| 查阅便利性 | ❌ 需要查看元数据 | ✅ 直接从文件名识别 |

## 使用场景

### 场景1: 手动查看历史文件
```bash
# 列出历史目录
ls ~/.closer-code/history/

# 输出：
# 06aecb89a562f1a6038cca327538315e-project-beta.json
# f5617862fb3ca8fbbc2f3ff26b106cf6-my-awesome-app.json
# aed557b877e451758c55c4d3f7306497-api-server.json

# 现在可以直接看出每个文件对应的项目！
```

### 场景2: 备份特定项目历史
```bash
# 备份 my-awesome-app 项目
cp ~/.closer-code/history/*-my-awesome-app.* ~/backup/

# 旧方案需要先查看元数据才知道哪个文件是哪个项目
```

### 场景3: 清理特定项目历史
```bash
# 删除 api-server 项目历史
rm ~/.closer-code/history/*-api-server.*
```

## 技术实现

### 代码片段 (src/config.js)
```javascript
function getProjectHistoryPath(projectPath) {
  const normalizedPath = path.normalize(projectPath);
  const hash = crypto.createHash('md5').update(normalizedPath).digest('hex');
  const dirName = path.basename(normalizedPath);
  const cleanDirName = dirName.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(HISTORY_DIR, `${hash}-${cleanDirName}.json`);
}
```

### 关键点
1. `path.basename()` - 提取最后一级目录名
2. `replace(/[^a-zA-Z0-9_-]/g, '_')` - 清理特殊字符
3. 保留哈希前缀 - 确保唯一性

## 向后兼容

### 旧文件处理
如果你有旧版本的哈希文件（不带目录名），系统会：
1. 继续读取旧文件（向后兼容）
2. 新保存的文件使用新格式
3. 建议运行迁移工具统一格式

### 迁移建议
```bash
# 旧文件会继续工作
# 新文件使用改进的命名
# 无需立即迁移，可以逐步过渡
```

## 常见问题

**Q: 为什么保留哈希值？**
A: 哈希值确保唯一性，避免不同路径但相同目录名导致的冲突。

**Q: 目录名太长怎么办？**
A: 文件系统通常支持长文件名（255字符），目录名一般不会超过限制。

**Q: 特殊字符会被如何处理？**
A: 非字母数字字符（除了 `-` 和 `_`）会被替换为下划线。

**Q: 如何查看完整的项目路径？**
A: 查看 `.meta.json` 文件，其中包含完整的原始路径。

## 总结

这个改进在保持技术优势（唯一性、安全性）的同时，大大提升了用户体验（可读性、可识别性），是一个简单但有效的改进！

**核心原则**：
- ✅ 机器可读（哈希前缀）
- ✅ 人类可读（目录名后缀）
- ✅ 安全可靠（特殊字符处理）
- ✅ 向后兼容（旧文件仍可用）
