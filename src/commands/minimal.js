/**
 * 极简模式命令
 * 启动极简界面，只提供一个多行输入框
 */

import { startMinimalMode } from '../minimal-cli.jsx';

export default function minimalCommand(args, options) {
  // 将 testMode 选项传递给全局，供 minimal-cli.jsx 使用
  if (options.test) {
    process.env.CLOSER_TEST_MODE = '1';
  }

  // 调用启动函数，此时才开始渲染UI
  startMinimalMode();
}
