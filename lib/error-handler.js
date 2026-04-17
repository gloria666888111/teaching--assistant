/**
 * 统一错误处理工具类
 * 为所有教学技能提供一致的错误处理机制
 */

class SkillErrorHandler {
  /**
   * 处理技能错误
   * @param {Error} error - 错误对象
   * @param {string} skillName - 技能名称
   * @returns {object} 错误处理结果
   */
  static handle(error, skillName) {
    console.error(`[${skillName}] 错误发生:`, error.message);

    const errorInfo = {
      skill: skillName,
      type: this.classifyError(error),
      message: error.message,
      timestamp: new Date().toISOString(),
      recoverable: this.isRecoverable(error)
    };

    // 记录错误日志
    this.logError(errorInfo);

    // 根据错误类型决定是否抛出
    if (!errorInfo.recoverable) {
      throw error;
    }

    return errorInfo;
  }

  /**
   * 分类错误类型
   */
  static classifyError(error) {
    if (error.message.includes('课程不存在') || error.message.includes('找不到')) {
      return 'RESOURCE_NOT_FOUND';
    }
    if (error.message.includes('API') || error.message.includes('请求失败')) {
      return 'API_ERROR';
    }
    if (error.message.includes('参数') || error.message.includes('无效')) {
      return 'INVALID_INPUT';
    }
    if (error.message.includes('权限') || error.message.includes('无法写入')) {
      return 'PERMISSION_ERROR';
    }
    return 'UNKNOWN_ERROR';
  }

  /**
   * 判断错误是否可恢复
   */
  static isRecoverable(error) {
    const recoverableTypes = [
      'INVALID_INPUT',
      'PERMISSION_ERROR'
    ];
    return recoverableTypes.includes(this.classifyError(error));
  }

  /**
   * 记录错误日志
   */
  static logError(errorInfo) {
    const logDir = require('path').join(__dirname, '../../logs');
    const logFile = require('path').join(logDir, 'errors.log');

    try {
      const fs = require('fs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logEntry = `[${errorInfo.timestamp}] ${errorInfo.skill} - ${errorInfo.type}: ${errorInfo.message}\n`;
      fs.appendFileSync(logFile, logEntry);
    } catch (logError) {
      console.warn('无法写入错误日志:', logError.message);
    }
  }

  /**
   * 创建标准化错误
   */
  static create(type, message, details = {}) {
    const error = new Error(message);
    error.type = type;
    error.details = details;
    error.skill = 'TeachingSkill';
    error.timestamp = new Date().toISOString();
    return error;
  }

  /**
   * 验证输入参数
   */
  static validate(params, schema) {
    const errors = [];

    for (const [key, rules] of Object.entries(schema)) {
      const value = params[key];

      if (rules.required && value === undefined) {
        errors.push(`${key} is required`);
      }

      if (rules.type && typeof value !== rules.type) {
        errors.push(`${key} must be ${rules.type}`);
      }

      if (rules.validate && !rules.validate(value)) {
        errors.push(`${key} validation failed`);
      }
    }

    if (errors.length > 0) {
      throw this.create('VALIDATION_ERROR', 'Invalid parameters', { errors });
    }

    return true;
  }
}

module.exports = { SkillErrorHandler };

/**
 * 使用示例
 */
if (require.main === module) {
  try {
    // 模拟错误
    throw new Error('课程不存在: TestCourse');
  } catch (error) {
    const handled = SkillErrorHandler.handle(error, 'TestSkill');
    console.log('处理结果:', handled);
  }

  try {
    // 参数验证示例
    SkillErrorHandler.validate({
      courseName: 'Python程序设计',
      chapters: [1, 2, 3]
    }, {
      courseName: { required: true, type: 'string' },
      chapters: { required: true, type: 'object' }
    });
    console.log('参数验证通过');
  } catch (error) {
    console.log('验证失败:', error.message);
  }
}
