/**
 * DifficultyClassifier - 实验难度分类器
 *
 * 判断实验难度，调整复杂度
 */

class DifficultyClassifier {
  constructor() {
    // 难度级别
    this.levels = {
      basic: {
        name: '基础',
        description: '验证单一知识点，操作简单',
        complexity: 1,
        timeEstimate: '2-4小时',
        codeLines: 50-150
      },
      advanced: {
        name: '进阶',
        description: '结合多个知识点，需要思考',
        complexity: 2,
        timeEstimate: '4-8小时',
        codeLines: 150-400
      },
      comprehensive: {
        name: '综合',
        description: '完整项目实战，综合运用',
        complexity: 3,
        timeEstimate: '8-16小时',
        codeLines: 400-1000
      }
    };

    // 课程类型与难度映射
    this.courseDifficultyMap = {
      '计算机科学导论': { default: 'basic', advanced: 'advanced', comprehensive: 'comprehensive' },
      '数据结构': { default: 'advanced', advanced: 'advanced', comprehensive: 'comprehensive' },
      '操作系统原理与技术实现': { default: 'advanced', advanced: 'comprehensive', comprehensive: 'comprehensive' },
      '编译原理与技术': { default: 'advanced', advanced: 'comprehensive', comprehensive: 'comprehensive' },
      '人工智能引论': { default: 'advanced', advanced: 'comprehensive', comprehensive: 'comprehensive' },
      '软件工程：理论与实践': { default: 'advanced', advanced: 'comprehensive', comprehensive: 'comprehensive' },
      '深入理解计算机网络': { default: 'advanced', advanced: 'comprehensive', comprehensive: 'comprehensive' },
      '数据库管理系统：从基本原理到系统构建': { default: 'advanced', advanced: 'comprehensive', comprehensive: 'comprehensive' },
      '计算机系统：基于RISC-V+Linux平台': { default: 'advanced', advanced: 'comprehensive', comprehensive: 'comprehensive' },
      '计算机组成与实现': { default: 'advanced', advanced: 'comprehensive', comprehensive: 'comprehensive' }
    };
  }

  /**
   * 根据课程和章节判断难度
   */
  classifyByCourse(courseName, chapters = []) {
    // 查找课程
    const courseKey = Object.keys(this.courseDifficultyMap).find(
      key => courseName.includes(key) || key.includes(courseName)
    );

    if (!courseKey) {
      return this.levels.basic;
    }

    const difficultyMap = this.courseDifficultyMap[courseKey];
    return this.levels[difficultyMap.default];
  }

  /**
   * 根据内容复杂度判断难度
   */
  classifyByContent(content) {
    if (!content || content.length < 500) {
      return this.levels.basic;
    }

    // 分析关键词
    const keywords = {
      basic: [
        '基础', '入门', '简单', '介绍', '概述',
        '基本', '初步', '入门级', '初级'
      ],
      advanced: [
        '进阶', '深入', '优化', '算法', '实现',
        '应用', '设计', '分析', '中级'
      ],
      comprehensive: [
        '综合', '实战', '项目', '系统', '架构',
        '框架', '完整', '高级', '复杂'
      ]
    };

    const lowerContent = content.toLowerCase();
    let scores = { basic: 0, advanced: 0, comprehensive: 0 };

    // 统计关键词
    for (const [level, words] of Object.entries(keywords)) {
      for (const word of words) {
        const regex = new RegExp(word, 'gi');
        const matches = content.match(regex);
        if (matches) {
          scores[level] += matches.length * 2;
        }
      }
    }

    // 根据内容长度调整
    if (content.length > 2000) {
      scores.comprehensive += 1;
    } else if (content.length > 1000) {
      scores.advanced += 1;
    } else {
      scores.basic += 1;
    }

    // 找出最高分
    const maxScore = Math.max(...Object.values(scores));
    const topLevel = Object.keys(scores).find(level => scores[level] === maxScore);

    return this.levels[topLevel];
  }

  /**
   * 根据显式指定判断难度
   */
  classifyByLevel(level) {
    const levelMap = {
      '基础': 'basic',
      '进阶': 'advanced',
      '综合': 'comprehensive',
      'basic': 'basic',
      'advanced': 'advanced',
      'comprehensive': 'comprehensive'
    };

    const normalizedLevel = levelMap[level.toLowerCase()];
    return this.levels[normalizedLevel] || this.levels.basic;
  }

  /**
   * 智能判断难度
   * 优先级：显式指定 > 课程类型 > 内容分析
   */
  classify(options = {}) {
    const { courseName, content, level } = options;

    // 优先使用显式指定的难度
    if (level) {
      return this.classifyByLevel(level);
    }

    // 其次根据课程类型
    if (courseName) {
      return this.classifyByCourse(courseName);
    }

    // 最后根据内容分析
    if (content) {
      return this.classifyByContent(content);
    }

    // 默认返回基础
    return this.levels.basic;
  }

  /**
   * 获取难度评分标准
   */
  getGradingCriteria(difficulty) {
    const criteria = {
      basic: {
        functionImplementation: 70,
        codeQuality: 15,
        report: 15,
        bonus: 0
      },
      advanced: {
        functionImplementation: 60,
        codeQuality: 20,
        report: 15,
        bonus: 5
      },
      comprehensive: {
        functionImplementation: 50,
        codeQuality: 25,
        report: 20,
        bonus: 5
      }
    };

    return criteria[difficulty] || criteria.basic;
  }

  /**
   * 获取难度描述
   */
  getDescription(difficulty) {
    const level = this.levels[difficulty];
    if (!level) return '';

    return `${level.name} - ${level.description}\n` +
           `复杂度：${level.complexity}/3\n` +
           `预计时间：${level.timeEstimate}`;
  }

  /**
   * 调整难度（向上或向下）
   */
  adjustDifficulty(currentDifficulty, direction = 'up') {
    const levels = ['basic', 'advanced', 'comprehensive'];
    const currentIndex = levels.indexOf(currentDifficulty);

    if (direction === 'up' && currentIndex < levels.length - 1) {
      return this.levels[levels[currentIndex + 1]];
    } else if (direction === 'down' && currentIndex > 0) {
      return this.levels[levels[currentIndex - 1]];
    }

    return this.levels[currentDifficulty];
  }
}

module.exports = DifficultyClassifier;
