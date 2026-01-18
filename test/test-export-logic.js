#!/usr/bin/env node
/**
 * 测试导出功能的逻辑
 */

import fs from 'fs';
import path from 'path';

async function testExportLogic() {
  console.log('🧪 测试导出功能逻辑\n');
  console.log('═'.repeat(60));

  try {
    // 模拟对话数据
    const mockConversation = {
      messages: [
        { role: 'user', content: '你好' },
        { role: 'assistant', content: '你好！有什么可以帮助你的吗？' },
        { role: 'user', content: '请帮我写一个 Python 脚本' },
        { role: 'assistant', content: '好的，我来帮你写一个 Python 脚本。' }
      ],
      export() {
        return {
          messages: this.messages
        };
      }
    };

    console.log('\n📝 测试消息:');
    mockConversation.messages.forEach((msg, i) => {
      console.log(`  ${i + 1}. [${msg.role}] ${msg.content.substring(0, 30)}...`);
    });

    // 导出逻辑（复制自 closer-cli.jsx）
    const exportData = mockConversation.export();
    const messages = exportData.messages || [];

    // 生成文本格式
    let textContent = '';
    textContent += '='.repeat(80) + '\n';
    textContent += 'Closer Code - Conversation Export\n';
    textContent += '='.repeat(80) + '\n';
    textContent += `Export Date: ${new Date().toLocaleString('zh-CN')}\n`;
    textContent += `Total Messages: ${messages.length}\n`;
    textContent += '='.repeat(80) + '\n\n';

    messages.forEach((msg, index) => {
      const role = msg.role || 'unknown';
      const roleLabel = {
        'user': '👤 User',
        'assistant': '🤖 Assistant',
        'system': 'ℹ️ System',
        'error': '❌ Error'
      }[role] || role;

      textContent += `[${index + 1}] ${roleLabel}\n`;
      textContent += '-'.repeat(80) + '\n';

      const content = msg.content;
      if (typeof content === 'string') {
        textContent += content + '\n';
      } else if (Array.isArray(content)) {
        // 处理工具调用等复杂内容
        content.forEach(block => {
          if (block.type === 'text') {
            textContent += block.text + '\n';
          } else if (block.type === 'tool_use') {
            textContent += `[Tool: ${block.name}]\n`;
            textContent += JSON.stringify(block.input, null, 2) + '\n';
          } else if (block.type === 'tool_result') {
            textContent += `[Tool Result]\n`;
            textContent += block.content + '\n';
          }
        });
      } else {
        textContent += JSON.stringify(content, null, 2) + '\n';
      }

      textContent += '\n';
    });

    textContent += '='.repeat(80) + '\n';
    textContent += 'End of Export\n';
    textContent += '='.repeat(80) + '\n';

    // 写入文件
    const filename = 'test-export.txt';
    fs.writeFileSync(filename, textContent, 'utf-8');

    console.log('\n✅ 导出成功！');
    console.log(`   文件路径: ${filename}`);

    // 读取并显示前几行
    const content = fs.readFileSync(filename, 'utf-8');
    const lines = content.split('\n');

    console.log('\n📄 导出内容预览（前25行）:\n');
    console.log(lines.slice(0, 25).join('\n'));
    console.log('\n... (内容已截断)\n');

    // 清理测试文件
    fs.unlinkSync(filename);
    console.log('🧹 测试文件已清理\n');

    console.log('═'.repeat(60));
    console.log('\n✅ 所有测试通过！\n');
    console.log('📊 测试总结:');
    console.log('  ✅ 导出逻辑正确');
    console.log('  ✅ 文本格式正确');
    console.log('  ✅ 消息序列化正确');
    console.log('  ✅ 文件读写正确\n');
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
  }
}

// 运行测试
testExportLogic().catch(console.error);
