/**
 * 场景三：项目文档自动生成器
 *
 * 功能：
 * 1. 使用 listFiles 递归列出项目文件
 * 2. 使用 readFile 读取关键文件（README, package.json 等）
 * 3. 使用 writeFile 生成结构化的项目文档
 *
 * 工具验证：listFiles, readFile, writeFile
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

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

  // listFiles 工具 - 递归列出目录
  async listFiles({ dirPath, recursive = true, showHidden = false }) {
    try {
      const fullPath = dirPath ? path.resolve(this.workingDir, dirPath) : this.workingDir;
      const files = [];

      const walk = async (currentDir, baseRelative = '') => {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          const relativePath = path.join(baseRelative, entry.name);

          // 跳过特定目录
          if (['node_modules', '.git', 'dist', 'coverage'].includes(entry.name)) {
            continue;
          }

          if (!showHidden && entry.name.startsWith('.')) {
            continue;
          }

          files.push({
            name: entry.name,
            type: entry.isDirectory() ? 'directory' : 'file',
            path: relativePath,
            fullPath: path.join(currentDir, entry.name)
          });

          if (entry.isDirectory() && recursive) {
            await walk(path.join(currentDir, entry.name), relativePath);
          }
        }
      };

      await walk(fullPath);

      const result = {
        success: true,
        data: {
          files,
          count: files.length,
          path: fullPath
        }
      };
      this.log('listFiles', { dirPath, recursive, showHidden }, result);
      return result;
    } catch (error) {
      const result = { success: false, error: error.message };
      this.log('listFiles', { dirPath }, result);
      return result;
    }
  }

  // readFile 工具
  async readFile({ filePath, encoding = 'utf-8' }) {
    try {
      const fullPath = path.resolve(this.workingDir, filePath);
      const content = await fs.readFile(fullPath, encoding);

      const result = {
        success: true,
        data: { content, path: fullPath }
      };
      this.log('readFile', { filePath, encoding }, result);
      return result;
    } catch (error) {
      const result = { success: false, error: error.message };
      this.log('readFile', { filePath }, result);
      return result;
    }
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

// 项目文档生成器
async function runDocGeneratorScenario() {
  console.log('\n========================================');
  console.log('场景三：项目文档自动生成器');
  console.log('========================================\n');

  const executor = new MockToolExecutor();

  try {
    // 步骤 1: 列出项目文件
    console.log('步骤 1: 扫描项目文件结构...');
    const listResult = await executor.listFiles({
      dirPath: '.',
      recursive: true,
      showHidden: false
    });

    if (!listResult.success) {
      throw new Error('文件列表获取失败');
    }

    console.log(`  找到 ${listResult.data.count} 个文件/目录\n`);

    // 分类文件
    const directories = listResult.data.files.filter(f => f.type === 'directory');
    const jsFiles = listResult.data.files.filter(f => f.type === 'file' && f.name.endsWith('.js'));
    const jsonFiles = listResult.data.files.filter(f => f.type === 'file' && f.name.endsWith('.json'));
    const mdFiles = listResult.data.files.filter(f => f.type === 'file' && f.name.endsWith('.md'));

    console.log(`  目录: ${directories.length} 个`);
    console.log(`  JS 文件: ${jsFiles.length} 个`);
    console.log(`  JSON 文件: ${jsonFiles.length} 个`);
    console.log(`  Markdown 文件: ${mdFiles.length} 个\n`);

    // 步骤 2: 读取关键配置文件
    console.log('步骤 2: 读取项目配置...');

    const docData = {
      name: 'Unknown',
      version: 'Unknown',
      description: '',
      scripts: {}
    };

    // 读取 package.json
    const packageResult = await executor.readFile({ filePath: 'package.json' });
    if (packageResult.success) {
      try {
        const packageJson = JSON.parse(packageResult.data.content);
        docData.name = packageJson.name || 'Unnamed';
        docData.version = packageJson.version || '0.0.0';
        docData.description = packageJson.description || '';
        docData.scripts = packageJson.scripts || {};
        docData.dependencies = packageJson.dependencies || {};
        docData.devDependencies = packageJson.devDependencies || {};
        console.log(`  ✓ 已读取 package.json: ${docData.name}@${docData.version}`);
      } catch {
        console.log('  ✗ 无法解析 package.json');
      }
    }

    // 读取 README.md
    const readmeResult = await executor.readFile({ filePath: 'README.md' });
    let readmeContent = '';
    if (readmeResult.success) {
      readmeContent = readmeResult.data.content;
      console.log('  ✓ 已读取 README.md');
    }

    // 读取 CLAUDE.md
    const claudeResult = await executor.readFile({ filePath: 'CLAUDE.md' });
    let claudeContent = '';
    if (claudeResult.success) {
      claudeContent = claudeResult.data.content;
      console.log('  ✓ 已读取 CLAUDE.md\n');
    }

    // 步骤 3: 生成项目文档
    console.log('步骤 3: 生成结构化文档...');

    let markdown = `# ${docData.name} - 项目文档\n\n`;
    markdown += `> 自动生成的项目文档\n\n`;
    markdown += `**版本**: ${docData.version}\n\n`;
    markdown += `**描述**: ${docData.description || '无描述'}\n\n`;

    markdown += `---\n\n`;
    markdown += `## 项目概述\n\n`;
    markdown += `本项目包含以下内容：\n\n`;
    markdown += `- **目录数**: ${directories.length}\n`;
    markdown += `- **JavaScript 文件**: ${jsFiles.length}\n`;
    markdown += `- **配置文件**: ${jsonFiles.length}\n`;
    markdown += `- **文档文件**: ${mdFiles.length}\n\n`;

    markdown += `### 目录结构\n\n`;
    markdown += '```\n';

    // 生成目录树
    const dirTree = {};
    directories.forEach(d => {
      const parts = d.path.split(path.sep);
      let current = dirTree;
      parts.forEach((part, idx) => {
        if (!current[part]) {
          current[part] = idx === parts.length - 1 ? null : {};
        }
        if (current[part] !== null) {
          current = current[part];
        }
      });
    });

    // 简单的树形显示
    function printTree(obj, prefix = '') {
      let result = '';
      const keys = Object.keys(obj).slice(0, 10); // 限制显示数量
      keys.forEach((key, idx) => {
        const isLast = idx === keys.length - 1;
        result += `${prefix}${isLast ? '└── ' : '├── '}${key}\n`;
        if (obj[key] !== null) {
          result += printTree(obj[key], prefix + (isLast ? '    ' : '│   '));
        }
      });
      return result;
    }

    markdown += printTree(dirTree);
    markdown += '```\n\n';

    // 关键文件列表
    markdown += `### 关键文件\n\n`;
    markdown += `#### JavaScript 源文件\n\n`;
    jsFiles.slice(0, 15).forEach(f => {
      markdown += `- \`${f.path}\`\n`;
    });
    if (jsFiles.length > 15) {
      markdown += `- ... 还有 ${jsFiles.length - 15} 个文件\n`;
    }

    markdown += `\n#### 配置文件\n\n`;
    jsonFiles.forEach(f => {
      markdown += `- \`${f.path}\`\n`;
    });

    // 脚本说明
    if (Object.keys(docData.scripts).length > 0) {
      markdown += `\n### 可用脚本\n\n`;
      Object.entries(docData.scripts).forEach(([name, script]) => {
        markdown += `#### npm run ${name}\n\n`;
        markdown += `\`\`\`bash\n${script}\n\`\`\`\n\n`;
      });
    }

    // 依赖关系
    if (Object.keys(docData.dependencies || {}).length > 0) {
      markdown += `\n### 生产依赖\n\n`;
      Object.entries(docData.dependencies).forEach(([name, version]) => {
        markdown += `- **${name}**: \`${version}\`\n`;
      });
    }

    if (Object.keys(docData.devDependencies || {}).length > 0) {
      markdown += `\n### 开发依赖\n\n`;
      Object.entries(docData.devDependencies).forEach(([name, version]) => {
        markdown += `- **${name}**: \`${version}\`\n`;
      });
    }

    // 原始文档引用
    if (readmeContent) {
      markdown += `\n---\n\n`;
      markdown += `## 原始 README\n\n`;
      markdown += readmeContent;
    }

    // 步骤 4: 写入文档
    console.log('步骤 4: 保存文档...');
    const writeResult = await executor.writeFile({
      filePath: 'scenarios/output/project-documentation.md',
      content: markdown
    });

    if (writeResult.success) {
      console.log(`  ✓ 文档已保存: ${writeResult.data.path} (${writeResult.data.size} bytes)\n`);
    }

    // 打印统计
    console.log('========================================');
    console.log('文档生成完成');
    console.log('========================================');
    console.log(`项目名称: ${docData.name}`);
    console.log(`项目版本: ${docData.version}`);
    console.log(`文件总数: ${listResult.data.count}`);
    executor.printSummary();

    return {
      success: true,
      docData,
      stats: {
        totalFiles: listResult.data.count,
        directories: directories.length,
        jsFiles: jsFiles.length,
        jsonFiles: jsonFiles.length,
        mdFiles: mdFiles.length
      },
      toolCalls: executor.getCallLog()
    };
  } catch (error) {
    console.error('\n场景执行失败:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  const result = await runDocGeneratorScenario();

  if (result.success) {
    console.log('\n✓ 场景三执行成功\n');
    process.exit(0);
  } else {
    console.log('\n✗ 场景三执行失败\n');
    process.exit(1);
  }
}

export { runDocGeneratorScenario };

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
