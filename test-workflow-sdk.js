#!/usr/bin/env node
/**
 * Workflow 测试脚本（使用 SDK）
 *
 * 使用方法:
 *   node test-workflow-sdk.js              - 列出所有测试
 *   node test-workflow-sdk.js <name>       - 运行单个测试
 *   node test-workflow-sdk.js --all        - 运行所有测试
 *   node test-workflow-sdk.js <name> --verbose  - 详细输出
 */

import workflowTestsSDKCommand from './src/commands/workflow-tests-sdk.js';

// 解析命令行参数
const args = process.argv.slice(2);
const options = {
  all: args.includes('--all'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  debug: args.includes('--debug') || args.includes('-d'),
  json: args.includes('--json')
};

// 移除选项参数，只保留测试名称
const cleanArgs = args.filter(arg => !arg.startsWith('--'));

// 运行命令
workflowTestsSDKCommand(cleanArgs, options);
