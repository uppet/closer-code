/**
 * 批处理模式命令
 * 支持单次对话和 workflow 模式
 */

export default async function batchCommand(args, options) {
  // Workflow 模式：支持多轮迭代和验收标准验证
  if (options.workflow) {
    const { runWorkflow } = await import('../utils/workflow.js');
    const result = await runWorkflow(options.workflow, args, options);

    // 根据 JSON 选项格式化输出
    if (options.json || options.j) {
      console.log(JSON.stringify(result, null, 2));
    }

    // 设置退出码
    process.exit(result.success ? 0 : 1);
    return;
  }

  // 常规批处理模式：单次对话
  // 临时保存原始 process.argv
  const originalArgv = process.argv.slice();

  // 构建新的 argv 数组，模拟直接调用 batch-cli.js
  process.argv = [
    process.argv[0], // node
    process.argv[1], // 当前脚本
  ];

  // 添加选项
  if (options.help || options.h) {
    process.argv.push('--help');
  }
  if (options.json || options.j) {
    process.argv.push('--json');
  }
  if (options.verbose || options.v) {
    process.argv.push('--verbose');
  }
  if (options.debug || options.d) {
    process.argv.push('--debug');
  }
  if (options.file || options.f) {
    process.argv.push('--file', options.file || options.f);
  }

  // 添加提示词参数
  if (args.length > 0) {
    process.argv.push(args.join(' '));
  }

  try {
    // 导入并运行批处理模式
    const { runBatch } = await import('../batch-cli.js');
    await runBatch();
  } finally {
    // 恢复原始 process.argv
    process.argv = originalArgv;
  }
}
