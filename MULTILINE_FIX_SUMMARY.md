# 多行文本粘贴修复总结

## ✅ 已修复

**问题**：粘贴多行文本时只有最后一行显示

**原因**：`insertChar` 函数没有处理 input 中的换行符

**修复**：在 `insertChar` 中检测换行符并分割成多行

## 📝 修改文件

- `src/components/multiline-text-input.jsx` - 修改 `insertChar` 函数

## 📚 相关文档

详细说明：`docs/MULTILINE_PASTE_FIX.md`
