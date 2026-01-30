/**
 * 平台检测工具
 *
 * 用于检测当前运行平台和功能支持情况
 */

import { fileURLToPath } from 'url';
import { basename } from 'path';

/**
 * 检测是否支持作业控制（SIGTSTP 信号）
 *
 * 修正版：采用保守策略，优先保证不 crash
 *
 * @returns {boolean} 如果支持作业控制返回 true
 *
 * 支持的平台：
 * - Linux: ✅ 支持
 * - macOS: ✅ 支持
 * - Windows (所有变体): ❌ 不支持（保守策略）
 *
 * 注意：
 * - WSL 在某些情况下被识别为 win32，但实际可能支持
 * - MSYS2/Git Bash 可能运行 Windows 版本的 node，不支持 SIGTSTP
 * - 为安全起见，Windows 环境（包括 WSL、MSYS2）默认不支持
 */
export function supportsJobControl() {
  // Unix/Linux/macOS 默认支持
  if (process.platform !== 'win32') {
    return true;
  }

  // Windows 环境（包括 WSL、MSYS2）
  // 保守策略：默认不支持
  // 原因：
  // 1. process.platform === 'win32' 表示运行的是 Windows 版本的 node
  // 2. Windows 版本的 node 不支持 SIGTSTP 信号
  // 3. 即使 shell 环境是 MSYS2，实际运行的 node 可能是 Windows 版本
  // 4. 调用 process.kill(pid, 'SIGTSTP') 会抛出异常或 crash
  return false;
}

/**
 * 获取平台名称
 *
 * @returns {string} 平台名称
 *
 * 返回格式：
 * - "Windows (WSL)" - Windows Subsystem for Linux
 * - "Windows (MINGW64)" - Git Bash 64位
 * - "Windows (MSYS)" - MSYS2 环境
 * - "Windows" - Windows 原生环境
 * - "macOS" - macOS 系统
 * - "Linux" - Linux 系统
 * - 其他平台名称
 */
export function getPlatformName() {
  if (process.platform === 'win32') {
    // 检测 WSL
    if (process.env.WSL_DISTRO) {
      return `Windows (WSL - ${process.env.WSL_DISTRO})`;
    }
    if (process.env.WSL_INTEROP) {
      return 'Windows (WSL)';
    }

    // 检测 Git Bash/MSYS2
    if (process.env.MSYSTEM) {
      return `Windows (${process.env.MSYSTEM})`;
    }
    if (process.env.MSYSCON) {
      return 'Windows (MSYS)';
    }

    // Windows 原生环境
    return 'Windows';
  }

  if (process.platform === 'darwin') {
    return 'macOS';
  }

  return process.platform;
}

/**
 * 检测是否在 Windows 原生环境
 *
 * @returns {boolean} 如果是 Windows 原生环境返回 true
 *
 * 注意：WSL 和 Git Bash 不被视为 Windows 原生环境
 */
export function isWindows() {
  if (process.platform !== 'win32') {
    return false;
  }

  // 排除 WSL 和 Git Bash/MSYS2
  if (process.env.WSL_DISTRO || process.env.WSL_INTEROP) {
    return false;
  }
  if (process.env.MSYSTEM || process.env.MSYSCON) {
    return false;
  }

  return true;
}

/**
 * 检测是否在 WSL 环境
 *
 * @returns {boolean} 如果在 WSL 环境返回 true
 */
export function isWSL() {
  return !!(process.env.WSL_DISTRO || process.env.WSL_INTEROP);
}

/**
 * 检测是否在 Git Bash/MSYS2 环境
 *
 * @returns {boolean} 如果在 Git Bash/MSYS2 环境返回 true
 */
export function isGitBash() {
  return !!(process.env.MSYSTEM || process.env.MSYSCON);
}

/**
 * 获取终端类型
 *
 * @returns {string} 终端类型
 *
 * 可能的返回值：
 * - "tty" - 直接在终端运行
 * - "cmd" - Windows CMD
 * - "powershell" - Windows PowerShell
 * - "vscode" - VS Code 集成终端
 * - "unknown" - 未知终端
 */
