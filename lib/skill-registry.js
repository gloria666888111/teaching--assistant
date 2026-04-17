#!/usr/bin/env node

/**
 * Skill注册器 (Skill Registry)
 * 管理所有可用的Skills
 */

class SkillRegistry {
  constructor() {
    this.skills = {};
  }

  /**
   * 注册Skill
   * @param {string} name - Skill名称
   * @param {object} skill - Skill实例
   */
  register(name, skill) {
    if (!skill || typeof skill.execute !== 'function') {
      throw new Error(`Skill必须实现execute方法: ${name}`);
    }

    this.skills[name] = skill;
    console.log(`✅ 已注册Skill: ${name}`);
  }

  /**
   * 获取Skill
   * @param {string} name - Skill名称
   * @returns {object} Skill实例
   */
  get(name) {
    const skill = this.skills[name];
    if (!skill) {
      throw new Error(`Skill not found: ${name}`);
    }
    return skill;
  }

  /**
   * 检查Skill是否存在
   * @param {string} name - Skill名称
   * @returns {boolean} 是否存在
   */
  has(name) {
    return name in this.skills;
  }

  /**
   * 列出所有已注册的Skills
   * @returns {array} Skill列表
   */
  list() {
    return Object.keys(this.skills).map(name => ({
      name,
      skill: this.skills[name]
    }));
  }

  /**
   * 批量注册Skills
   * @param {object} skills - Skills对象 {name: skill}
   */
  registerMany(skills) {
    for (const name in skills) {
      this.register(name, skills[name]);
    }
  }

  /**
   * 注销Skill
   * @param {string} name - Skill名称
   */
  unregister(name) {
    delete this.skills[name];
    console.log(`🗑️  已注销Skill: ${name}`);
  }

  /**
   * 清空所有Skills
   */
  clear() {
    this.skills = {};
    console.log('🧹 已清空所有Skills');
  }

  /**
   * 打印所有Skills的信息
   */
  print() {
    console.log('\n📚 已注册的Skills:\n');
    const skills = this.list();

    if (skills.length === 0) {
      console.log('   (无)');
      return;
    }

    skills.forEach(({ name }, index) => {
      console.log(`${index + 1}. ${name}`);
    });
    console.log();
  }

  /**
   * 执行Skill
   * @param {string} name - Skill名称
   * @param {object} params - 参数
   * @returns {object} 执行结果
   */
  async execute(name, params = {}) {
    const skill = this.get(name);
    return await skill.execute(params);
  }

  /**
   * 验证Skill参数
   * @param {string} name - Skill名称
   * @param {object} params - 参数
   * @returns {boolean} 是否有效
   */
  async validate(name, params = {}) {
    const skill = this.get(name);

    // 如果Skill有validate方法，调用它
    if (typeof skill.validate === 'function') {
      return await skill.validate(params);
    }

    // 默认验证：检查参数不为空
    return params && typeof params === 'object' && Object.keys(params).length > 0;
  }
}

module.exports = SkillRegistry;
