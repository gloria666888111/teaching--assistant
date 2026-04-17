const fs = require('fs').promises;
const path = require('path');
const { getContextForChapters } = require('./semantic-context');
const { LLMClient } = require('./llm-client');

const WORKSPACE_ROOT = path.join(__dirname, '..');

function todayStamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function safeReadJSON(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function normalizeChapters(chapters) {
  if (!chapters) return [];
  const arr = Array.isArray(chapters) ? chapters : [chapters];
  return arr
    .map(v => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    })
    .filter(v => v && v > 0);
}

function buildReminderTemplates({ courseName = '本课程', weakChapterLine = '' }) {
  const chapterTip = weakChapterLine ? `重点关注：${weakChapterLine}` : '建议复习最近高频提问章节。';
  return {
    wecom: `【督学提醒】\n同学们好，今天请完成《${courseName}》的学习打卡：\n1) 复习 20 分钟\n2) 完成 5 道自测题\n3) 在群内提 1 个问题\n${chapterTip}\n回复“已完成+姓名”即可。`,
    feishu: `【学习提醒】\n《${courseName}》今日任务：\n- 复习本章核心概念\n- 自测练习 5 题\n- 提交 1 个疑问到群内 @OpenClaw\n${chapterTip}\n坚持每天进步一点点。`
  };
}

async function loadLearningSummary() {
  const summaryPath = path.join(WORKSPACE_ROOT, 'output', 'reports', '学情摘要.json');
  const summary = await safeReadJSON(summaryPath);
  return { summaryPath, summary };
}

function buildTeacherDashboardText(summary) {
  if (!summary) {
    return '暂未找到学情摘要数据。请先执行“学情分析”生成报告后再查看教师管理面板。';
  }

  const topWeak = (summary.weakChapters || []).slice(0, 5);
  const weakLines = topWeak.length
    ? topWeak.map((w, i) => `${i + 1}. 《${w.course}》第${w.chapter}章（${w.count}次）`).join('\n')
    : '暂无薄弱章节数据';
  const courseLines = Object.entries(summary.byCourse || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([c, n], i) => `${i + 1}. 《${c}》：${n}次`)
    .join('\n') || '暂无课程统计';
  const tags = (summary.styleTags || []).join('、') || '暂无';
  const classLines = Object.entries(summary.byClass || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cls, n], i) => `${i + 1}. ${cls}：${n}次`)
    .join('\n') || '暂无班级统计';
  const studentLines = Object.entries(summary.byStudent || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([stu, n], i) => `${i + 1}. ${stu}：${n}次`)
    .join('\n') || '暂无学生统计';

  return `📊 教师管理面板（学情概览）

- 总提问量：${summary.totalQ || 0}
- 学习风格标签：${tags}

【高频提问课程TOP5】
${courseLines}

【薄弱章节TOP5】
${weakLines}

【班级提问TOP5】
${classLines}

【学生提问TOP5】
${studentLines}

建议动作：
1) 对TOP薄弱章节安排一次针对性讲解
2) 对提问频次高的学生安排个性化答疑
3) 用“生成常见问题FAQ”发布课前预习问答
4) 用“生成督学提醒计划”下发分层提醒消息`;
}

function parseFaqItems(rawText) {
  if (!rawText) return [];
  const jsonText = LLMClient.stripJsonFromMarkdown(rawText);
  const parsed = JSON.parse(jsonText);
  const arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.faqs) ? parsed.faqs : []);
  return arr
    .map(item => ({
      q: String(item.q || item.question || '').trim(),
      a: String(item.a || item.answer || '').trim(),
      keywords: Array.isArray(item.keywords) ? item.keywords.map(k => String(k).trim()).filter(Boolean) : []
    }))
    .filter(item => item.q && item.a);
}

