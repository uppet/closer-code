/**
 * Skills Tools - 技能相关工具
 *
 * 实现 skillDiscover 和 skillLoad 两个工具
 */

import { z } from 'zod';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';

/**
 * 创建 skillDiscover 工具
 * @param {Object} skillRegistry - 技能注册表实例
 * @returns {Object} betaZodTool 对象
 */
export function createSkillDiscoverTool(skillRegistry) {
  return betaZodTool({
    name: 'skillDiscover',
    description: `发现可用的技能。

当用户需求可能需要特定技能时，使用此工具查看可用的技能列表。

**使用场景**：
- 用户提到特定领域（如 Git、部署、代码审查）
- 当前工具无法满足用户需求
- 需要了解有哪些专业能力可用

**返回**：
- 技能列表（名称、描述）
- 技能总数
- 搜索关键词匹配`,

    inputSchema: z.object({
      query: z.string().optional().describe('搜索关键词（可选）'),
      category: z.string().optional().describe('筛选分类（可选）')
    }),

    run: async (input) => {
      try {
        const skills = await skillRegistry.discover(input);

        return JSON.stringify({
          success: true,
          skills: skills.map(s => ({
            name: s.name,
            description: s.description
          })),
          total: skills.length,
          query: input.query || '',
          category: input.category || ''
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error.message,
          skills: [],
          total: 0
        });
      }
    }
  });
}

/**
 * 创建 skillLoad 工具
 * @param {Object} skillRegistry - 技能注册表实例
 * @param {Object} conversationState - 会话状态实例
 * @returns {Object} betaZodTool 对象
 */
export function createSkillLoadTool(skillRegistry, conversationState) {
  return betaZodTool({
    name: 'skillLoad',
    description: `加载指定的技能，使其在当前对话中可用。

**使用时机**：
1. 通过 skillDiscover 发现相关技能后
2. 用户明确提到某个技能名称
3. 当前工具无法完成用户需求

**加载成功后**：
- 技能的完整内容将被添加到系统上下文
- 模型可以使用技能描述中说明的能力

**失败处理**：
- 如果技能不存在或加载失败，使用原有能力解决问题`,

    inputSchema: z.object({
      name: z.string().describe('技能名称（必需）')
    }),

    run: async (input) => {
      try {
        const skill = await skillRegistry.loadByName(input.name);

        if (!skill) {
          return JSON.stringify({
            success: false,
            error: `技能 "${input.name}" 未找到`,
            hint: '使用 skillDiscover 查看可用技能'
          });
        }

        // 添加到会话状态
        conversationState.addSkill(skill);

        return JSON.stringify({
          success: true,
          skill: {
            name: skill.name,
            description: skill.description,
            content: skill.content
          },
          message: `技能 "${skill.name}" 已加载。`
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error.message,
          hint: '使用原有能力解决问题'
        });
      }
    }
  });
}

/**
 * 创建所有技能工具
 * @param {Object} skillRegistry - 技能注册表实例
 * @param {Object} conversationState - 会话状态实例
 * @returns {Array} 工具数组
 */
export function createSkillTools(skillRegistry, conversationState) {
  return [
    createSkillDiscoverTool(skillRegistry),
    createSkillLoadTool(skillRegistry, conversationState)
  ];
}
