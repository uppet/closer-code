/**
 * MCP 集成测试
 */

import { MCPClientManager } from '../src/mcp/client.js';
import { convertMCPToolsToBetaZod } from '../src/mcp/tools-adapter.js';
import { loadConfig } from '../src/config.js';

async function testMCPClient() {
  console.log('=== MCP Client 测试 ===\n');

  // 加载配置
  const config = loadConfig();

  if (!config.mcp?.enabled) {
    console.log('⚠️  MCP 未在配置中启用');
    console.log('请在 ~/.closer-code/config.json 中设置 "mcp.enabled": true');
    return;
  }

  if (!config.mcp?.servers || Object.keys(config.mcp.servers).length === 0) {
    console.log('⚠️  没有配置任何 MCP Servers');
    console.log('请在配置文件中添加 "mcp.servers" 配置');
    return;
  }

  console.log('📋 配置的 MCP Servers:');
  for (const [name, serverConfig] of Object.entries(config.mcp.servers)) {
    const status = serverConfig.enabled ? '✅ 启用' : '❌ 禁用';
    console.log(`  ${status} ${name}`);
    console.log(`     命令: ${serverConfig.command}`);
    console.log(`     参数: ${serverConfig.args?.join(' ') || '(无)'}`);
  }
  console.log();

  // 创建 MCP Client Manager
  const manager = new MCPClientManager();

  try {
    // 连接到所有启用的 servers
    console.log('🔗 正在连接到 MCP Servers...\n');
    await manager.connectServers(config.mcp.servers);

    // 获取连接状态
    const status = manager.getStatus();
    console.log('\n📊 连接状态:');
    console.log(`  已连接服务器: ${status.connectedServers.join(', ') || '(无)'}`);
    console.log(`  总工具数: ${status.totalTools}`);
    console.log('\n服务器详情:');
    for (const [name, info] of Object.entries(status.servers)) {
      const connStatus = info.connected ? '✅ 已连接' : '❌ 未连接';
      console.log(`  ${connStatus} ${name}: ${info.toolCount} 个工具`);
    }
    console.log();

    // 获取所有工具
    const allTools = manager.getAllTools();
    console.log(`🛠️  可用的 MCP 工具 (${allTools.length} 个):\n`);
    for (const tool of allTools) {
      console.log(`  • ${tool.name}`);
      console.log(`    来源: ${tool.serverName}`);
      console.log(`    描述: ${tool.description.substring(0, 80)}${tool.description.length > 80 ? '...' : ''}`);
      console.log();
    }

    // 测试工具转换
    console.log('🔄 测试工具转换...\n');
    const betaTools = convertMCPToolsToBetaZod(allTools);
    console.log(`✅ 成功转换 ${betaTools.length} 个工具为 betaZodTool 格式`);

    // 如果有工具，测试工具信息获取
    if (allTools.length > 0) {
      const firstTool = allTools[0];
      console.log('\n🔍 测试工具信息获取...\n');
      const toolInfo = manager.getToolInfo(firstTool.name);
      if (toolInfo) {
        console.log('✅ 成功获取工具信息:');
        console.log(`  服务器: ${toolInfo.serverName}`);
        console.log(`  工具: ${toolInfo.toolName}`);
        console.log(`  Schema: ${JSON.stringify(toolInfo.toolSchema.inputSchema, null, 2).substring(0, 200)}...`);
      } else {
        console.log('❌ 无法获取工具信息');
      }
    }

    // 测试工具调用（如果有 filesystem server）
    const filesystemServer = status.servers['filesystem'];
    if (filesystemServer && filesystemServer.connected) {
      console.log('\n🧪 测试工具调用...\n');
      try {
        const result = await manager.callTool('filesystem', 'read_file', {
          path: process.cwd()
        });
        console.log('✅ 工具调用成功:');
        console.log(`  结果: ${JSON.stringify(result, null, 2).substring(0, 200)}...`);
      } catch (error) {
        console.log(`⚠️  工具调用失败: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
  } finally {
    // 断开所有连接
    console.log('\n🔌 断开所有连接...\n');
    await manager.disconnectAll();
    console.log('✅ 已断开所有连接');
  }

  console.log('\n=== 测试完成 ===');
}

// 运行测试
testMCPClient().catch(console.error);
