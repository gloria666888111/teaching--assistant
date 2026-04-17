/**
 * Quiz Generator - 自测题生成器
 *
 * 基于教材内容生成带难度分级和详细解析的自测题
 */

const { MaterialLoader } = require('../../lib/material-loader');
const { LLMClient } = require('../../lib/llm-client');
const { getContextForChapters } = require('../../lib/semantic-context');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class QuizGenerator {
  constructor(config = {}) {
    this.materialLoader = new MaterialLoader();
    this.llmClient = new LLMClient({
      provider: config.provider || 'deepseek',
      apiKey: config.apiKey,
      model: config.model || 'deepseek-chat',
      timeout: config.timeout || 180000,
      extractChapterTimeout: config.extractChapterTimeout
    });
    this.difyRetriever = config.difyRetriever || null;
    this.useDify = config.useDify !== false;
  }

  /**
   * 主入口：生成自测题
   * @param {string} userInput - 用户输入
   * @param {object} options - 配置选项
   * @returns {string} 处理结果
   */
  async generate(userInput, options = {}) {
    console.log('=== Quiz Generator ===');
    console.log(`用户输入: ${userInput}\n`);

    try {
      // 步骤1: 解析用户输入
      const params = this.parseInput(userInput);
      console.log(`解析结果:`, params);

      // 步骤2: 解析课程与上下文（统一由 semantic-context 解析：Dify 用知识库，否则本地 loadCourse）
      console.log('\n[步骤1/6] 解析课程与知识上下文...');
      const { context, course } = await getContextForChapters({
        materialLoader: this.materialLoader,
        llmClient: this.llmClient,
        courseName: params.courseName,
        chapters: params.chapters,
        difyRetriever: this.difyRetriever,
        useDify: this.useDify,
        maxFullLength: 40000,
        maxContextLength: 8000,
        buildContextOptions: { includeOutline: true, includeKnowledge: false }
      });
      if (this.useDify && this.difyRetriever?.isConfigured()) {
        console.log(`从 Dify 知识库获取内容`);
      }
      console.log(`✓ 课程: ${course.name}，上下文长度: ${context.length} 字符`);

      // 步骤5: 生成题目
      console.log(`\n[步骤3/6] 生成题目...`);
      const questions = await this.generateQuestions(params, context);
      console.log(`✓ 已生成 ${questions.total} 道题目`);

      // 步骤6: 生成解析
      console.log(`\n[步骤4/6] 生成解析...`);
      const questionsWithExplanation = await this.generateExplanations(questions);
      console.log(`✓ 已生成解析`);

      // 步骤7: 导出文件
      console.log(`\n[步骤6/6] 导出文件...`);
      const files = await this.exportQuiz(params.courseName, params.chapters, questionsWithExplanation, params.formats, { course });
      console.log(`✓ 文件已保存`);

      // 返回结果
      return this.formatResult(params, questionsWithExplanation, files);

    } catch (error) {
      console.error('生成失败:', error);
      throw new Error(`自测题生成失败: ${error.message}`);
    }
  }

  /**
   * 解析用户输入
   * @param {string} input
   * @returns {object} 解析参数
   */
  parseInput(input) {
    const params = {
      courseName: null,
      chapters: null,
      difficulties: {
        basic: 0,
        advanced: 0,
        challenge: 0
      },
      types: ['choice', 'true_false', 'fill', 'code_analysis', 'design'],
      formats: ['md', 'json']
    };

    // 解析课程名称
    const courseMatch = input.match(/(?:为|给)(?:《|「)(.+?)(?:》|」)/);
    if (courseMatch) {
      params.courseName = courseMatch[1].trim();
    }

    // 解析章节
    const chapterMatch = input.match(/第(\d+)(?:-(\d+))?章/);
    if (chapterMatch) {
      const start = parseInt(chapterMatch[1]);
      const end = chapterMatch[2] ? parseInt(chapterMatch[2]) : start;
      params.chapters = [];
      for (let i = start; i <= end; i++) {
        params.chapters.push(i);
      }
    }

    // 解析基础题数量
    const basicMatch = input.match(/基础(\d+)题|basic\s*(\d+)/i);
    if (basicMatch) {
      params.difficulties.basic = parseInt(basicMatch[1] || basicMatch[2]) || 10;
    } else if (!/进阶|挑战|advanced|challenge/i.test(input)) {
      // 默认基础题
      params.difficulties.basic = 10;
    }

    // 解析进阶题数量
    const advancedMatch = input.match(/进阶(\d+)题|advanced\s*(\d+)/i);
    if (advancedMatch) {
      params.difficulties.advanced = parseInt(advancedMatch[1] || advancedMatch[2]) || 10;
    }

    // 解析挑战题数量
    const challengeMatch = input.match(/挑战(\d+)题|challenge\s*(\d+)/i);
    if (challengeMatch) {
      params.difficulties.challenge = parseInt(challengeMatch[1] || challengeMatch[2]) || 5;
    }

    // 解析题型
    if (input.includes('选择题') && !input.includes('和')) {
      params.types = ['choice'];
    } else if (input.includes('判断题')) {
      params.types = ['true_false'];
    } else if (input.includes('填空题')) {
      params.types = ['fill'];
    } else if (input.includes('代码分析题')) {
      params.types = ['code_analysis'];
    } else if (input.includes('设计题')) {
      params.types = ['design'];
    }

    // 解析输出格式
    if (input.includes('HTML') || input.includes('html')) {
      params.formats.push('html');
    }
    if (input.includes('JSON') || input.includes('json')) {
      params.formats.push('json');
    }

    return params;
  }

  /**
   * 生成题目（模拟）
   * @param {object} params - 参数
   * @param {string} context - 上下文
   * @returns {object} 题目
   */
  async generateQuestions(params, context) {
    const questions = {
      basic: [],
      advanced: [],
      challenge: []
    };

    console.log('[LLM] 正在使用火山方舟生成题目...');

    try {
      // 生成基础题
      if (params.difficulties.basic > 0) {
        console.log(`[LLM] 生成${params.difficulties.basic}道基础题...`);
        questions.basic = await this.llmClient.generateQuestions(context, {
          count: params.difficulties.basic,
          types: params.types,
          difficulty: 'basic',
          chapters: params.chapters
        });
        console.log(`[LLM] ✓ 已生成${questions.basic.length}道基础题`);
      }

      // 生成进阶题
      if (params.difficulties.advanced > 0) {
        console.log(`[LLM] 生成${params.difficulties.advanced}道进阶题...`);
        questions.advanced = await this.llmClient.generateQuestions(context, {
          count: params.difficulties.advanced,
          types: params.types,
          difficulty: 'advanced',
          chapters: params.chapters
        });
        console.log(`[LLM] ✓ 已生成${questions.advanced.length}道进阶题`);
      }

      // 生成挑战题
      if (params.difficulties.challenge > 0) {
        console.log(`[LLM] 生成${params.difficulties.challenge}道挑战题...`);
        questions.challenge = await this.llmClient.generateQuestions(context, {
          count: params.difficulties.challenge,
          types: params.types,
          difficulty: 'challenge',
          chapters: params.chapters
        });
        console.log(`[LLM] ✓ 已生成${questions.challenge.length}道挑战题`);
      }

      questions.total = questions.basic.length + questions.advanced.length + questions.challenge.length;
      console.log(`[LLM] ✓ 总计生成${questions.total}道题目`);

    } catch (error) {
      console.error('[LLM] 生成题目失败:', error);
      throw new Error(`LLM生成题目失败: ${error.message}`);
    }

    return questions;
  }

  /**
   * 创建单个题目（模拟）
   * @param {string} difficulty - 难度
   * @param {array} types - 题型
   * @param {number} index - 索引
   * @returns {object} 题目
   */
  createQuestion(difficulty, types, index) {
    const type = types[index % types.length];

    const questions = {
      choice: {
        content: '这是第' + index + '道选择题。',
        options: ['A. 选项一', 'B. 选项二', 'C. 选项三', 'D. 选项四'],
        answer: 'A'
      },
      true_false: {
        content: '这是第' + index + '道判断题。',
        answer: '正确'
      },
      fill: {
        content: '这是第' + index + '道填空题，答案是______。',
        answer: '答案'
      },
      code_analysis: {
        content: '这是第' + index + '道代码分析题。',
        code: 'print("Hello World")',
        answer: 'Hello World'
      },
      design: {
        content: '这是第' + index + '道设计题。',
        answer: '这是设计题的答案。'
      }
    };

    return {
      id: index,
      type: type,
      difficulty: difficulty,
      ...questions[type],
      explanation: '这是' + (difficulty === 'basic' ? '基础' : difficulty === 'advanced' ? '进阶' : '挑战') + '题的解析。'
    };
  }

  /**
   * 生成解析（题目已包含解析）
   * @param {object} questions - 题目
   * @returns {object} 带解析的题目
   */
  async generateExplanations(questions) {
    // LLM已经生成了详细的解析，直接返回
    console.log('[LLM] 题目已包含详细解析');
    return questions;
  }

  /**
   * 导出文件
   * @param {string} courseName - 课程名
   * @param {array} chapters - 章节
   * @param {object} questions - 题目
   * @param {array} formats - 格式
   * @returns {object} 文件路径
   */
  async exportQuiz(courseName, chapters, questions, formats, opts = {}) {
    const files = {};
    const date = new Date().toISOString().split('T')[0];
    const chapterStr = chapters ? chapters.join('-') : 'all';
    const course = opts.course || null;

    // 创建输出目录
    const outputDir = path.join(__dirname, '../../output/quizzes', courseName);
    await fs.mkdir(outputDir, { recursive: true });

    const baseFileName = `第${chapterStr}章-${date}`;

    // 导出 Markdown
    if (formats.includes('md')) {
      const mdPath = path.join(outputDir, `${baseFileName}-完整版.md`);
      const mdContent = this.generateMarkdown(courseName, chapterStr, questions, { course, chapters });
      await fs.writeFile(mdPath, mdContent, 'utf-8');
      files.md = mdPath;

      // 分别导出各难度
      if (questions.basic.length > 0) {
        const basicPath = path.join(outputDir, `${baseFileName}-基础题.md`);
        await fs.writeFile(basicPath, this.generateMarkdownByDifficulty(courseName, chapterStr, questions, 'basic', { course, chapters }), 'utf-8');
      }
      if (questions.advanced.length > 0) {
        const advancedPath = path.join(outputDir, `${baseFileName}-进阶题.md`);
        await fs.writeFile(advancedPath, this.generateMarkdownByDifficulty(courseName, chapterStr, questions, 'advanced', { course, chapters }), 'utf-8');
      }
      if (questions.challenge.length > 0) {
        const challengePath = path.join(outputDir, `${baseFileName}-挑战题.md`);
        await fs.writeFile(challengePath, this.generateMarkdownByDifficulty(courseName, chapterStr, questions, 'challenge', { course, chapters }), 'utf-8');
      }
    }

    // 导出 HTML
    if (formats.includes('html')) {
      const htmlPath = path.join(outputDir, `${baseFileName}-交互式.html`);
      const htmlContent = this.generateHTML(courseName, chapterStr, questions);
      await fs.writeFile(htmlPath, htmlContent, 'utf-8');
      files.html = htmlPath;
    }

    // 导出 JSON
    if (formats.includes('json')) {
      const jsonPath = path.join(outputDir, `${baseFileName}-数据.json`);
      const jsonContent = this.generateJSON(courseName, chapterStr, questions);
      await fs.writeFile(jsonPath, jsonContent, 'utf-8');
      files.json = jsonPath;
    }

    return files;
  }

  /**
   * 生成 Markdown 格式
   * @param {string} courseName - 课程名
   * @param {string} chapterStr - 章节号串，如 "3" 或 "3-5"
   * @param {object} questions - 题目
   * @param {object} [opts] - { course, chapters } 用于章节信息（作者、章节标题）
   * @returns {string} Markdown 内容
   */
  generateMarkdown(courseName, chapterStr, questions, opts = {}) {
    const { course, chapters } = opts;
    const author = course?.metadata?.author || '—';
    const chapterLabel = this.formatChapterLabel(chapterStr, chapters, course);

    let md = `# 《${courseName}》第${chapterStr}章 自测题\n\n`;
    md += `## 章节信息\n`;
    md += `- **课程：** ${courseName}\n`;
    md += `- **章节：** ${chapterLabel}\n`;
    md += `- **作者：** ${author}\n\n`;
    md += `生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`;

    // 基础题
    if (questions.basic.length > 0) {
      md += `## 基础题（${questions.basic.length}题）\n\n`;
      md += this.generateQuestionsMarkdown(questions.basic);
      md += `\n`;
    }

    // 进阶题
    if (questions.advanced.length > 0) {
      md += `## 进阶题（${questions.advanced.length}题）\n\n`;
      md += this.generateQuestionsMarkdown(questions.advanced);
      md += `\n`;
    }

    // 挑战题
    if (questions.challenge.length > 0) {
      md += `## 挑战题（${questions.challenge.length}题）\n\n`;
      md += this.generateQuestionsMarkdown(questions.challenge);
      md += `\n`;
    }

    // 参考答案
    md += `## 参考答案与解析\n\n`;
    md += this.generateAnswersMarkdown(questions);

    return md;
  }

  /**
   * 生成题目 Markdown
   * @param {array} questions - 题目列表
   * @returns {string} Markdown
   */
  generateQuestionsMarkdown(questions) {
    return questions.map((q, idx) => {
      let md = `${idx + 1}. ${q.content}\n`;

      if (q.type === 'choice' && q.options) {
        q.options.forEach(opt => {
          md += `   ${opt}\n`;
        });
      }

      if (q.type === 'code_analysis' && q.code) {
        md += `   \`\`\`python\n${q.code}\n   \`\`\`\n`;
      }

      return md + '\n';
    }).join('');
  }

  /**
   * 生成答案 Markdown
   * @param {object} questions - 题目
   * @returns {string} Markdown
   */
  generateAnswersMarkdown(questions) {
    let md = '';

    ['basic', 'advanced', 'challenge'].forEach(difficulty => {
      if (questions[difficulty].length > 0) {
        md += `### ${difficulty === 'basic' ? '基础' : difficulty === 'advanced' ? '进阶' : '挑战'}题答案\n\n`;

        questions[difficulty].forEach((q, idx) => {
          md += `${idx + 1}. 答案：${q.answer}\n`;
          md += `   难度：${q.difficulty === 'basic' ? '基础' : q.difficulty === 'advanced' ? '进阶' : '挑战'}\n`;
          md += `   解析：${q.explanation}\n\n`;
        });
      }
    });

    return md;
  }

  /**
   * 从大纲中解析章节标题，得到「第N章 标题」展示
   * @param {string} chapterStr - 如 "3" 或 "3-5"
   * @param {array} [chapters] - 如 [3]
   * @param {object} [course] - 含 outline 时尝试解析
   * @returns {string} 如 "第3章 搜索探寻与问题求解" 或 "第3章"
   */
  formatChapterLabel(chapterStr, chapters, course) {
    const single = Array.isArray(chapters) && chapters.length === 1 ? chapters[0] : (chapterStr && !String(chapterStr).includes('-') ? parseInt(chapterStr, 10) : null);
    if (single && course?.outline) {
      const m = course.outline.match(new RegExp(`第\\s*${single}\\s*章\\s*([^\\n]+)`));
      if (m && m[1]) return `第${single}章 ${m[1].trim()}`;
    }
    return chapterStr ? `第${chapterStr}章` : '全课程';
  }

  /**
   * 按难度生成 Markdown
   */
  generateMarkdownByDifficulty(courseName, chapterStr, questions, difficulty, opts = {}) {
    const { course, chapters } = opts;
    const author = course?.metadata?.author || '—';
    const chapterLabel = this.formatChapterLabel(chapterStr, chapters, course);

    const qs = questions[difficulty];
    const diffTitle = difficulty === 'basic' ? '基础' : difficulty === 'advanced' ? '进阶' : '挑战';
    let md = `# 《${courseName}》第${chapterStr}章 - ${diffTitle}题\n\n`;
    md += `## 章节信息\n`;
    md += `- **课程：** ${courseName}\n`;
    md += `- **章节：** ${chapterLabel}\n`;
    md += `- **作者：** ${author}\n\n`;
    md += `生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += this.generateQuestionsMarkdown(qs);
    md += `\n## 参考答案\n\n`;
    md += qs.map((q, idx) => {
      return `${idx + 1}. 答案：${q.answer}\n   解析：${q.explanation}\n`;
    }).join('\n\n');

    return md;
  }

  /**
   * 生成 HTML 格式
   * @param {string} courseName - 课程名
   * @param {string} chapterStr - 章节
   * @param {object} questions - 题目
   * @returns {string} HTML
   */
  generateHTML(courseName, chapterStr, questions) {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>《${courseName}》第${chapterStr}章 自测题</title>
    <style>
        body {
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #2196F3;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #2196F3;
        }
        .question {
            margin-bottom: 25px;
            padding: 15px;
            background: #f9f9f9;
            border-left: 4px solid #2196F3;
            border-radius: 4px;
        }
        .question-content {
            font-size: 16px;
            margin-bottom: 10px;
            font-weight: 500;
        }
        .options {
            margin: 10px 0 10px 20px;
        }
        .option {
            margin: 5px 0;
            padding: 5px 10px;
            cursor: pointer;
            border-radius: 4px;
            transition: background 0.2s;
        }
        .option:hover {
            background: #e3f2fd;
        }
        .code-block {
            background: #263238;
            color: #aed581;
            padding: 15px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            margin: 10px 0;
            overflow-x: auto;
        }
        .answer-toggle {
            margin-top: 15px;
        }
        .toggle-btn {
            background: #2196F3;
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
        }
        .toggle-btn:hover {
            background: #1976D2;
        }
        .answer {
            display: none;
            margin-top: 15px;
            padding: 15px;
            background: #fff3e0;
            border-left: 4px solid #ff9800;
            border-radius: 4px;
        }
        .answer.show {
            display: block;
        }
        .answer-label {
            font-weight: bold;
            color: #e65100;
        }
        .explanation {
            margin-top: 10px;
            color: #666;
            line-height: 1.6;
        }
        .difficulty-tag {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            margin-left: 10px;
        }
        .difficulty-basic { background: #c8e6c9; color: #2e7d32; }
        .difficulty-advanced { background: #fff9c4; color: #f57f17; }
        .difficulty-challenge { background: #ffcdd2; color: #c62828; }
        .footer {
            text-align: center;
            color: #999;
            margin-top: 30px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>《${courseName}》第${chapterStr}章 自测题</h1>
        <p style="text-align: center; color: #666; margin-bottom: 30px;">
            生成时间: ${new Date().toLocaleString('zh-CN')}
        </p>
        ${this.generateQuestionsHTML(questions)}
        <div class="footer">
            <p>点击"查看答案"可查看答案与详细解析</p>
        </div>
    </div>
    <script>
        function toggleAnswer(btn) {
            const answerDiv = btn.nextElementSibling;
            answerDiv.classList.toggle('show');
            btn.textContent = answerDiv.classList.contains('show') ? '隐藏答案' : '查看答案';
        }
    </script>
</body>
</html>`;

    return html;
  }

  /**
   * 生成题目 HTML
   * @param {object} questions - 题目
   * @returns {string} HTML
   */
  generateQuestionsHTML(questions) {
    let html = '';

    const sections = [
      { key: 'basic', title: '基础题', color: 'difficulty-basic' },
      { key: 'advanced', title: '进阶题', color: 'difficulty-advanced' },
      { key: 'challenge', title: '挑战题', color: 'difficulty-challenge' }
    ];

    sections.forEach(section => {
      if (questions[section.key].length > 0) {
        html += `<div class="section">\n`;
        html += `  <div class="section-title">${section.title}（${questions[section.key].length}题）</div>\n`;
        html += questions[section.key].map((q, idx) => {
          let qHtml = `  <div class="question">\n`;
          qHtml += `    <div class="question-content">${idx + 1}. ${q.content}`;
          qHtml += `      <span class="difficulty-tag ${section.color}">${section.title.replace('题', '')}</span>\n`;
          qHtml += `    </div>\n`;

          if (q.type === 'choice' && q.options) {
            qHtml += `    <div class="options">\n`;
            q.options.forEach(opt => {
              qHtml += `      <div class="option">${opt}</div>\n`;
            });
            qHtml += `    </div>\n`;
          }

          if (q.type === 'code_analysis' && q.code) {
            qHtml += `    <div class="code-block">${q.code}</div>\n`;
          }

          qHtml += `    <div class="answer-toggle">\n`;
          qHtml += `      <button class="toggle-btn" onclick="toggleAnswer(this)">查看答案</button>\n`;
          qHtml += `      <div class="answer">\n`;
          qHtml += `        <div class="answer-label">答案：${q.answer}</div>\n`;
          qHtml += `        <div class="explanation">${q.explanation}</div>\n`;
          qHtml += `      </div>\n`;
          qHtml += `    </div>\n`;
          qHtml += `  </div>\n`;

          return qHtml;
        }).join('');
        html += `</div>\n`;
      }
    });

    return html;
  }

  /**
   * 生成 JSON 格式
   * @param {string} courseName - 课程名
   * @param {string} chapterStr - 章节
   * @param {object} questions - 题目
   * @returns {string} JSON
   */
  generateJSON(courseName, chapterStr, questions) {
    const allQuestions = [];

    ['basic', 'advanced', 'challenge'].forEach(difficulty => {
      questions[difficulty].forEach(q => {
        allQuestions.push({
          id: q.id,
          type: q.type,
          difficulty: q.difficulty,
          course: courseName,
          chapter: chapterStr,
          content: q.content,
          ...(q.options && { options: q.options }),
          ...(q.code && { code: q.code }),
          answer: q.answer,
          explanation: q.explanation
        });
      });
    });

    return JSON.stringify({
      course: courseName,
      chapter: chapterStr,
      generateTime: new Date().toISOString(),
      totalQuestions: questions.total,
      questions: allQuestions
    }, null, 2);
  }

  /**
   * 格式化结果
   * @param {object} params - 参数
   * @param {object} questions - 题目
   * @param {object} files - 文件
   * @returns {string} 结果
   */
  formatResult(params, questions, files) {
    let result = `✅ 自测题生成完成\n\n`;

    result += `**自测题信息**:\n`;
    result += `- 课程: ${params.courseName}\n`;
    result += `- 章节: ${params.chapters ? params.chapters.join('-') : '全部'}\n\n`;

    result += `**题目分布**:\n`;
    result += `- 基础题: ${questions.basic.length}题\n`;
    result += `- 进阶题: ${questions.advanced.length}题\n`;
    result += `- 挑战题: ${questions.challenge.length}题\n`;
    result += `- 总计: ${questions.total}题\n\n`;

    result += `**题型**:\n`;
    const typeMap = {
      choice: '选择题',
      true_false: '判断题',
      fill: '填空题',
      code_analysis: '代码分析题',
      design: '设计题'
    };
    result += params.types.map(t => `- ${typeMap[t] || t}\n`).join('');

    result += `\n**输出文件**:\n`;
    if (files.md) {
      result += `- Markdown: ${files.md}\n`;
    }
    if (files.html) {
      result += `- HTML: ${files.html}\n`;
    }
    if (files.json) {
      result += `- JSON: ${files.json}\n`;
    }

    result += `\n**需要调整吗？** (难度/数量/题型)`;

    return result;
  }
}

module.exports = { QuizGenerator };

// CLI 入口：支持 node index.js --course "课程名" --chapter "章节" [--basic N] [--advanced N] [--challenge N]
function parseArg(name) {
  const i = process.argv.indexOf(name);
  if (i === -1 || !process.argv[i + 1]) return null;
  return process.argv[i + 1];
}
function parseArgInt(name, def) {
  const v = parseArg(name);
  return v != null ? parseInt(v, 10) : def;
}

if (require.main === module) {
  const { getDefaultLLMConfig } = require('../../teaching-assistant');
  const { loadEnv } = require('../../lib/config-loader');
  loadEnv();
  const llm = getDefaultLLMConfig();
  if (!llm.apiKey) {
    console.error('错误: 请在 config.env 中配置 DEEPSEEK_API_KEY（推荐）或 VOLCENGINE_API_KEY');
    process.exit(1);
  }
  const { provider, apiKey, model } = llm;

  const course = parseArg('--course');
  const chapter = parseArg('--chapter');
  if (!course || !chapter) {
    console.error('用法: node index.js --course "课程名" --chapter "章节" [--basic N] [--advanced N] [--challenge N]');
    process.exit(1);
  }
  const basic = parseArgInt('--basic', 10);
  const advanced = parseArgInt('--advanced', 5);
  const challenge = parseArgInt('--challenge', 3);
  let userInput = `为《${course}》第${chapter}章生成自测题`;
  if (basic || advanced || challenge) {
    userInput += `，基础${basic}题、进阶${advanced}题、挑战${challenge}题`;
  }
  const generator = new QuizGenerator(llm);
  generator.generate(userInput).then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
