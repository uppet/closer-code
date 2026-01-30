/**
 * 交互模式命令
 * 启动交互式聊天界面
 */

import { startChatMode } from '../closer-cli.jsx';

export default async function chatCommand(args, options) {
  // 将 testMode 选项传递给全局，供 closer-cli.jsx 使用
  if (options.test) {
    process.env.CLOSER_TEST_MODE = '1';
  }

  // 调用启动函数，此时才开始渲染UI
  startChatMode();
}
