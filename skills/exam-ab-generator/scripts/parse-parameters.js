/**
 * Exam 参数解析脚本
 * 解析用户输入的试卷参数
 */

class ExamParameterParser {
  constructor() {
    this.courseNameRegex = /《(.+?)》|为(.+?)课程/;
    this.chapterRegex = /第?(\d+)[-~至](\d+)|第?(\d+)(?:,|和|及)(\d+)|第(\d+)章/g;
    this.examTypeRegex = /期末|期中|单元测试|月考|期考|考试/;
    this.totalScoreRegex = /(\d+)分|总分(\d+)/;
    this.durationRegex = /(\d+)(?:小时|分钟|min|hour|h)/;
    this.questionTypeRegex = /(选择|填空|简答|综合|编程|设计)题.*?(\d+)分/g;
    this.difficultyRegex = /简单|基础|中等|困难|难|容易/g;
  }

  /**
   * 解析用户输入
   * @param {string} input - 用户输入
   * @returns {object} 解析结果
   */
  parse(input) {
    return {
      courseName: this.extractCourseName(input),
      chapters: this.extractChapters(input),
      examType: this.extractExamType(input),
      totalScore: this.extractTotalScore(input),
      duration: this.extractDuration(input),
      questionTypes: this.extractQuestionTypes(input),
      difficulty: this.extractDifficulty(input),
      versions: this.extractVersions(input)
    };
  }

  /**
   * 提取课程名称
   */
  extractCourseName(input) {
    const match = input.match(this.courseNameRegex);
    return match ? (match[1] || match[2]).trim() : null;
  }

  /**
   * 提取章节范围
   */
  extractChapters(input) {
    const chapters = [];
    let match;
    
    while ((match = this.chapterRegex.exec(input)) !== null) {
      if (match[1] && match[2]) {
        // 范围：3-5
        for (let i = parseInt(match[1]); i <= parseInt(match[2]); i++) {
          chapters.push(i);
        }
      } else if (match[3] && match[4]) {
        // 多个章节：3,4
        chapters.push(parseInt(match[3]));
        chapters.push(parseInt(match[4]));
      } else if (match[5]) {
        // 单个章节：3
        chapters.push(parseInt(match[5]));
      }
    }

    return chapters.length > 0 ? chapters : null;
  }

  /**
   * 提取考试类型
   */
  extractExamType(input) {
    const match = input.match(this.examTypeRegex);
    return match ? match[0] : 'Final';
  }

  /**
   * 提取总分
   */
  extractTotalScore(input) {
    const match = input.match(this.totalScoreRegex);
    return match ? parseInt(match[1] || match[2]) : 100;
  }

  /**
   * 提取考试时长
   */
  extractDuration(input) {
    const match = input.match(this.durationRegex);
    if (match) {
      const value = parseInt(match[1]);
      const unit = input.substring(match.index, match.index + match[0].length);
      return unit.includes('小时') || unit.includes('hour') || unit.includes('h') 
        ? value * 60 
        : value;
    }
    return 120; // 默认120分钟
  }

  /**
   * 提取题型分布
   */
  extractQuestionTypes(input) {
    const types = [];
    let match;
    
    while ((match = this.questionTypeRegex.exec(input)) !== null) {
      types.push({
        type: match[1],
        score: parseInt(match[2])
      });
    }

    return types.length > 0 ? types : null;
  }

  /**
   * 提取难度
   */
  extractDifficulty(input) {
    const match = input.match(this.difficultyRegex);
    if (match) {
      const diff = match[0];
      if (diff.includes('简单') || diff.includes('基础') || diff.includes('容易')) {
        return 'easy';
      } else if (diff.includes('困难') || diff.includes('难')) {
        return 'hard';
      } else {
        return 'medium';
      }
    }
    return 'medium';
  }

  /**
   * 提取版本数量
   */
  extractVersions(input) {
    if (input.includes('AB') || input.includes('两卷') || input.includes('两份')) {
      return 2;
    }
    return 1;
  }
}

module.exports = { ExamParameterParser };

/**
 * 使用示例
 */
if (require.main === module) {
  const parser = new ExamParameterParser();
  const testInput = '为《Python程序设计》第3-5章生成期末试卷AB两卷，100分，2小时';
  
  const result = parser.parse(testInput);
  console.log('解析结果:');
  console.log(JSON.stringify(result, null, 2));
}
