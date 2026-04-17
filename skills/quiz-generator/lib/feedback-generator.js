/**
 * Feedback Generator - 解析生成器
 *
 * 为题目生成详细的解答解析
 */

class FeedbackGenerator {
  constructor() {
    this.templates = {
      choice: {
        correct: '正确答案。{explanation}',
        incorrect: '错误答案。{explanation}'
      },
      true_false: {
        correct: '判断正确。{explanation}',
        incorrect: '判断错误。{explanation}'
      },
      fill: {
        template: '正确答案是：{answer}。{explanation}'
      },
      code_analysis: {
        template: '代码执行结果：{answer}。{explanation}'
      },
      design: {
        template: '这是一个可行的解决方案。{explanation}'
      }
    };
  }

  /**
   * 生成解析
   * @param {object} question - 题目
   * @param {string} context - 上下文
   * @returns {string} 解析
   */
  generate(question, context = '') {
    const type = question.type;
    const template = this.templates[type] || this.templates.design;

    let explanation = '';

    // 根据题型生成解析
    switch (type) {
      case 'choice':
        explanation = this.generateChoiceExplanation(question);
        break;
      case 'true_false':
        explanation = this.generateTrueFalseExplanation(question);
        break;
      case 'fill':
        explanation = this.generateFillExplanation(question);
        break;
      case 'code_analysis':
        explanation = this.generateCodeExplanation(question);
        break;
      case 'design':
        explanation = this.generateDesignExplanation(question);
        break;
      default:
        explanation = '这道题考查了相关知识点的理解和应用。';
    }

    // 格式化输出
    return explanation;
  }

  /**
   * 生成选择题解析
   * @param {object} question - 题目
   * @returns {string} 解析
   */
  generateChoiceExplanation(question) {
    let explanation = '';

    // 解释正确答案
    explanation += `正确答案是 ${question.answer}。`;

    // 解释为什么正确
    if (question.knowledgePoints && question.knowledgePoints.length > 0) {
      explanation += ` 这道题考查了 ${question.knowledgePoints.join('、')}。`;
    } else {
      explanation += ' 这道题考查了对基本概念的理解。';
    }

    // 解释其他选项为什么错误（如果需要）
    if (question.options && question.options.length > 0) {
      explanation += '\n\n各选项分析：\n';
      question.options.forEach((opt, idx) => {
        const letter = String.fromCharCode(65 + idx);
        if (!opt.startsWith(question.answer)) {
          explanation += `- ${opt}：错误。`;
        }
      });
    }

    return explanation;
  }

  /**
   * 生成判断题解析
   * @param {object} question - 题目
   * @returns {string} 解析
   */
  generateTrueFalseExplanation(question) {
    let explanation = '';

    explanation += `判断${question.answer === '正确' ? '正确' : '错误'}。`;

    if (question.knowledgePoints && question.knowledgePoints.length > 0) {
      explanation += ` 这道题考查了 ${question.knowledgePoints.join('、')}。`;
    }

    return explanation;
  }

  /**
   * 生成填空题解析
   * @param {object} question - 题目
   * @returns {string} 解析
   */
  generateFillExplanation(question) {
    let explanation = '';

    explanation += `正确答案是：${question.answer}。`;

    if (question.knowledgePoints && question.knowledgePoints.length > 0) {
      explanation += ` 这道题考查了 ${question.knowledgePoints.join('、')}。`;
    }

    explanation += ' 需要牢记相关的知识点和概念。';

    return explanation;
  }

  /**
   * 生成代码分析题解析
   * @param {object} question - 题目
   * @returns {string} 解析
   */
  generateCodeExplanation(question) {
    let explanation = '';

    explanation += `代码的输出结果是：${question.answer}。\n\n`;

    if (question.code) {
      explanation += '代码执行分析：\n';
      explanation += '1. 代码逐行执行...\n';
      explanation += '2. 关键变量状态变化...\n';
      explanation += `3. 最终输出：${question.answer}\n`;
    }

    if (question.knowledgePoints && question.knowledgePoints.length > 0) {
      explanation += `\n这道题考查了 ${question.knowledgePoints.join('、')}。`;
    }

    return explanation;
  }

  /**
   * 生成设计题解析
   * @param {object} question - 题目
   * @returns {string} 解析
   */
  generateDesignExplanation(question) {
    let explanation = '';

    explanation += '这是一道开放性设计题，可以有多种解决方案。\n\n';

    if (question.answer) {
      explanation += '参考答案：\n';
      if (question.code) {
        explanation += `\`\`\`\n${question.code}\n\`\`\`\n\n`;
      } else {
        explanation += `${question.answer}\n\n`;
      }
    }

    explanation += '设计要点：\n';
    explanation += '1. 理解题目要求和约束条件\n';
    explanation += '2. 选择合适的数据结构和算法\n';
    explanation += '3. 考虑代码的可读性和可维护性\n';
    explanation += '4. 处理边界情况\n';

    if (question.knowledgePoints && question.knowledgePoints.length > 0) {
      explanation += `\n这道题综合考查了 ${question.knowledgePoints.join('、')}。`;
    }

    return explanation;
  }

  /**
   * 批量生成解析
   * @param {array} questions - 题目列表
   * @param {string} context - 上下文
   * @returns {Promise<array>} 带解析的题目
   */
  async generateAll(questions, context = '') {
    const promises = questions.map(q => ({
      ...q,
      explanation: this.generate(q, context)
    }));

    return promises;
  }
}

module.exports = { FeedbackGenerator };
