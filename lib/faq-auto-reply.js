const fs = require('fs').promises;
const path = require('path');

const FAQ_ROOT = path.join(__dirname, '..', 'output', 'faq');

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[《》“”"'\s，。！？、：:；;（）()【】\[\]\-]/g, '');
}

function splitKeywords(text) {
  const cleaned = String(text || '')
    .toLowerCase()
    .replace(/[《》“”"'\n\r\t，。！？、：:；;（）()【】\[\]]/g, ' ');
  return cleaned
    .split(/\s+/)
    .map(s => s.trim())
    .filter(s => s.length >= 2);
}

async function readJsonSafe(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

async function listLatestFaqJsonForCourse(courseName) {
  const courseDir = path.join(FAQ_ROOT, courseName);
  let files = [];
  try {
    files = await fs.readdir(courseDir);
  } catch (_) {
    return null;
  }
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  if (jsonFiles.length === 0) return null;

  let latest = null;
  let latestMtime = 0;
  for (const file of jsonFiles) {
    const full = path.join(courseDir, file);
    try {
      const stat = await fs.stat(full);
      if (stat.mtimeMs > latestMtime) {
        latestMtime = stat.mtimeMs;
        latest = full;
      }
    } catch (_) {
      // ignore bad file
    }
  }
  return latest;
}

function scoreFaqItem(questionNorm, inputKeywords, item) {
  const itemQuestion = item.q || item.question || '';
  const itemAnswer = item.a || item.answer || '';
  if (!itemQuestion || !itemAnswer) return 0;

  const itemNorm = normalizeText(itemQuestion);
  let score = 0;
  if (itemNorm && questionNorm.includes(itemNorm.slice(0, Math.min(itemNorm.length, 12)))) score += 5;
  if (questionNorm && itemNorm.includes(questionNorm.slice(0, Math.min(questionNorm.length, 8)))) score += 3;

  const kw = Array.isArray(item.keywords) ? item.keywords : splitKeywords(itemQuestion);
  for (const k of kw) {
    const nk = normalizeText(k);
    if (nk && questionNorm.includes(nk)) score += 1;
  }
  for (const k of inputKeywords) {
    if (k && itemNorm.includes(k)) score += 1;
  }
  return score;
}

async function getFAQAutoReply(courseName, question, minScore = 3) {
  if (!courseName || !question) return null;

  const faqJson = await listLatestFaqJsonForCourse(courseName);
  if (!faqJson) return null;
  const data = await readJsonSafe(faqJson);
  if (!data || !Array.isArray(data.faqs) || data.faqs.length === 0) return null;

  const questionNorm = normalizeText(question);
  const inputKeywords = splitKeywords(question).map(normalizeText).filter(Boolean);

  let best = null;
  let bestScore = 0;
  for (const item of data.faqs) {
    const score = scoreFaqItem(questionNorm, inputKeywords, item);
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  if (!best || bestScore < minScore) return null;

  return {
    answer: String(best.a || best.answer || '').trim(),
    matchedQuestion: String(best.q || best.question || '').trim(),
    score: bestScore,
    sourceFile: faqJson
  };
}

module.exports = {
  getFAQAutoReply
};
