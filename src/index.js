#!/usr/bin/env node
/**
 * Cloco - AI 编程助手统一CLI入口
 *
 * 使用方式:
 *   cloco [options] [prompt]
 *   cloco -b|--batch [options] <prompt>
 *   cloco config [subcommand] [args]
 *   cloco setup|upgrade|version|help
 */

import { parseOptions } from './utils/cli.js';
import { showHelp } from './commands/help.js';
import { showVersion } from './utils/version.js';
import { hasConfig } from './config.js';

// 子命令映射
const commands = {
  config: () => import('./commands/config.js'),
  setup: () => import('./commands/setup.js'),
  upgrade: () => import('./commands/upgrade.js'),
  'workflow-tests': () => import('./commands/workflow-tests.js'),
};

/**
 * 错误处理
 */
function handleError(error) {
  console.error('❌ 发生错误:', error.message);

  if (error.code === 'ENOENT') {
    console.error('💡 文件或目录不存在');
  } else if (error.code === 'EACCES') {
    console.error('💡 权限不足，请检查文件权限');
  } else if (process.env.CLOSER_DEBUG_LOG) {
    console.error('调试信息:', error.stack);
  }

  process.exit(1);
}

/**
 * 主函数
 */
async function main() {
  const { options, args, specialCommand } = parseOptions(process.argv.slice(2));

  // 处理特殊命令
  if (specialCommand === 'help' || options.help) {
    await showHelp();
    return;
  }

  if (specialCommand === 'version' || options.version) {
    showVersion();
    return;
  }

  // 处理子命令
  if (specialCommand && commands[specialCommand]) {
    const module = await commands[specialCommand]();
    await module.default(args, options);
    return;
  }

  // 批处理模式
  if (options.batch || options.b) {
    const { default: batchMode } = await import('./commands/batch.js');
    await batchMode(args, options);
    return;
  }

  // 极简模式
  if (options.simple) {
    // const { startDoubleCtrlc } = await import('../double_ctrlc.jsx');
    const { default: minimalMode } = await import('./commands/minimal.js');

    // // 检查配置，如无则自动运行setup
    if (!await hasConfig()) {
      console.log('⚙️  首次使用，让我们完成配置...\n');
      const { default: setup } = await import('./commands/setup.js');
      await setup([], {});
      console.log('\n✅ 配置完成！\n');
    }

    await minimalMode(args, options);
    // await startDoubleCtrlc();
    return;
  }

  // 交互模式（默认）
  const { default: chatMode } = await import('./commands/chat.js');

  // 检查配置，如无则自动运行setup
  if (!await hasConfig()) {
    console.log('⚙️  首次使用，让我们完成配置...\n');
    const { default: setup } = await import('./commands/setup.js');
    await setup([], {});
    console.log('\n✅ 配置完成！\n');
  }

  await chatMode(args, options);
}

// 运行主函数
main().catch(handleError);
