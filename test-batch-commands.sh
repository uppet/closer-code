#!/bin/bash

# 测试 batch 模式下的斜杠命令

echo "========================================="
echo "测试 Batch 模式的斜杠命令支持"
echo "========================================="
echo ""

# 构建 batch-cli
echo "1. 构建 batch-cli..."
npm run build:batch

if [ $? -ne 0 ]; then
  echo "❌ 构建失败"
  exit 1
fi

echo "✅ 构建成功"
echo ""

# 测试 /keys 命令
echo "2. 测试 /keys 命令..."
echo "-----------------------------------"
node dist/batch-cli.js "/keys"
echo ""
echo "退出码: $?"
echo ""

# 测试 /config 命令
echo "3. 测试 /config 命令..."
echo "-----------------------------------"
node dist/batch-cli.js "/config"
echo ""
echo "退出码: $?"
echo ""

# 测试 /help 命令
echo "4. 测试 /help 命令..."
echo "-----------------------------------"
node dist/batch-cli.js "/help"
echo ""
echo "退出码: $?"
echo ""

# 测试 JSON 格式输出
echo "5. 测试 /keys 命令（JSON 格式）..."
echo "-----------------------------------"
node dist/batch-cli.js --json "/keys"
echo ""
echo "退出码: $?"
echo ""

# 测试未知命令
echo "6. 测试未知命令..."
echo "-----------------------------------"
node dist/batch-cli.js "/unknown"
echo ""
echo "退出码: $?"
echo ""

# 测试普通提示词（确保不影响正常功能）
echo "7. 测试普通提示词（非命令）..."
echo "-----------------------------------"
echo "hello" | node dist/batch-cli.js
echo ""
echo "退出码: $?"
echo ""

echo "========================================="
echo "测试完成"
echo "========================================="
