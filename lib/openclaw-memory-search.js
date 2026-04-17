/**
 * 调用 OpenClaw memory search 从已建索引（teaching-data）检索片段
 * 供 semantic-context 优先用知识库取上下文，不足再回退 Dify/MaterialLoader
 */

const { execFileSync } = require('child_process');
const path = require('path');

/** 默认使用的 openclaw 配置（用户主配置） */
const DEFAULT_CONFIG_PATH = path.join(process.env.HOME || process.env.USERPROFILE || '', '.openclaw', 'openclaw.json');

/**
 * 调用 openclaw memory search，返回检索到的文本片段拼接
 * @param {string} query - 检索词（如 "《数据结构》第3章 树" 或 "数据结构 二叉树 遍历"）
 * @param {object} [opts]
 * @param {string} [opts.agent=teaching] - agent id
 * @param {number} [opts.maxResults=20] - 最多返回条数
 * @param {string} [opts.configPath] - openclaw.json 路径
 * @returns {{ ok: true, context: string } | { ok: false, error: string }}
 */
function search(query, opts = {}) {
  const agent = opts.agent || 'teaching';
  const maxResults = Math.min(Number(opts.maxResults) || 20, 50);
  const configPath = opts.configPath || process.env.OPENCLAW_CONFIG_PATH || DEFAULT_CONFIG_PATH;

  if (!query || String(query).trim() === '') {
    return { ok: false, error: 'query is empty' };
  }

  const args = ['memory', 'search', String(query).trim(), '--agent', agent, '--max-results', String(maxResults)];

  try {
    const env = { ...process.env };
    try {
      const fs = require('fs');
      if (fs.existsSync(configPath)) {
        env.OPENCLAW_CONFIG_PATH = configPath;
      }
    } catch (_) {}

    const stdout = execFileSync('openclaw', args, {
      encoding: 'utf8',
      timeout: 30000,
      env,
      maxBuffer: 4 * 1024 * 1024
    });

    const context = (stdout && typeof stdout === 'string' ? stdout.trim() : '') || '';
    if (context.length >= 200) {
      return { ok: true, context };
    }
    return { ok: false, error: 'insufficient results', context: '' };
  } catch (err) {
    const msg = (err.stderr || err.stdout || err.message || '').toString();
    return { ok: false, error: msg.slice(0, 500) };
  }
}

module.exports = { search };
