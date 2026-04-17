#!/usr/bin/env node
/**
 * 按课程逐个执行 OpenClaw memory index，减轻 embedding 接口 429（TPM 限流）。
 *
 * 用法（在 workspace 或项目根执行）：
 *   OPENCLAW_CONFIG_PATH=/path/to/openclaw.json node scripts/memory-index-by-course.js
 *   node scripts/memory-index-by-course.js --agent teaching --delay 120
 *
 * 会临时修改 openclaw.json 的 agents.defaults.memorySearch.extraPaths：
 * - 累积模式：第 1 次 extraPaths=[课程1]，第 2 次 extraPaths=[课程1,课程2]，…依次累积。
 * - OpenClaw 行为（已对 dist/manager-*.js 确认）：sync 后索引 = 当前 listMemoryFiles(extraPaths) 的并集；
 *   会删除「当前扫描里没有」的 path（stale），不会整体清空再重写。因此每次多加一门课再 index，
 *   之前已索引的课程仍在扫描范围内，不会被删，只会对新课程发 embedding，最终索引包含所有课程。
 * - 全部完成后恢复 extraPaths 为 [teaching-data] 根目录。
 *
 * 需设置 SILICONFLOW_API_KEY（或所用 embedding 的 apiKey）后再运行。
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE_DIR = path.resolve(__dirname, '..');
const TEACHING_DATA = path.join(WORKSPACE_DIR, 'teaching-data');
const DEFAULT_CONFIG_PATH = path.resolve(WORKSPACE_DIR, '..', 'openclaw.json');

// 不当作「课程」的目录名（参考、模板等）
const SKIP_DIRS = new Set(['参考', 'templates', 'course-materials', 'textbooks', '.git']);

function parseArgs() {
  const args = process.argv.slice(2);
  let agent = 'teaching';
  let delaySec = 120;
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--agent' && args[i + 1]) {
      agent = args[i + 1];
      i++;
    } else if (args[i] === '--delay' && args[i + 1]) {
      delaySec = Math.max(30, parseInt(args[i + 1], 10) || 120);
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }
  return { agent, delaySec, dryRun };
}

function listCourseDirs() {
  if (!fs.existsSync(TEACHING_DATA) || !fs.statSync(TEACHING_DATA).isDirectory()) {
    console.error('teaching-data 目录不存在或不是目录:', TEACHING_DATA);
    process.exit(1);
  }
  const names = fs.readdirSync(TEACHING_DATA);
  const courses = [];
  for (const name of names) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(TEACHING_DATA, name);
    try {
      if (fs.statSync(full).isDirectory()) courses.push({ name, path: full });
    } catch (_) {}
  }
  return courses.sort((a, b) => a.name.localeCompare(b.name));
}

function loadConfig(configPath) {
  const raw = fs.readFileSync(configPath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('openclaw.json 解析失败:', e.message);
    process.exit(1);
  }
}

function setExtraPaths(config, paths) {
  if (!config.agents || !config.agents.defaults || !config.agents.defaults.memorySearch) {
    console.error('配置中缺少 agents.defaults.memorySearch');
    process.exit(1);
  }
  config.agents.defaults.memorySearch.extraPaths = paths.slice();
}

function getExtraPaths(config) {
  return config.agents?.defaults?.memorySearch?.extraPaths ?? [];
}

function writeConfig(configPath, config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

function runIndex(agent, configPath, dryRun) {
  const cmd = `openclaw memory index --agent ${agent} --verbose`;
  console.log('[run]', cmd);
  if (dryRun) return;
  execSync(cmd, {
    stdio: 'inherit',
    env: { ...process.env, OPENCLAW_CONFIG_PATH: configPath }
  });
}

function sleep(sec) {
  return new Promise((r) => setTimeout(r, sec * 1000));
}

async function main() {
  const { agent, delaySec, dryRun } = parseArgs();
  const configPath = process.env.OPENCLAW_CONFIG_PATH || DEFAULT_CONFIG_PATH;
  if (!fs.existsSync(configPath)) {
    console.error('未找到配置文件:', configPath);
    process.exit(1);
  }

  const courses = listCourseDirs();
  if (courses.length === 0) {
    console.log('teaching-data 下没有课程目录，跳过。');
    return;
  }

  console.log('课程列表（共 %d 门）:', courses.length);
  courses.forEach((c, i) => console.log('  %d. %s', i + 1, c.name));
  console.log('');

  if (dryRun) {
    console.log('[dry-run] 将使用的配置: %s', configPath);
    console.log('[dry-run] 会依次执行: 第1门课 index → 等 %d 秒 → 前2门课 index → … → 共 %d 次，最后恢复 extraPaths 为 teaching-data 根目录', delaySec, courses.length);
    console.log('[dry-run] 去掉 --dry-run 后正式执行。');
    return;
  }

  const config = loadConfig(configPath);
  const originalPaths = getExtraPaths(config);

  const accumulatedPaths = [];
  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    accumulatedPaths.push(course.path);
    console.log('--- [%d/%d] 当前累积: %s ---', i + 1, courses.length, course.name);
    setExtraPaths(config, accumulatedPaths);
    writeConfig(configPath, config);
    runIndex(agent, configPath, dryRun);
    if (i < courses.length - 1) {
      console.log('等待 %d 秒后继续下一门课（减轻 429）...', delaySec);
      await sleep(delaySec);
    }
  }

  // 恢复为整库根目录，便于日后直接 openclaw memory index
  console.log('--- 恢复 extraPaths 为 teaching-data 根目录 ---');
  setExtraPaths(config, [TEACHING_DATA]);
  writeConfig(configPath, config);

  console.log('按课程索引完成。当前 extraPaths 已恢复为:', TEACHING_DATA);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
