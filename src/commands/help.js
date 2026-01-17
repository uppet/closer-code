/**
 * 帮助文档系统
 */

import { getVersion } from '../utils/version.js';

/**
 * 显示主帮助信息
 */
export async function showHelp() {
  const version = getVersion();

  console.log(`
Cloco - AI 编程助手 v${version}

使用方式:
  cloco [选项] [提示词]
  cloco -b|--batch [选项] <提示词>
  cloco config <操作> [参数]
  cloco setup|upgrade|version|help

交互模式:
  cloco                              # 启动交互式对话（默认）
                                       # 首次使用会自动运行配置向导

批处理模式:
  cloco -b "分析代码"                  # 短选项
  cloco --batch "列出文件"             # 长选项
  cloco -b --json "生成代码" > out.js  # JSON 格式输出
  cloco -b --file prompt.txt          # 从文件读取提示词
  cloco -b --verbose "分析"            # 详细输出（包含工具调用）

配置管理:
  cloco config                        # 查看当前配置
  cloco config set <key> <value>      # 设置配置项
  cloco config get <key>              # 获取配置项
  cloco config edit                   # 打开配置文件
  cloco config reset                  # 重置为默认配置

其他命令:
  cloco setup                         # 手动运行配置向导
  cloco upgrade                       # 检查版本更新
  cloco version                       # 显示版本信息
  cloco help                          # 显示此帮助信息

选项:
  -b, --batch                         # 批处理模式
  -j, --json                          # JSON 格式输出
  -f, --file <文件>                   # 从文件读取提示词
  --verbose                           # 详细输出模式
  -d, --debug                         # 启用调试日志
  -h, --help                          # 显示帮助信息
  -v, --version                       # 显示版本信息

环境变量:
  CLOSER_AI_PROVIDER                  # AI 提供商 (anthropic, openai, ollama)
  CLOSER_ANTHROPIC_API_KEY            # Anthropic API Key
  CLOSER_OPENAI_API_KEY               # OpenAI API Key
  CLOSER_DEBUG_LOG                    # 启用调试日志 (设为 1)

文档:
  https://github.com/your-repo/closer-code

示例:
  # 快速开始
  cloco                               # 首次使用会引导配置

  # 批处理任务
  cloco -b "解释这个函数"
  cloco -b --json "生成代码" > output.json

  # 配置管理
  cloco config set ai.provider openai
  cloco config get ai.provider
`);
}
