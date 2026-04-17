/**
 * Exam AB Generator - 试卷生成技能（A/B两卷）
 * 基于实际课程资料生成试卷
 */

const { MaterialLoader } = require('../../lib/material-loader');
const { LLMClient } = require('../../lib/llm-client');
const { getContextForChapters } = require('../../lib/semantic-context');
const fs = require('fs').promises;
const path = require('path');

class ExamABGenerator {
  constructor(config = {}) {
    this.materialLoader = new MaterialLoader();
    this.llmClient = new LLMClient({
      provider: config.provider || 'volcengine',
      apiKey: config.apiKey,
      model: config.model || 'deepseek-chat',
      timeout: config.timeout || 180000,
      extractChapterTimeout: config.extractChapterTimeout
    });
    this.difyRetriever = config.difyRetriever || null;
    this.useDify = config.useDify !== false;
    this.outputDir = path.join(__dirname, '..', '..', 'output', 'exams');
  }

  /**
   * 主入口：处理用户请求
   * @param {string} userInput - 用户输入
   * @param {object} options - 选项
   */
  async generate(userInput, options = {}) {
    console.log('=== Exam AB Generator ===');
    console.log(`用户输入: ${userInput}`);

    // 1. 解析用户请求
    const params = this.parseRequest(userInput);
    console.log('解析结果:', params);

    // 2. 解析课程与上下文（统一由 semantic-context 解析）
    console.log('\n[步骤1/5] 解析课程与知识上下文...');
    const { context, course } = await getContextForChapters({
      materialLoader: this.materialLoader,
      llmClient: this.llmClient,
      courseName: params.courseName,
      chapters: params.chapters,
      difyRetriever: this.difyRetriever,
      useDify: this.useDify,
      maxFullLength: 40000,
      maxContextLength: 30000,
      buildContextOptions: { includeKnowledge: true, includeNotes: true }
    });
    if (this.useDify && this.difyRetriever?.isConfigured()) {
      console.log(`从 Dify 知识库获取内容`);
    }
    console.log(`✓ 课程: ${course.name}，上下文长度: ${context.length} 字符`);

    // 3. 生成A卷
    console.log(`\n[步骤2/5] 生成A卷...`);
    const examA = await this.generateExamPaper(params, context, 'A');

    // 6. 生成B卷（如果需要）
    let examB = null;
    if (params.versions >= 2) {
      console.log(`\n[步骤3/5] 生成B卷...`);
      examB = await this.generateExamPaper(params, context, 'B', examA);
    }

    // 5. 保存文件
    console.log(`\n[步骤4/5] 保存试卷文件...`);
    await this.saveResults(params, examA, examB, context);

    // 6. 返回结果
    return this.formatResult(params, examA, examB);
  }

  /**
   * 解析用户请求
   * @param {string} userInput
   * @returns {object} 参数对象
   */
  parseRequest(userInput) {
    const params = {
      courseName: '未命名课程',
      chapters: null,
      examType: '期末考试',
      totalScore: 100,
      duration: 120,
      difficulty: '中等',
      versions: 1,
      questionTypes: null // 用户指定的题型分布
    };

    // 提取课程名称
    const courseMatch = userInput.match(/(?:为|出|生成)\s*(?:《|「)(.+?)(?:》|」)/);
    if (courseMatch) {
      params.courseName = courseMatch[1].trim();
    }

    // 提取章节范围
    const chapterMatch = userInput.match(/第?(\d+)[-~至](\d+)(?:章|讲)/);
    if (chapterMatch) {
      params.chapters = `${chapterMatch[1]}-${chapterMatch[2]}`;
    }

    // 提取试卷类型
    const typeMatch = userInput.match(/(期末|期中|单元|模拟|月考|周测)(?:考试|测试)/);
    if (typeMatch) {
      params.examType = typeMatch[1] + '考试';
    }

    // 提取总分
    const scoreMatch = userInput.match(/(\d+)\s*分/);
    if (scoreMatch) {
      params.totalScore = parseInt(scoreMatch[1]);
    }

    // 提取考试时长
    const durationMatch = userInput.match(/(\d+)\s*(?:分钟|小时)/);
    if (durationMatch) {
      params.duration = parseInt(durationMatch[1]);
      if (userInput.includes('小时')) {
        params.duration *= 60;
      }
    }

    // 提取难度
    const difficultyMatch = userInput.match(/(简单|中等|困难|难|易)/);
    if (difficultyMatch) {
      const level = difficultyMatch[1];
      params.difficulty = level === '易' ? '简单' : (level === '难' ? '困难' : level);
    }

    // 检测A/B卷需求
    if (/AB|A\/B|两卷|两份/.test(userInput)) {
      params.versions = 2;
    }

    // 解析题型分布（如果有）
    const typePatterns = [
      { name: 'choice', regex: /(?:选择|单选)(?:题)?\s*(\d+)\s*分/, type: '单选题' },
      { name: 'multiChoice', regex: /(?:多选)(?:题)?\s*(\d+)\s*分/, type: '多选题' },
      { name: 'fill', regex: /(?:填空)(?:题)?\s*(\d+)\s*分/, type: '填空题' },
      { name: 'short', regex: /(?:简答|问答)(?:题)?\s*(\d+)\s*分/, type: '简答题' },
      { name: 'comprehensive', regex: /(?:综合|应用|编程)(?:题)?\s*(\d+)\s*分/, type: '综合题' }
    ];

    const distribution = {};
    typePatterns.forEach(({ name, regex, type }) => {
      const match = userInput.match(regex);
      if (match) {
        distribution[name] = {
          type,
          score: parseInt(match[1])
        };
      }
    });

    if (Object.keys(distribution).length > 0) {
      params.questionTypes = distribution;
    }

    return params;
  }

