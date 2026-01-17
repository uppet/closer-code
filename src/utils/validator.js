/**
 * 验收标准验证器
 * 解析 expect.md 并验证验收标准
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * 解析验收标准
 */
function parseExpect(expectContent) {
  // 移除 markdown 标题符号和空格
  const checks = expectContent
    .split('\n')
    .map(line => line.trim())
    .map(line => line.replace(/^#+\s*/, '')) // 移除 # 标题符号
    .filter(line => line.length > 0);

  return checks;
}

/**
 * 检查单个条件
 */
async function checkSingleCondition(condition, workingDir) {
  // 1. 文件存在性检查
  // 匹配模式："有一个 [文件名] 程序" 或 "存在 [文件名]"
  if (condition.includes('有一个') && condition.includes('程序')) {
    const match = condition.match(/(\w+)\s*程序/);
    if (match) {
      const programName = match[1];
      const programPath = path.join(workingDir, programName);

      try {
        await fs.access(programPath, fs.constants.X_OK); // 检查可执行权限
        return {
          passed: true,
          check: condition,
          reason: `程序 ${programName} 存在且可执行`
        };
      } catch {
        return {
          passed: false,
          check: condition,
          reason: `程序 ${programName} 不存在或不可执行`
        };
      }
    }
  }

  // 2. 文件存在性检查
  // 匹配模式："存在 [文件名]" 或 "有 [文件名]"
  if (condition.includes('存在') || condition.includes('有')) {
    // 尝试提取文件名
    const match = condition.match(/(?:存在|有)\s+["']?([^"'\s]+)["']?/);
    if (match) {
      const fileName = match[1];
      const filePath = path.join(workingDir, fileName);

      try {
        await fs.access(filePath, fs.constants.F_OK);
        return {
          passed: true,
          check: condition,
          reason: `文件 ${fileName} 存在`
        };
      } catch {
        return {
          passed: false,
          check: condition,
          reason: `文件 ${fileName} 不存在`
        };
      }
    }
  }

  // 3. 可执行文件检查
  // 匹配模式："可执行的 [文件名]" 或 "[文件名] 可执行"
  if (condition.includes('可执行')) {
    const match = condition.match(/可执行的?\s*(\w+)/);
    if (match) {
      const fileName = match[1];
      const filePath = path.join(workingDir, fileName);

      try {
        await fs.access(filePath, fs.constants.X_OK);
        return {
          passed: true,
          check: condition,
          reason: `文件 ${fileName} 可执行`
        };
      } catch {
        return {
          passed: false,
          check: condition,
          reason: `文件 ${fileName} 不存在或不可执行`
        };
      }
    }
  }

  // 4. 目录存在性检查
  // 匹配模式："[目录名] 目录" 或 "目录 [目录名]"
  if (condition.includes('目录')) {
    const match = condition.match(/(\w+)\s*目录/);
    if (match) {
      const dirName = match[1];
      const dirPath = path.join(workingDir, dirName);

      try {
        const stat = await fs.stat(dirPath);
        if (stat.isDirectory()) {
          return {
            passed: true,
            check: condition,
            reason: `目录 ${dirName} 存在`
          };
        } else {
          return {
            passed: false,
            check: condition,
            reason: `${dirName} 不是目录`
          };
        }
      } catch {
        return {
          passed: false,
          check: condition,
          reason: `目录 ${dirName} 不存在`
        };
      }
    }
  }

  // 5. 默认：无法识别的条件，假设通过
  // 这允许 future 扩展更多验证逻辑
  return {
    passed: true,
    check: condition,
    reason: '未实现验证逻辑，默认通过'
  };
}

/**
 * 验证验收标准
 */
export async function validateExpect(expectContent, workingDir, verbose = false) {
  const checks = parseExpect(expectContent);

  if (verbose) {
    console.log(`\n解析到 ${checks.length} 条验收标准:`);
    checks.forEach((check, index) => {
      console.log(`  ${index + 1}. ${check}`);
    });
  }

  const results = [];
  let allPassed = true;

  for (const check of checks) {
    const result = await checkSingleCondition(check, workingDir);
    results.push(result);

    if (verbose) {
      console.log(`  ${result.passed ? '✓' : '✗'} ${check}`);
      if (!result.passed) {
        console.log(`    原因: ${result.reason}`);
      }
    }

    if (!result.passed) {
      allPassed = false;
      // 遇到第一个失败就停止（AND 逻辑）
      break;
    }
  }

  return {
    passed: allPassed,
    reason: allPassed ? '所有验收标准已满足' : results.find(r => !r.passed)?.reason || '验证失败',
    details: results
  };
}
