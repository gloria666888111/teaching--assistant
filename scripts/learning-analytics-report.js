/**
 * 学情分析报告：读取 learning-logs/qa.jsonl，生成带 ECharts 可视化的 HTML
 * 在工作区根目录执行：node scripts/learning-analytics-report.js
 * 输出：output/reports/学情分析-YYYYMMDD.html
 */

const path = require('path');
const fs = require('fs').promises;

const workspaceRoot = path.join(__dirname, '..');
const { readQALog } = require('../lib/learning-log');

function aggregate(logs) {
  const byCourse = {};
  const byChapter = {}; // key: "课程名-第N章"
  const byDay = {};
  const byCourseChapter = {}; // key: course, value: { "1": n, "2": n, ... }
  const byStudent = {}; // key: studentId
  const byClass = {}; // key: classId

  for (const r of logs) {
    const course = r.course || '未指定课程';
    const ch = (r.chapters || '').toString().trim();
    const day = (r.ts || '').slice(0, 10);
    const studentId = (r.studentId || 'unknown-student').toString().trim() || 'unknown-student';
    const classId = (r.classId || 'unknown-class').toString().trim() || 'unknown-class';

    byCourse[course] = (byCourse[course] || 0) + 1;
    byDay[day] = (byDay[day] || 0) + 1;
    byStudent[studentId] = (byStudent[studentId] || 0) + 1;
    byClass[classId] = (byClass[classId] || 0) + 1;

    if (ch) {
      const key = `${course}-第${ch}章`;
      byChapter[key] = (byChapter[key] || 0) + 1;
      if (!byCourseChapter[course]) byCourseChapter[course] = {};
      byCourseChapter[course][ch] = (byCourseChapter[course][ch] || 0) + 1;
    } else {
      const key = `${course}-整门课`;
      byChapter[key] = (byChapter[key] || 0) + 1;
    }
  }

  return {
    total: logs.length,
    byCourse,
    byChapter,
    byDay,
    byStudent,
    byClass,
    byCourseChapter,
    sortedDays: Object.keys(byDay).sort(),
    sortedCourses: Object.keys(byCourse).sort((a, b) => (byCourse[b] || 0) - (byCourse[a] || 0)),
    sortedStudents: Object.keys(byStudent).sort((a, b) => (byStudent[b] || 0) - (byStudent[a] || 0)),
    sortedClasses: Object.keys(byClass).sort((a, b) => (byClass[b] || 0) - (byClass[a] || 0))
  };
}

/** 从答疑问题文本推断学习风格标签（概念型/应用型/复习型） */
function inferLearningStyle(logs) {
  let conceptCount = 0;
  let applyCount = 0;
  const seen = {}; // "课程-章" -> 次数，用于复习型
  for (const r of logs) {
    const q = (r.question || '').toLowerCase();
    if (/定义|是什么|概念|含义|区别|原理|为什么|机制/.test(q)) conceptCount++;
    if (/怎么做|如何实现|代码|题目|习题|实验|步骤|例子|例题|编程/.test(q)) applyCount++;
    const key = `${r.course || ''}-${(r.chapters || '').toString()}`;
    if (key && key !== '-') seen[key] = (seen[key] || 0) + 1;
  }
  const styles = [];
  if (conceptCount > applyCount && conceptCount >= 2) styles.push('概念型');
  if (applyCount > conceptCount && applyCount >= 2) styles.push('应用型');
  if (conceptCount >= 2 && applyCount >= 2) styles.push('概念与应用并重');
  const repeatChapters = Object.entries(seen).filter(([, n]) => n >= 2).length;
  if (repeatChapters >= 1) styles.push('有反复追问的章节');
  return styles.length ? styles : ['暂无足够记录'];
}