  /**
   * 加载课程资料
   * @param {string} courseName
   * @returns {object}
   */
  async loadCourseData(courseName) {
    try {
      const course = await this.materialLoader.loadCourse(courseName);

      // 检查是否有可用资料
      const hasContent = course.textbook || course.outline || course.knowledge ||
                         course.slides.length > 0 || course.notes.length > 0;

      if (!hasContent) {
        throw new Error(`课程"${courseName}"没有可用的资料。请将教材文件放入 teaching-data/textbooks/${courseName}/ 目录`);
      }

      return course;
    } catch (error) {
      throw new Error(`加载课程资料失败: ${error.message}`);
    }
  }

  /**
   * 生成试卷（调用LLM）
   * @param {object} params - 试卷参数
   * @param {string} context - 课程资料上下文
   * @param {string} version - 试卷版本（A或B）
   * @param {object} excludeExam - 需要排除的试卷（用于B卷去重）
   * @returns {object} 试卷对象
   */
  async generateExamPaper(params, context, version, excludeExam = null) {
    const distribution = this.determineDistribution(params);
    const prompt = this.buildPrompt(params, context, version, distribution, excludeExam);

    // 调用LLM生成试卷
    // 注意：这里需要集成实际的LLM调用
    // 暂时返回模拟数据用于演示

    console.log(`[LLM] 调用LLM生成${version}卷...`);
    const response = await this.callLLM(prompt);

    // 解析LLM响应
    const exam = this.parseExamResponse(response, params, version, distribution);

    return exam;
  }

  /**
   * 确定题型分布
   * @param {object} params
   * @returns {array}
   */
  determineDistribution(params) {
    // 如果用户指定了题型分布，使用用户的
    if (params.questionTypes) {
      const result = [];
      for (const [name, info] of Object.entries(params.questionTypes)) {
        result.push({
          name: info.type,
          type: name,
          score: info.score,
          count: this.estimateQuestionCount(name, info.score)
        });
      }
      return result;
    }

    // 使用默认分布
    const total = params.totalScore;
    return [
      { name: '单选题', type: 'choice', score: total * 0.3, count: 15 },
      { name: '多选题', type: 'multiChoice', score: total * 0.2, count: 5 },
      { name: '填空题', type: 'fill', score: total * 0.2, count: 10 },
      { name: '简答题', type: 'short', score: total * 0.2, count: 4 },
      { name: '综合题', type: 'comprehensive', score: total * 0.1, count: 1 }
    ].map(q => ({
      ...q,
      perQuestionScore: Math.round(q.score / q.count * 100) / 100
    }));
  }

  /**
   * 估算题目数量
   * @param {string} type - 题型
   * @param {number} totalScore - 总分
   * @returns {number} 题目数量
   */
  estimateQuestionCount(type, totalScore) {
    const scoresPerQuestion = {
      choice: 2,
      multiChoice: 4,
      fill: 2,
      short: 5,
      comprehensive: 10
    };

    const scorePerQuestion = scoresPerQuestion[type] || 5;
    return Math.max(1, Math.round(totalScore / scorePerQuestion));
  }

