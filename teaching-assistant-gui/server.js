/**
 * 智能教学助手 GUI 后端桥接
 * 对接 clawwork/workspace 下 4 个 skills：自测题、AB卷、实验、PPT
 * 需在启动前设置环境变量 WORKSPACE_ROOT，或使用默认路径
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 确保工作区为绝对路径，避免子进程把文件写到运行目录下
const defaultWorkspace = path.join(os.homedir(), 'Desktop', 'clawwork', 'workspace');
const WORKSPACE_ROOT = path.resolve(process.env.WORKSPACE_ROOT || defaultWorkspace);

function checkWorkspace() {
  const out = { ok: false, workspaceRoot: WORKSPACE_ROOT, message: '' };
  try {
    if (!fs.existsSync(WORKSPACE_ROOT)) {
      out.message = '工作区目录不存在，请设置环境变量 WORKSPACE_ROOT 指向 clawwork/workspace';
      return out;
    }
    const quizPath = path.join(WORKSPACE_ROOT, 'skills', 'quiz-generator', 'index.js');
    if (!fs.existsSync(quizPath)) {
      out.message = '工作区内未找到 skills/quiz-generator/index.js';
      return out;
    }
    out.ok = true;
    out.message = '工作区可用';
    return out;
  } catch (e) {
    out.message = (e && e.message) || String(e);
    return out;
  }
}

function runNodeSkill(scriptRelPath, args, cwd = WORKSPACE_ROOT) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptRelPath, ...args], {
      cwd,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.stderr?.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
      if (code === 0) resolve({ ok: true, stdout, stderr });
      else reject(new Error(stderr || stdout || `exit ${code}`));
    });
    child.on('error', reject);
  });
}

function runPythonScript(args, cwd = WORKSPACE_ROOT) {
  return new Promise((resolve, reject) => {
    const child = spawn('python3', args, {
      cwd,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.stderr?.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
      if (code === 0) resolve({ ok: true, stdout, stderr });
      else reject(new Error(stderr || stdout || `exit ${code}`));
    });
    child.on('error', reject);
  });
}

// 自测题
app.post('/api/quiz/generate', async (req, res) => {
  try {
    const { course, chapter, basic = 10, advanced = 5, challenge = 3 } = req.body || {};
    if (!course || !chapter) {
      return res.status(400).json({ ok: false, error: '缺少 course 或 chapter' });
    }
    const args = [
      'skills/quiz-generator/index.js',
      '--course', course,
      '--chapter', String(chapter),
      '--basic', String(basic),
      '--advanced', String(advanced),
      '--challenge', String(challenge),
    ];
    await runNodeSkill(args[0], args.slice(1));
    const absOut = path.join(WORKSPACE_ROOT, 'output', 'quizzes', course);
    res.json({
      ok: true,
      message: '自测题已生成',
      outputDir: `output/quizzes/${course}/`,
      outputPath: absOut,
    });
  } catch (e) {
    const msg = e.message || String(e);
    console.error('[quiz/generate]', msg);
    res.status(500).json({ ok: false, error: msg });
  }
});
app.post('/api/exam/generate', async (req, res) => {
  try {
    const { course, type = '期末', chapters } = req.body || {};
    if (!course) {
      return res.status(400).json({ ok: false, error: '缺少 course' });
    }
    const args = [
      'skills/exam-ab-generator/index.js',
      '--course', course,
      '--type', type,
      '--paper-a', '--paper-b',
    ];
    if (chapters) args.push('--chapters', chapters);
    await runNodeSkill(args[0], args.slice(1));
    const absOut = path.join(WORKSPACE_ROOT, 'output', 'exams', course);
    res.json({
      ok: true,
      message: 'AB 卷已生成',
      outputDir: `output/exams/${course}/`,
      outputPath: absOut,
    });
  } catch (e) {
    const msg = e.message || String(e);
    console.error('[exam/generate]', msg);
    res.status(500).json({ ok: false, error: msg });
  }
});

// 实验方案
app.post('/api/experiment/generate', async (req, res) => {
  try {
    const { course, chapter, difficulty } = req.body || {};
    if (!course || !chapter) {
      return res.status(400).json({ ok: false, error: '缺少 course 或 chapter' });
    }
    const args = [
      'skills/experiment-designer/index.js',
      '--course', course,
      '--chapter', String(chapter),
    ];
    if (difficulty) args.push('--difficulty', difficulty);
    await runNodeSkill(args[0], args.slice(1));
    const absOut = path.join(WORKSPACE_ROOT, 'output', 'experiments', course);
    res.json({
      ok: true,
      message: '实验方案已生成',
      outputDir: `output/experiments/${course}/`,
      outputPath: absOut,
    });
  } catch (e) {
    const msg = e.message || String(e);
    console.error('[experiment/generate]', msg);
    res.status(500).json({ ok: false, error: msg });
  }
});

// PPT
app.post('/api/ppt/generate', async (req, res) => {
  try {
    const { query } = req.body || {};
    if (!query || !query.trim()) {
      return res.status(400).json({ ok: false, error: '缺少 query（PPT 主题）' });
    }
    const scriptPath = 'skills/ai-ppt-generator/scripts/random_ppt_theme.py';
    const { stdout } = await runPythonScript([scriptPath, '--query', query.trim()]);
    const absOut = path.join(WORKSPACE_ROOT, 'output', 'ppts');
    res.json({
      ok: true,
      message: 'PPT 生成请求已提交',
      outputDir: 'output/ppts/',
      outputPath: absOut,
      raw: stdout,
    });
  } catch (e) {
    const msg = e.message || String(e);
    console.error('[ppt/generate]', msg);
    res.status(500).json({ ok: false, error: msg });
  }
});

// 工作区检查（用于前端诊断）
app.get('/api/workspace-check', (_req, res) => {
  res.json(checkWorkspace());
});

// 可选：获取课程列表（从 workspace 读取）
app.get('/api/courses', (_req, res) => {
  const textbooksPath = path.join(WORKSPACE_ROOT, 'teaching-data', 'textbooks');
  try {
    const names = fs.readdirSync(textbooksPath).filter((n) => {
      const p = path.join(textbooksPath, n);
      return fs.statSync(p).isDirectory() && !n.startsWith('.');
    });
    res.json({ ok: true, courses: names });
  } catch {
    res.json({
      ok: true,
      courses: ['人工智能引论', 'Python程序设计', '操作系统原理与技术实现', '数据结构'],
    });
  }
});

const PORT = process.env.PORT || 3765;
app.listen(PORT, () => {
  const ws = checkWorkspace();
  console.log(`Teaching Assistant GUI: http://localhost:${PORT}`);
  console.log(`WORKSPACE_ROOT: ${WORKSPACE_ROOT}`);
  if (!ws.ok) console.warn('[警告]', ws.message);
});
