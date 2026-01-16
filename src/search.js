/**
 * 代码搜索模块
 */

import { readdir } from 'fs/promises';
import { join } from 'path';
import { glob } from 'glob';

/**
 * 搜索代码中的文本模式
 */
export async function searchCode(pattern, options = {}) {
  const {
    searchPath = '.',
    type = null,
    caseInsensitive = false,
    maxResults = 100
  } = options;

  const flags = caseInsensitive ? 'gi' : 'g';
  const regex = new RegExp(pattern, flags);
  const results = [];

  // 获取要搜索的文件
  let globPattern = '**/*';
  if (type) {
    globPattern = `**/*.${type}`;
  }

  const files = await glob(globPattern, {
    cwd: searchPath,
    ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/coverage/**']
  });

  for (const file of files.slice(0, maxResults)) {
    const fullPath = join(searchPath, file);

    try {
      const { readFile } = await import('fs/promises');
      const content = await readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      let fileHasMatch = false;
      const fileResults = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = regex.exec(line);
        if (match) {
          fileHasMatch = true;
          fileResults.push({
            lineNumber: i + 1,
            line: line.trim(),
            match: match[0],
            index: match.index
          });
          regex.lastIndex = 0; // 重置以查找同一行中的其他匹配
        }
      }

      if (fileHasMatch) {
        results.push({
          file,
          path: fullPath,
          matches: fileResults
        });
      }
    } catch (error) {
      // 忽略无法读取的文件（二进制文件等）
    }
  }

  return {
    pattern,
    results,
    totalFiles: results.length,
    totalMatches: results.reduce((sum, r) => sum + r.matches.length, 0)
  };
}

/**
 * 搜索函数定义
 */
export async function searchFunction(pattern, options = {}) {
  const { searchPath = '.', type = 'js' } = options;

  // 函数定义的正则模式
  const functionPatterns = [
    // JavaScript/TypeScript
    /function\s+(\w+)\s*\(/g,
    /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|\s*function\s*\()/g,
    /(\w+)\s*:\s*function\s*\(/g,
    /class\s+(\w+)/g,
    // Python
    /def\s+(\w+)\s*\(/g,
    /class\s+(\w+)/g,
  ];

  const results = [];

  const files = await glob(`**/*.${type}`, {
    cwd: searchPath,
    ignore: ['**/node_modules/**', '**/dist/**']
  });

  for (const file of files) {
    const fullPath = join(searchPath, file);

    try {
      const { readFile } = await import('fs/promises');
      const content = await readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      for (const funcPattern of functionPatterns) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          funcPattern.lastIndex = 0;
          const match = funcPattern.exec(line);

          if (match) {
            const funcName = match[1];

            // 检查是否匹配搜索模式
            if (pattern && !funcName.toLowerCase().includes(pattern.toLowerCase())) {
              continue;
            }

            results.push({
              file,
              lineNumber: i + 1,
              name: funcName,
              line: line.trim()
            });
          }
        }
      }
    } catch (error) {
      // 忽略错误
    }
  }

  return results;
}

/**
 * 搜索导入/导出
 */
export async function searchImports(searchPath = '.') {
  const results = [];
  const importPatterns = [
    // ES6 imports
    /^import\s+.*?from\s+['"]([^'"]+)['"]/gm,
    // CommonJS require
    /require\(['"]([^'"]+)['"]\)/g,
    // TypeScript exports
    /^export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/gm
  ];

  const files = await glob('**/*.{js,jsx,ts,tsx}', {
    cwd: searchPath,
    ignore: ['**/node_modules/**', '**/dist/**']
  });

  for (const file of files) {
    const fullPath = join(searchPath, file);

    try {
      const { readFile } = await import('fs/promises');
      const content = await readFile(fullPath, 'utf-8');

      const fileImports = {
        file,
        imports: [],
        exports: []
      };

      for (const pattern of importPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          if (match[1]) {
            fileImports.imports.push(match[1]);
          }
        }
      }

      if (fileImports.imports.length > 0) {
        results.push(fileImports);
      }
    } catch (error) {
      // 忽略错误
    }
  }

  return results;
}
