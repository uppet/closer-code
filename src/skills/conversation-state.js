/**
 * Conversation State - 会话状态管理
 *
 * 管理已加载的技能并更新 System Prompt
 */

/**
 * 会话状态类
 */
export class ConversationState {
  constructor() {
    // 已加载的技能（按加载顺序）
    this.activeSkills = [];
  }

  /**
   * 添加技能到会话
   * @param {Object} skill - 技能对象
   */
  addSkill(skill) {
    // 检查是否已加载
    const exists = this.activeSkills.some(s => s.name === skill.name);
    if (exists) {
      console.log(`[Skills] Skill "${skill.name}" already loaded, skipping.`);
      return false;
    }

    // 添加到列表
    this.activeSkills.push(skill);
    console.log(`[Skills] Loaded skill: ${skill.name}`);
    return true;
  }

  /**
   * 移除技能
   * @param {string} name - 技能名称
   */
  removeSkill(name) {
    const index = this.activeSkills.findIndex(s => s.name === name);
    if (index === -1) {
      return false;
    }

    this.activeSkills.splice(index, 1);
    console.log(`[Skills] Removed skill: ${name}`);
    return true;
  }

  /**
   * 获取所有已加载的技能
   * @returns {Array} 技能列表
   */
  getActiveSkills() {
    return [...this.activeSkills];
  }

  /**
   * 检查是否有已加载的技能
   * @returns {boolean}
   */
  hasActiveSkills() {
    return this.activeSkills.length > 0;
  }

  /**
   * 检查特定技能是否已加载
   * @param {string} name - 技能名称
   * @returns {boolean}
   */
  hasSkill(name) {
    return this.activeSkills.some(s => s.name === name);
  }

  /**
   * 清除所有已加载的技能
   */
  clearSkills() {
    this.activeSkills = [];
    console.log('[Skills] Cleared all active skills');
  }

  /**
   * 获取技能摘要（用于调试）
   * @returns {Array} 技能名称列表
   */
  getSkillsSummary() {
    return this.activeSkills.map(s => ({
      name: s.name,
      description: s.description.substring(0, 100) + '...',
      path: s.path
    }));
  }
}

/**
 * 构建包含技能的 System Prompt
 * @param {string} basePrompt - 基础 System Prompt
 * @param {Array} activeSkills - 已加载的技能列表
 * @param {Object} options - 配置选项
 * @returns {string} 更新后的 System Prompt
 */
export function buildSystemPromptWithSkills(basePrompt, activeSkills, options = {}) {
  if (!activeSkills || activeSkills.length === 0) {
    return basePrompt;
  }

  const {
    maxTokens = 8000,  // 最大 token 限制
    maxSkillContentLength = 2000,  // 单个技能内容最大长度
    includeFullContent = true  // 是否包含完整内容
  } = options;

  let prompt = basePrompt;
  let estimatedTokens = prompt.length / 2;  // 粗略估计

  // 添加技能部分
  prompt += '\n\n## 🎯 Loaded Skills\n\n';
  prompt += 'The following skills are available for use in this conversation:\n\n';

  for (const skill of activeSkills) {
    const skillSection = `### ${skill.name}\n\n${skill.description}\n\n`;

    if (includeFullContent) {
      // 截断过长的内容
      const content = skill.content.length > maxSkillContentLength
        ? skill.content.substring(0, maxSkillContentLength) + '...\n\n[Content truncated due to length]'
        : skill.content;

      prompt += skillSection + content + '\n\n---\n\n';
    } else {
      // 只包含名称和描述
      prompt += skillSection + '---\n\n';
    }

    // 检查 token 限制
    estimatedTokens = prompt.length / 2;
    if (estimatedTokens > maxTokens) {
      console.warn('[Skills] System prompt exceeds token limit, truncating...');
      // 移除最后添加的技能
      prompt = prompt.substring(0, prompt.lastIndexOf('###'));
      break;
    }
  }

  prompt += 'You can use these skills to help the user. Please carefully read the skill documentation, understand their capabilities and usage, then assist the user with your tasks.\n';

  return prompt;
}

/**
 * 创建全局会话状态实例
 * @returns {ConversationState} 会话状态实例
 */
export function createConversationState() {
  return new ConversationState();
}
