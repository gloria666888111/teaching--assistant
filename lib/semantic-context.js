/**
 * 语义上下文 - 四个核心教学技能共用
 *
 * 支持两种模式（可配置切换）：
 * - Dify 模式：从 Dify 知识库检索，query 为「课程名 + 章节 + 章节标题」，提高单章检索准确度。
 * - 本地模式：从 teaching-data 用 MaterialLoader 加载，指定章节时用 LLM 语义抽取或按标题筛选。
 *
 * 所有功能统一优先用 OpenClaw 知识库（memory search 索引 teaching-data），不足再回退 Dify / MaterialLoader。
 */

const { search: memorySearch } = require('./openclaw-memory-search');

/** 部分课程的章节标题映射，用于 Dify / memory 检索时构造更精确的 query */
const CHAPTER_TITLES_BY_COURSE = {
  '人工智能引论': {
    1: '绪论',
    2: '知识表达与推理',
    3: '搜索探寻与问题求解',
    4: '机器学习',
    5: '神经网络与深度学习',
    6: '强化学习',
    7: '人工智能博弈',
    8: '人工智能伦理与安全',
    9: '人工智能架构与系统',
    10: '人工智能应用'
  }
};

function getChapterTitles(courseName, chapterNumbers) {
  const key = String(courseName || '').trim();
  const map = CHAPTER_TITLES_BY_COURSE[key];
  if (!map || !chapterNumbers.length) return [];
  return chapterNumbers.map(n => map[n]).filter(Boolean);
}

/**
 * 构建 Dify 检索 query：带章节时加入章节标题，强调「第N章」正文，减少模块/附录混入
 */
function buildDifyQuery(courseName, chapterNumbers) {
  if (!chapterNumbers.length) {
    return `《${courseName}》课程 教材 知识点 大纲`;
  }
  const titles = getChapterTitles(courseName, chapterNumbers);
  const chapterPart = chapterNumbers.map((n, i) => {
    const t = titles[i];
    return t ? `第${n}章 ${t}` : `第${n}章`;
  }).join(' ');
  return `《${courseName}》${chapterPart} 教材正文 内容`;
}

/** 构建 memory search 用 query（与 Dify 一致，便于语义检索） */
function buildMemoryQuery(courseName, chapterNumbers) {
  return buildDifyQuery(courseName, chapterNumbers);
}

/**
 * 将章节参数规范为数字数组
 * @param {string|number|array} chapters - "3-5" | [3,4,5] | ["第3章"] | 4
 * @returns {number[]} 如 [3,4,5]
 */
function chaptersToArray(chapters) {
  if (chapters == null) return [];
  if (Array.isArray(chapters)) {
    return chapters.map(ch => {
      if (typeof ch === 'number') return ch;
      const s = String(ch);
      const range = s.match(/^(\d+)[-~至](\d+)$/);
      if (range) {
        const a = [];
        for (let i = parseInt(range[1], 10); i <= parseInt(range[2], 10); i++) a.push(i);
        return a;
      }
      const num = s.replace(/\D/g, '');
      return num ? parseInt(num, 10) : null;
    }).filter(n => Number.isInteger(n));
  }
  const s = String(chapters);
  const range = s.match(/^(\d+)[-~至](\d+)$/);
  if (range) {
    const a = [];
    for (let i = parseInt(range[1], 10); i <= parseInt(range[2], 10); i++) a.push(i);
    return a;
  }
  const num = s.replace(/\D/g, '');
  return num ? [parseInt(num, 10)] : [];
}

/**
 * 创建仅含课程名的占位对象（Dify 模式下使用，避免步骤1 就触发本地加载）
 */
function createCourseStub(courseName) {
  return {
    name: courseName,
    textbook: '',
    outline: '',
    knowledge: '',
    slides: [],
    notes: [],
    cases: [],
    exercises: [],
    references: null,
    metadata: null
  };
}

/**
 * 判断是否为未加载内容的占位 course（仅识别 createCourseStub 创建的，避免与 loadCourse 返回的 null 混淆）
 */
function isCourseStub(course) {
  return course && course.textbook === '' && (course.outline === '' || course.outline == null);
}

/**
 * 获取用于出题/试卷/实验/课件的「章节上下文」字符串
 * 模式：优先 Dify（若配置且 useDify），否则本地 MaterialLoader + 语义抽取/标题筛选
 * @param {object} opts
 * @param {MaterialLoader} opts.materialLoader
 * @param {LLMClient} [opts.llmClient] - 本地模式下的语义抽取
 * @param {object} [opts.course] - 可选；不传时由内部按 useDify 解析（Dify 用 stub，否则 loadCourse）
 * @param {string} opts.courseName
 * @param {string|number|array} opts.chapters - 章节，如 "3-5" 或 [4]
 * @param {string} [opts.searchQuery] - 可选，用于答疑等：直接作为 memory 检索词（如 "《数据结构》 二叉树 遍历"），不传则用课程+章节构造
 * @param {object} [opts.difyRetriever]
 * @param {boolean} [opts.useDify=true]
 * @param {number} [opts.maxFullLength=40000]
 * @param {number} [opts.maxContextLength=8000]
 * @param {object} [opts.buildContextOptions]
 * @returns {Promise<{ context: string, course: object }>}
 */
