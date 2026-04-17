#!/usr/bin/env node

/**
 * 工作流引擎 (Workflow Engine)
 * 负责编排多个Skill，实现自动化流程
 */

const fs = require('fs').promises;
const path = require('path');

class WorkflowEngine {
  constructor(options = {}) {
    this.workflowsDir = options.workflowsDir || path.join(__dirname, '..', 'workflows');
    this.skillRegistry = options.skillRegistry;
    this.variables = {};
  }

  /**
   * 加载工作流定义
   * @param {string} workflowName - 工作流名称
   * @returns {object} 工作流定义
   */
  async load(workflowName) {
    const workflowPath = path.join(this.workflowsDir, `${workflowName}.json`);

    try {
      const content = await fs.readFile(workflowPath, 'utf-8');
      const workflow = JSON.parse(content);
      console.log(`✅ 已加载工作流: ${workflow.name}`);
      return workflow;
    } catch (error) {
      throw new Error(`加载工作流失败: ${error.message}`);
    }
  }

  /**
   * 运行工作流
   * @param {string} workflowName - 工作流名称
   * @param {object} variables - 变量
   * @returns {object} 执行结果
   */
  async run(workflowName, variables = {}) {
    console.log('\n🔄 工作流引擎');
    console.log(`📋 工作流: ${workflowName}\n`);

    // 合并变量
    this.variables = { ...this.variables, ...variables };

    // 加载工作流
    const workflow = await this.load(workflowName);

    console.log(`📝 描述: ${workflow.description}`);
    console.log(`🔢 步骤数: ${workflow.steps.length}`);
    console.log('--- 开始执行 ---\n');

    const results = {};
    const completedSteps = new Set();

    // 执行每个步骤
    for (const step of workflow.steps) {
      // 检查依赖
      if (step.depends_on && step.depends_on.length > 0) {
        const allDepsMet = step.depends_on.every(dep => completedSteps.has(dep));
        if (!allDepsMet) {
          console.log(`⏭️  跳过步骤 "${step.name}"：依赖未满足`);
          continue;
        }
      }

      // 执行步骤
      console.log(`\n📍 执行步骤: ${step.name}`);
      console.log(`   Skill: ${step.skill}`);

      try {
        // 替换变量
        const params = this.replaceVariables(step.params, this.variables);

        // 执行Skill
        const skill = this.skillRegistry.get(step.skill);
        if (!skill) {
          throw new Error(`Skill not found: ${step.skill}`);
        }

        const result = await skill.execute(params);

        // 保存结果
        results[step.name] = result;
        completedSteps.add(step.name);

        console.log(`✅ 步骤完成: ${step.name}`);
      } catch (error) {
        console.error(`❌ 步骤失败: ${step.name}`);
        console.error(`   错误: ${error.message}`);

        // 根据配置决定是否继续
        if (step.continue_on_error) {
          console.log(`⚠️  继续执行后续步骤`);
        } else {
          console.error(`\n❌ 工作流中断`);
          throw error;
        }
      }
    }

    console.log('\n--- 执行完成 ---');
    console.log(`✅ 工作流 "${workflow.name}" 执行完成\n`);

    return results;
  }

  /**
   * 替换变量
   * @param {object} params - 参数对象
   * @param {object} variables - 变量对象
   * @returns {object} 替换后的参数
   */
  replaceVariables(params, variables) {
    if (typeof params === 'string') {
      // 字符串替换
      return params.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] !== undefined ? variables[key] : match;
      });
    }

    if (Array.isArray(params)) {
      // 数组递归
      return params.map(item => this.replaceVariables(item, variables));
    }

    if (typeof params === 'object' && params !== null) {
      // 对象递归
      const result = {};
      for (const key in params) {
        result[key] = this.replaceVariables(params[key], variables);
      }
      return result;
    }

    return params;
  }

  /**
   * 列出所有可用的工作流
   * @returns {array} 工作流列表
   */
  async list() {
    try {
      const files = await fs.readdir(this.workflowsDir);
      const workflows = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const workflowPath = path.join(this.workflowsDir, file);
          const content = await fs.readFile(workflowPath, 'utf-8');
          const workflow = JSON.parse(content);
          workflows.push({
            name: workflow.name,
            description: workflow.description,
            file: file
          });
        }
      }

      return workflows;
    } catch (error) {
      console.error(`❌ 列出工作流失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 打印工作流详情
   * @param {string} workflowName - 工作流名称
   */
  async printDetails(workflowName) {
    const workflow = await this.load(workflowName);

    console.log('\n📋 工作流详情');
    console.log(`名称: ${workflow.name}`);
    console.log(`描述: ${workflow.description}`);
    console.log('\n步骤:');
    workflow.steps.forEach((step, index) => {
      console.log(`\n${index + 1}. ${step.name}`);
      console.log(`   Skill: ${step.skill}`);
      if (step.depends_on && step.depends_on.length > 0) {
        console.log(`   依赖: ${step.depends_on.join(', ')}`);
      }
      if (step.continue_on_error) {
        console.log(`   错误处理: 继续`);
      }
    });
  }
}

module.exports = WorkflowEngine;
