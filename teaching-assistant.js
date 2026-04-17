/**
 * 智能教学助手 - Teaching Assistant
 *
 * 统一入口，整合所有教学相关功能：
 * - 试卷生成 (exam-ab-generator)
 * - 自测题生成 (quiz-generator)
 * - PPT生成 (ai-ppt-generator)
 * - 课程内容生成 (course-content-generator)
 * - 实验设计 (experiment-designer)
 * - 教学资料库管理
 * - 面向学生：课程答疑、知识点总结
 */

// 先加载 config.env
const { loadEnv } = require('./lib/config-loader');
loadEnv();

const { ExamABGenerator } = require('./skills/exam-ab-generator');
const { QuizGenerator } = require('./skills/quiz-generator');
const ExperimentDesigner = require('./skills/experiment-designer');
const { CourseContentGenerator } = require('./skills/course-content-generator');
const { DifyRetriever } = require('./lib/dify-retriever');
const { MaterialLoader } = require('./lib/material-loader');
const { LLMClient } = require('./lib/llm-client');
const { answerQuestion: courseQaAnswer, summarizeKnowledge: courseQaSummarize } = require('./lib/course-qa');
const { appendQALog } = require('./lib/learning-log');
const {
  loadLearningSummary,
  buildTeacherDashboardText,
  generateCourseFAQ,
  generateReminderPlan
} = require('./lib/teaching-admin');
const { getFAQAutoReply } = require('./lib/faq-auto-reply');
const { applyAutoReplyRules } = require('./lib/auto-reply-rules');
const { exec } = require('child_process');
const path = require('path');

/**
 * Promisified exec
 */
