/**
 * 场景四：进程监控与日志分析器
 *
 * 功能：
 * 1. 使用 bash 监控进程状态和资源使用
 * 2. 使用 editFile 创建和更新日志文件
 * 3. 使用 analyzeError 分析错误日志
 *
 * 工具验证：bash, editFile, analyzeError
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MockToolExecutor {
  constructor() {
    this.workingDir = path.resolve(__dirname, '..');
    this.callLog = [];
    this.errorDatabase = new Map();
  }

  log(toolName, input, result) {
    this.callLog.push({
      tool: toolName,
      input,
      success: result.success,
      timestamp: new Date().toISOString()
    });
  }

  // bash 工具
  async bash({ command, timeout = 30000 }) {
    return new Promise((resolve) => {
      const proc = spawn('bash', ['-lc', command], {
        cwd: this.workingDir,
        shell: true,
        env: { ...process.env }
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        proc.kill('SIGKILL');
        resolve({
          success: false,
          data: { error: 'Command timeout' },
          error: 'Command timeout'
        });
      }, timeout);

      proc.on('close', (exitCode) => {
        clearTimeout(timer);
        const result = {
          success: exitCode === 0,
          data: {
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode
          }
        };
        this.log('bash', { command }, result);
        resolve(result);
      });

      proc.on('error', (error) => {
        clearTimeout(timer);
        const result = {
          success: false,
          data: null,
          error: error.message
        };
        this.log('bash', { command }, result);
        resolve(result);
      });
    });
  }

  // editFile 工具
  async editFile({ filePath, oldText, newText, replaceAll = false }) {
    try {
      const fullPath = path.resolve(this.workingDir, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });

      let content = '';
      try {
        content = await fs.readFile(fullPath, 'utf-8');
      } catch {
        // 文件不存在，创建新文件
      }

      let replacements = 0;
      if (replaceAll) {
        const matches = content.split(oldText);
        replacements = matches.length - 1;
        content = matches.join(newText);
      } else {
        if (oldText && !content.includes(oldText)) {
          // 如果文件为空或oldText不存在，直接添加新内容
          content = newText;
          replacements = 1;
        } else {
          content = content.replace(oldText, newText);
          replacements = 1;
        }
      }

      await fs.writeFile(fullPath, content, 'utf-8');

      const result = {
        success: true,
        data: { path: fullPath, replacements, contentLength: content.length }
      };
      this.log('editFile', { filePath, replacements }, result);
      return result;
    } catch (error) {
      const result = { success: false, error: error.message };
      this.log('editFile', { filePath }, result);
      return result;
    }
  }

  // analyzeError 工具
  async analyzeError({ error, context }) {
    try {
      const analysis = {
        error,
        context,
        timestamp: new Date().toISOString(),
        patterns: [],
        severity: 'unknown',
        suggestions: []
      };

      // 分析错误类型
      if (error.includes('ECONNREFUSED')) {
        analysis.patterns.push('Connection Refused');
        analysis.severity = 'high';
        analysis.suggestions.push('检查服务是否运行');
        analysis.suggestions.push('验证端口是否正确');
      } else if (error.includes('ENOENT')) {
        analysis.patterns.push('File Not Found');
        analysis.severity = 'medium';
        analysis.suggestions.push('检查文件路径是否正确');
        analysis.suggestions.push('确认文件是否存在');
      } else if (error.includes('SyntaxError')) {
        analysis.patterns.push('Syntax Error');
        analysis.severity = 'high';
        analysis.suggestions.push('检查代码语法');
        analysis.suggestions.push('验证括号和引号匹配');
      } else if (error.includes('TypeError')) {
        analysis.patterns.push('Type Error');
        analysis.severity = 'medium';
        analysis.suggestions.push('检查数据类型');
        analysis.suggestions.push('验证变量是否已定义');
      } else if (error.includes('ENOMEM')) {
        analysis.patterns.push('Out of Memory');
        analysis.severity = 'critical';
        analysis.suggestions.push('增加可用内存');
        analysis.suggestions.push('检查内存泄漏');
      } else if (error.includes('ETIMEDOUT')) {
        analysis.patterns.push('Timeout');
        analysis.severity = 'medium';
        analysis.suggestions.push('增加超时时间');
        analysis.suggestions.push('检查网络连接');
      }

      // 存储到错误数据库
      const errorKey = error.split(':')[0];
      if (!this.errorDatabase.has(errorKey)) {
        this.errorDatabase.set(errorKey, []);
      }
      this.errorDatabase.get(errorKey).push({
        error,
        context,
        analysis,
        timestamp: analysis.timestamp
      });

      const result = {
        success: true,
        data: analysis
      };
      this.log('analyzeError', { error: errorKey, severity: analysis.severity }, result);
      return result;
    } catch (err) {
      const result = { success: false, error: err.message };
      this.log('analyzeError', { error }, result);
      return result;
    }
  }

  getCallLog() {
    return this.callLog;
  }

  getErrorDatabase() {
    return this.errorDatabase;
  }

  printSummary() {
    console.log('\n=== 工具调用统计 ===');
    const stats = {};
    this.callLog.forEach(log => {
      stats[log.tool] = (stats[log.tool] || 0) + 1;
    });
    Object.entries(stats).forEach(([tool, count]) => {
      console.log(`  ${tool}: ${count} 次`);
    });
    console.log(`  总计: ${this.callLog.length} 次`);

    if (this.errorDatabase.size > 0) {
      console.log('\n=== 错误分析统计 ===');
      this.errorDatabase.forEach((errors, type) => {
        console.log(`  ${type}: ${errors.length} 次`);
      });
    }
  }
}

// 进程监控与日志分析场景
async function runLogAnalyzerScenario() {
  console.log('\n========================================');
  console.log('场景四：进程监控与日志分析器');
  console.log('========================================\n');

  const executor = new MockToolExecutor();
  const logFilePath = 'scenarios/output/process-monitor.log';
  const reportPath = 'scenarios/output/error-analysis-report.md';

  try {
    const monitoringData = {
      startTime: new Date().toISOString(),
      checks: [],
      errors: [],
      processes: []
    };

    // 步骤 1: 检查系统资源
    console.log('步骤 1: 系统资源检查...');

    // 检查 Node.js 进程
    console.log('  检查 Node.js 进程...');
    const nodeProcResult = await executor.bash({
      command: 'ps aux | grep -i node | grep -v grep | head -5 || echo "No Node processes found"'
    });

    if (nodeProcResult.success && nodeProcResult.data.stdout) {
      monitoringData.processes.push({
        type: 'nodejs',
        output: nodeProcResult.data.stdout
      });
      console.log('  ✓ Node.js 进程检查完成');
    }

    // 检查内存使用
    console.log('  检查内存使用...');
    const memResult = await executor.bash({
      command: 'free -h 2>/dev/null || vmstat 2>/dev/null || echo "Memory info not available"'
    });

    if (memResult.success) {
      monitoringData.checks.push({
        type: 'memory',
        data: memResult.data.stdout,
        timestamp: new Date().toISOString()
      });
      console.log('  ✓ 内存检查完成');
    }

    // 检查磁盘使用
    console.log('  检查磁盘使用...');
    const diskResult = await executor.bash({
      command: 'df -h . | tail -1'
    });

    if (diskResult.success && diskResult.data.stdout) {
      monitoringData.checks.push({
        type: 'disk',
        data: diskResult.data.stdout,
        timestamp: new Date().toISOString()
      });
      console.log('  ✓ 磁盘检查完成');
    }

    console.log('');

    // 步骤 2: 模拟各种错误并分析
    console.log('步骤 2: 错误分析与处理...\n');

    // 模拟连接错误
    console.log('  测试 1: 连接错误分析');
    await executor.editFile({
      filePath: logFilePath,
      oldText: '',
      newText: `[${new Date().toISOString()}] ERROR: ECONNREFUSED - Connection refused to localhost:9999\n`
    });

    const connError = await executor.analyzeError({
      error: 'ECONNREFUSED: Connection refused',
      context: '尝试连接到 localhost:9999'
    });

    if (connError.success) {
      console.log(`    严重性: ${connError.data.severity}`);
      console.log(`    建议: ${connError.data.suggestions.join(', ')}`);
      monitoringData.errors.push(connError.data);
    }

    // 模拟文件错误
    console.log('  测试 2: 文件错误分析');
    await executor.editFile({
      filePath: logFilePath,
      oldText: '\n',
      newText: `[${new Date().toISOString()}] ERROR: ENOENT - File not found: /nonexistent/file.txt\n`,
      replaceAll: false
    });

    const fileError = await executor.analyzeError({
      error: 'ENOENT: no such file or directory',
      context: '尝试读取不存在的文件'
    });

    if (fileError.success) {
      console.log(`    严重性: ${fileError.data.severity}`);
      console.log(`    建议: ${fileError.data.suggestions.join(', ')}`);
      monitoringData.errors.push(fileError.data);
    }

    // 模拟超时错误
    console.log('  测试 3: 超时错误分析');
    await executor.editFile({
      filePath: logFilePath,
      oldText: '\n',
      newText: `[${new Date().toISOString()}] ERROR: ETIMEDOUT - Operation timed out after 30000ms\n`,
      replaceAll: false
    });

    const timeoutError = await executor.analyzeError({
      error: 'ETIMEDOUT: Operation timed out',
      context: 'API 请求超时'
    });

    if (timeoutError.success) {
      console.log(`    严重性: ${timeoutError.data.severity}`);
      console.log(`    建议: ${timeoutError.data.suggestions.join(', ')}`);
      monitoringData.errors.push(timeoutError.data);
    }

    // 步骤 3: 检查项目构建状态
    console.log('\n步骤 3: 项目构建检查...');

    const buildCheckResult = await executor.bash({
      command: 'node --check dist/closer-cli.js 2>&1 || echo "Build check failed"'
    });

    if (buildCheckResult.success) {
      console.log('  ✓ 构建文件检查通过');
      monitoringData.checks.push({
        type: 'build',
        status: 'success',
        data: buildCheckResult.data.stdout,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('  ✗ 构建文件检查失败');

      // 分析构建错误
      const buildError = await executor.analyzeError({
        error: buildCheckResult.data.stderr || 'Unknown build error',
        context: '构建文件语法检查'
      });

      if (buildError.success) {
        monitoringData.errors.push(buildError.data);
        console.log(`    错误类型: ${buildError.data.patterns.join(', ')}`);
      }

      monitoringData.checks.push({
        type: 'build',
        status: 'failed',
        error: buildCheckResult.data.stderr,
        timestamp: new Date().toISOString()
      });
    }

    // 步骤 4: 生成分析报告
    console.log('\n步骤 4: 生成分析报告...');

    let report = `# 进程监控与错误分析报告\n\n`;
    report += `**生成时间**: ${new Date().toISOString()}\n\n`;
    report += `---\n\n`;

    report += `## 监控摘要\n\n`;
    report += `- 检查项目: ${monitoringData.checks.length}\n`;
    report += `- 错误数量: ${monitoringData.errors.length}\n`;
    report += `- 监控进程: ${monitoringData.processes.length}\n\n`;

    // 系统检查结果
    report += `## 系统检查结果\n\n`;
    monitoringData.checks.forEach(check => {
      report += `### ${check.type.toUpperCase()} 检查\n\n`;
      if (check.type === 'build') {
        report += `- 状态: ${check.status === 'success' ? '✓ 通过' : '✗ 失败'}\n`;
      } else {
        report += `\`\`\`\n${check.data}\n\`\`\`\n\n`;
      }
    });

    // 错误分析
    if (monitoringData.errors.length > 0) {
      report += `## 错误分析\n\n`;
      monitoringData.errors.forEach((error, idx) => {
        report += `### 错误 ${idx + 1}: ${error.patterns.join(' / ')}\n\n`;
        report += `- **严重性**: ${error.severity}\n`;
        report += `- **时间**: ${error.timestamp}\n`;
        report += `- **错误信息**: ${error.error}\n`;
        report += `- **上下文**: ${error.context}\n\n`;
        report += `**建议措施**:\n\n`;
        error.suggestions.forEach(s => {
          report += `- ${s}\n`;
        });
        report += '\n';
      });
    }

    // 错误统计
    report += `## 错误统计\n\n`;
    const errorDb = executor.getErrorDatabase();
    errorDb.forEach((errors, type) => {
      report += `- **${type}**: ${errors.length} 次\n`;
    });

    // 保存报告
    const writeResult = await executor.editFile({
      filePath: reportPath,
      oldText: '',
      newText: report
    });

    if (writeResult.success) {
      console.log(`  ✓ 报告已保存: ${writeResult.data.path}`);
    }

    // 打印总结
    console.log('\n========================================');
    console.log('监控与分析完成');
    console.log('========================================');
    console.log(`系统检查: ${monitoringData.checks.length} 项`);
    console.log(`错误分析: ${monitoringData.errors.length} 个`);
    console.log(`日志文件: ${logFilePath}`);
    console.log(`分析报告: ${reportPath}`);

    executor.printSummary();

    return {
      success: true,
      monitoringData,
      toolCalls: executor.getCallLog()
    };
  } catch (error) {
    console.error('\n场景执行失败:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  const result = await runLogAnalyzerScenario();

  if (result.success) {
    console.log('\n✓ 场景四执行成功\n');
    process.exit(0);
  } else {
    console.log('\n✗ 场景四执行失败\n');
    process.exit(1);
  }
}

export { runLogAnalyzerScenario };

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
