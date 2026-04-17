/**
 * 学情日志：记录每次课程答疑，供学情分析使用
 * 与 OpenClaw 记忆配合：可同时写入 memory/YYYY-MM-DD.md 一行，便于智能体「记得」学生问过什么
 */

const fs = require('fs').promises;
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'learning-logs');
const QA_LOG_FILE = path.join(LOG_DIR, 'qa.jsonl');
const MEMORY_DIR = path.join(__dirname, '..', 'memory');

/**
 * 追加一条答疑记录到 learning-logs/qa.jsonl
 * @param {string} courseName - 课程名
 * @param {number[]|null} chapters - 章节号数组，如 [3] 或 null（整门课）
 * @param {string} question - 学生问题（可截断防过长）
 * @param {boolean|object} [writeToMemoryOrMeta=true]
 *   - boolean: 是否同时写一行到 memory/YYYY-MM-DD.md（兼容旧签名）
 *   - object: { writeToMemory, studentId, channel, classId }
 */
async function appendQALog(courseName, chapters, question, writeToMemoryOrMeta = true) {
  const meta = typeof writeToMemoryOrMeta === 'object' && writeToMemoryOrMeta !== null
    ? writeToMemoryOrMeta
    : { writeToMemory: writeToMemoryOrMeta };
  const writeToMemory = meta.writeToMemory !== false;
  const ts = new Date().toISOString();
  const chapterStr = chapters && chapters.length > 0 ? chapters.join(',') : '';
  const record = {
    ts,
    course: courseName,
    chapters: chapterStr,
    question: String(question || '').slice(0, 500),
    studentId: String(meta.studentId || '').trim() || 'unknown-student',
    channel: String(meta.channel || '').trim() || 'unknown-channel',
    classId: String(meta.classId || '').trim() || 'unknown-class'
  };

  await fs.mkdir(LOG_DIR, { recursive: true });
  await fs.appendFile(QA_LOG_FILE, JSON.stringify(record) + '\n', 'utf8');

  if (writeToMemory) {
    try {
      const date = new Date().toISOString().slice(0, 10);
      const memoryFile = path.join(MEMORY_DIR, `${date}.md`);
      await fs.mkdir(MEMORY_DIR, { recursive: true });
      const studentLabel = record.studentId !== 'unknown-student' ? ` 学生:${record.studentId}` : '';
      const classLabel = record.classId !== 'unknown-class' ? ` 班级:${record.classId}` : '';
      const line = `- 学情：${courseName}${chapterStr ? ` 第${chapterStr}章` : ''}${studentLabel}${classLabel} 提问：${String(question).slice(0, 80)}${question.length > 80 ? '…' : ''}\n`;
      await fs.appendFile(memoryFile, line, 'utf8');
    } catch (_) {
      // 忽略 memory 写入失败
    }
  }
}

/**
 * 读取全部答疑记录（用于学情分析）
 * @returns {Promise<Array<{ ts, course, chapters, question, studentId, channel, classId }>>}
 */
async function readQALog() {
  try {
    const raw = await fs.readFile(QA_LOG_FILE, 'utf8');
    return raw
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .map(r => ({
        ...r,
        studentId: String(r.studentId || '').trim() || 'unknown-student',
        channel: String(r.channel || '').trim() || 'unknown-channel',
        classId: String(r.classId || '').trim() || 'unknown-class'
      }));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

module.exports = { appendQALog, readQALog, QA_LOG_FILE, LOG_DIR };
