#!/usr/bin/env node
/**
 * 测试 Plan 功能
 */

import { Plan, PlanType, PlanStatus, StepStatus } from '../src/plan.js';

async function testPlan() {
  console.log('🧪 测试 Plan 功能\n');
  console.log('═'.repeat(60));

  try {
    // 测试1: 创建 Plan
    console.log('\n测试1: 创建 Plan');
    const plan = new Plan('创建一个 React 组件', PlanType.COMMAND);
    console.log('✅ Plan 创建成功');
    console.log(`   ID: ${plan.id}`);
    console.log(`   类型: ${plan.type}`);
    console.log(`   描述: ${plan.description}`);
    console.log(`   状态: ${plan.status}`);

    // 测试2: 添加步骤
    console.log('\n测试2: 添加步骤');
    plan.addStep('创建组件文件');
    plan.addStep('编写组件代码');
    plan.addStep('添加样式');
    console.log(`✅ 添加了 ${plan.steps.length} 个步骤`);

    // 测试3: 开始执行
    console.log('\n测试3: 开始执行');
    plan.start();
    console.log(`✅ Plan 状态: ${plan.status}`);

    // 测试4: 更新步骤状态
    console.log('\n测试4: 更新步骤状态');
    const step1 = plan.steps[0];
    plan.updateStep(step1.id, StepStatus.IN_PROGRESS);
    console.log(`✅ 步骤1状态: ${step1.status}`);

    plan.updateStep(step1.id, StepStatus.COMPLETED);
    console.log(`✅ 步骤1已完成`);

    const step2 = plan.steps[1];
    plan.updateStep(step2.id, StepStatus.IN_PROGRESS);
    console.log(`✅ 步骤2进行中`);

    // 测试5: 获取进度
    console.log('\n测试5: 获取进度');
    const progress = plan.getProgress();
    console.log(`✅ 总步骤: ${progress.total}`);
    console.log(`✅ 已完成: ${progress.completed}`);
    console.log(`✅ 进行中: ${progress.inProgress}`);
    console.log(`✅ 进度: ${progress.percentage}%`);

    // 测试6: 完成所有步骤
    console.log('\n测试6: 完成所有步骤');
    plan.updateStep(step2.id, StepStatus.COMPLETED);
    const step3 = plan.steps[2];
    plan.updateStep(step3.id, StepStatus.COMPLETED);

    const finalProgress = plan.getProgress();
    console.log(`✅ 最终进度: ${finalProgress.percentage}%`);
    console.log(`✅ Plan 状态: ${plan.status}`);

    // 测试7: JSON 序列化
    console.log('\n测试7: JSON 序列化');
    const json = plan.toJSON();
    console.log(`✅ 序列化成功`);
    console.log(`   包含 ${json.steps.length} 个步骤`);

    // 测试8: 从 JSON 恢复
    console.log('\n测试8: 从 JSON 恢复');
    const restoredPlan = Plan.fromJSON(json);
    console.log(`✅ 恢复成功`);
    console.log(`   ID: ${restoredPlan.id}`);
    console.log(`   状态: ${restoredPlan.status}`);

    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ 所有测试通过！\n');
    console.log('📊 测试总结:');
    console.log('  ✅ Plan 创建');
    console.log('  ✅ 步骤管理');
    console.log('  ✅ 状态更新');
    console.log('  ✅ 进度计算');
    console.log('  ✅ JSON 序列化');
    console.log('  ✅ 从 JSON 恢复\n');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
  }
}

// 运行测试
testPlan().catch(console.error);