async function generateCourseFAQ(opts) {
  const {
    materialLoader,
    difyRetriever = null,
    useDify = true,
    llmClient,
    courseName,
    chapters
  } = opts;
  if (!courseName || !llmClient) {
    throw new Error('生成FAQ需要课程名和LLM配置');
  }

  const normalizedChapters = normalizeChapters(chapters);
  const { context } = await getContextForChapters({
    materialLoader,
    difyRetriever,
    useDify,
    courseName,
    chapters: normalizedChapters,
    maxContextLength: 9000
  });
  if (!context || context.length < 80) {
    throw new Error(`未找到《${courseName}》对应教材内容，无法生成FAQ`);
  }

  const scope = normalizedChapters.length > 0
    ? `第${normalizedChapters.join('、')}章`
    : '整门课程';
  const prompt = `请基于以下教材内容，生成《${courseName}》${scope}的常见问题FAQ。

要求：
1) 生成 8 条 FAQ；
2) 每条包含 question、answer、keywords；
3) 回答面向学生，准确、简洁、可直接群内发送；
4) 严格基于教材内容，不编造教材外知识；
5) 仅输出 JSON，对象格式：
{
  "faqs": [
    { "question": "...", "answer": "...", "keywords": ["...","..."] }
  ]
}

【教材内容】
${context}`;

  const response = await llmClient.chat(prompt, {
    temperature: 0.3,
    maxTokens: 2800,
    responseFormat: 'json',
    timeout: 120000
  });

  const faqs = parseFaqItems(response);
  if (faqs.length === 0) {
    throw new Error('FAQ生成结果为空，请重试');
  }

  const outDir = path.join(WORKSPACE_ROOT, 'output', 'faq', courseName);
  await ensureDir(outDir);
  const date = todayStamp();
  const chapterSuffix = normalizedChapters.length > 0 ? `-第${normalizedChapters.join('-')}章` : '-全课程';
  const jsonPath = path.join(outDir, `faq${chapterSuffix}-${date}.json`);
  const mdPath = path.join(outDir, `faq${chapterSuffix}-${date}.md`);

  const md = [
    `# 《${courseName}》FAQ（${scope}）`,
    '',
    ...faqs.map((item, idx) => `## Q${idx + 1}. ${item.q}\n\nA: ${item.a}\n`)
  ].join('\n');

  await fs.writeFile(jsonPath, JSON.stringify({ courseName, chapters: normalizedChapters, faqs }, null, 2), 'utf8');
  await fs.writeFile(mdPath, md, 'utf8');

  return { faqs, jsonPath, mdPath, scope };
}

async function generateReminderPlan(opts = {}) {
  const {
    courseName = '本课程',
    weakChapters = [],
    profileSummary = null
  } = opts;

  const weakLine = weakChapters.length > 0
    ? weakChapters.slice(0, 3).map(w => `第${w.chapter}章`).join('、')
    : '';
  const templates = buildReminderTemplates({ courseName, weakChapterLine: weakLine });

  const plan = {
    generatedAt: new Date().toISOString(),
    targetCourse: courseName,
    schedules: [
      {
        id: 'daily-morning-reminder',
        cron: '0 8 * * 1-5',
        channels: ['wecom', 'feishu'],
        messageType: '督学提醒',
        templateRef: 'dailyLearning'
      },
      {
        id: 'daily-evening-checkin',
        cron: '30 20 * * 1-5',
        channels: ['wecom', 'feishu'],
        messageType: '打卡提醒',
        templateRef: 'checkin'
      },
      {
        id: 'weekly-review-reminder',
        cron: '0 19 * * 0',
        channels: ['wecom', 'feishu'],
        messageType: '周复盘提醒',
        templateRef: 'weeklyReview'
      }
    ],
    templates,
    basedOnLearningProfile: profileSummary ? {
      totalQ: profileSummary.totalQ || 0,
      styleTags: profileSummary.styleTags || [],
      weakChapters: (profileSummary.weakChapters || []).slice(0, 5)
    } : null
  };

  const outDir = path.join(WORKSPACE_ROOT, 'output', 'reminders');
  await ensureDir(outDir);
  const date = todayStamp();
  const jsonPath = path.join(outDir, `督学提醒计划-${date}.json`);
  const mdPath = path.join(outDir, `督学提醒模板-${date}.md`);

  const md = `# 督学提醒计划（${courseName}）

## 建议定时策略
- 工作日早晨提醒：\`0 8 * * 1-5\`
- 工作日晚间打卡：\`30 20 * * 1-5\`
- 周日复盘提醒：\`0 19 * * 0\`

## 企业微信模板
${templates.wecom}

## 飞书模板
${templates.feishu}
`;

  await fs.writeFile(jsonPath, JSON.stringify(plan, null, 2), 'utf8');
  await fs.writeFile(mdPath, md, 'utf8');
  return { jsonPath, mdPath, plan };
}

module.exports = {
  loadLearningSummary,
  buildTeacherDashboardText,
  generateCourseFAQ,
  generateReminderPlan
};