  /**
   * 构建LLM提示词
   * @param {object} params
   * @param {string} context
   * @param {string} version
   * @param {array} distribution
   * @param {object} excludeExam
   * @returns {string}
   */
  buildPrompt(params, context, version, distribution, excludeExam) {
    let prompt = `你是一位专业的教师，需要为课程"${params.courseName}"生成一份${version}卷试卷。\n\n`;

    prompt += `【试卷要求】\n`;
    prompt += `- 试卷类型: ${params.examType}\n`;
    prompt += `- 总分: ${params.totalScore}分\n`;
    prompt += `- 考试时间: ${params.duration}分钟\n`;
    prompt += `- 难度: ${params.difficulty}\n\n`;

    prompt += `【题型分布】\n`;
    distribution.forEach((q, idx) => {
      prompt += `${idx + 1}. ${q.name}: ${q.count}题 × ${q.perQuestionScore}分 = ${q.score}分\n`;
    });
    prompt += '\n';

    if (excludeExam) {
      prompt += `【重要】\n`;
      prompt += `这是B卷，题目必须与A卷不同，但覆盖相同的知识点，难度相当。\n`;
      prompt += `避免使用A卷中的相似题目或变体。\n\n`;
    }

    prompt += `【课程资料】\n`;
    prompt += `${context}\n\n`;

    prompt += `【输出格式】\n`;
    prompt += `请严格按照以下格式输出试卷内容（使用Markdown）：\n\n`;
    prompt += `## 一、单选题（每题${distribution.find(q => q.type === 'choice')?.perQuestionScore || 2}分，共${distribution.find(q => q.type === 'choice')?.score || 30}分）\n\n`;
    prompt += `1. 题目内容（  ）\n`;
    prompt += `   A. 选项A\n`;
    prompt += `   B. 选项B\n`;
    prompt += `   C. 选项C\n`;
    prompt += `   D. 选项D\n`;
    prompt += `   [答案: A]\n\n`;

    prompt += `## 二、多选题（每题${distribution.find(q => q.type === 'multiChoice')?.perQuestionScore || 4}分，共${distribution.find(q => q.type === 'multiChoice')?.score || 20}分）\n\n`;
    prompt += `1. 题目内容（ ）\n`;
    prompt += `   A. 选项A\n`;
    prompt += `   B. 选项B\n`;
    prompt += `   C. 选项C\n`;
    prompt += `   D. 选项D\n`;
    prompt += `   E. 选项E\n`;
    prompt += `   [答案: AB]\n\n`;

    prompt += `## 三、填空题（每题${distribution.find(q => q.type === 'fill')?.perQuestionScore || 2}分，共${distribution.find(q => q.type === 'fill')?.score || 20}分）\n\n`;
    prompt += `1. 题目内容 __________。\n`;
    prompt += `   [答案: 答案内容]\n\n`;

    prompt += `## 四、简答题（每题${distribution.find(q => q.type === 'short')?.perQuestionScore || 5}分，共${distribution.find(q => q.type === 'short')?.score || 20}分）\n\n`;
    prompt += `1. 题目内容\n`;
    prompt += `   [答案: 参考答案]\n\n`;

    prompt += `## 五、综合题（每题${distribution.find(q => q.type === 'comprehensive')?.perQuestionScore || 10}分，共${distribution.find(q => q.type === 'comprehensive')?.score || 10}分）\n\n`;
    prompt += `1. 题目内容\n`;
    prompt += `   [答案: 参考答案]\n\n`;

    return prompt;
  }

  /**
   * 调用LLM（模拟）
   * @param {string} prompt
   * @returns {string}
   */
  async callLLM(prompt) {
    try {
      console.log('[LLM] 正在使用火山方舟生成试卷...');
      const response = await this.llmClient.chat(prompt, {
        systemPrompt: '你是一位专业的教师，擅长生成高质量的考试试卷。请严格按照要求输出Markdown格式的试卷。',
        temperature: 0.7,
        maxTokens: 5000
      });
      console.log('[LLM] ✓ 试卷生成完成');
      return response;
    } catch (error) {
      console.error('[LLM] 生成试卷失败:', error);
      throw new Error(`LLM生成试卷失败: ${error.message}`);
    }
  }

  /**
   * 解析LLM响应
   * @param {string} response
   * @param {object} params
   * @param {string} version
   * @param {array} distribution
   * @returns {object}
   */
  parseExamResponse(response, params, version, distribution) {
    // TODO: 实现实际的解析逻辑
    // 这里返回模拟数据
    return {
      version,
      course: params.courseName,
      chapters: params.chapters || '全部',
      examType: params.examType,
      totalScore: params.totalScore,
      duration: params.duration,
      difficulty: params.difficulty,
      distribution,
      content: response,
      questions: this.extractQuestions(response, distribution)
    };
  }

  /**
   * 从响应中提取题目
   * @param {string} response
   * @param {array} distribution
   * @returns {array}
   */
  extractQuestions(response, distribution) {
    // TODO: 实现实际的题目提取逻辑
    return [];
  }

