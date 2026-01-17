/**
 * 场景一：批量文件格式转换器
 *
 * 功能：
 * 1. 使用 searchFiles 查找特定类型的文件
 * 2. 使用 readFile 读取每个文件内容
 * 3. 转换文件格式（例如：JSON -> YAML）
 * 4. 使用 writeFile 写入转换后的文件
 *
 * 工具验证：searchFiles, readFile, writeFile
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 模拟工具执行器
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

  // searchFiles 工具
  async searchFiles({ pattern, cwd }) {
    const searchDir = cwd ? path.resolve(this.workingDir, cwd) : this.workingDir;
    const files = await glob(pattern, { cwd: searchDir });

    const result = {
      success: true,
      data: { files, count: files.length }
    };
    this.log('searchFiles', { pattern, cwd }, result);
    return result;
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

  // 获取调用日志
  getCallLog() {
    return this.callLog;
  }

  // 打印统计信息
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

// JSON 到 YAML 的简单转换器
function jsonToYaml(obj, indent = 0) {
  const spaces = '  '.repeat(indent);
  let yaml = '';

  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`;
      value.forEach(item => {
        if (typeof item === 'object' && item !== null) {
          yaml += `${spaces}-\n${jsonToYaml(item, indent + 2)}`;
        } else {
          yaml += `${spaces}  - ${JSON.stringify(item)}\n`;
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      yaml += `${spaces}${key}:\n${jsonToYaml(value, indent + 1)}`;
    } else {
      yaml += `${spaces}${key}: ${JSON.stringify(value)}\n`;
    }
  }

  return yaml;
}

// 批量转换场景
async function runBatchConverterScenario() {
  console.log('\n========================================');
  console.log('场景一：批量文件格式转换器');
  console.log('========================================\n');

  const executor = new MockToolExecutor();

  try {
    // 步骤 1: 搜索所有 JSON 配置文件
    console.log('步骤 1: 搜索 JSON 配置文件...');
    const searchResult = await executor.searchFiles({
      pattern: '*.json',
      cwd: '.'
    });

    if (!searchResult.success) {
      throw new Error('搜索文件失败');
    }

    console.log(`  找到 ${searchResult.data.count} 个 JSON 文件`);
    const jsonFiles = searchResult.data.files.filter(f =>
      !f.includes('node_modules') && !f.includes('package-lock.json')
    );
    console.log(`  过滤后: ${jsonFiles.length} 个文件\n`);

    // 步骤 2: 读取并转换每个文件
    const conversions = [];
    for (const jsonFile of jsonFiles) {
      console.log(`步骤 2: 读取 ${jsonFile}...`);
      const readResult = await executor.readFile({ filePath: jsonFile });

      if (!readResult.success) {
        console.log(`  ✗ 读取失败: ${readResult.error}`);
        continue;
      }

      try {
        const jsonData = JSON.parse(readResult.data.content);
        const yamlContent = jsonToYaml(jsonData);

        // 步骤 3: 写入 YAML 文件
        const yamlFile = jsonFile.replace('.json', '.yaml');
        console.log(`步骤 3: 写入 ${yamlFile}...`);
        const writeResult = await executor.writeFile({
          filePath: `scenarios/output/${path.basename(yamlFile)}`,
          content: yamlContent
        });

        if (writeResult.success) {
          console.log(`  ✓ 转换成功: ${jsonFile} -> ${yamlFile}`);
          conversions.push({
            from: jsonFile,
            to: yamlFile,
            size: writeResult.data.size
          });
        }
      } catch (parseError) {
        console.log(`  ✗ 解析失败: ${parseError.message}`);
      }
      console.log('');
    }

    // 打印结果
    console.log('========================================');
    console.log('转换结果汇总');
    console.log('========================================');
    console.log(`成功转换: ${conversions.length} 个文件`);
    conversions.forEach(c => {
      console.log(`  ${c.from} -> ${c.to} (${c.size} bytes)`);
    });

    executor.printSummary();

    return {
      success: true,
      conversions,
      toolCalls: executor.getCallLog()
    };
  } catch (error) {
    console.error('\n场景执行失败:', error.message);
    return { success: false, error: error.message };
  }
}

// 创建输出目录
async function ensureOutputDir() {
  const dir = path.resolve(__dirname, 'output');
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // 目录可能已存在
  }
}

// 主函数
async function main() {
  await ensureOutputDir();
  const result = await runBatchConverterScenario();

  if (result.success) {
    console.log('\n✓ 场景一执行成功\n');
    process.exit(0);
  } else {
    console.log('\n✗ 场景一执行失败\n');
    process.exit(1);
  }
}

// 导出以便其他脚本使用
export { runBatchConverterScenario };

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