async function getContextForChapters(opts) {
  const {
    materialLoader,
    llmClient,
    course: courseIn,
    courseName,
    chapters,
    searchQuery: searchQueryOverride,
    difyRetriever = null,
    useDify = true,
    maxFullLength = 40000,
    maxContextLength = 8000,
    buildContextOptions = {}
  } = opts;

  const chapterNumbers = chaptersToArray(chapters);
  const useDifyFirst = process.env.USE_DIFY_FIRST === 'true';

  // ---------- 可选：优先 Dify（USE_DIFY_FIRST=true 时跳过 memory，先走 Dify 便于测准确率）----------
  if (useDifyFirst && courseName && useDify && difyRetriever && typeof difyRetriever.retrieve === 'function' && difyRetriever.isConfigured()) {
    const queryForDify = searchQueryOverride
      ? `《${courseName}》 ${searchQueryOverride}`
      : buildDifyQuery(courseName, chapterNumbers);
    const retrieveOpts = { courseName };
    if (chapterNumbers.length > 0) retrieveOpts.topK = 12;
    if (searchQueryOverride) retrieveOpts.topK = 15;
    console.log('[步骤1] 教材来源: Dify 知识库（USE_DIFY_FIRST，先检索）', searchQueryOverride ? '(按学生问题检索)' : '');
    const difyText = await difyRetriever.retrieve(queryForDify, retrieveOpts);
    if (difyText && difyText.length >= 200) {
      const context = difyText.length > maxContextLength
        ? difyText.substring(0, maxContextLength) + '\n\n...'
        : difyText;
      return { context, course: createCourseStub(courseName) };
    }
    console.log('[步骤1] Dify 未返回足够内容，继续尝试 OpenClaw 知识库 / 本地教材');
  }

  // ---------- 优先 OpenClaw 知识库（memory search）----------
  const memoryQuery = searchQueryOverride || (courseName ? buildMemoryQuery(courseName, chapterNumbers) : '');
  if (memoryQuery && courseName) {
    const mem = memorySearch(memoryQuery, { agent: 'teaching', maxResults: 20 });
    if (mem.ok && mem.context && mem.context.length >= 300) {
      console.log('[步骤1] 教材来源: OpenClaw 知识库（memory search）');
      const context = mem.context.length > maxContextLength ? mem.context.substring(0, maxContextLength) + '\n\n...' : mem.context;
      return { context, course: createCourseStub(courseName) };
    }
  }

  // 统一解析 course：不传则内部解析，避免各技能重复「步骤1 加载」
  let course = courseIn;
  if (!course && courseName) {
    if (useDify && difyRetriever && difyRetriever.isConfigured()) {
      console.log('[步骤1] 教材来源: Dify 知识库（先检索，不加载本地）');
      course = createCourseStub(courseName);
    } else {
      if (materialLoader) {
        console.log('[步骤1] 教材来源: 本地 teaching-data');
        course = await materialLoader.loadCourse(courseName);
      }
    }
  }
  if (!course) {
    return { context: '', course: createCourseStub(courseName || '') };
  }

  // ---------- Dify 模式（先尝试，成功则直接返回，不碰本地）----------
  if (useDify && difyRetriever && typeof difyRetriever.retrieve === 'function' && difyRetriever.isConfigured()) {
    const query = searchQueryOverride
      ? `《${courseName}》 ${searchQueryOverride}`
      : buildDifyQuery(courseName, chapterNumbers);
    const retrieveOpts = { courseName };
    if (chapterNumbers.length > 0) retrieveOpts.topK = 12;
    if (searchQueryOverride) retrieveOpts.topK = 15;
    console.log('[DifyRetriever] 正在检索知识库...', searchQueryOverride ? '(按学生问题)' : (chapterNumbers.length ? `(第${chapterNumbers.join('、')}章)` : ''));
    const difyText = await difyRetriever.retrieve(query, retrieveOpts);
    if (difyText && difyText.length >= 200) {
      const context = difyText.length > maxContextLength
        ? difyText.substring(0, maxContextLength) + '\n\n...'
        : difyText;
      return { context, course };
    }
    console.log('[步骤1] Dify 未返回足够内容，回退到本地教材');
  }

  // ---------- 本地模式 ----------
  const defaultBuildOpts = {
    includeTextbook: true,
    includeOutline: true,
    includeKnowledge: false,
    includeSlides: false,
    includeNotes: false,
    includeCases: false,
    maxLength: maxFullLength
  };
  const buildOpts = { ...defaultBuildOpts, ...buildContextOptions };

  let resolvedCourse = course;
  if (materialLoader && courseName && isCourseStub(course)) {
    resolvedCourse = await materialLoader.loadCourse(courseName);
  }

  if (chapterNumbers.length === 0) {
    const ctx = materialLoader.buildContext(resolvedCourse, { ...buildOpts, maxLength: maxContextLength });
    return { context: ctx, course: resolvedCourse };
  }

  const filtered = await materialLoader.filterByChapters(resolvedCourse, chapterNumbers, {
    useSemantic: !!(llmClient && typeof llmClient.extractChapterContent === 'function'),
    llmClient,
    maxFullLength
  });
  const ctx = materialLoader.buildContext(filtered, {
    includeTextbook: true,
    includeOutline: true,
    includeKnowledge: buildOpts.includeKnowledge,
    maxLength: maxContextLength
  });
  return { context: ctx, course: resolvedCourse };
}

