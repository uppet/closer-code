/**
 * Git 集成功能
 */

import { spawn } from 'child_process';

/**
 * 执行 Git 命令
 */
async function gitExec(args, options = {}) {
  return new Promise((resolve, reject) => {
    const git = spawn('git', args, {
      cwd: options.cwd || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    git.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    git.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    git.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code });
      } else {
        reject({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code });
      }
    });

    git.on('error', (error) => {
      reject({ error: error.message, exitCode: -1 });
    });
  });
}

/**
 * Git 助手类
 */
export class GitHelper {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
  }

  /**
   * 检查是否在 Git 仓库中
   */
  async isRepo() {
    try {
      await gitExec(['rev-parse', '--is-inside-work-tree'], { cwd: this.cwd });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取当前分支
   */
  async getCurrentBranch() {
    try {
      const result = await gitExec(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: this.cwd });
      return result.stdout;
    } catch {
      return null;
    }
  }

  /**
   * 获取状态
   */
  async getStatus() {
    try {
      const result = await gitExec(['status', '--porcelain'], { cwd: this.cwd });
      const lines = result.stdout.split('\n').filter(Boolean);

      return {
        staged: lines.filter(l => l.startsWith('M ').length),
        modified: lines.filter(l => l.startsWith(' M').length),
        untracked: lines.filter(l => l.startsWith('??').length),
        total: lines.length
      };
    } catch {
      return null;
    }
  }

  /**
   * 获取差异
   */
  async getDiff(file = null) {
    const args = ['diff'];
    if (file) args.push(file);

    try {
      const result = await gitExec(args, { cwd: this.cwd });
      return result.stdout;
    } catch {
      return null;
    }
  }

  /**
   * 获取提交历史
   */
  async getLog(limit = 10) {
    try {
      const result = await gitExec(
        ['log', '--oneline', `-${limit}`, '--pretty=format:%H|%s|%an|%ar'],
        { cwd: this.cwd }
      );

      return result.stdout.split('\n').filter(Boolean).map(line => {
        const [hash, message, author, date] = line.split('|');
        return { hash, message, author, date };
      });
    } catch {
      return [];
    }
  }

  /**
   * 添加文件
   */
  async add(files) {
    try {
      const args = ['add', ...(Array.isArray(files) ? files : [files])];
      const result = await gitExec(args, { cwd: this.cwd });
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * 提交
   */
  async commit(message, options = {}) {
    try {
      const args = ['commit', '-m', message];
      if (options.amend) args.push('--amend');
      if (options.noVerify) args.push('--no-verify');

      const result = await gitExec(args, { cwd: this.cwd });
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * 推送
   */
  async push(remote = 'origin', branch = null) {
    try {
      const args = ['push', remote];
      if (branch) args.push(branch);

      const result = await gitExec(args, { cwd: this.cwd });
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * 拉取
   */
  async pull(remote = 'origin', branch = null) {
    try {
      const args = ['pull', remote];
      if (branch) args.push(branch);

      const result = await gitExec(args, { cwd: this.cwd });
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * 创建分支
   */
  async createBranch(name, base = null) {
    try {
      const args = ['checkout', '-b', name];
      if (base) args.push(base);

      const result = await gitExec(args, { cwd: this.cwd });
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * 切换分支
   */
  async checkoutBranch(name) {
    try {
      const result = await gitExec(['checkout', name], { cwd: this.cwd });
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * 删除分支
   */
  async deleteBranch(name, force = false) {
    try {
      const args = ['branch', force ? '-D' : '-d', name];
      const result = await gitExec(args, { cwd: this.cwd });
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * 获取所有分支
   */
  async getBranches() {
    try {
      const result = await gitExec(['branch', '-a'], { cwd: this.cwd });
      const branches = result.stdout.split('\n').filter(Boolean);

      const current = await this.getCurrentBranch();

      return {
        current,
        local: branches.filter(b => !b.includes('HEAD ->') && !b.includes('remotes')).map(b => b.trim().replace('* ', '')),
        remote: branches.filter(b => b.includes('remotes')).map(b => b.trim())
      };
    } catch {
      return { current: null, local: [], remote: [] };
    }
  }

  /**
   * 获取远程仓库
   */
  async getRemotes() {
    try {
      const result = await gitExec(['remote', '-v'], { cwd: this.cwd });
      const lines = result.stdout.split('\n').filter(Boolean);

      return lines.map(line => {
        const [name, url] = line.split('\t');
        return { name, url: url.replace(' (fetch)', '').replace(' (push)', '') };
      });
    } catch {
      return [];
    }
  }

  /**
   * 克隆仓库
   */
  static async clone(url, directory, options = {}) {
    return new Promise((resolve, reject) => {
      const args = ['clone', url, directory];
      if (options.branch) args.splice(1, 0, '-b', options.branch);
      if (options.depth) args.splice(1, 0, `--depth=${options.depth}`);

      const git = spawn('git', args, {
        cwd: options.cwd || process.cwd(),
        stdio: 'inherit'
      });

      git.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          reject({ success: false, exitCode: code });
        }
      });

      git.on('error', (error) => {
        reject({ success: false, error: error.message });
      });
    });
  }

  /**
   * 智能提交助手
   */
  async smartCommit(files, messageGenerator) {
    // 1. 获取状态
    const status = await this.getStatus();

    // 2. 添加文件
    await this.add(files || '.');

    // 3. 生成或使用提交信息
    let message = files?.message;

    if (!message && messageGenerator) {
      // 生成提交信息
      const diff = await this.getDiff();
      message = await messageGenerator(diff);
    }

    if (!message) {
      return { success: false, error: 'No commit message provided' };
    }

    // 4. 提交
    return await this.commit(message);
  }

  /**
   * 获取仓库统计
   */
  async getStats() {
    try {
      const [currentBranch, status, log, branches, remotes] = await Promise.all([
        this.getCurrentBranch(),
        this.getStatus(),
        this.getLog(5),
        this.getBranches(),
        this.getRemotes()
      ]);

      return {
        branch: currentBranch,
        status,
        recentCommits: log,
        branches,
        remotes
      };
    } catch {
      return null;
    }
  }
}

/**
 * 创建 Git 助手
 */
export function createGitHelper(cwd) {
  return new GitHelper(cwd);
}