/** 生成学情摘要 JSON：薄弱/常问章节 + 学习风格，供答题页学习建议使用 */
function buildProfileSummary(logs, stats) {
  const { byCourseChapter, sortedCourses } = stats;
  const weakChapters = []; // { course, chapter, count }
  for (const c of sortedCourses) {
    const chMap = byCourseChapter[c];
    if (!chMap || typeof chMap !== 'object') continue;
    for (const [ch, n] of Object.entries(chMap)) {
      if (ch && n > 0) weakChapters.push({ course: c, chapter: String(ch), count: n });
    }
  }
  weakChapters.sort((a, b) => b.count - a.count);
  const styleTags = inferLearningStyle(logs);
  return {
    generatedAt: new Date().toISOString(),
    totalQ: stats.total,
    weakChapters: weakChapters.slice(0, 15),
    styleTags,
    byCourse: stats.byCourse,
    byStudent: stats.byStudent,
    byClass: stats.byClass
  };
}

function buildClassSummary(logs, stats) {
  const studentQuestions = {};
  const studentWeakChapters = {};
  for (const r of logs) {
    const studentId = (r.studentId || 'unknown-student').toString().trim() || 'unknown-student';
    const classId = (r.classId || 'unknown-class').toString().trim() || 'unknown-class';
    const course = r.course || '未指定课程';
    const chapter = (r.chapters || '').toString().trim();

    if (!studentQuestions[studentId]) {
      studentQuestions[studentId] = { studentId, classId, totalQ: 0 };
    }
    studentQuestions[studentId].totalQ += 1;

    const weakKey = chapter ? `${course}-第${chapter}章` : `${course}-整门课`;
    if (!studentWeakChapters[studentId]) studentWeakChapters[studentId] = {};
    studentWeakChapters[studentId][weakKey] = (studentWeakChapters[studentId][weakKey] || 0) + 1;
  }

  const studentTopWeak = Object.values(studentQuestions).map(s => {
    const weakMap = studentWeakChapters[s.studentId] || {};
    const weak = Object.entries(weakMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, n]) => ({ chapterKey: k, count: n }));
    return { ...s, weakChapters: weak };
  });

  const classWeakPoints = Object.entries(stats.byChapter || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([chapterKey, count]) => ({ chapterKey, count }));

  return {
    generatedAt: new Date().toISOString(),
    totalQ: stats.total,
    classDistribution: stats.byClass || {},
    classTopWeakPoints: classWeakPoints,
    studentStats: studentTopWeak.sort((a, b) => b.totalQ - a.totalQ)
  };
}