/**
 * 获取「按章节筛选后的课程对象」（供 experiment-designer / course-content-generator 等）
 * 优先用 OpenClaw 知识库，不足再 Dify / MaterialLoader
 * @param {object} [opts.course] - 可选；不传时由内部按 useDify 解析
 */
async function getCourseForChapters(opts) {
  const {
    materialLoader,
    llmClient,
    course: courseIn,
    courseName,
    chapters,
    difyRetriever = null,
    useDify = true,
    maxFullLength = 40000
  } = opts;

  const chapterNumbers = chaptersToArray(chapters);
  const useDifyFirst = process.env.USE_DIFY_FIRST === 'true';

  // ---------- 可选：优先 Dify ----------
  if (useDifyFirst && courseName && useDify && difyRetriever && difyRetriever.isConfigured() && typeof difyRetriever.retrieve === 'function') {
    const query = buildDifyQuery(courseName, chapterNumbers);
    const retrieveOpts = { courseName };
    if (chapterNumbers.length > 0) retrieveOpts.topK = 12;
    const difyText = await difyRetriever.retrieve(query, retrieveOpts);
    if (difyText && difyText.length >= 200) {
      return {
        ...createCourseStub(courseName),
        textbook: difyText,
        outline: '',
        knowledge: '',
        content: difyText
      };
    }
  }

  // ---------- 优先 OpenClaw 知识库 ----------
  if (courseName) {
    const memoryQuery = buildMemoryQuery(courseName, chapterNumbers);
    const mem = memorySearch(memoryQuery, { agent: 'teaching', maxResults: 20 });
    if (mem.ok && mem.context && mem.context.length >= 300) {
      return {
        ...createCourseStub(courseName),
        textbook: mem.context,
        outline: '',
        knowledge: '',
        content: mem.context
      };
    }
  }

  let course = courseIn;
  if (!course && courseName) {
    if (useDify && difyRetriever && difyRetriever.isConfigured()) {
      course = createCourseStub(courseName);
    } else if (materialLoader) {
      course = await materialLoader.loadCourse(courseName);
    }
  }
  if (!course) {
    return createCourseStub(courseName || '');
  }

  // ---------- Dify 模式 ----------
  if (useDify && difyRetriever && difyRetriever.isConfigured() && typeof difyRetriever.retrieve === 'function') {
    const query = buildDifyQuery(courseName, chapterNumbers);
    const retrieveOpts = { courseName };
    if (chapterNumbers.length > 0) retrieveOpts.topK = 12;
    const difyText = await difyRetriever.retrieve(query, retrieveOpts);
    if (difyText && difyText.length >= 200) {
      return {
        ...course,
        textbook: difyText,
        outline: '',
        knowledge: '',
        content: difyText
      };
    }
  }

  // ---------- 本地模式 ----------
  if (chapterNumbers.length === 0) {
    return course;
  }

  let resolvedCourse = course;
  if (materialLoader && courseName && isCourseStub(course)) {
    resolvedCourse = await materialLoader.loadCourse(courseName);
  }

  const filtered = await materialLoader.filterByChapters(resolvedCourse, chapterNumbers, {
    useSemantic: !!(llmClient && typeof llmClient.extractChapterContent === 'function'),
    llmClient,
    maxFullLength
  });
  return filtered;
}

module.exports = {
  chaptersToArray,
  createCourseStub,
  isCourseStub,
  getContextForChapters,
  getCourseForChapters
};
