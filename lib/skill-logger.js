/**
 * 统一日志工具类
 * 为所有教学技能提供一致的日志记录功能
 */

const fs = require('fs');
const path = require('path');

class SkillLogger {
  constructor(options = {}) {
    this.skillName = options.skillName || 'TeachingSkill';
    this.level = options.level || 'info'; // debug, info, warn, error
    this.enableConsole = options.enableConsole !== false;
    this.enableFile = options.enableFile || false;
    this.logDir = options.logDir || path.join(__dirname, '../../logs');
    this.logFile = options.logFile || `${this.skillName.toLowerCase()}.log`;

    if (this.enableFile) {
      this._ensureLogDir();
    }
  }

  /**
   * 确保日志目录存在
   */
  _ensureLogDir() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (error) {
      console.warn(`无法创建日志目录 ${this.logDir}:`, error.message);
      this.enableFile = false;
    }
  }

  /**
   * 格式化日志消息
   */
  _format(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${this.skillName}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  /**
   * 写入日志
   */
  _write(formattedMessage) {
    if (this.enableConsole) {
      console.log(formattedMessage);
    }

    if (this.enableFile) {
      try {
        const logPath = path.join(this.logDir, this.logFile);
        fs.appendFileSync(logPath, formattedMessage + '\n');
      } catch (error) {
        console.warn('无法写入日志文件:', error.message);
      }
    }
  }

  /**
   * 记录调试信息
   */
  debug(message, meta) {
    if (this.level === 'debug') {
      this._write(this._format('debug', message, meta));
    }
  }

  /**
   * 记录信息
   */
  info(message, meta) {
    if (['debug', 'info'].includes(this.level)) {
      this._write(this._format('info', message, meta));
    }
  }

  /**
   * 记录警告
   */
  warn(message, meta) {
    if (['debug', 'info', 'warn'].includes(this.level)) {
      this._write(this._format('warn', message, meta));
    }
  }

  /**
   * 记录错误
   */
  error(message, meta) {
    this._write(this._format('error', message, meta));
  }

  /**
   * 记录性能指标
   */
  performance(operation, duration, meta = {}) {
    this.info(`性能: ${operation} 完成，耗时 ${duration}ms`, {
      ...meta,
      operation,
      duration,
      unit: 'ms'
    });
  }

  /**
   * 记录操作开始
   */
  start(operation) {
    const startTime = Date.now();
    this.debug(`开始: ${operation}`);
    return {
      operation,
      startTime,
      end: () => {
        const duration = Date.now() - startTime;
        this.performance(operation, duration);
      }
    };
  }

  /**
   * 记录 Token 使用
   */
  tokens(inputTokens, outputTokens, totalTokens) {
    this.info('Token 使用统计', {
      inputTokens,
      outputTokens,
      totalTokens,
      cost: this._calculateCost(totalTokens)
    });
  }

  /**
   * 计算 Token 成本（估算）
   */
  _calculateCost(tokens) {
    // 假设每1000 tokens 费用 $0.002
    return ((tokens / 1000) * 0.002).toFixed(6);
  }

  /**
   * 创建子日志器
   */
  child(childName, options = {}) {
    const childLogger = new SkillLogger({
      ...options,
      skillName: `${this.skillName}.${childName}`,
      level: options.level || this.level,
      enableConsole: options.enableConsole !== undefined ? options.enableConsole : this.enableConsole,
      enableFile: options.enableFile !== undefined ? options.enableFile : this.enableFile,
      logDir: options.logDir || this.logDir
    });

    return childLogger;
  }
}

module.exports = { SkillLogger };

/**
 * 使用示例
 */
if (require.main === module) {
  // 创建日志器
  const logger = new SkillLogger({
    skillName: 'TestSkill',
    level: 'debug',
    enableConsole: true,
    enableFile: false
  });

  // 基础日志
  logger.info('技能启动');
  logger.debug('调试信息', { key: 'value' });
  logger.warn('警告信息');
  logger.error('错误信息', { code: 500 });

  // 性能日志
  const perf = logger.start('测试操作');
  // 模拟操作
  setTimeout(() => {
    perf.end();
  }, 100);

  // Token 统计
  logger.tokens(1000, 500, 1500);

  // 子日志器
  const childLogger = logger.child('ModuleA');
  childLogger.info('子模块日志');
}
