const fs = require('fs').promises;
const path = require('path');

const DEFAULT_RULES_PATH = path.join(__dirname, '..', 'config', 'auto-reply-rules.json');

function normalize(text) {
  return String(text || '').trim().toLowerCase();
}

async function loadRules() {
  const filePath = process.env.AUTO_REPLY_RULES_PATH || DEFAULT_RULES_PATH;
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    const rules = Array.isArray(parsed.rules) ? parsed.rules : [];
    return {
      filePath,
      rules: rules.filter(rule => rule && rule.enabled !== false)
    };
  } catch (_) {
    return { filePath, rules: [] };
  }
}

function fillTemplate(template, context = {}) {
  return String(template || '')
    .replace(/\{courseName\}/g, context.courseName || '本课程')
    .replace(/\{question\}/g, context.question || '');
}

function containsAny(text, keywords = []) {
  if (!Array.isArray(keywords) || keywords.length === 0) return false;
  const norm = normalize(text);
  return keywords.some(k => norm.includes(normalize(k)));
}

async function applyAutoReplyRules({ courseName, question }) {
  const { rules } = await loadRules();
  if (!question || rules.length === 0) {
    return { handled: false, matchedRuleId: null, reply: null, escalatedToAI: false };
  }

  for (const rule of rules) {
    const keywords = Array.isArray(rule.keywords) ? rule.keywords : [];
    if (!containsAny(question, keywords)) continue;

    const mode = rule.mode || 'template';
    const reply = fillTemplate(rule.template, { courseName, question });

    if (mode === 'template') {
      return {
        handled: true,
        matchedRuleId: rule.id || 'unknown-rule',
        reply,
        escalatedToAI: false
      };
    }

    if (mode === 'template_then_ai') {
      const escalateKeywords = Array.isArray(rule.escalateKeywords) ? rule.escalateKeywords : [];
      const shouldEscalate = containsAny(question, escalateKeywords);
      if (shouldEscalate) {
        return {
          handled: false,
          matchedRuleId: rule.id || 'unknown-rule',
          reply,
          escalatedToAI: true
        };
      }
      return {
        handled: true,
        matchedRuleId: rule.id || 'unknown-rule',
        reply,
        escalatedToAI: false
      };
    }
  }

  return { handled: false, matchedRuleId: null, reply: null, escalatedToAI: false };
}

module.exports = {
  applyAutoReplyRules
};