function execPromise(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/** 从环境变量解析默认 LLM 配置（优先 DeepSeek，其次火山方舟、智谱） */
function getDefaultLLMConfig() {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.VOLCENGINE_API_KEY || process.env.LLM_API_KEY || process.env.ZHIPU_API_KEY;
  const provider = process.env.LLM_PROVIDER || (process.env.DEEPSEEK_API_KEY ? 'deepseek' : (process.env.VOLCENGINE_API_KEY ? 'volcengine' : 'zhipu'));
  const model = process.env.LLM_MODEL || (provider === 'deepseek' ? 'deepseek-chat' : 'glm-4.7');
  return {
    provider,
    apiKey,
    model,
    timeout: parseInt(process.env.LLM_TIMEOUT || '180000', 10),
    extractChapterTimeout: parseInt(process.env.VOLCENGINE_EXTRACT_CHAPTER_TIMEOUT || process.env.LLM_EXTRACT_CHAPTER_TIMEOUT || '300000', 10)
  };
}

class TeachingAssistant {
  constructor(config = {}) {
    const defaults = getDefaultLLMConfig();
    this.llmConfig = {
      provider: config.provider ?? defaults.provider,
      apiKey: config.apiKey ?? defaults.apiKey,
      model: config.model ?? defaults.model,
      timeout: config.timeout ?? defaults.timeout,
      extractChapterTimeout: config.extractChapterTimeout != null
        ? config.extractChapterTimeout
        : defaults.extractChapterTimeout
    };

    // 初始化各个生成器，传递LLM配置与教材来源模式（Dify / 本地）
    // Dify 知识库按课程名自动选择（GET /datasets 匹配名称），只需配置 baseUrl 和 apiKey
    const difyRetriever = (process.env.DIFY_BASE_URL && process.env.DIFY_API_KEY)
      ? new DifyRetriever()
      : null;
    const useDify = process.env.USE_DIFY_KNOWLEDGE !== 'false';
    if (difyRetriever && difyRetriever.isConfigured()) {
      console.log('[TeachingAssistant] 教材来源: Dify 知识库已启用，步骤1 将先检索 Dify，不加载本地');
    } else {
      console.log('[TeachingAssistant] 教材来源: 本地 teaching-data（未配置 DIFY_BASE_URL/DIFY_API_KEY 或已关闭 USE_DIFY_KNOWLEDGE）');
    }

    this.examGenerator = new ExamABGenerator({ ...this.llmConfig, difyRetriever, useDify });
    this.quizGenerator = new QuizGenerator({ ...this.llmConfig, difyRetriever, useDify });
    this.experimentDesigner = new ExperimentDesigner({ llmConfig: this.llmConfig, difyRetriever, useDify });
    this.courseContentGenerator = new CourseContentGenerator({ llmConfig: this.llmConfig, difyRetriever, useDify });

    this.difyRetriever = difyRetriever;
    this.useDify = useDify;
    this.materialLoader = new MaterialLoader();
    this.llmClient = (this.llmConfig.apiKey
      ? new LLMClient({
          provider: this.llmConfig.provider,
          apiKey: this.llmConfig.apiKey,
          model: this.llmConfig.model,
          timeout: this.llmConfig.timeout,
          extractChapterTimeout: this.llmConfig.extractChapterTimeout
        })
      : null);
  }

  /**
   * 主入口：处理用户请求
   * @param {string} userInput - 用户输入
   * @returns {string} 处理结果
   */
  async process(userInput) {
    console.log('=== 智能教学助手 ===');
    console.log(`用户输入: ${userInput}\n`);

    // 分析用户意图
    const intent = this.detectIntent(userInput);

    console.log(`检测到意图: ${intent}\n`);

    try {
      switch (intent) {
        case 'generate_exam':
          return await this.handleExamGeneration(userInput);

        case 'generate_ppt':
          return await this.handlePPTGeneration(userInput);

        case 'generate_quiz':
          return await this.handleQuizGeneration(userInput);

        case 'design_experiment':
          return await this.handleExperimentDesign(userInput);

        case 'list_courses':
          return await this.handleListCourses();

        case 'generate_content':
          return await this.handleContentGeneration(userInput);

        case 'add_materials':
          return this.handleAddMaterials(userInput);

        case 'course_qa':
          return await this.handleCourseQA(userInput);

        case 'knowledge_summary':
          return await this.handleKnowledgeSummary(userInput);

        case 'learning_analytics':
          return await this.handleLearningAnalytics();

        case 'teacher_dashboard':
          return await this.handleTeacherDashboard();

        case 'generate_faq':
          return await this.handleGenerateFAQ(userInput);

        case 'reminder_plan':
          return await this.handleReminderPlan(userInput);

        case 'help':
          return this.showHelp();

        default:
          return `我不太确定您想做什么。您可以：
1. 生成试卷："为《Python程序设计》第3-5章生成期末试卷"
2. 生成自测题："为《Python程序设计》第3章生成自测题"
3. 设计实验："为《数据结构》第3章设计编程实验"
4. 生成PPT："为《数据结构》生成教学PPT"
5. 生成课程内容："为《Python程序设计》生成课程内容"
6. 查看课程："查看所有课程"
7. 添加资料："为《机器学习》添加教材"
8. 课程答疑："《人工智能引论》第3章 什么是搜索？"
9. 知识点总结："总结《人工智能引论》第5章知识点"
10. 学情分析："学情分析" 或 "生成学情报告"
11. 教师面板："教师管理面板"
12. 生成FAQ："为《数据结构》第3章生成常见问题FAQ"
13. 督学提醒："为《数据结构》生成定时督学提醒计划"
14. 获取帮助："帮助"`;
      }
    } catch (error) {
      console.error('处理失败:', error);
      return `处理请求时出错: ${error.message}`;
    }
  }

  /**
   * 检测用户意图
   * @param {string} input
   * @returns {string}
   */
  detectIntent(input) {
    const lower = input.toLowerCase();

    // 试卷生成意图
    if (/(生成|出|创建).*试卷|考试|测试|AB|A\/B|两卷/.test(input)) {
      return 'generate_exam';
    }

    // PPT生成意图
    if (/(生成|制作|创建).*PPT|课件|幻灯片/.test(input)) {
      return 'generate_ppt';
    }

    // 自测题生成意图
    if (/(生成|出|创建).*自测题|练习题|章节测试/.test(input)) {
      return 'generate_quiz';
    }

    // 实验设计意图
    if (/(设计|创建|生成).*实验|实验设计|实验案例|实验手册/.test(input) &&
        !/(怎么|如何|是什么意思|解释|请问|\?|？)/.test(input)) {
      return 'design_experiment';
    }

    // 课程内容生成意图（排在知识点总结之后，避免被误匹配）
    if (/(生成|创建).*课程内容|教学内容|课件内容|大纲|重点难点/.test(input) && !/PPT/.test(input)) {
      return 'generate_content';
    }

    // 知识点总结意图（面向学生复习）：总结+课程/章节/知识点/重点
    if (/(总结\s*[《「]|总结\s*第\s*\d+|总结.*知识点|知识点总结|第\s*\d+.*章.*(重点|要点)|(重点|要点)\s*(总结|归纳))/.test(input) &&
        !/(生成|创建).*课程内容|教学内容|课件内容|大纲/.test(input)) {
      return 'knowledge_summary';
    }

    // 教务自动回复/课程答疑意图（面向学生提问）
    // 覆盖两类问题：
    // 1) 知识问答：什么是/为什么/怎么/解释一下...
    // 2) 教务问询：截止时间/考试安排/课件资料...
    if (/答疑|请问|什么是|是什么|为什么|怎么|如何|是什么意思|解释一下|的定义/.test(input) &&
        (/\?|？|《|》|第\s*\d+\s*章/.test(input) || input.trim().length > 8)) {
      return 'course_qa';
    }
    if (/(什么时候|截止|提交时间|考试安排|考试时间|课件|讲义|教材|实验手册|资料)/.test(input) &&
        (/\?|？|《|》/.test(input) || input.trim().length > 6)) {
      return 'course_qa';
    }

    // 查看课程意图
    if (/查看.*课程|列出.*课程|有哪些课程/.test(input)) {
      return 'list_courses';
    }

    // 添加资料意图
    if (/(添加|导入|上传).*教材|资料|课件/.test(input)) {
      return 'add_materials';
    }

    // 学情分析（基于答疑记录与 OpenClaw 记忆）
    if (/学情分析|学情报告|答疑统计|学习分析/.test(input)) {
      return 'learning_analytics';
    }

    // 教师管理面板（基于学情摘要）
    if (/教师管理面板|教学管理面板|教师看板|dashboard|督学面板/.test(lower)) {
      return 'teacher_dashboard';
    }

    // FAQ 生成（用于群内自动回复）
    if (/(生成|创建|整理).*(常见问题|FAQ)|FAQ.*(生成|整理)|自动回复.*FAQ/.test(input)) {
      return 'generate_faq';
    }

    // 督学提醒计划（飞书/企微）
    if (/定时提醒|督学提醒|学习提醒|提醒计划|定时督学|提醒模板/.test(input)) {
      return 'reminder_plan';
    }

    // 帮助意图
    if (/帮助|help|怎么用|功能|功能列表/.test(lower)) {
      return 'help';
    }

    return 'unknown';
  }

  /**
   * 处理试卷生成请求
   * @param {string} input
   * @returns {string}
   */
  async handleExamGeneration(input) {
    console.log('【试卷生成】');

    // 解析课程名称
    const courseMatch = input.match(/(?:为|出|生成)\s*(?:《|「)(.+?)(?:》|」)/);
    if (!courseMatch) {
      return '请指定课程名称，例如："为《Python程序设计》生成试卷"';
    }

    const courseName = courseMatch[1].trim();
    console.log(`课程: ${courseName}`);

    try {
      const result = await this.examGenerator.generate(input, {});
      return result;
    } catch (error) {
      throw new Error(`试卷生成失败: ${error.message}`);
    }
  }

  /**
   * 处理PPT生成请求
   * @param {string} input
   * @returns {string}
   */
  async handlePPTGeneration(input) {
    console.log('【PPT生成】');

    // 解析课程名称和主题
    const courseMatch = input.match(/(?:为|给)(?:《|「)(.+?)(?:》|」)/);
    const topicMatch = input.match(/(?:为|生成|制作)(?:.*?)(?:《|「)?.*?(?:》|」)?.*?["\"](.+?)["\"]|主题[:：](.+)/);
    const courseName = courseMatch ? courseMatch[1].trim() : null;
    const topic = topicMatch ? (topicMatch[1] || topicMatch[2]) : null;

    // 生成PPT主题
    const pptTopic = topic || (courseName ? `${courseName}课程` : '教学课件');

    console.log(`PPT主题: ${pptTopic}`);
    console.log(`课程: ${courseName || '未指定'}`);

    // 检查是否需要选择模板
    const wantsStyle = /(选择|挑选|指定).*模板|模板.*风格/.test(input);

    if (wantsStyle) {
      return await this.handlePPTWithTemplate(pptTopic, courseName);
    } else {
      return await this.handlePPTAuto(pptTopic, courseName);
    }
  }

  /**
   * 自动选择模板生成PPT
   * @param {string} topic
   * @param {string} courseName
   * @returns {string}
   */
  async handlePPTAuto(topic, courseName) {
    console.log('使用智能模板选择...');

    // 尝试使用 CourseContentGenerator 生成详细内容
    let enrichedTopic = topic;
    let context = '';

    if (courseName) {
      try {
        // 使用 CourseContentGenerator 生成课程内容
        const courseContent = await this.courseContentGenerator.generateCourseContent({
          courseName,
          chapters: [], // 全部章节，后续可以从 topic 中解析
          contentType: 'courseware'
        });

        console.log(`已生成课程内容: ${courseContent.content.length} 字符`);

        // 构建 PPT 查询字符串
        enrichedTopic = this.courseContentGenerator.buildPPTQuery(courseContent);
        context = courseContent.content;
      } catch (error) {
        console.log(`课程内容生成失败: ${error.message}，回退到通用主题`);
        // 回退到旧的逻辑
        try {
          const { MaterialLoader } = require('./lib/material-loader');
          const loader = new MaterialLoader();
          const course = await loader.loadCourse(courseName);
          context = loader.buildContext(course, {
            includeOutline: true,
            includeKnowledge: true,
            maxLength: 5000
          });
          console.log(`已加载课程资料: ${context.length} 字符`);
          enrichedTopic = topic + '\n\n' + context.substring(0, 2000);
        } catch (fallbackError) {
          console.log(`课程资料加载失败: ${fallbackError.message}，使用通用主题`);
        }
      }
    }

    console.log(`最终 PPT 主题: ${enrichedTopic.substring(0, 100)}...`);

    // 调用Python脚本生成PPT
    const scriptPath = path.join(__dirname, 'skills', 'ai-ppt-generator', 'scripts', 'random_ppt_theme.py');
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    try {
      const { stdout, stderr } = await execPromise(
        `${pythonCmd} "${scriptPath}" --query "${enrichedTopic}"`,
        { timeout: 300000 } // 5分钟超时
      );

      if (stderr && stderr.includes('Error')) {
        throw new Error(stderr);
      }

      // 解析输出获取PPT URL
      const urlMatch = stdout.match(/"ppt_url":\s*"([^"]+)"/);
      if (urlMatch) {
        const pptUrl = urlMatch[1];
        return `✅ PPT生成完成！

**PPT信息**:
- 主题: ${topic}
- 模板: 自动选择（基于主题智能匹配）
${courseName ? `- 课程: ${courseName}` : ''}

**下载链接**:
${pptUrl}

提示: 您可以下载PPT后根据课程资料进行微调。`;
      }

      return `⏳ PPT正在生成中，请稍候...

输出信息: ${stdout}`;
    } catch (execError) {
      // Python执行失败，提供替代方案
      console.error('Python脚本执行失败:', execError);
      return `⚠️ PPT生成功能需要配置：

**要求：**
1. 安装 Python 3.x
2. 安装依赖库：\`pip install requests\`
3. 设置环境变量：\`BAIDU_API_KEY=你的百度API密钥\`

**获取API密钥：**
- 访问：https://cloud.baidu.com/product/wenxinworkshop
- 注册并开通"智能PPT生成"服务

**临时替代方案：**
您可以手动创建PPT框架，基于以下课程资料：
${context ? `\n\n${context.substring(0, 500)}...` : '\n（请先添加课程资料）'}
`;
    }
  }

  /**
   * 选择特定模板生成PPT
   * @param {string} topic
   * @param {string} courseName
   * @returns {string}
   */
  async handlePPTWithTemplate(topic, courseName) {
    console.log('列出可用模板...');

    // 获取可用模板列表
    const scriptPath = path.join(__dirname, 'skills', 'ai-ppt-generator', 'scripts', 'ppt_theme_list.py');
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    try {
      const { stdout } = await execPromise(
        `${pythonCmd} "${scriptPath}"`,
        { timeout: 60000 }
      );

      const templates = JSON.parse(stdout);

      // 格式化模板列表
    let templateList = '📋 **可用PPT模板**\n\n';
    templates.forEach((t, idx) => {
      templateList += `${idx + 1}. **${t.style_name}** (tpl_id: ${t.tpl_id})\n`;
      templateList += `   ${t.description || ''}\n\n`;
    });

      templateList += `\n请告诉我您想使用哪个模板的编号，例如："使用模板3"`;

      return templateList;
    } catch (execError) {
      console.error('Python脚本执行失败:', execError);
      return `⚠️ PPT模板列表需要配置：

**要求：**
1. 安装 Python 3.x
2. 安装依赖库：\`pip install requests\`
3. 设置环境变量：\`BAIDU_API_KEY=你的百度API密钥\`

**获取API密钥：**
- 访问：https://cloud.baidu.com/product/wenxinworkshop
- 注册并开通"智能PPT生成"服务

配置完成后，重新运行此命令即可查看模板列表。`;
    }
  }

  /**
   * 处理自测题生成请求
   * @param {string} input
   * @returns {string}
   */
  async handleQuizGeneration(input) {
    console.log('【自测题生成】');

    try {
      const result = await this.quizGenerator.generate(input, {});
      return result;
    } catch (error) {
      throw new Error(`自测题生成失败: ${error.message}`);
    }
  }

  /**
   * 处理实验设计请求
   * @param {string} input
   * @returns {string}
   */
  async handleExperimentDesign(input) {
    console.log('【实验设计】');

    // 解析参数
    const courseMatch = input.match(/(?:为|给)(?:《|「)(.+?)(?:》|」)/);
    const chapterMatch = input.match(/第(\d+)章/);
    const difficultyMatch = input.match(/(基础|进阶|综合)/);

    const courseName = courseMatch ? courseMatch[1].trim() : null;
    const chapters = chapterMatch ? [`第${chapterMatch[1]}章`] : [];
    const difficulty = difficultyMatch ? difficultyMatch[1] : null;

    // 解析语言
    let language = 'python';
    const languageMatch = input.match(/(python|c|cpp|java)/i);
    if (languageMatch) {
      language = languageMatch[1].toLowerCase();
    }

    if (!courseName) {
      return '请指定课程名称，例如："为《数据结构》第3章设计编程实验"';
    }

    try {
      const result = await this.experimentDesigner.designExperiment({
        courseName,
        chapters,
        difficulty,
        language
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      return `✅ 实验设计完成！

**实验信息：**
- 实验名称：${result.experiment.experimentTitle}
- 实验类型：${result.experiment.experimentType}
- 难度级别：${result.experiment.difficulty.name}
- 预计时间：${result.experiment.difficulty.timeEstimate}
- 知识点：${result.experiment.knowledgePoints.map(k => k.title).join('、')}

**实验目的：**
${result.experiment.objectives.map(obj => `- ${obj}`).join('\n')}

**实验要求：**
- 功能要求：${result.experiment.requirements.function.join('、')}
- 性能要求：${result.experiment.requirements.performance.join('、') || '无'}
- 提交要求：${result.experiment.requirements.submission.join('、')}

**输出文件：**
- 代码文件：${result.implementation.path}
- Markdown手册：${result.manuals.markdown.path}
- Word手册：${result.manuals.word.path}

**测试用例：** ${result.testCases.length} 个
**评分标准：** 总分 ${result.gradingCriteria.total} 分

提示：请查看输出目录中的详细文件内容。`;
    } catch (error) {
      throw new Error(`实验设计失败: ${error.message}`);
    }
  }

  /**
   * 处理课程内容生成请求
   * @param {string} input
   * @returns {string}
   */
  async handleContentGeneration(input) {
    console.log('【课程内容生成】');

    // 解析课程名称
    const courseMatch = input.match(/(?:为|给)(?:《|「)(.+?)(?:》|」)/);
    const courseName = courseMatch ? courseMatch[1].trim() : null;

    // 解析章节
    const chapterMatch = input.match(/第(\d+)章/);
    const chapters = chapterMatch ? [`第${chapterMatch[1]}章`] : [];

    // 解析内容类型
    let contentType = 'courseware'; // 默认
    if (/大纲|outline/.test(input)) {
      contentType = 'outline';
    } else if (/重点难点|keypoint/.test(input)) {
      contentType = 'keypoints';
    } else if (/总结|summary/.test(input)) {
      contentType = 'summary';
    } else if (/课件|courseware/.test(input)) {
      contentType = 'courseware';
    }

    if (!courseName) {
      return '请指定课程名称，例如："为《Python程序设计》生成课程内容"';
    }

    try {
      const courseContent = await this.courseContentGenerator.generateCourseContent({
        courseName,
        chapters,
        contentType
      });

      return `✅ 课程内容生成完成！

**内容信息：**
- 课程名称：${courseContent.courseName}
- 章节：${courseContent.chapters.join('、')}
- 内容类型：${courseContent.contentTypeName}
- 内容长度：${courseContent.content.length} 字符

**内容结构：**
\`\`\`json
${JSON.stringify(courseContent.structure, null, 2)}
\`\`\`

**内容预览（前500字符）：**
\`\`\`
${courseContent.content.substring(0, 500)}...
\`\`\`

**使用建议：**
1. 如果需要生成 PPT，可以将此内容传递给 PPT 生成器
2. 可以直接查看完整内容进行教学参考
3. 可以根据需要调整内容类型（courseware/outline/keypoints/summary）`;
    } catch (error) {
      throw new Error(`课程内容生成失败: ${error.message}`);
    }
  }

  /**
   * 处理列出课程请求
   * @returns {string}
   */
  async handleListCourses() {
    console.log('【列出课程】');

    const { MaterialLoader } = require('./lib/material-loader');
    const loader = new MaterialLoader();

    try {
      const courses = await loader.listCourses();

      if (courses.length === 0) {
        return '目前还没有课程资料。请先将教材放入 teaching-data/textbooks/ 目录。';
      }

      let result = '📚 **可用课程列表**\n\n';

      for (const courseName of courses) {
        try {
          const course = await loader.loadCourse(courseName);
          result += `### 《${courseName}》\n`;

          if (course.metadata) {
            result += `- 课程代码: ${course.metadata.courseCode || 'N/A'}\n`;
            result += `- 作者: ${course.metadata.author || 'N/A'}\n`;
            result += `- 章节: ${course.metadata.chapters || 'N/A'}\n`;
          }

          result += `- 教材: ${course.textbook ? '✅ 已添加' : '❌ 缺失'}\n`;
          result += `- 大纲: ${course.outline ? '✅ 已添加' : '❌ 缺失'}\n`;
          result += `- 课件: ${course.slides.length > 0 ? `✅ ${course.slides.length}个` : '❌ 缺失'}\n`;
          result += `- 案例: ${course.cases.length > 0 ? `✅ ${course.cases.length}个` : '❌ 缺失'}\n\n`;
        } catch (error) {
          result += `### ${courseName}\n❌ 加载失败: ${error.message}\n\n`;
        }
      }

      return result;
    } catch (error) {
      throw new Error(`获取课程列表失败: ${error.message}`);
    }
  }

  /**
   * 处理添加资料请求
   * @param {string} input
   * @returns {string}
   */
  handleAddMaterials(input) {
    console.log('【添加资料】');

    const courseMatch = input.match(/(?:为|给)(?:《|「)(.+?)(?:》|」)/);
    const courseName = courseMatch ? courseMatch[1].trim() : null;

    let result = '📂 **添加教学资料**\n\n';

    if (courseName) {
      result += `目标课程: 《${courseName}》\n\n`;
    }

    result += `请按照以下步骤操作：\n\n`;

    result += `### 步骤1：创建课程目录\n`;
    result += `\`\`\`\nteaching-data/textbooks/${courseName || '课程名'}/\n\`\`\`\n\n`;

    result += `### 步骤2：添加教材文件\n`;
    result += `将教材文件放入目录，支持格式：\n`;
    result += `- textbook.md（推荐）\n`;
    result += `- textbook.txt\n`;
    result += `- textbook.pdf（计划支持）\n\n`;

    result += `### 步骤3：添加课程资料（可选）\n`;
    result += `在 teaching-data/course-materials/${courseName || '课程名'}/ 下添加：\n`;
    result += `- slides/（课件）\n`;
    result += `- notes/（讲义）\n`;
    result += `- cases/（案例）\n\n`;

    result += `### 步骤4：测试\n`;
    result += `运行以下命令验证：\n`;
    result += `\`\`\`bash\nnode lib/test-material-loader.js\n\`\`\`\n\n`;

    result += `📖 详细指南: 查看 teaching-data/QUICKSTART.md`;

    return result;
  }

  /**
   * 从用户输入中解析课程名、章节、学生问题（用于答疑）
   */
  _parseCourseChapterQuestion(input) {
    const courseMatch = input.match(/《([^》]+)》/);
    const courseName = courseMatch ? courseMatch[1].trim() : null;
    const chapterMatch = input.match(/第\s*(\d+)(?:\s*[-~至]\s*(\d+))?\s*章/);
    let chapters = null;
    if (chapterMatch) {
      const start = parseInt(chapterMatch[1], 10);
      const end = chapterMatch[2] ? parseInt(chapterMatch[2], 10) : start;
      chapters = [];
      for (let i = start; i <= end; i++) chapters.push(i);
    }
    let question = input
      .replace(/《[^》]+》/g, '')
      .replace(/第\s*\d+(?:\s*[-~至]\s*\d+)?\s*章/g, '')
      .replace(/^(答疑|请问|解释一下)[:：]?\s*/i, '')
      .trim();
    return { courseName, chapters, question };
  }

  /**
   * 解析学生上下文（优先环境变量，其次从输入中提取轻量标识）
   * 支持：
   * - STUDENT_ID / STUDENT_CHANNEL / CLASS_ID
   * - 文本中包含 “学生ID:xxx” “班级:xxx” 的简易标识
   */
  _parseStudentContext(input) {
    const envStudentId = process.env.STUDENT_ID || process.env.OPENCLAW_STUDENT_ID;
    const envChannel = process.env.STUDENT_CHANNEL || process.env.OPENCLAW_STUDENT_CHANNEL;
    const envClassId = process.env.CLASS_ID || process.env.OPENCLAW_CLASS_ID;

    const text = String(input || '');
    const studentMatch = text.match(/学生(?:ID|编号)?[:：]\s*([A-Za-z0-9_-]+)/i);
    const classMatch = text.match(/班级[:：]\s*([A-Za-z0-9_\-\u4e00-\u9fa5]+)/i);
    const channelMatch = text.match(/渠道[:：]\s*(wecom|feishu|qq|web|cli)/i);

    return {
      studentId: (envStudentId || (studentMatch && studentMatch[1]) || 'unknown-student').trim(),
      channel: (envChannel || (channelMatch && channelMatch[1]) || 'unknown-channel').trim(),
      classId: (envClassId || (classMatch && classMatch[1]) || 'unknown-class').trim()
    };
  }

  /**
   * 处理课程答疑（面向学生）
   */
  async handleCourseQA(input) {
    console.log('【课程答疑】');
    let { courseName, chapters, question } = this._parseCourseChapterQuestion(input);
    // 未带《》时：用本地课程列表推断课程名（确保从本地 teaching-data 读教材）
    if (!courseName) {
      const courses = await this.materialLoader.listCourses();
      const trimmed = input.replace(/^(你好|您好)[，,]?\s*/i, '').trim();
      for (const c of courses) {
        if (trimmed.startsWith(c) || trimmed.includes(c + '的') || trimmed.includes(c + ' ')) {
          courseName = c;
          question = trimmed.replace(c, '').replace(/^[的\s，,]+/, '').trim() || trimmed;
          break;
        }
      }
    }
    if (!courseName) {
      return '请说明是哪门课程，例如：《数据结构》数据结构的定义是什么？ 或 数据结构 数据结构的定义是什么？';
    }
    if (!question || question.length < 2) {
      return '请写出你的具体问题，例如：《人工智能引论》第3章 什么是盲目搜索？';
    }
    try {
      const studentContext = this._parseStudentContext(input);
      const ruleDecision = await applyAutoReplyRules({ courseName, question });
      if (ruleDecision.handled && ruleDecision.reply) {
        const chapterList = (Array.isArray(chapters) ? chapters : (chapters ? [chapters] : [])).filter(Boolean);
        appendQALog(courseName, chapterList.length ? chapterList : null, question, studentContext).catch(() => {});
        return `${ruleDecision.reply}\n\n（命中规则：${ruleDecision.matchedRuleId}）`;
      }
      const faqReply = await getFAQAutoReply(courseName, question);
      if (faqReply && faqReply.answer) {
        const chapterList = (Array.isArray(chapters) ? chapters : (chapters ? [chapters] : [])).filter(Boolean);
        appendQALog(courseName, chapterList.length ? chapterList : null, question, studentContext).catch(() => {});
        return `【FAQ自动回复】\n${faqReply.answer}\n\n（匹配问题：${faqReply.matchedQuestion}）`;
      }
      if (!this.llmClient) {
        return '当前未配置 LLM，未命中规则/FAQ，无法继续智能答疑。请在 config.env 中配置 DEEPSEEK_API_KEY 或 VOLCENGINE_API_KEY。';
      }
      const answer = await courseQaAnswer({
        materialLoader: this.materialLoader,
        difyRetriever: this.difyRetriever,
        useDify: this.useDify,
        llmClient: this.llmClient,
        courseName,
        chapters,
        question
      });
      // 学情记录：写入 learning-logs/qa.jsonl，并可选写一行到 memory/YYYY-MM-DD.md（OpenClaw 记忆）
      const chapterList = (Array.isArray(chapters) ? chapters : (chapters ? [chapters] : [])).filter(Boolean);
      appendQALog(courseName, chapterList.length ? chapterList : null, question, studentContext).catch(() => {});
      if (ruleDecision.escalatedToAI && ruleDecision.reply) {
        return `${ruleDecision.reply}\n\n【智能答疑补充】\n${answer}`;
      }
      return answer;
    } catch (e) {
      console.error('课程答疑失败:', e);
      return `答疑时出错: ${e.message}`;
    }
  }

  /**
   * 处理知识点总结（面向学生复习）
   */
  async handleKnowledgeSummary(input) {
    console.log('【知识点总结】');
    if (!this.llmClient) {
      return '当前未配置 LLM，无法生成知识点总结。请在 config.env 中配置 DEEPSEEK_API_KEY 或 VOLCENGINE_API_KEY。';
    }
    const courseMatch = input.match(/《([^》]+)》|总结\s*([^\s第]+?)(?:\s*第|\s*知识点|$)/);
    const courseName = courseMatch ? (courseMatch[1] || courseMatch[2] || '').trim() : null;
    const chapterMatch = input.match(/第\s*(\d+)(?:\s*[-~至]\s*(\d+))?\s*章/);
    let chapters = null;
    if (chapterMatch) {
      const start = parseInt(chapterMatch[1], 10);
      const end = chapterMatch[2] ? parseInt(chapterMatch[2], 10) : start;
      chapters = [];
      for (let i = start; i <= end; i++) chapters.push(i);
    }
    if (!courseName) {
      return '请说明课程名称，例如：总结《人工智能引论》第5章知识点';
    }
    try {
      const summary = await courseQaSummarize({
        materialLoader: this.materialLoader,
        difyRetriever: this.difyRetriever,
        useDify: this.useDify,
        llmClient: this.llmClient,
        courseName,
        chapters
      });
      return summary;
    } catch (e) {
      console.error('知识点总结失败:', e);
      return `生成总结时出错: ${e.message}`;
    }
  }

  /**
   * 生成课程FAQ（供飞书/企微群内自动回复）
   */
  async handleGenerateFAQ(input) {
    console.log('【FAQ生成】');
    if (!this.llmClient) {
      return '当前未配置 LLM，无法生成FAQ。请在 config.env 中配置 DEEPSEEK_API_KEY 或 VOLCENGINE_API_KEY。';
    }

    let { courseName, chapters } = this._parseCourseChapterQuestion(input);
    if (!courseName) {
      const courseMatch = input.match(/(?:为|给|针对)(?:《|「)(.+?)(?:》|」)/);
      if (courseMatch) courseName = courseMatch[1].trim();
    }
    if (!courseName) {
      return '请指定课程，例如：为《数据结构》第3章生成常见问题FAQ';
    }

    try {
      const result = await generateCourseFAQ({
        materialLoader: this.materialLoader,
        difyRetriever: this.difyRetriever,
        useDify: this.useDify,
        llmClient: this.llmClient,
        courseName,
        chapters
      });
      const preview = result.faqs.slice(0, 3).map((f, idx) => `${idx + 1}. Q: ${f.q}`).join('\n');
      return `✅ FAQ生成完成（${result.scope}）\n\n` +
        `- JSON文件：${result.jsonPath.replace(path.join(__dirname, ''), '').replace(/^[\\/]/, '')}\n` +
        `- Markdown文件：${result.mdPath.replace(path.join(__dirname, ''), '').replace(/^[\\/]/, '')}\n\n` +
        `可将该FAQ用于飞书/企微群内自动回复。预览：\n${preview}`;
    } catch (e) {
      console.error('FAQ生成失败:', e);
      return `FAQ生成失败: ${e.message}`;
    }
  }

  /**
   * 生成督学提醒计划（飞书/企微）
   */
  async handleReminderPlan(input) {
    console.log('【督学提醒计划】');
    let courseName = null;
    const courseMatch = input.match(/《([^》]+)》|(?:为|给)\s*([^\s，。]+)\s*(?:生成|制定)?\s*(?:定时)?(?:督学|学习)?提醒/);
    if (courseMatch) {
      courseName = (courseMatch[1] || courseMatch[2] || '').trim();
    }

    let summary = null;
    const { summary: loadedSummary } = await loadLearningSummary();
    summary = loadedSummary;
    if (!summary) {
      await this.handleLearningAnalytics();
      const latest = await loadLearningSummary();
      summary = latest.summary;
    }

    const weakForCourse = (summary && Array.isArray(summary.weakChapters))
      ? summary.weakChapters.filter(w => !courseName || w.course === courseName)
      : [];
    const targetCourse = courseName || (summary && summary.weakChapters && summary.weakChapters[0] ? summary.weakChapters[0].course : '本课程');

    try {
      const { jsonPath, mdPath } = await generateReminderPlan({
        courseName: targetCourse,
        weakChapters: weakForCourse,
        profileSummary: summary
      });
      return `✅ 已生成飞书/企业微信督学提醒计划\n\n` +
        `- 计划JSON：${jsonPath.replace(path.join(__dirname, ''), '').replace(/^[\\/]/, '')}\n` +
        `- 提醒模板：${mdPath.replace(path.join(__dirname, ''), '').replace(/^[\\/]/, '')}\n\n` +
        `你可以将 JSON 中的 cron 配置接入 OpenClaw cron，并把模板消息绑定到飞书/企微渠道。`;
    } catch (e) {
      console.error('生成提醒计划失败:', e);
      return `提醒计划生成失败: ${e.message}`;
    }
  }

  /**
   * 教师管理面板（文本视图）
   */
  async handleTeacherDashboard() {
    console.log('【教师管理面板】');
    const { summaryPath, summary } = await loadLearningSummary();
    if (!summary) {
      await this.handleLearningAnalytics();
    }
    const latest = await loadLearningSummary();
    const dashboardText = buildTeacherDashboardText(latest.summary);
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const reportPath = `output/reports/学情分析-${today}.html`;
    return `${dashboardText}\n\n` +
      `数据来源：${summaryPath.replace(path.join(__dirname, ''), '').replace(/^[\\/]/, '')}\n` +
      `可视化报告：${reportPath}`;
  }

  /**
   * 学情分析：基于 learning-logs/qa.jsonl 与 OpenClaw 记忆生成可视化报告（ECharts HTML）
   */
  async handleLearningAnalytics() {
    console.log('【学情分析】');
    const scriptPath = path.join(__dirname, 'scripts', 'learning-analytics-report.js');
    try {
      const { stdout, stderr } = await execPromise(`node "${scriptPath}"`, { cwd: path.join(__dirname) });
      if (stderr) console.warn(stderr);
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const reportPath = `output/reports/学情分析-${date}.html`;
      return `✅ 学情分析报告已生成。\n\n` +
        `**说明**：基于课程答疑记录（learning-logs/qa.jsonl）与 OpenClaw 每日记忆中的学情条目统计，包含各课程提问次数、每日趋势、章节分布等图表。\n\n` +
        `**报告路径**：${reportPath}\n\n` +
        `请用浏览器打开该 HTML 文件查看 ECharts 可视化。若暂无答疑记录，报告中会提示「多使用课程答疑后再次生成」。`;
    } catch (e) {
      console.error('学情分析失败:', e);
      return `学情分析报告生成失败: ${e.message}`;
    }
  }

  /**
   * 显示帮助信息
   * @returns {string}
   */
  showHelp() {
    return `🤖 **智能教学助手 - 帮助**\n\n
**可用功能：**\n\n

### 1️⃣ 试卷生成 📝
基于实际课程资料生成试卷A/B两卷

\`\`\`
为《Python程序设计》第3-5章生成期末试卷，100分，2小时，AB两卷
\`\`\`

**特性：**
- ✅ 基于教材内容出题
- ✅ 支持章节筛选
- ✅ 自定义题型分布
- ✅ 自动生成参考答案

---

### 2️⃣ 自测题生成 📋
生成带难度分级和详细解析的自测题

\`\`\`
为《Python程序设计》第3章生成自测题，基础10题、进阶10题、挑战5题
\`\`\`

**特性：**
- ✅ 基于教材内容生成
- ✅ 难度分级（基础/进阶/挑战）
- ✅ 详细解析
- ✅ 多种输出格式（MD/HTML/JSON）

---

### 3️⃣ PPT生成 📑
使用AI智能生成教学PPT，基于课程资料自动生成内容

\`\`\`
为《数据结构》生成教学PPT
为《Python程序设计》第3章生成PPT
\`\`\`

**特性：**
- ✅ 智能模板选择（商务/科技/教育/简约等）
- ✅ 基于课程资料自动生成内容
- ✅ 支持按章节生成
- ✅ 多种风格可选

---

### 4️⃣ 课程内容生成 📚
生成详细的课程内容，用于教学参考

\`\`\`
为《数据结构》生成课程内容
\`\`\`

**特性：**
- ✅ 教学大纲生成
- ✅ 知识点详解
- ✅ 重点难点总结
- ✅ 章节内容概述

---

### 5️⃣ 实验设计 🧪
设计实验案例并生成实验手册

\`\`\`
为《数据结构》第3章设计编程实验，难度进阶
\`\`\`

**特性：**
- ✅ 智能实验规划
- ✅ 自动生成示例代码
- ✅ 输出Markdown + Word手册
- ✅ 生成测试用例和评分标准

---

### 6️⃣ 课程管理 📚
查看和管理课程资料

\`\`\`
查看所有课程
\`\`\`

**特性：**
- ✅ 列出所有课程
- ✅ 显示资料完整度
- ✅ 快速访问

---

### 7️⃣ 添加资料 📂
添加新的课程资料

\`\`\`
为《机器学习》添加教材
\`\`\`

---

### 8️⃣ 课程答疑 💬（面向学生）
根据教材内容回答学生问题

\`\`\`
《人工智能引论》第3章 什么是盲目搜索？
请问反向传播是什么意思？
\`\`\`

**特性：**
- ✅ 基于教材/Dify 知识库作答
- ✅ 可指定课程与章节
- ✅ 只依据教材，不编造

---

### 9️⃣ 知识点总结 📋（面向学生复习）
提炼章节或整门课的知识点

\`\`\`
总结《人工智能引论》第5章知识点
《人工智能引论》第3章重点总结
\`\`\`

**特性：**
- ✅ 基于教材/Dify 知识库
- ✅ 条理清晰，便于复习
- ✅ 可指定章节或整门课

---

### 🔟 学情分析 📊（基于 OpenClaw 记忆与答疑记录）
根据课程答疑记录生成学情报告（ECharts 可视化）

\`\`\`
学情分析
生成学情报告
答疑统计
\`\`\`

**特性：**
- ✅ 每次答疑自动写入 learning-logs/qa.jsonl，并可选写入 memory/YYYY-MM-DD.md（OpenClaw 记忆）
- ✅ 报告含各课程提问次数、每日趋势、章节分布等图表
- ✅ 输出 HTML：output/reports/学情分析-YYYYMMDD.html

---

### 1️⃣1️⃣ 教师管理面板 🧭
基于学情摘要查看高频课程与薄弱章节

\`\`\`
教师管理面板
教学管理面板
\`\`\`

---

### 1️⃣2️⃣ FAQ 自动回复 📌
生成常见问题库，用于群内自动回复

\`\`\`
为《数据结构》第3章生成常见问题FAQ
\`\`\`

---

### 1️⃣3️⃣ 督学提醒计划 ⏰
生成飞书/企微定时督学提醒模板与计划

\`\`\`
为《人工智能引论》生成定时督学提醒计划
\`\`\`

---

### 1️⃣4️⃣ 教务规则自动回复 🧩
按关键词触发教务模板回复，复杂问题自动升级到 AI 答疑

\`\`\`
《数据结构》作业什么时候截止？
《数据结构》实验手册怎么用？
\`\`\`

---

**技术支持：**
- 教学资料库系统: teaching-data/
- 快速开始: teaching-data/QUICKSTART.md
- 系统文档: docs/teaching-data-system.md

**提示：** 所有功能都基于您的实际课程资料工作！`;
  }
}

module.exports = { TeachingAssistant, getDefaultLLMConfig };

/**
 * 直接运行示例
 * node teaching-assistant.js "为《Python程序设计》生成试卷"
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  const userInput = args.join(' ') || '帮助';

  // 从环境变量读取 LLM 配置（默认优先 DeepSeek）
  const assistant = new TeachingAssistant(getDefaultLLMConfig());

  assistant.process(userInput)
    .then(result => {
      console.log('\n=== 处理结果 ===\n');
      console.log(result);
    })
    .catch(error => {
      console.error('\n=== 错误 ===\n');
      console.error(error.message);
      process.exit(1);
    });
}
