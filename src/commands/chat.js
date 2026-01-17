/**
 * 交互模式命令
 * 暂时桥接到现有的 closer-cli.jsx
 */

export default async function chatCommand(args, options) {
  // 动态导入并运行现有的交互模式
  // 由于 closer-cli.jsx 是 jsx 文件且使用 ink，我们直接导入它的主逻辑
  await import('../closer-cli.jsx');
}
