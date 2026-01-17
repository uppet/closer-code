/**
 * CLI 工具函数
 * 提供命令行参数解析、输出格式化等功能
 */

// 特殊命令列表（不以 - 开头的非选项参数）
export const SPECIAL_COMMANDS = ['config', 'setup', 'upgrade', 'help', 'version', 'workflow-tests'];

/**
 * 解析命令行参数
 * @param {string[]} argv - 命令行参数数组（不包括 node 和脚本名）
 * @returns {Object} 解析结果 { options, args, specialCommand }
 */
export function parseOptions(argv) {
  const options = {
    help: false,
    version: false,
    batch: false,
    b: false,
    json: false,
    file: null,
    verbose: false,
    debug: false,
    all: false,               // 运行所有 workflow 测试
    workflow: null,           // workflow 模式：workflow 案例路径
    maxIterations: null,      // 最大迭代次数
  };
  const args = [];
  let specialCommand = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    // 处理选项
    if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (arg === '-v' || arg === '--version') {
      options.version = true;
    } else if (arg === '-b' || arg === '--batch') {
      options.batch = true;
      options.b = true;
    } else if (arg === '-j' || arg === '--json') {
      options.json = true;
    } else if (arg === '-f' || arg === '--file') {
      options.file = argv[++i] || null;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '-d' || arg === '--debug') {
      options.debug = true;
    } else if (arg === '--all') {
      // 运行所有 workflow 测试
      options.all = true;
    } else if (arg === '--workflow' || arg === '-w') {
      // workflow 模式
      options.workflow = argv[++i] || null;
      // workflow 模式隐含 batch 模式
      options.batch = true;
      options.b = true;
    } else if (arg === '--max-iterations') {
      // 最大迭代次数
      options.maxIterations = argv[++i] || null;
    } else if (arg.startsWith('-')) {
      // 其他选项（例如 --key value 或 -k value）
      const key = arg.replace(/^-+/, '');
      const nextArg = argv[i + 1];

      // 如果下一个参数存在且不是选项，则作为值
      if (nextArg !== undefined && !nextArg.startsWith('-')) {
        options[key] = nextArg;
        i++; // 跳过下一个参数
      } else {
        options[key] = true;
      }
    } else if (!specialCommand && SPECIAL_COMMANDS.includes(arg)) {
      // 特殊命令（只在第一个非选项位置）
      specialCommand = arg;
    } else {
      // 普通参数（提示词等）
      args.push(arg);
    }
  }

  return { options, args, specialCommand };
}

/**
 * 显示错误信息
 * @param {string} message - 错误信息
 */
export function showError(message) {
  console.error(`❌ ${message}`);
}

/**
 * 显示提示信息
 * @param {string} message - 提示信息
 */
export function showTip(message) {
  console.log(`💡 ${message}`);
}

/**
 * 显示成功信息
 * @param {string} message - 成功信息
 */
export function showSuccess(message) {
  console.log(`✅ ${message}`);
}

/**
 * 显示信息
 * @param {string} message - 信息内容
 */
export function showInfo(message) {
  console.log(`ℹ️  ${message}`);
}

/**
 * 显示警告信息
 * @param {string} message - 警告信息
 */
export function showWarning(message) {
  console.warn(`⚠️  ${message}`);
}