function buildHTML(stats) {
  const { total, byCourse, byDay, sortedDays, sortedCourses, byCourseChapter } = stats;

  const courseNames = sortedCourses;
  const courseValues = courseNames.map(c => byCourse[c] || 0);
  const dayLabels = sortedDays.slice(-14); // 最近14天
  const dayValues = dayLabels.map(d => byDay[d] || 0);

  // 每门课下章节分布（取提问最多的前几门课）
  const topCourses = sortedCourses.slice(0, 5);
  const chapterBars = [];
  for (const c of topCourses) {
    const chMap = byCourseChapter[c];
    if (chMap && Object.keys(chMap).length > 0) {
      const chEntries = Object.entries(chMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
      chEntries.forEach(([ch, n]) => chapterBars.push({ course: c, chapter: `第${ch}章`, count: n }));
    }
  }

  const chapterLabels = chapterBars.map(b => `${b.course}-${b.chapter}`);
  const chapterCounts = chapterBars.map(b => b.count);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>学情分析报告</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body { font-family: "PingFang SC", "Microsoft YaHei", sans-serif; margin: 20px; background: #f5f5f5; }
    h1 { color: #333; border-bottom: 2px solid #1890ff; padding-bottom: 8px; }
    .summary { background: #fff; padding: 16px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    .summary p { margin: 8px 0; color: #555; }
    .chart { background: #fff; padding: 16px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.08); height: 360px; }
    .chart h3 { margin-top: 0; color: #333; font-size: 16px; }
    .tip { color: #888; font-size: 12px; margin-top: 12px; }
  </style>
</head>
<body>
  <h1>学情分析报告</h1>
  <div class="summary">
    <p><strong>统计说明</strong>：基于课程答疑记录（learning-logs/qa.jsonl）与 OpenClaw 记忆中的学情条目生成。每次学生提问会记录课程、章节与问题摘要。</p>
    <p><strong>总提问次数</strong>：${total}</p>
    ${total === 0 ? '<p class="tip">暂无答疑记录。多使用课程答疑功能后再次生成报告即可看到统计与图表。</p>' : ''}
  </div>

  <div class="chart" id="chartCourse" style="display:${total ? 'block' : 'none'}"></div>
  <div class="chart" id="chartDay" style="display:${total ? 'block' : 'none'}"></div>
  <div class="chart" id="chartChapter" style="display:${chapterLabels.length ? 'block' : 'none'}"></div>

  <p class="tip">生成时间：${new Date().toLocaleString('zh-CN')} · 数据来源：workspace/learning-logs/qa.jsonl 与 memory/YYYY-MM-DD.md 学情记录</p>

  <script>
    ${total ? `
    var chartCourse = echarts.init(document.getElementById('chartCourse'));
    chartCourse.setOption({
      title: { text: '各课程提问次数', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: ${JSON.stringify(courseNames)}, axisLabel: { rotate: 30 } },
      yAxis: { type: 'value', name: '提问次数' },
      series: [{ name: '提问次数', type: 'bar', data: ${JSON.stringify(courseValues)}, itemStyle: { color: '#1890ff' } }]
    });

    var chartDay = echarts.init(document.getElementById('chartDay'));
    chartDay.setOption({
      title: { text: '每日提问趋势（最近14天）', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: ${JSON.stringify(dayLabels)} },
      yAxis: { type: 'value', name: '提问次数' },
      series: [{ name: '提问次数', type: 'line', data: ${JSON.stringify(dayValues)}, smooth: true, itemStyle: { color: '#52c41a' } }]
    });
    ${chapterLabels.length ? `
    var chartChapter = echarts.init(document.getElementById('chartChapter'));
    chartChapter.setOption({
      title: { text: '各课程章节提问分布（前5门课）', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: ${JSON.stringify(chapterLabels)}, axisLabel: { rotate: 35 } },
      yAxis: { type: 'value', name: '提问次数' },
      series: [{ name: '提问次数', type: 'bar', data: ${JSON.stringify(chapterCounts)}, itemStyle: { color: '#fa8c16' } }]
    });
    ` : ''}
    window.addEventListener('resize', function() {
      chartCourse.resize();
      chartDay.resize();
      if (typeof chartChapter !== 'undefined') chartChapter.resize();
    });
    ` : ''}
  </script>
</body>
</html>`;
}

async function main() {
  const logs = await readQALog();
  const stats = aggregate(logs);
  const html = buildHTML(stats);
  const profile = buildProfileSummary(logs, stats);
  const classSummary = buildClassSummary(logs, stats);

  const outDir = path.join(workspaceRoot, 'output', 'reports');
  await fs.mkdir(outDir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const outPath = path.join(outDir, `学情分析-${date}.html`);
  await fs.writeFile(outPath, html, 'utf8');
  const summaryPath = path.join(outDir, '学情摘要.json');
  await fs.writeFile(summaryPath, JSON.stringify(profile, null, 2), 'utf8');
  const classSummaryPath = path.join(outDir, '班级学情摘要.json');
  await fs.writeFile(classSummaryPath, JSON.stringify(classSummary, null, 2), 'utf8');
  console.log('学情分析报告已生成:', outPath);
  console.log('学情摘要已导出（供答题页学习建议使用）:', summaryPath);
  console.log('班级学情摘要已导出（供教师总览使用）:', classSummaryPath);
  console.log('总记录数:', stats.total, '· 学习风格标签:', profile.styleTags.join('、'));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
