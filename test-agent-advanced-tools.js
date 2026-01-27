/**
 * 测试高级工具和插件系统
 * Phase 6.2: 功能增强测试
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { 
  getGlobalPluginRegistry, 
  createToolPlugin,
  createPluginRegistry 
} from './src/agents/agent-plugin-system.js';
import { 
  CodeStatsTool, 
  DependencyAnalyzerTool, 
  PatternSearchTool 
} from './src/agents/agent-advanced-tools.js';
import { 
  getGlobalPermissionConfig,
  getAllAvailableTools,
  getCompleteToolDefinitions
} from './src/agents/agent-tools.js';

describe('Phase 6.2: Advanced Tools and Plugin System', () => {
  let registry;

  beforeEach(() => {
    registry = createPluginRegistry();
  });

  describe('Plugin System', () => {
    it('should register and execute custom tool plugins', async () => {
      // 使用构建器创建自定义工具
      const plugin = createToolPlugin('testGreeting')
        .description('A simple greeting tool')
        .type('custom')
        .execute(async (params) => {
          return {
            success: true,
            message: `Hello, ${params.name || 'World'}!`
          };
        })
        .allowPaths(['.'])
        .build();

      const registered = registry.register(plugin);
      assert.strictEqual(registered, true);
      assert.strictEqual(registry.has('testGreeting'), true);

      const result = await registry.execute('testGreeting', { name: 'Test' });
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.message, 'Hello, Test!');
    });

    it('should enforce plugin permissions', async () => {
      const plugin = createToolPlugin('testFileReader')
        .description('Read files with permission checks')
        .type('read')
        .execute(async (params) => {
          return {
            success: true,
            path: params.filePath
          };
        })
        .allowPaths(['.'])  // 只允许当前目录
        .build();

      registry.register(plugin);

      // 测试允许的路径
      const allowedResult = await registry.execute('testFileReader', { 
        filePath: './test.txt' 
      });
      assert.strictEqual(allowedResult.success, true);

      // 测试禁止的路径
      const deniedResult = await registry.execute('testFileReader', { 
        filePath: '/etc/passwd' 
      });
      assert.strictEqual(deniedResult.success, false);
      assert.ok(deniedResult.error.includes('Permission denied'));
    });

    it('should support plugin hooks', async () => {
      let beforeExecuted = false;
      let afterExecuted = false;

      registry.addHook('beforeExecute', async (plugin, params) => {
        beforeExecuted = true;
      });

      registry.addHook('afterExecute', async (plugin, params, result) => {
        afterExecuted = true;
      });

      const plugin = createToolPlugin('testHooks')
        .description('Test plugin hooks')
        .execute(async () => ({ success: true }))
        .build();

      registry.register(plugin);
      await registry.execute('testHooks', {});

      assert.strictEqual(beforeExecuted, true);
      assert.strictEqual(afterExecuted, true);
    });

    it('should get tool definitions', () => {
      const plugin = createToolPlugin('testDefinition')
        .description('Test tool definition')
        .type('analysis')
        .execute(async () => ({ success: true }))
        .schema({
          type: 'object',
          properties: {
            query: { type: 'string' }
          }
        })
        .build();

      registry.register(plugin);

      const definitions = registry.getToolDefinitions();
      assert.ok(definitions.some(d => d.name === 'testDefinition'));
      assert.strictEqual(definitions[0].input_schema.type, 'object');
    });
  });

  describe('Advanced Analysis Tools', () => {
    it('should execute codeStats tool', async () => {
      const tool = new CodeStatsTool();
      const result = await tool.execute({ dirPath: '.' });

      assert.strictEqual(result.success, true);
      assert.ok(result.data.totalFiles >= 0);
      assert.ok(result.data.totalDirs >= 0);
      assert.ok(result.data.fileTypes);
      assert.ok(result.data.summary);
    });

    it('should execute dependencyAnalyzer tool', async () => {
      const tool = new DependencyAnalyzerTool();
      const result = await tool.execute({ dirPath: '.' });

      assert.strictEqual(result.success, true);
      assert.ok(Array.isArray(result.data.dependencies));
      assert.ok(Array.isArray(result.data.imports));
    });

    it('should execute patternSearch tool', async () => {
      const tool = new PatternSearchTool();
      const result = await tool.execute({ 
        pattern: 'asyncFunction',
        dirPath: '.',
        fileType: '**/*.js'
      });

      assert.strictEqual(result.success, true);
      assert.ok(result.data.pattern === 'asyncFunction');
      assert.ok(Array.isArray(result.data.matches));
      assert.ok(result.data.totalMatches >= 0);
    });

    it('should support custom patterns in patternSearch', async () => {
      const tool = new PatternSearchTool();
      const result = await tool.execute({ 
        pattern: 'TODO',  // 预定义模式
        dirPath: '.'
      });

      assert.strictEqual(result.success, true);
      assert.ok(result.data.pattern === 'TODO');
    });
  });

  describe('Permission System', () => {
    let permConfig;

    beforeEach(() => {
      permConfig = getGlobalPermissionConfig();
    });

    it('should check file size permissions', () => {
      permConfig.setToolPermission('testTool', {
        maxFileSize: 1024  // 1KB
      });

      const allowed = permConfig.checkPermission('testTool', { 
        maxSize: 512 
      });
      assert.strictEqual(allowed.allowed, true);

      const denied = permConfig.checkPermission('testTool', { 
        maxSize: 2048 
      });
      assert.strictEqual(denied.allowed, false);
      assert.ok(denied.reason.includes('exceeds limit'));
    });

    it('should check path permissions', () => {
      const allowed = permConfig.checkPermission('readFile', { 
        filePath: './src/test.js' 
      });
      assert.strictEqual(allowed.allowed, true);

      const denied = permConfig.checkPermission('readFile', { 
        filePath: '.git/config' 
      });
      assert.strictEqual(denied.allowed, false);
      assert.ok(denied.reason.includes('denied by security policy'));
    });

    it('should check read line limits', () => {
      const denied = permConfig.checkPermission('readFileLines', { 
        maxLines: 20000 
      });
      assert.strictEqual(denied.allowed, false);
      assert.ok(denied.reason.includes('exceeds limit'));
    });

    it('should get permission summary', () => {
      const summary = permConfig.getSummary();
      assert.ok(summary.defaultPermissions);
      assert.ok(summary.toolPermissions);
      assert.strictEqual(typeof summary.totalToolPermissions, 'number');
    });
  });

  describe('Tool Integration', () => {
    it('should get all available tools including plugins', async () => {
      // 注册一个测试插件
      const plugin = createToolPlugin('testIntegration')
        .description('Test integration')
        .execute(async () => ({ success: true }))
        .build();

      getGlobalPluginRegistry().register(plugin);

      const allTools = getAllAvailableTools();
      assert.ok(allTools.includes('searchFiles'));
      assert.ok(allTools.includes('readFile'));
      assert.ok(allTools.includes('codeStats'));
      assert.ok(allTools.includes('testIntegration'));
    });

    it('should get complete tool definitions', () => {
      const definitions = getCompleteToolDefinitions();
      assert.ok(Array.isArray(definitions));
      assert.ok(definitions.length > 0);
      
      const builtinTool = definitions.find(d => d.name === 'searchFiles');
      assert.ok(builtinTool);
      assert.strictEqual(builtinTool.type, 'builtin');
    });
  });

  describe('Plugin Registry Statistics', () => {
    it('should get registry stats', () => {
      const plugin1 = createToolPlugin('testStats1')
        .type('read')
        .execute(async () => ({ success: true }))
        .build();

      const plugin2 = createToolPlugin('testStats2')
        .type('analysis')
        .execute(async () => ({ success: true }))
        .build();

      registry.register(plugin1);
      registry.register(plugin2);

      const stats = registry.getStats();
      assert.strictEqual(stats.totalPlugins, 2);
      assert.strictEqual(stats.byType.read, 1);
      assert.strictEqual(stats.byType.analysis, 1);
      assert.ok(stats.pluginNames.includes('testStats1'));
      assert.ok(stats.pluginNames.includes('testStats2'));
    });
  });
});

// 运行测试
console.log('Running Phase 6.2 Advanced Tools and Plugin System Tests...\n');
