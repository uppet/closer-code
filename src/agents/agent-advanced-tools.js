/**
 * Agent 高级工具集
 *
 * 提供安全的数据分析和代码库统计工具
 * 所有工具都是只读的，不会修改文件系统
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { searchCode as searchCodeUtil } from '../search.js';

/**
 * 辅助函数：搜索文件
 */
async function searchFiles({ pattern, cwd = '.' } = {}) {
  return await glob(pattern, { cwd });
}

/**
 * 代码库统计工具
 * 分析代码库的结构、文件类型、大小等信息
 */
export class CodeStatsTool {
  constructor() {
    this.name = 'codeStats';
    this.description = 'Analyze codebase statistics (file types, sizes, structure)';
  }

  /**
   * 执行代码库统计
   * @param {Object} params - 参数
   * @param {string} params.dirPath - 目录路径（默认当前目录）
   * @param {boolean} params.recursive - 是否递归（默认 true）
   * @returns {Object} 统计结果
   */
  async execute({ dirPath = '.', recursive = true } = {}) {
    try {
      const resolvedPath = path.resolve(dirPath);

      if (!fs.existsSync(resolvedPath)) {
        return {
          success: false,
          error: `Directory not found: ${resolvedPath}`
        };
      }

      const stats = {
        path: resolvedPath,
        totalFiles: 0,
        totalDirs: 0,
        totalSize: 0,
        fileTypes: {},
        largestFiles: [],
        summary: {}
      };

      // 遍历目录
      const walkDir = (dirPath, maxDepth = 10, currentDepth = 0) => {
        if (currentDepth >= maxDepth) return;

        try {
          const entries = fs.readdirSync(dirPath, { withFileTypes: true });

          for (const entry of entries) {
            // 跳过隐藏目录和 node_modules
            if (entry.name.startsWith('.') || entry.name === 'node_modules') {
              continue;
            }

            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
              stats.totalDirs++;
              if (recursive) {
                walkDir(fullPath, maxDepth, currentDepth + 1);
              }
            } else if (entry.isFile()) {
              stats.totalFiles++;
              try {
                const fileStat = fs.statSync(fullPath);
                const fileSize = fileStat.size;
                stats.totalSize += fileSize;

                // 记录文件类型
                const ext = path.extname(entry.name).toLowerCase() || '(no extension)';
                stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;

                // 记录最大的文件
                stats.largestFiles.push({
                  path: fullPath,
                  name: entry.name,
                  size: fileSize
                });
              } catch (err) {
                // 忽略无法读取的文件
              }
            }
          }
        } catch (err) {
          // 忽略无法读取的目录
        }
      };

      walkDir(resolvedPath);

      // 排序并限制最大文件列表
      stats.largestFiles.sort((a, b) => b.size - a.size);
      stats.largestFiles = stats.largestFiles.slice(0, 20);

      // 生成摘要
      stats.summary = {
        avgFileSize: stats.totalFiles > 0 ? Math.round(stats.totalSize / stats.totalFiles) : 0,
        totalSizeMB: (stats.totalSize / (1024 * 1024)).toFixed(2),
        topFileTypes: Object.entries(stats.fileTypes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([ext, count]) => `${ext}: ${count}`)
      };

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * 依赖分析工具
 * 分析项目的依赖关系和导入结构
 */
export class DependencyAnalyzerTool {
  constructor() {
    this.name = 'dependencyAnalyzer';
    this.description = 'Analyze project dependencies and import relationships';
  }

  /**
   * 执行依赖分析
   * @param {Object} params - 参数
   * @param {string} params.dirPath - 目录路径
   * @returns {Object} 分析结果
   */
  async execute({ dirPath = '.' } = {}) {
    try {
      const resolvedPath = path.resolve(dirPath);

      // 检查 package.json
      const packageJsonPath = path.join(resolvedPath, 'package.json');
      let dependencies = {};
      let devDependencies = {};

      if (fs.existsSync(packageJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        dependencies = pkg.dependencies || {};
        devDependencies = pkg.devDependencies || {};
      }

      // 分析导入语句（简化版）
      const importPatterns = {
        es6: /^import\s+.*?from\s+['"]([^'"]+)['"]/gm,
        commonjs: /^const\s+.*?=\s+require\(['"]([^'"]+)['"]\)/gm
      };

      const imports = {};

      const analyzeFile = (filePath) => {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');

          // ES6 imports
          let match;
          while ((match = importPatterns.es6.exec(content)) !== null) {
            const imp = match[1];
            if (!imp.startsWith('.')) {
              imports[imp] = (imports[imp] || 0) + 1;
            }
          }

          // CommonJS requires
          importPatterns.es6.lastIndex = 0; // Reset regex
          while ((match = importPatterns.commonjs.exec(content)) !== null) {
            const imp = match[1];
            if (!imp.startsWith('.')) {
              imports[imp] = (imports[imp] || 0) + 1;
            }
          }
        } catch (err) {
          // Ignore errors
        }
      };

      // 扫描 JS/TS 文件
      const walkDir = (dirPath) => {
        try {
          const entries = fs.readdirSync(dirPath, { withFileTypes: true });

          for (const entry of entries) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules') {
              continue;
            }

            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
              walkDir(fullPath);
            } else if (entry.isFile()) {
              const ext = path.extname(entry.name);
              if (['.js', '.ts', '.jsx', '.tsx', '.mjs'].includes(ext)) {
                analyzeFile(fullPath);
              }
            }
          }
        } catch (err) {
          // Ignore errors
        }
      };

      walkDir(resolvedPath);

      return {
        success: true,
        data: {
          dependencies: Object.keys(dependencies),
          devDependencies: Object.keys(devDependencies),
          imports: Object.entries(imports)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 50)
            .map(([name, count]) => ({ name, count }))
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * 模式搜索工具
 * 在代码中搜索常见的编程模式
 */
export class PatternSearchTool {
  constructor() {
    this.name = 'patternSearch';
    this.description = 'Search for common programming patterns in code';
  }

  /**
   * 预定义的代码模式
   */
  getPatterns() {
    return {
      // JavaScript/TypeScript patterns
      asyncFunction: /async\s+function\s+\w+/g,
      arrowFunction: /\w+\s*=>\s*/g,
      classDeclaration: /class\s+\w+/g,
      tryCatch: /try\s*{[\s\S]*?}\s*catch/g,
      promise: /new\s+Promise\(/g,
      await: /await\s+/g,

      // Import patterns
      es6Import: /import\s+.*from\s+['"]([^'"]+)['"]/g,
      commonjsRequire: /require\(['"]([^'"]+)['"]\)/g,

      // Common patterns
      todo: /TODO|FIXME|HACK|XXX/gi,
      consoleLog: /console\.(log|warn|error|debug)/g,

      // Testing patterns
      describe: /describe\(/g,
      it: /it\(|test\(/g,
      expect: /expect\(/g,

      // API patterns
      fetch: /fetch\(/g,
      axios: /axios\./g,
      http: /http\.(get|post|put|delete)/g
    };
  }

  /**
   * 执行模式搜索
   * @param {Object} params - 参数
   * @param {string} params.pattern - 模式名称（预定义）或正则表达式
   * @param {string} params.dirPath - 搜索目录
   * @param {string} params.fileType - 文件类型过滤（可选）
   * @returns {Object} 搜索结果
   */
  async execute({ pattern, dirPath = '.', fileType = null } = {}) {
    try {
      if (!pattern) {
        return {
          success: false,
          error: 'Pattern is required'
        };
      }

      // 获取正则表达式
      let regex;
      const patterns = this.getPatterns();

      if (patterns[pattern]) {
        regex = patterns[pattern];
      } else {
        try {
          regex = new RegExp(pattern, 'g');
        } catch (err) {
          return {
            success: false,
            error: `Invalid pattern: ${err.message}`
          };
        }
      }

      const results = {
        pattern: pattern,
        matches: [],
        totalMatches: 0,
        filesWithMatches: 0
      };

      // 搜索文件
      const files = await glob(fileType || '**/*.{js,ts,jsx,tsx,py,java,go,rs,cpp,c,h}', { 
        cwd: dirPath 
      });

      for (const file of files) {
        try {
          const content = fs.readFileSync(file, 'utf-8');
          const fileMatches = [];

          let match;
          while ((match = regex.exec(content)) !== null) {
            fileMatches.push({
              text: match[0] || match[1] || match[2],
              index: match.index
            });
          }

          if (fileMatches.length > 0) {
            results.matches.push({
              file: file,
              count: fileMatches.length,
              samples: fileMatches.slice(0, 5) // 只保留前5个示例
            });
            results.filesWithMatches++;
            results.totalMatches += fileMatches.length;
          }
        } catch (err) {
          // Ignore errors
        }
      }

      // 排序并限制结果
      results.matches.sort((a, b) => b.count - a.count);
      results.matches = results.matches.slice(0, 50);

      return {
        success: true,
        data: results
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * 创建高级工具实例的工厂函数
 */
export function createAdvancedAgentTools() {
  return [
    new CodeStatsTool(),
    new DependencyAnalyzerTool(),
    new PatternSearchTool()
  ];
}

/**
 * 获取高级工具的定义（用于工具注册）
 */
export function getAdvancedToolDefinitions() {
  const tools = createAdvancedAgentTools();
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    type: 'analysis'
  }));
}
