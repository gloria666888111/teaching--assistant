/**
 * LLM Client - 大语言模型客户端
 *
 * 支持多种LLM提供商：
 * - DeepSeek（默认推荐）- OpenAI 兼容 API
 * - 火山方舟 (Volcengine / 豆包等)
 * - 智谱AI (GLM-4)（已弃用，可保留兼容）
 * - OpenAI (GPT-4)
 */

const https = require('https');

class LLMClient {
  constructor(config = {}) {
    this.provider = config.provider || 'deepseek'; // deepseek, volcengine, zhipu, openai
    this.apiKey = config.apiKey;
    this.model = config.model || 'deepseek-chat';
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout || 120000; // 默认 120 秒，生成题目/试卷可能较慢
    /** 语义抽章单次请求超时（毫秒），可在 config.env 用 VOLCENGINE_EXTRACT_CHAPTER_TIMEOUT 配置，默认 5 分钟 */
    this.extractChapterTimeout = config.extractChapterTimeout != null
      ? config.extractChapterTimeout
      : 300000;
  }

  /**
   * 获取API端点
   * @returns {string} API URL
   */
  getEndpoint() {
    switch (this.provider) {
      case 'deepseek':
        return (this.baseUrl || 'https://api.deepseek.com/v1').replace(/\/$/, '') + '/chat/completions';
      case 'volcengine':
        return (this.baseUrl || 'https://ark.cn-beijing.volces.com/api/coding/v3').replace(/\/$/, '') + '/chat/completions';
      case 'zhipu':
        return 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
      case 'openai':
        return this.baseUrl || 'https://api.openai.com/v1/chat/completions';
      default:
        throw new Error(`不支持的LLM提供商: ${this.provider}`);
    }
  }

  /**
   * 发送聊天请求
   * @param {string} prompt - 提示词
   * @param {object} options - 配置选项（含 timeout 可覆盖本次请求超时，单位毫秒）
   * @returns {Promise<string>} LLM响应
   */
  async chat(prompt, options = {}) {
    const {
      temperature = 0.7,
      maxTokens = 2000,
      systemPrompt = null,
      responseFormat = null, // 'json' 或 'text'
      timeout = null // 本次请求超时（毫秒），不传则用实例默认
    } = options;

    const messages = [];

    // 添加系统提示
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // 添加用户提示
    messages.push({
      role: 'user',
      content: prompt
    });

    const requestBody = {
      model: this.model,
      messages: messages,
      temperature: temperature,
      max_tokens: maxTokens
    };

    // 如果需要JSON格式响应（DeepSeek/OpenAI/火山/智谱等支持）
    if (responseFormat === 'json' && (this.provider === 'deepseek' || this.provider === 'openai' || this.provider === 'volcengine' || this.provider === 'zhipu')) {
      requestBody.response_format = { type: 'json_object' };
    }

    return this.sendRequest(requestBody, timeout != null ? { timeout } : {});
  }

