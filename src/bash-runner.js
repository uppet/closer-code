import { spawn } from 'child_process';

/**
 * 在 bash 进程中执行命令并返回结果
 * @param {string} command - 要执行的 shell 命令
 * @param {Object} options - 配置选项
 * @param {string} options.shell - shell 路径，默认 'bash'
 * @param {string} options.cwd - 工作目录
 * @param {Object} options.env - 环境变量
 * @param {number} options.timeout - 超时时间（毫秒）
 * @returns {Promise<BashResult>} 执行结果
 */
export function executeBashCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    const {
      shell = 'bash',
      cwd = process.cwd(),
      env = process.env,
      timeout = 30000
    } = options;

    // 启动 bash 进程，使用 -c 参数直接执行命令
    // 不使用 -i (interactive) 避免在没有 TTY 时产生作业控制错误
    const bashProcess = spawn(shell, ['-c', command], {
      cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let timer = null;

    // 设置超时
    if (timeout > 0) {
      timer = setTimeout(() => {
        bashProcess.kill('SIGTERM');
        reject(new BashResult({
          command,
          stdout,
          stderr,
          exitCode: null,
          signal: 'SIGTERM',
          timedOut: true,
          error: `Command timed out after ${timeout}ms`
        }));
      }, timeout);
    }

    // 收集 stdout
    bashProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    // 收集 stderr
    bashProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // 进程退出时的处理
    bashProcess.on('close', (code, signal) => {
      if (timer) clearTimeout(timer);

      const result = new BashResult({
        command,
        stdout,
        stderr,
        exitCode: code,
        signal,
        timedOut: false
      });

      resolve(result);
    });

    // 错误处理
    bashProcess.on('error', (error) => {
      if (timer) clearTimeout(timer);
      reject(new BashResult({
        command,
        stdout,
        stderr,
        exitCode: null,
        error: error.message
      }));
    });
  });
}

/**
 * Bash 执行结果类
 */
export class BashResult {
  constructor({
    command,
    stdout = '',
    stderr = '',
    exitCode = null,
    signal = null,
    timedOut = false,
    error = null
  }) {
    this.command = command;
    this.stdout = stdout;
    this.stderr = stderr;
    this.exitCode = exitCode;
    this.signal = signal;
    this.timedOut = timedOut;
    this.error = error;
    this.timestamp = new Date().toISOString();
  }

  /** 是否成功执行（退出码为0） */
  get success() {
    return this.exitCode === 0 && !this.error && !this.timedOut;
  }

  /** 获取完整的输出（stdout + stderr） */
  get output() {
    return this.stdout + this.stderr;
  }

  /** 转换为 JSON 格式 */
  toJSON() {
    return {
      command: this.command,
      stdout: this.stdout,
      stderr: this.stderr,
      exitCode: this.exitCode,
      signal: this.signal,
      success: this.success,
      timedOut: this.timedOut,
      error: this.error,
      timestamp: this.timestamp
    };
  }

  /** 格式化输出 */
  toString() {
    const parts = [];
    parts.push(`Command: ${this.command}`);
    parts.push(`Exit Code: ${this.exitCode}`);
    if (this.stdout) parts.push(`\nStdout:\n${this.stdout}`);
    if (this.stderr) parts.push(`\nStderr:\n${this.stderr}`);
    if (this.error) parts.push(`\nError: ${this.error}`);
    return parts.join('\n');
  }
}
