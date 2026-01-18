#!/bin/bash
# 项目历史隔离功能验证脚本

echo "=========================================="
echo "  项目历史隔离功能验证"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Node.js
echo "1. 检查环境..."
if command -v node &> /dev/null; then
    echo -e "${GREEN}✓${NC} Node.js 已安装: $(node --version)"
else
    echo -e "${RED}✗${NC} Node.js 未安装"
    exit 1
fi

# 运行单元测试
echo ""
echo "2. 运行单元测试..."
if node test/test-history-isolation.js; then
    echo -e "${GREEN}✓${NC} 单元测试通过"
else
    echo -e "${RED}✗${NC} 单元测试失败"
    exit 1
fi

# 运行场景测试
echo ""
echo "3. 运行场景测试..."
if node test/test-real-scenario.js; then
    echo -e "${GREEN}✓${NC} 场景测试通过"
else
    echo -e "${RED}✗${NC} 场景测试失败"
    exit 1
fi

# 测试命令行工具
echo ""
echo "4. 测试命令行工具..."
if node src/commands/history.js list > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} 命令行工具正常"
else
    echo -e "${RED}✗${NC} 命令行工具异常"
    exit 1
fi

# 显示当前项目历史
echo ""
echo "5. 显示当前项目历史..."
node src/commands/history.js show "$(pwd)"

# 总结
echo ""
echo "=========================================="
echo -e "${GREEN}✓ 所有验证通过！${NC}"
echo "=========================================="
echo ""
echo "功能已就绪，可以开始使用！"
echo ""
echo "常用命令："
echo "  - 查看所有项目: node src/commands/history.js list"
echo "  - 查看当前项目: node src/commands/history.js show \$(pwd)"
echo "  - 清除项目历史: node src/commands/history.js clear \$(pwd)"
echo ""
