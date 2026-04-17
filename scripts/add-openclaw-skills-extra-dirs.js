#!/usr/bin/env node
/**
 * 将 clawwork 及指定路径下的所有技能加入 OpenClaw Dashboard 显示
 * 通过向 ~/.openclaw/openclaw.json 写入 skills.load.extraDirs 实现
 * 使用：node scripts/add-openclaw-skills-extra-dirs.js
 */

const fs = require('fs');
const path = require('path');

const OPENCLAW_DIR = process.env.OPENCLAW_STATE_DIR || path.join(process.env.HOME || process.env.USERPROFILE, '.openclaw');
const OPENCLAW_JSON = path.join(OPENCLAW_DIR, 'openclaw.json');

// 要纳入 Dashboard 的技能目录（所有技能都会在 Dashboard 显示）
const CANDIDATES = [
  path.join(process.env.HOME || process.env.USERPROFILE, '.openclaw', 'skills'),
  path.join(process.env.HOME || process.env.USERPROFILE, 'Desktop', 'clawwork', 'workspace', 'skills'),
  path.join(__dirname, '..', 'skills'), // 本仓库 workspace/skills（在 clawwork 内运行时）
  process.env.OPENCLAW_EXTRA_SKILLS_DIRS ? process.env.OPENCLAW_EXTRA_SKILLS_DIRS.split(path.delimiter).map(s => s.trim()) : [],
].flat();

const EXTRA_SKILLS_DIRS = CANDIDATES.filter(p => {
  if (!p || typeof p !== 'string') return false;
  const resolved = path.resolve(p.trim());
  try {
    return fs.existsSync(resolved);
  } catch {
    return false;
  }
});

// 去重（同一真实路径只保留一个）
const seen = new Set();
const uniqueDirs = EXTRA_SKILLS_DIRS.map(p => path.resolve(p)).filter(p => {
  if (seen.has(p)) return false;
  seen.add(p);
  return true;
});

function main() {
  let config = {};
  if (fs.existsSync(OPENCLAW_JSON)) {
    try {
      config = JSON.parse(fs.readFileSync(OPENCLAW_JSON, 'utf8'));
    } catch (e) {
      console.error('读取 openclaw.json 失败:', e.message);
      process.exit(1);
    }
  }

  if (!config.skills) config.skills = {};
  if (!config.skills.load) config.skills.load = {};
  config.skills.load.extraDirs = uniqueDirs;
  config.skills.load.watch = config.skills.load.watch !== false;
  config.skills.load.watchDebounceMs = config.skills.load.watchDebounceMs || 250;

  try {
    fs.mkdirSync(path.dirname(OPENCLAW_JSON), { recursive: true });
    fs.writeFileSync(OPENCLAW_JSON, JSON.stringify(config, null, 2) + '\n', 'utf8');
    console.log('已写入 skills.load.extraDirs 到:', OPENCLAW_JSON);
    console.log('extraDirs:', uniqueDirs);
    console.log('\n请重启 OpenClaw 网关后刷新 Dashboard，即可看到上述路径下的所有技能。');
  } catch (e) {
    console.error('写入失败:', e.message);
    process.exit(1);
  }
}

main();