  /**
   * 保存结果
   * @param {object} params
   * @param {object} examA
   * @param {object} examB
   * @param {string} context
   */
  async saveResults(params, examA, examB, context) {
    const courseDir = path.join(this.outputDir, params.courseName);

    // 创建目录
    await fs.mkdir(courseDir, { recursive: true });

    const timestamp = new Date().toISOString().slice(0, 10);

    // 保存A卷
    const examAPath = path.join(courseDir, `${params.examType}-A-${timestamp}.md`);
    await fs.writeFile(examAPath, this.renderExamMarkdown(examA), 'utf-8');
    console.log(`✓ A卷已保存: ${examAPath}`);

    // 保存B卷
    if (examB) {
      const examBPath = path.join(courseDir, `${params.examType}-B-${timestamp}.md`);
      await fs.writeFile(examBPath, this.renderExamMarkdown(examB), 'utf-8');
      console.log(`✓ B卷已保存: ${examBPath}`);
    }

    // 保存参考答案
    const answersPath = path.join(courseDir, `${params.examType}-answers-${timestamp}.md`);
    await fs.writeFile(answersPath, this.renderAnswersMarkdown(examA, examB), 'utf-8');
    console.log(`✓ 参考答案已保存: ${answersPath}`);

    // 保存上下文（用于调试）
    const contextPath = path.join(courseDir, `${params.examType}-context-${timestamp}.md`);
    await fs.writeFile(contextPath, `# 生成试卷使用的课程资料\n\n${context}`, 'utf-8');
  }

  /**
   * 渲染试卷Markdown
   * @param {object} exam
   * @returns {string}
   */
  renderExamMarkdown(exam) {
    return `# ${exam.course} - ${exam.examType}试卷（${exam.version}卷）

**考试时间**: ${exam.duration}分钟  |  **总分**: ${exam.totalScore}分
**考试日期**: ${new Date().toLocaleDateString('zh-CN')}

**注意事项**:
1. 请在答题卡上作答
2. 题目未注明可使用外部库时，请使用标准库

---

${exam.content}

---

**考试结束，请检查是否漏题**
`;
  }

  /**
   * 渲染参考答案Markdown
   * @param {object} examA
   * @param {object} examB
   * @returns {string}
   */
  renderAnswersMarkdown(examA, examB) {
    let md = `# ${examA.course} - ${examA.examType}参考答案\n\n`;

    md += `## A卷参考答案\n\n`;
    md += `[A卷答案内容待LLM生成]\n\n`;

    if (examB) {
      md += `## B卷参考答案\n\n`;
      md += `[B卷答案内容待LLM生成]\n\n`;
    }

    return md;
  }

  /**
   * 格式化返回结果
   * @param {object} params
   * @param {object} examA
   * @param {object} examB
   * @returns {string}
   */
  formatResult(params, examA, examB) {
    const timestamp = new Date().toISOString().slice(0, 10);
    const courseDir = `output/exams/${params.courseName}`;

    let result = `✅ 试卷生成完成\n\n`;
    result += `**试卷信息**:\n`;
    result += `- 课程: ${params.courseName}\n`;
    result += `- 章节: ${params.chapters || '全部'}\n`;
    result += `- 试卷类型: ${params.examType}\n`;
    result += `- 总分: ${params.totalScore}分\n`;
    result += `- 考试时间: ${params.duration}分钟\n\n`;

    result += `**题型分布**:\n`;
    examA.distribution.forEach((q, idx) => {
      result += `- ${q.name}: ${q.count}题 × ${q.perQuestionScore}分 = ${q.score}分\n`;
    });

    result += `\n**输出文件**:\n`;
    result += `- A卷: ${courseDir}/${params.examType}-A-${timestamp}.md\n`;
    if (examB) {
      result += `- B卷: ${courseDir}/${params.examType}-B-${timestamp}.md\n`;
    }
    result += `- 参考答案: ${courseDir}/${params.examType}-answers-${timestamp}.md\n`;

    result += `\n**需要调整吗？** (题型分布/难度/题目替换)`;

    return result;
  }

  /**
   * 模拟考试响应
   * @returns {string}
   */
  getMockExamResponse() {
    return `## 一、单选题（每题2分，共30分）

1. Python中用于输出的是（ ）
   A. print()    B. output()   C. write()   D. echo()
   [答案: A]

2. 下列哪个不是Python的基本数据类型（ ）
   A. int       B. str        C. array     D. float
   [答案: C]

3. Python中定义列表使用（ ）
   A. {}        B. []         C. ()        D. <>
   [答案: B]

---

## 二、多选题（每题4分，共20分）

1. 以下哪些是Python的内置数据结构？（ ）
   A. 列表      B. 元组       C. 字典      D. 集合
   [答案: ABCD]

---

## 三、填空题（每题2分，共20分）

1. Python中布尔类型的两个值是 \`True\` 和 \`False\`。
   [答案: True, False]

2. 列表的索引从 \`0\` 开始。
   [答案: 0]

---

## 四、简答题（每题5分，共20分）

1. 简述列表和元组的区别。
   [答案: 列表是可变的，元组是不可变的。列表用[]定义，元组用()定义。]

---

## 五、综合题（每题10分，共10分）

1. 编写一个函数，判断一个数是否为素数。
   [答案: 实现略]
`;
  }
}

module.exports = { ExamABGenerator };
