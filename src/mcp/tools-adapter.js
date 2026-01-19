/**
 * MCP 工具适配器
 * 
 * 将 MCP 工具转换为 betaZodTool 格式，以便与现有工具系统集成
 */

import { z } from 'zod';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { getMCPClientManager } from './client.js';
import { logger } from '../logger.js';

/**
 * 将 MCP 工具的 JSON Schema 转换为 Zod Schema
 * @param {Object} jsonSchema - MCP 工具的 inputSchema (JSON Schema)
 * @returns {z.ZodTypeAny} Zod Schema
 */
function jsonSchemaToZod(jsonSchema) {
  // 简化版本：处理常见的 JSON Schema 类型
  // 实际项目中可能需要更完整的转换

  if (!jsonSchema || !jsonSchema.type) {
    return z.object({});
  }

  const { type, properties, required } = jsonSchema;

  if (type === 'object' && properties) {
    const shape = {};

    for (const [propName, propSchema] of Object.entries(properties)) {
      let zodType;

      switch (propSchema.type) {
        case 'string':
          zodType = z.string();
          break;
        case 'number':
        case 'integer':
          zodType = z.number();
          break;
        case 'boolean':
          zodType = z.boolean();
          break;
        case 'array':
          zodType = z.array(z.any());
          break;
        case 'object':
          zodType = z.object({});
          break;
        default:
          zodType = z.any();
      }

      // 处理可选字段
      const isRequired = Array.isArray(required) && required.includes(propName);
      shape[propName] = isRequired ? zodType : zodType.optional();
    }

    return z.object(shape);
  }

  // 其他类型作为 any 处理
  return z.any();
}

/**
 * 为 MCP 工具创建描述文本（包含服务器信息）
 * @param {string} serverName - 服务器名称
 * @param {Object} mcpTool - MCP 工具定义
 * @returns {string} 增强的描述
 */
function enhanceDescription(serverName, mcpTool) {
  const baseDesc = mcpTool.description || mcpTool.name;
  return `[MCP: ${serverName}] ${baseDesc}`;
}

/**
 * 将 MCP 工具列表转换为 betaZodTool 列表
 * @param {Array} mcpTools - MCP 工具列表
 * @returns {Array} betaZodTool 列表
 */
export function convertMCPToolsToBetaZod(mcpTools) {
  const converted = [];

  for (const mcpTool of mcpTools) {
    try {
      const { name, originalName, serverName, description, inputSchema } = mcpTool;

      // 转换 JSON Schema 为 Zod Schema
      const zodSchema = jsonSchemaToZod(inputSchema);

      // 创建 betaZodTool
      const betaTool = betaZodTool({
        name: name,
        description: enhanceDescription(serverName, { name: originalName, description }),
        inputSchema: zodSchema,
        run: async (input) => {
          const manager = getMCPClientManager();

          logger.debug(`执行 MCP 工具: ${serverName}.${originalName}`);

          const result = await manager.callTool(serverName, originalName, input);

          // 返回 JSON 字符串（与现有工具保持一致）
          return JSON.stringify(result);
        }
      });

      converted.push(betaTool);
    } catch (error) {
      logger.error(`转换 MCP 工具失败 (${mcpTool.name}): ${error.message}`);
    }
  }

  return converted;
}

/**
 * 获取所有 MCP 工具的 betaZodTool 格式
 * @returns {Promise<Array>} betaZodTool 列表
 */
export async function getAllMCPToolsAsBetaZod() {
  const manager = getMCPClientManager();
  const mcpTools = manager.getAllTools();

  return convertMCPToolsToBetaZod(mcpTools);
}

/**
 * 生成 MCP 工具的简短摘要
 * @param {string} toolName - 工具名称
 * @param {Object} input - 工具输入
 * @param {Object} result - 工具结果
 * @returns {string} 简短摘要
 */
export function generateMCPToolSummary(toolName, input, result) {
  // 解析工具名称（格式：serverName_toolName）
  const parts = toolName.split('_');
  const serverName = parts[0];
  const shortToolName = parts.slice(1).join('_');

  const success = result?.success;

  if (success) {
    return `✓ [${serverName}] ${shortToolName}`;
  } else {
    return `✗ [${serverName}] ${shortToolName}`;
  }
}
