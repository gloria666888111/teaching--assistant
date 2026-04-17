/**
 * Difficulty Classifier - 难度分类器
 *
 * 根据题目特征智能分类难度
 */

class DifficultyClassifier {
  constructor() {
    this.rules = {
      basic: [
        '基本概念',
        '定义',
        '是什么',
        '哪个',
        '正确',
        '错误'
      ],
      advanced: [
        '应用',
        '为什么',
        '如何',
        '分析',
        '比较',
        '区别'
      ],
      challenge: [
        '设计',
        '实现',
        '优化',
        '复杂',
        '综合',
        '多个'
      ]
    };
  }

  /**
   * 根据题目内容分类难度
   * @param {object} question - 题目
   * @returns {string} 难度
   */
  classify(question) {
    const content = question.content.toLowerCase();
    let scores = {
      basic: 0,
      advanced: 0,
      challenge: 0
    };

    // 统计关键词匹配
    Object.keys(this.rules).forEach(difficulty => {
      this.rules[difficulty].forEach(keyword => {
        if (content.includes(keyword)) {
          scores[difficulty]++;
        }
      });
    });

    // 根据题目长度判断
    if (content.length < 50) {
      scores.basic += 1;
    } else if (content.length < 100) {
      scores.advanced += 1;
    } else {
      scores.challenge += 1;
    }

    // 根据题型判断
    if (question.type === 'choice' || question.type === 'true_false') {
      scores.basic += 1;
    } else if (question.type === 'fill') {
      scores.advanced += 0.5;
    } else {
      scores.challenge += 1;
    }

    // 返回得分最高的难度
    return Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
  }

  /**
   * 批量分类
   * @param {array} questions - 题目列表
   * @returns {array} 带难度的题目
   */
  classifyAll(questions) {
    return questions.map(q => ({
      ...q,
      difficulty: this.classify(q)
    }));
  }

  /**
   * 调整难度分布
   * @param {array} questions - 题目
   * @param {object} target - 目标分布 {basic: 10, advanced: 5, challenge: 2}
   * @returns {object} 调整后的题目
   */
  adjustDistribution(questions, target) {
    const result = {
      basic: [],
      advanced: [],
      challenge: []
    };

    // 按难度分类
    questions.forEach(q => {
      if (result[q.difficulty]) {
        result[q.difficulty].push(q);
      }
    });

    // 如果不足，用其他难度的补充
    Object.keys(target).forEach(difficulty => {
      while (result[difficulty].length < target[difficulty]) {
        // 从其他难度获取题目
        for (const otherDifficulty of Object.keys(result)) {
          if (otherDifficulty !== difficulty && result[otherDifficulty].length > 0) {
            const q = result[otherDifficulty].shift();
            q.difficulty = difficulty;
            result[difficulty].push(q);
            break;
          }
        }
      }

      // 截取目标数量
      result[difficulty] = result[difficulty].slice(0, target[difficulty]);
    });

    return result;
  }
}

module.exports = { DifficultyClassifier };
