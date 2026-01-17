/**
 * 场景二：代码分析报告生成器
 *
 * 功能：
 * 1. 使用 searchCode 搜索代码模式（函数定义、类定义等）
 * 2. 使用 bash 执行代码统计命令（cloc, tokei 等）
 * 3. 使用 writeFile 生成分析报告
 *
 * 工具验证：searchCode, bash, writeFile
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MockToolExecutor {
  constructor() {
    this.workingDir = path.resolve(__dirname, '..');
    this.callLog = [];
  }

  log(toolName, input, result) {
    this.callLog.push({
      tool: toolName,
      input,
      success: result.success,
      timestamp: new Date().toISOString()
    });
  }

  // searchCode 工具 - 使用 ripgrep 搜索代码
  async searchCode({ pattern, path: searchPath, fileType }) {
    try {
      const searchDir = searchPath ? path.resolve(this.workingDir, searchPath) : this.workingDir;
      const rgPath = path.join(this.workingDir, 'node_modules', '.bin', 'rg');

      // 构建 ripgrep 命令
      let args = [pattern, searchDir, '--json', '-n'];
      if (fileType) {
        args.push('-t', fileType);
      }

      const results = [];
      const proc = spawn(rgPath, args, { shell: true });

      for await (const line of proc.stdout) {
        try {
          const data = JSON.parse(line.toString());
          if (data.type === 'match') {
            results.push({
              file: path.relative(this.workingDir, data.path),
              line: data.line_number,
              text: data.lines.text
            });
          }
        } catch {
          // 忽略解析错误
        }
      }

      const result = {
        success: true,
        data: { matches: results, count: results.length }
      };
      this.log('searchCode', { pattern, searchPath, fileType }, result);
      return result;
    } catch (error) {
      const result = { success: false, error: error.message };
      this.log('searchCode', { pattern }, result);
      return result;
    }
  }

  // bash 工具 - 执行 shell 命令
  async bash({ command, timeout = 30000 }) {
    return new Promise((resolve) => {
      const proc = spawn('bash', ['-lc', command], {
        cwd: this.workingDir,
        shell: true,
        env: { ...process.env, PATH: process.env.PATH }
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

  // writeFile 工具
  async writeFile({ filePath, content, encoding = 'utf-8' }) {
    try {
      const fullPath = path.resolve(this.workingDir, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, encoding);

      const result = {
        success: true,
        data: { path: fullPath, size: content.length }
      };
      this.log('writeFile', { filePath, size: content.length }, result);
      return result;
    } catch (error) {
      const result = { success: false, error: error.message };
      this.log('writeFile', { filePath }, result);
      return result;
    }
  }

  getCallLog() {
    return this.callLog;
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
  }
}

// 代码分析报告生成器
async function runCodeAnalyzerScenario() {
  console.log('\n========================================');
  console.log('场景二：代码分析报告生成器');
  console.log('========================================\n');

  const executor = new MockToolExecutor();

  try {
    const report = {
      timestamp: new Date().toISOString(),
      project: path.basename(executor.workingDir),
      sections: []
    };

    // 步骤 1: 统计代码行数
    console.log('步骤 1: 统计代码行数...');
    const locResult = await executor.bash({
      command: 'find src -name "*.js" -type f | wc -l'
    });

    if (locResult.success) {
      const fileCount = locResult.data.stdout;
      console.log(`  找到 ${fileCount} 个 JavaScript 文件`);

      // 统计总行数
      const linesResult = await executor.bash({
        command: 'find src -name "*.js" -type f -exec cat {} \\; | wc -l'
      });

      if (linesResult.success) {
        report.sections.push({
          title: '代码行数统计',
          data: {
            jsFiles: parseInt(fileCount),
            totalLines: parseInt(linesResult.data.stdout)
          }
        });
        console.log(`  总行数: ${linesResult.data.stdout}\n`);
      }
    }

    // 步骤 2: 搜索函数定义
    console.log('步骤 2: 搜索函数定义...');
    const functionResult = await executor.searchCode({
      pattern: 'function\\s+\\w+|const\\s+\\w+\\s*=\\s*(async\\s*)?\\(',
      path: 'src',
      fileType: 'js'
    });

    if (functionResult.success) {
      console.log(`  找到 ${functionResult.data.count} 个函数定义`);
      report.sections.push({
        title: '函数定义统计',
        data: {
          count: functionResult.data.count,
          samples: functionResult.data.matches.slice(0, 5).map(m => ({
            file: m.file,
            line: m.line,
            text: m.text.trim().substring(0, 60)
          }))
        }
      });
      console.log(`  示例:\n`);
      functionResult.data.matches.slice(0, 3).forEach(m => {
        console.log(`    ${m.file}:${m.line} - ${m.text.trim().substring(0, 50)}...`);
      });
      console.log('');
    }

    // 步骤 3: 搜索类定义
    console.log('步骤 3: 搜索类定义...');
    const classResult = await executor.searchCode({
      pattern: 'class\\s+\\w+',
      path: 'src',
      fileType: 'js'
    });

    if (classResult.success) {
      console.log(`  找到 ${classResult.data.count} 个类定义`);
      report.sections.push({
        title: '类定义统计',
        data: {
          count: classResult.data.count,
          classes: classResult.data.matches.map(m => ({
            file: m.file,
            line: m.line,
            name: m.text.match(/class\s+(\w+)/)?.[1] || 'Unknown'
          }))
        }
      });
      console.log('');
    }

    // 步骤 4: 搜索导入语句
    console.log('步骤 4: 分析依赖关系...');
    const importResult = await executor.searchCode({
      pattern: '^import\\s+.*from',
      path: 'src',
      fileType: 'js'
    });

    if (importResult.success) {
      const dependencies = new Set();
      importResult.data.matches.forEach(m => {
        const match = m.text.match(/from\s+['"]([^'"]+)['"]/);
        if (match && !match[1].startsWith('.')) {
          dependencies.add(match[1]);
        }
      });

      console.log(`  找到 ${importResult.data.count} 个导入语句`);
      console.log(`  外部依赖: ${dependencies.size} 个\n`);

      report.sections.push({
        title: '依赖关系分析',
        data: {
          totalImports: importResult.data.count,
          externalDependencies: Array.from(dependencies)
        }
      });
    }

    // 步骤 5: 生成 Markdown 报告
    console.log('步骤 5: 生成分析报告...');
    let markdown = `# 代码分析报告\n\n`;
    markdown += `- 项目: ${report.project}\n`;
    markdown += `- 生成时间: ${report.timestamp}\n\n`;

    report.sections.forEach(section => {
      markdown += `## ${section.title}\n\n`;
      if (section.title === '代码行数统计') {
        markdown += `- JavaScript 文件数: ${section.data.jsFiles}\n`;
        markdown += `- 总代码行数: ${section.data.totalLines}\n\n`;
      } else if (section.title === '函数定义统计') {
        markdown += `- 函数总数: ${section.data.count}\n\n`;
        markdown += `### 示例函数\n\n`;
        section.data.samples.forEach(s => {
          markdown += `\`${s.file}:${s.line}\` - ${s.text}\n\n`;
        });
      } else if (section.title === '类定义统计') {
        markdown += `- 类总数: ${section.data.count}\n\n`;
        markdown += `### 类列表\n\n`;
        section.data.classes.forEach(c => {
          markdown += `- \`${c.name}\` (${c.file}:${c.line})\n`;
        });
        markdown += '\n';
      } else if (section.title === '依赖关系分析') {
        markdown += `- 总导入语句: ${section.data.totalImports}\n`;
        markdown += `- 外部依赖: ${section.data.externalDependencies.length}\n\n`;
        markdown += `### 外部依赖列表\n\n`;
        section.data.externalDependencies.forEach(dep => {
          markdown += `- ${dep}\n`;
        });
        markdown += '\n';
      }
    });

    const writeResult = await executor.writeFile({
      filePath: 'scenarios/output/code-analysis-report.md',
      content: markdown
    });

    if (writeResult.success) {
      console.log(`  ✓ 报告已生成: ${writeResult.data.path} (${writeResult.data.size} bytes)\n`);
    }

    // 打印统计
    console.log('========================================');
    console.log('分析完成');
    console.log('========================================');
    report.sections.forEach(section => {
      console.log(`${section.title}: ✓`);
    });
    executor.printSummary();

    return {
      success: true,
      report,
      toolCalls: executor.getCallLog()
    };
  } catch (error) {
    console.error('\n场景执行失败:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  const result = await runCodeAnalyzerScenario();

  if (result.success) {
    console.log('\n✓ 场景二执行成功\n');
    process.exit(0);
  } else {
    console.log('\n✗ 场景二执行失败\n');
    process.exit(1);
  }
}

export { runCodeAnalyzerScenario };

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
