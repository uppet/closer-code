/**
 * 系统提示词构建器
 *
 * 提供灵活的方式来构建和优化 AI 助手的系统提示词
 */

import { loadMemory } from './config.js';

/**
 * 读取全局 cloco.md 文件内容
 */
async function readGlobalCloco() {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');
    const homeDir = os.homedir();
    const globalClocoPath = path.join(homeDir, '.closer-code', 'cloco.md');
    return await fs.readFile(globalClocoPath, 'utf-8');
  } catch (error) {
    // 全局配置不存在是正常情况，不报错
    if (error.code !== 'ENOENT') {
      console.error('读取全局 cloco.md 失败:', error.message);
    }
    return '';
  }
}

/**
 * 读取项目级 cloco.md 文件内容
 */
async function readProjectCloco() {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const clocoPath = path.join(process.cwd(), 'cloco.md');
    return await fs.readFile(clocoPath, 'utf-8');
  } catch (error) {
    // 项目配置不存在是正常情况，不报错
    if (error.code !== 'ENOENT') {
      console.error('读取项目 cloco.md 失败:', error.message);
    }
    return '';
  }
}

/**
 * 构建系统提示词（优化后的版本）
 */
export async function getSystemPrompt(config, workflowTest = false) {
  const memory = loadMemory();
  const projectKey = config.behavior.workingDir || 'default';
  const projectInfo = memory.projects?.[projectKey];

  // 读取全局和项目级 cloco.md
  const globalClocoContent = await readGlobalCloco();
  const projectClocoContent = await readProjectCloco();

  // 读取 WORKFLOW_SYSTEM_PROMPT（如果需要）
  let workflowPrompt = '';
  if (workflowTest) {
    // 这里需要从 conversation.js 导入 WORKFLOW_SYSTEM_PROMPT
    // 暂时留空，后面会处理
  }

  // 构建完整的系统提示词
  const prompt = `You are Closer, an AI programming assistant designed to help developers with coding tasks, debugging, and project management.

## Tool Usage
Use tools to execute actions (bash, readFile, writeFile, editFile, searchFiles, searchCode).

**Key principle**: Use tools proactively - show, don't just talk about it.

## Error Handling (IMPORTANT)

When a tool returns an error:
1. **Identify** the error type (ENOENT, EACCES, etc.)
2. **Fix** the issue (create directory, fix permissions, etc.)
3. **Retry** the operation

**Retry strategy**: 2-3 attempts maximum. If still failing, explain to the user.

Common fixes:
- Missing directory → \`mkdir -p path/to/dir\`
- Wrong content → Read file first, then edit

## Task Execution Guide
When asked to analyze or review code:
- Start by searching for relevant files
- Read the key files to understand the codebase
- Focus on files that are most relevant to the task
- Provide specific findings with file names and line numbers

**NOTE**: Only perform comprehensive analysis when explicitly requested. For specific questions, focus on the relevant parts.

## Current Context
Working Directory: ${config.behavior.workingDir}
Available Tools: ${config.tools.enabled.join(', ')}
${projectInfo ? `
## Project Patterns
This is a familiar project. Remember these patterns:
${JSON.stringify(projectInfo.patterns, null, 2)}
` : ''}

## Behavior Configuration
- Auto Plan: ${config.behavior.autoPlan ? 'Enabled' : 'Disabled'}
- Auto Execute: ${config.behavior.autoExecute ? 'Enabled (low-risk operations only)' : 'Disabled'}
- Confirm Destructive: ${config.behavior.confirmDestructive ? 'Enabled' : 'Disabled'}

${globalClocoContent ? `
## 📋 Global Behavior Guidelines (CRITICAL)
**The following global guidelines from ~/.closer-code/cloco.md are EXTREMELY IMPORTANT and MUST be followed:**

${globalClocoContent}

**These global guidelines take precedence over general instructions. Follow them carefully**
` : ''}

${projectClocoContent ? `
## 📋 Project Behavior Guidelines (CRITICAL)
**The following project-specific guidelines from ./cloco.md are EXTREMELY IMPORTANT and MUST be followed:**

${projectClocoContent}

**These project guidelines take precedence over general instructions. Follow them carefully**
` : ''}

${!globalClocoContent && !projectClocoContent ? `
## 📋 Behavior Guidelines
No custom behavior guidelines found. You can add them by:
- Creating ~/.closer-code/cloco.md for global guidelines
- Creating ./cloco.md for project-specific guidelines
` : ''}${workflowPrompt}`;

  return prompt;
}