export function getTerminalType() {
  // 检查 VS Code
  if (process.env.VSCODE_PID || process.env.TERM_PROGRAM === 'vscode') {
    return 'vscode';
  }

  // Windows 终端检测
  if (process.platform === 'win32') {
    if (process.env.PROMPT) {
      return 'cmd';
    }
    if (process.env.PSModulePath) {
      return 'powershell';
    }
  }

  // TTY 终端
  if (process.stdout.isTTY) {
    return 'tty';
  }

  return 'unknown';
}

/**
 * 获取详细的平台信息
 *
 * @returns {Object} 平台信息对象
 */
export function getPlatformInfo() {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    platformName: getPlatformName(),
    terminalType: getTerminalType(),
    supportsJobControl: supportsJobControl(),
    isWindows: isWindows(),
    isWSL: isWSL(),
    isGitBash: isGitBash(),
    isTTY: process.stdout.isTTY
  };
}

/**
 * 安全地尝试挂起程序
 *
 * 包含错误处理，防止在不支持的平台 crash
 *
 * @returns {boolean} 如果成功挂起返回 true
 */
export function safeSuspend() {
  // 只有非 Windows 平台才尝试挂起
  if (process.platform === 'win32') {
    return false;
  }

  try {
    // 退出 raw mode，让终端回到正常状态
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }

    // 发送 SIGTSTP 信号挂起进程
    process.kill(process.pid, 'SIGTSTP');
    return true;
  } catch (error) {
    // 如果失败，恢复终端状态
    console.error('\n⚠️  挂起失败:', error.message);
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(true);
      } catch (e) {
        // 忽略恢复失败
      }
    }
    return false;
  }
}

/**
 * 打印平台调试信息
 *
 * 用于诊断平台相关问题
 */
export function printPlatformDebugInfo() {
  const info = getPlatformInfo();

  console.log('═══════════════════════════════════════════════════');
  console.log('🔍 平台信息');
  console.log('═══════════════════════════════════════════════════');
  console.log(`平台: ${info.platformName}`);
  console.log(`架构: ${info.arch}`);
  console.log(`Node 版本: ${info.nodeVersion}`);
  console.log(`终端类型: ${info.terminalType}`);
  console.log(`作业控制: ${info.supportsJobControl ? '✅ 支持' : '❌ 不支持'}`);
  console.log(`TTY: ${info.isTTY ? '✅ 是' : '❌ 否'}`);

  // 额外的调试信息
  if (process.platform === 'win32') {
    console.log('\nWindows 环境说明：');
    console.log(`  - WSL: ${isWSL() ? '✅ 是' : '❌ 否'}`);
    console.log(`  - Git Bash: ${isGitBash() ? '✅ 是' : '❌ 否'}`);
    console.log(`  - Node 版本: ${process.version}`);
    if (process.release && process.release.headersUrl) {
      console.log(`  - 构建信息: ${process.release.headersUrl}`);
    }
  }

  console.log('═══════════════════════════════════════════════════');
}

/**
 * 检查当前模块是否是主模块（直接运行）
 *
 * 跨平台兼容的解决方案，通过比较文件名来判断
 *
 * @returns {boolean} 如果是主模块返回 true
 *
 * 使用示例：
 * ```javascript
 * import { isMainModule } from './utils/platform.js';
 *
 * if (isMainModule(import.meta.url)) {
 *   // 直接运行此文件时的代码
 *   startApp();
 * }
 * ```
 *
 * 为什么需要这个函数？
 * - Windows 下 `process.argv[1]` 是 `C:\path\to\file.js`
 * - `import.meta.url` 是 `file:///C:/path/to/file.js`
 * - 直接比较路径会失败
 * - 通过比较文件名可以跨平台工作
 */
export function isMainModule(metaUrl) {
  const currentFileName = basename(fileURLToPath(metaUrl));
  const mainFileName = basename(process.argv[1]);
  return currentFileName === mainFileName;
}

// 默认导出所有函数
export default {
  supportsJobControl,
  safeSuspend,
  getPlatformName,
  isWindows,
  isWSL,
  isGitBash,
  getTerminalType,
  getPlatformInfo,
  printPlatformDebugInfo,
  isMainModule
};
