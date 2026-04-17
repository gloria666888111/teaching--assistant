/**
 * 面向学生的课程答疑与知识点总结
 *
 * 复用 semantic-context（Dify / 本地教材）取上下文，再用 LLM 生成：
 * - 课程答疑：根据教材内容回答学生问题
 * - 知识点总结：根据教材内容提炼章节/课程要点
 *
 * 不单独建 skill，由 teaching-assistant 直接调用。
 */

const { getContextForChapters } = require('./semantic-context');

/**
 * 课程答疑：基于教材上下文回答学生问题
 * @param {object} opts
 * @param {import('./material-loader')} opts.materialLoader
 * @param {object} [opts.difyRetriever]
 * @param {boolean} [opts.useDify=true]
 * @param {import('./llm-client')} opts.llmClient
 * @param {string} opts.courseName
 * @param {string|number|number[]} [opts.chapters] - 章节，不传则整门课
 * @param {string} opts.question - 学生问题
 * @returns {Promise<string>}
 */
async function answerQuestion(opts) {
  const {
    materialLoader,
    difyRetriever = null,
    useDify = true,
    llmClient,
    courseName,
    chapters,
    question
  } = opts;

  if (!courseName || !question || !llmClient) {
    return '请提供课程名称和学生问题。';
  }

  const { context } = await getContextForChapters({
    materialLoader,
    difyRetriever,
    useDify,
    courseName,
    chapters: chapters || [],
    searchQuery: `${courseName} ${question}`,
    maxContextLength: 6000
  });

  if (!context || context.length < 50) {
    return `未找到《${courseName}》${chapters ? ' 对应章节' : ''}的教材内容，无法基于教材作答。请确认课程与章节，或联系老师补充资料。`;
  }

  // 引导式 AI 教师设定：苏格拉底式引导、从错误中学习、循序渐进、积极鼓励；教材作为标准依据防幻觉，不局限题型
  const systemPrompt = `你是一位采用「引导式教学」的课程辅导老师，服务学习《${courseName}》的学生。

**教材的作用**：下面【教材内容】用于提供课程的标准定义、定理、方法等，作为回答的依据以降低幻觉；你不必只答「概念题」，学生问概念、原理、解题（含编程题、算法题、计算题等）都可以答。与教材一致的部分以教材为准；教材未覆盖的（如具体题目变形、实现细节）可基于正确知识作答，若不确定则说明并建议查教材某章或问老师。

**教学原则**
1. **苏格拉底式引导**：不直接抛答案，先引导学生思考。概念题可先问「你是怎么理解的？」；解题可先问「你想到用哪块知识？」或给一个思考方向/提示，再给完整解释或解答。
2. **从错误中学习**：若学生有理解偏差或做错，温和指出根因，并联系教材中的正确表述或方法，帮助纠错。
3. **循序渐进**：先讲清前置知识或思路，再给进阶步骤或结论；解题可分步写清。
4. **积极鼓励**：答对时给出具体肯定（如「这里用到了……，思路对」），避免只说「很好」「对」；保护学习兴趣，不打击信心。

**具体规则**
- 概念、原理、解题、编程等任何类型问题：都可先简短反问或给思考方向，再结合教材中的标准定义/方法给出清晰解释或解答；解题时可先给提示再给步骤或答案。
- 若教材完全未涉及该问题：如实说明，并建议可查阅的章节或联系老师。
- 回答控制在合理篇幅内，便于学生阅读；必要时分条或分步。`;

  const userPrompt = `【教材内容】（供标准定义、方法参考，防幻觉）
${context}

【学生问题】
${question.trim()}

请按上述教学原则，结合教材内容给出引导式回答（概念、解题等均可，不局限题型）。`;

  const answer = await llmClient.chat(userPrompt, {
    temperature: 0.4,
    maxTokens: 1500,
    timeout: 60000,
    systemPrompt
  });
  return (answer && answer.trim()) || '未能生成回答，请稍后再试。';
}

/**
 * 知识点总结：基于教材上下文提炼章节/课程要点（面向学生复习）
 * @param {object} opts - 同上，无 question，可有 chapters
 * @returns {Promise<string>}
 */
async function summarizeKnowledge(opts) {
  const {
    materialLoader,
    difyRetriever = null,
    useDify = true,
    llmClient,
    courseName,
    chapters
  } = opts;

  if (!courseName || !llmClient) {
    return '请提供课程名称。';
  }

  const { context } = await getContextForChapters({
    materialLoader,
    difyRetriever,
    useDify,
    courseName,
    chapters: chapters || [],
    maxContextLength: 8000
  });

  if (!context || context.length < 50) {
    return `未找到《${courseName}》${chapters ? ' 对应章节' : ''}的教材内容，无法生成知识点总结。请确认课程与章节。`;
  }

  const scope = chapters && (Array.isArray(chapters) ? chapters.length : 1) > 0
    ? `第 ${[].concat(chapters).join('、')} 章`
    : '整门课程';
  const prompt = `你是一位助教。请根据下面【教材内容】，提炼《${courseName}》${scope}的知识点总结，面向学生复习使用。要求：
1. 条理清晰，分点或分小节；
2. 突出核心概念、定义、结论；
3. 篇幅适中，便于记忆与复习；
4. 只归纳教材中已有的内容，不要添加教材外的内容。

【教材内容】
${context}`;

  const summary = await llmClient.chat(prompt, {
    temperature: 0.3,
    maxTokens: 2000,
    timeout: 90000
  });
  return (summary && summary.trim()) || '未能生成总结，请稍后再试。';
}

module.exports = {
  answerQuestion,
  summarizeKnowledge
};
