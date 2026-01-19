/**
 * 项目本地配置测试
 */

import { loadConfig, loadProjectConfig, findProjectConfigFile, getConfigPaths } from '../src/config.js';
import fs from 'fs';
import path from 'path';

async function testProjectConfig() {
  console.log('=== 项目本地配置测试 ===\n');

  // 1. 测试查找项目配置文件
  console.log('1️⃣ 测试查找项目配置文件\n');
  const projectConfigPath = findProjectConfigFile();
  console.log(`当前目录: ${process.cwd()}`);
  console.log(`项目配置文件: ${projectConfigPath || '(未找到)'}\n`);

  // 2. 测试加载项目配置
  console.log('2️⃣ 测试加载项目配置\n');
  const projectConfig = loadProjectConfig();
  console.log(`项目配置内容:`);
  console.log(JSON.stringify(projectConfig, null, 2));
  console.log();

  // 3. 测试配置合并
  console.log('3️⃣ 测试配置合并\n');
  const mergedConfig = loadConfig();
  console.log(`合并后的配置:`);
  console.log(`- MCP 启用: ${mergedConfig.mcp?.enabled}`);
  console.log(`- MCP Servers 数量: ${Object.keys(mergedConfig.mcp?.servers || {}).length}`);
  if (mergedConfig.mcp?.servers) {
    for (const [name, server] of Object.entries(mergedConfig.mcp.servers)) {
      const status = server.enabled ? '✅' : '❌';
      console.log(`  ${status} ${name}`);
    }
  }
  console.log();

  // 4. 测试配置路径
  console.log('4️⃣ 测试配置路径\n');
  const configPaths = getConfigPaths();
  console.log('配置文件路径:');
  console.log(`- 全局配置: ${configPaths.global}`);
  console.log(`- 项目配置: ${configPaths.project || '(未找到)'}`);
  console.log(`- 活动配置: ${configPaths.active}`);
  console.log();

  // 5. 测试创建项目配置文件
  console.log('5️⃣ 测试创建项目配置文件\n');
  const testConfigPath = '.closer-code.test.json';
  const testConfig = {
    mcp: {
      enabled: true,
      servers: {
        test_server: {
          enabled: true,
          command: 'echo',
          args: ['test'],
          env: {}
        }
      }
    }
  };

  try {
    // 创建测试配置文件
    fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));
    console.log(`✅ 创建测试配置文件: ${testConfigPath}`);

    // 重新加载配置
    const newProjectConfig = loadProjectConfig();
    console.log(`✅ 重新加载项目配置:`);
    console.log(JSON.stringify(newProjectConfig, null, 2));

    // 验证配置是否正确加载
    if (newProjectConfig.mcp?.servers?.test_server) {
      console.log(`✅ 测试服务器配置加载成功`);
    } else {
      console.log(`❌ 测试服务器配置加载失败`);
    }

    // 清理测试文件
    fs.unlinkSync(testConfigPath);
    console.log(`✅ 清理测试文件: ${testConfigPath}`);
  } catch (error) {
    console.error(`❌ 测试失败: ${error.message}`);
  }

  console.log();

  // 6. 测试配置优先级
  console.log('6️⃣ 测试配置优先级\n');
  console.log('配置优先级: 项目本地 > 全局 > 默认');
  console.log();
  console.log('示例:');
  console.log('1. 默认配置: MCP 启用，无 servers');
  console.log('2. 全局配置: 添加 filesystem server');
  console.log('3. 项目配置: 添加 git server');
  console.log('4. 最终配置: 包含 filesystem (全局) 和 git (项目)');
  console.log();

  console.log('=== 测试完成 ===');
}

// 运行测试
testProjectConfig().catch(console.error);