  /**
   * 从 LLM 响应中提取 JSON 字符串（去掉 ```json ... ``` 等 Markdown 包装）
   * @param {string} raw - 原始响应
   * @returns {string} 纯 JSON 字符串
   */
  static stripJsonFromMarkdown(raw) {
    if (!raw || typeof raw !== 'string') return raw;
    let s = raw.trim();
    // 匹配 ```json ... ``` 或 ``` ... ```，允许 ``` 后无换行
    const codeBlockMatch = s.match(/^```(?:json)?\s*\n?([\s\S]*?)```\s*$/);
    if (codeBlockMatch) {
      s = codeBlockMatch[1].trim();
    } else if (s.startsWith('```')) {
      s = s.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '').trim();
    }
    return s;
  }

  /**
   * 发送HTTP请求
   * @param {object} requestBody - 请求体
   * @param {object} [reqOptions] - 可选 { timeout } 本次请求超时（毫秒）
   * @returns {Promise<string>} 响应内容
   */
  sendRequest(requestBody, reqOptions = {}) {
    const timeout = reqOptions.timeout != null ? reqOptions.timeout : this.timeout;
    return new Promise((resolve, reject) => {
      const url = new URL(this.getEndpoint());

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);

            if (res.statusCode !== 200) {
              throw new Error(`API请求失败: ${res.statusCode} - ${JSON.stringify(response)}`);
            }

            if (!response.choices || !response.choices[0]) {
              throw new Error(`API响应格式错误: ${JSON.stringify(response)}`);
            }

            const content = response.choices[0].message.content;
            resolve(content);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('API请求超时'));
      });

      req.write(JSON.stringify(requestBody));
      req.end();
    });
  }

  /**
   * 语义抽取「第 N 章」内容：由模型判断教材中哪些段落属于指定章节，不依赖「第X章」标题格式
   * @param {string} fullCourseText - 教材/课程全文或较长片段（可含多章、前言、目录）
   * @param {string} courseName - 课程/教材名，如《人工智能引论》
   * @param {number[]} chapterNumbers - 章节号，如 [4] 表示第4章
   * @returns {Promise<string>} 抽取出的「第 N 章」正文，供后续出题使用
   */
  async extractChapterContent(fullCourseText, courseName, chapterNumbers) {
    const chapterSpec = chapterNumbers.length === 1
      ? `第${chapterNumbers[0]}章`
      : `第${chapterNumbers.join('、')}章`;
    const systemPrompt = `你是一个教材结构分析助手。你的任务是从一段教材内容中，**语义判断**并**只输出**属于指定章节的完整正文。

要求：
1. 指定章节可能是「第N章」「第四章」「4. 章节名」等任意表述，请根据语义和上下文识别。
2. 只输出该章从开头到下一章之前（或本章结束）的完整内容，不要输出前言、目录、其他章节。
3. 不要改写、不要总结，只做抽取与复制；若找不到明确对应章节，请输出与「${chapterSpec}」主题最相关的连续段落。
4. 直接输出章节正文，不要加「以下是第N章」等前缀。`;

    const prompt = `教材名称：${courseName}
需要抽取的章节：${chapterSpec}

以下是一段教材内容（可能包含多章、前言或目录），请判断并只输出属于「${chapterSpec}」的完整正文。

--- 教材内容 ---
${fullCourseText}
--- 结束 ---`;

    try {
      const response = await this.chat(prompt, {
        systemPrompt,
        temperature: 0.2,
        maxTokens: 16000,
        timeout: this.extractChapterTimeout
      });
      const text = (response || '').trim();
      return text;
    } catch (error) {
      console.warn('[LLMClient] 语义抽取章节失败:', error.message);
      return '';
    }
  }

  /**
   * 生成题目
   * @param {string} courseContent - 课程内容
   * @param {object} params - 题目参数
   * @returns {Promise<object>} 题目对象
   */
  async generateQuestions(courseContent, params) {
    const { count = 10, types = ['choice'], difficulty = 'basic', chapters = null } = params;

    const chapterHint = Array.isArray(chapters) && chapters.length > 0
      ? `本批题目仅针对第${chapters.join('、')}章。请严格只根据下方提供的「第${chapters.join('、')}章」课程内容出题，不要引用或考查教材前言、目录、其他章节或全书概览。`
      : '请严格根据下方提供的课程内容出题，不要引用未在下方出现的前言、目录或其他章节内容。';

    const systemPrompt = `你是一个专业的教学题目生成助手。请根据提供的课程内容，生成高质量的${difficulty === 'basic' ? '基础' : difficulty === 'advanced' ? '进阶' : '挑战'}难度题目。

要求：
1. 题目必须基于提供的课程内容，不得编造
2. ${chapterHint}
3. 题目要考查关键知识点和重点内容
4. 选项要合理，错误选项要有干扰性
5. 答案要准确，解析要详细
6. 返回JSON格式，结构如下：

{
  "questions": [
    {
      "id": 1,
      "type": "choice",
      "content": "题目内容",
      "options": ["A. 选项一", "B. 选项二", "C. 选项三", "D. 选项四"],
      "answer": "A",
      "explanation": "详细解析，说明为什么选这个答案",
      "difficulty": "${difficulty}"
    }
  ]
}`;

    const prompt = `请根据以下课程内容，生成${count}道${difficulty === 'basic' ? '基础' : difficulty === 'advanced' ? '进阶' : '挑战'}难度的${types.join('、')}题目。

${chapterHint}

课程内容：
${courseContent}

题目类型：${types.join('、')}
题目数量：${count}

请确保：
- 题目紧扣上述课程内容，仅考查本节内容中的知识点
- 难度适中，符合${difficulty}级别的要求
- 答案准确，解析详细且有教育意义`;

    try {
      const response = await this.chat(prompt, {
        systemPrompt,
        responseFormat: 'json',
        temperature: 0.7,
        maxTokens: 3000
      });

      // 解析JSON响应（LLM 可能返回 ```json ... ``` 包装）
      const jsonStr = LLMClient.stripJsonFromMarkdown(response);
      const result = JSON.parse(jsonStr);
      return result.questions || [];
    } catch (error) {
      console.error('生成题目失败:', error);
      throw new Error(`LLM生成题目失败: ${error.message}`);
    }
  }

  /**
   * 生成试卷（A卷和B卷）
   * @param {string} courseContent - 课程内容
   * @param {object} examConfig - 试卷配置
   * @returns {Promise<object>} 试卷对象
   */
  async generateExam(courseContent, examConfig) {
    const {
      totalScore = 100,
      duration = 120,
      questionTypes = [],
      chapters = []
    } = examConfig;

    const systemPrompt = `你是一个专业的试卷生成助手。请根据提供的课程内容，生成一份高质量的期末考试试卷。

要求：
1. 试卷总分${totalScore}分，考试时长${duration}分钟
2. 题目必须基于课程内容，难度合理
3. 各题型分配明确，覆盖主要知识点
4. 返回JSON格式，结构如下：

{
  "exam": {
    "title": "《课程名称》期末考试",
    "score": ${totalScore},
    "duration": ${duration},
    "questions": [
      {
        "id": 1,
        "type": "choice",
        "score": 5,
        "content": "题目内容",
        "options": ["A. 选项一", "B. 选项二", "C. 选项三", "D. 选项四"],
        "answer": "A",
        "explanation": "详细解析"
      }
    ]
  }
}`;

    const questionTypesDesc = questionTypes.map(q => `${q.type}: ${q.count}题，每题${q.score}分`).join('、');

    const prompt = `请根据以下课程内容，生成一份期末考试试卷。

课程内容：
${courseContent}

试卷要求：
- 总分：${totalScore}分
- 时长：${duration}分钟
- 题型分布：${questionTypesDesc}
- 覆盖章节：${chapters.length > 0 ? chapters.join('、') : '全部章节'}

请确保：
- 题目难度适中，符合期末考试要求
- 知识点覆盖全面，重点突出
- 题目表述清晰，无歧义
- A卷和B卷题目不同，但考查的知识点相同`;

    try {
      const response = await this.chat(prompt, {
        systemPrompt,
        responseFormat: 'json',
        temperature: 0.7,
        maxTokens: 4000
      });

      const jsonStr = LLMClient.stripJsonFromMarkdown(response);
      const result = JSON.parse(jsonStr);
      return result.exam;
    } catch (error) {
      console.error('生成试卷失败:', error);
      throw new Error(`LLM生成试卷失败: ${error.message}`);
    }
  }
}

module.exports = { LLMClient };
