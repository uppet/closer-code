/**
 * 测试 Agent Cache 功能
 * 验证 Phase 4.2: 结果缓存
 */

import { AgentCacheManager } from './src/agents/agent-cache.js';
import { loadConfig } from './src/config.js';

async function testAgentCache() {
  console.log('🧪 测试 Agent Cache 功能\n');

  const config = loadConfig();
  const cache = new AgentCacheManager(config);

  // 测试 1: 缓存写入
  console.log('📋 测试 1: 缓存写入');
  const testKey = 'test-prompt-1';
  const testValue = {
    success: true,
    value: 'test result',
    executionTime: 100
  };

  cache.set(testKey, testValue);
  console.log('缓存写入:', cache.has(testKey) ? '✅ 成功' : '❌ 失败');

  // 测试 2: 缓存读取
  console.log('\n📋 测试 2: 缓存读取');
  const retrieved = cache.get(testKey);
  console.log('缓存读取:', retrieved && retrieved.value === testValue.value ? '✅ 成功' : '❌ 失败');

  // 测试 3: 缓存命中统计
  console.log('\n📋 测试 3: 缓存命中统计');
  cache.get(testKey); // 命中
  cache.get('non-existent-key'); // 未命中
  const stats = cache.getStats();
  console.log('命中统计:', JSON.stringify(stats, null, 2));
  console.log('统计验证:', stats.hits > 0 && stats.misses > 0 ? '✅ 通过' : '❌ 失败');

  // 测试 4: 缓存过期
  console.log('\n📋 测试 4: 缓存过期');
  const shortTTLConfig = {
    ...config,
    agents: {
      ...config.agents,
      cacheTTL: 100 // 100ms TTL
    }
  };
  const shortCache = new AgentCacheManager(shortTTLConfig);
  shortCache.set('expire-test', { value: 'will expire' });
  
  // 立即读取应该成功
  const beforeExpire = shortCache.get('expire-test');
  console.log('过期前读取:', beforeExpire ? '✅ 成功' : '❌ 失败');
  
  // 等待过期
  await new Promise(resolve => setTimeout(resolve, 150));
  const afterExpire = shortCache.get('expire-test');
  console.log('过期后读取:', !afterExpire ? '✅ 正确过期' : '❌ 未过期');

  // 测试 5: 缓存清除
  console.log('\n📋 测试 5: 缓存清除');
  cache.clear();
  const cleared = cache.get(testKey);
  console.log('清除验证:', !cleared ? '✅ 成功' : '❌ 失败');

  // 测试 6: 缓存大小限制
  console.log('\n📋 测试 6: 缓存大小限制');
  const sizeLimitConfig = {
    ...config,
    agents: {
      ...config.agents,
      cacheMaxSize: 3
    }
  };
  const sizeCache = new AgentCacheManager(sizeLimitConfig);
  sizeCache.set('key1', { value: '1' });
  sizeCache.set('key2', { value: '2' });
  sizeCache.set('key3', { value: '3' });
  sizeCache.set('key4', { value: '4' }); // 应该淘汰 key1
  
  const key1Exists = sizeCache.has('key1');
  const key4Exists = sizeCache.has('key4');
  console.log('LRU 淘汰:', !key1Exists && key4Exists ? '✅ 正确淘汰' : '❌ 淘汰失败');

  // 测试 7: 批量操作
  console.log('\n📋 测试 7: 批量操作');
  const batchCache = new AgentCacheManager(config);
  batchCache.set('batch1', { value: 'a' });
  batchCache.set('batch2', { value: 'b' });
  batchCache.set('batch3', { value: 'c' });
  
  const keys = batchCache.keys();
  console.log('批量获取键:', keys.length === 3 ? '✅ 成功' : '❌ 失败');

  console.log('\n✅ 所有测试完成！');
}

// 运行测试
testAgentCache().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
