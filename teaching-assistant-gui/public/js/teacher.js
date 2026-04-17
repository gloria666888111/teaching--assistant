(function () {
  const API_BASE = ''; // 同源，由 server.js 提供

  // 页面加载时拉取课程列表并填充 select
  function loadCourses() {
    fetch(API_BASE + '/api/courses')
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok || !data.courses || !data.courses.length) return;
        const opts = data.courses.map((c) => `<option value="${c}">${c}</option>`).join('');
        ['quiz-course', 'exam-course', 'exp-course'].forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.innerHTML = opts;
        });
      })
      .catch(() => {});
  }
  loadCourses();

  // 工作区检查：若后端工作区不可用，提示用户
  fetch(API_BASE + '/api/workspace-check')
    .then((r) => r.json())
    .then((data) => {
      const el = document.getElementById('workspace-warn');
      if (!el) return;
      if (!data.ok) {
        el.textContent = '【无法生成题目】' + (data.message || '工作区未配置') + '。请用「WORKSPACE_ROOT=你的clawwork/workspace路径 npm start」启动服务。';
        el.style.display = 'block';
      }
    })
    .catch(() => {});

  function showResult(id, ok, message) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'block';
    el.className = 'result ' + (ok ? 'success' : 'error');
    el.textContent = message;
  }

  function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.disabled = loading;
      btn.textContent = loading ? '生成中…' : btn.getAttribute('data-label') || btn.textContent;
    }
  }

  document.getElementById('btn-quiz').setAttribute('data-label', '生成自测题');
  document.getElementById('btn-exam').setAttribute('data-label', '生成 AB 卷');
  document.getElementById('btn-exp').setAttribute('data-label', '生成实验方案');
  document.getElementById('btn-ppt').setAttribute('data-label', '生成 PPT');

  document.getElementById('btn-quiz').addEventListener('click', async function () {
    const course = document.getElementById('quiz-course').value;
    const chapter = document.getElementById('quiz-chapter').value.trim();
    if (!chapter) {
      showResult('result-quiz', false, '请填写章节');
      return;
    }
    setLoading('btn-quiz', true);
    showResult('result-quiz', true, '');
    try {
      const res = await fetch(API_BASE + '/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course, chapter }),
      });
      const data = await res.json();
      if (data.ok) {
        const msg = '已生成 → ' + (data.outputPath || data.outputDir || 'output/quizzes/');
        showResult('result-quiz', true, msg);
      } else {
        showResult('result-quiz', false, data.error || '生成失败');
      }
    } catch (e) {
      showResult('result-quiz', false, '请求失败: ' + (e.message || String(e)));
    }
    setLoading('btn-quiz', false);
  });

  document.getElementById('btn-exam').addEventListener('click', async function () {
    const course = document.getElementById('exam-course').value;
    const type = document.getElementById('exam-type').value;
    const chapters = document.getElementById('exam-chapters').value.trim();
    setLoading('btn-exam', true);
    showResult('result-exam', true, '');
    try {
      const body = { course, type };
      if (chapters) body.chapters = chapters;
      const res = await fetch(API_BASE + '/api/exam/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        showResult('result-exam', true, '已生成 → ' + (data.outputPath || data.outputDir || 'output/exams/'));
      } else {
        showResult('result-exam', false, data.error || '生成失败');
      }
    } catch (e) {
      showResult('result-exam', false, '请求失败: ' + (e.message || String(e)));
    }
    setLoading('btn-exam', false);
  });

  document.getElementById('btn-exp').addEventListener('click', async function () {
    const course = document.getElementById('exp-course').value;
    const chapter = document.getElementById('exp-chapter').value.trim();
    const difficulty = document.getElementById('exp-difficulty').value;
    if (!chapter) {
      showResult('result-exp', false, '请填写章节');
      return;
    }
    setLoading('btn-exp', true);
    showResult('result-exp', true, '');
    try {
      const body = { course, chapter };
      if (difficulty) body.difficulty = difficulty;
      const res = await fetch(API_BASE + '/api/experiment/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        showResult('result-exp', true, '已生成 → ' + (data.outputPath || data.outputDir || 'output/experiments/'));
      } else {
        showResult('result-exp', false, data.error || '生成失败');
      }
    } catch (e) {
      showResult('result-exp', false, '请求失败: ' + (e.message || String(e)));
    }
    setLoading('btn-exp', false);
  });

  document.getElementById('btn-ppt').addEventListener('click', async function () {
    const query = document.getElementById('ppt-query').value.trim();
    if (!query) {
      showResult('result-ppt', false, '请填写 PPT 主题');
      return;
    }
    setLoading('btn-ppt', true);
    showResult('result-ppt', true, '');
    try {
      const res = await fetch(API_BASE + '/api/ppt/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (data.ok) {
        showResult('result-ppt', true, '已提交 → ' + (data.outputPath || data.outputDir || 'output/ppts/'));
      } else {
        showResult('result-ppt', false, data.error || '生成失败');
      }
    } catch (e) {
      showResult('result-ppt', false, '请求失败: ' + (e.message || String(e)));
    }
    setLoading('btn-ppt', false);
  });
})();
