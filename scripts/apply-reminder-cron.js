#!/usr/bin/env node
/**
 * 将督学提醒计划 JSON 映射为 OpenClaw cron 任务
 * 用法：
 * node scripts/apply-reminder-cron.js \
 *   --plan output/reminders/督学提醒计划-20260416.json \
 *   --wecom-target "wecom:xxx" \
 *   --feishu-target "ou_xxx" \
 *   --agent teaching
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const DEFAULT_REMINDER_RULES_PATH = path.join(process.cwd(), 'config', 'reminder-rules.json');

function getArg(flag, fallback = null) {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : fallback;
}

function runOpenclaw(args) {
  const stdout = execFileSync('openclaw', args, {
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 4 * 1024 * 1024
  });
  return stdout.trim();
}

function parseJsonFromMixedOutput(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) throw new Error('empty output');
  const direct = (() => {
    try { return JSON.parse(trimmed); } catch { return null; }
  })();
  if (direct) return direct;

  const start = trimmed.lastIndexOf('\n{');
  const candidate = start >= 0 ? trimmed.slice(start + 1) : trimmed.slice(trimmed.indexOf('{'));
  return JSON.parse(candidate);
}

function normalizeName(raw) {
  return String(raw || 'reminder')
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function loadReminderRules(rulesPath) {
  try {
    const raw = fs.readFileSync(rulesPath, 'utf8');
    const parsed = JSON.parse(raw);
    const rules = Array.isArray(parsed.rules) ? parsed.rules.filter(r => r && r.enabled !== false) : [];
    const fallbackTemplates = parsed.fallbackTemplates && typeof parsed.fallbackTemplates === 'object'
      ? parsed.fallbackTemplates
      : {};
    return { rules, fallbackTemplates };
  } catch (_) {
    return { rules: [], fallbackTemplates: {} };
  }
}

function fillTemplate(template, context = {}) {
  return String(template || '')
    .replace(/\{courseName\}/g, context.courseName || '本课程')
    .replace(/\{studentId\}/g, context.studentId || 'unknown-student')
    .replace(/\{classId\}/g, context.classId || 'unknown-class')
    .replace(/\{channel\}/g, context.channel || 'unknown-channel');
}

function includesValue(arr, value) {
  if (!Array.isArray(arr) || arr.length === 0) return true;
  return arr.map(v => String(v)).includes(String(value));
}

function matchReminderRule(rule, ctx) {
  const when = rule.when || {};
  if (!includesValue(when.messageTypes, ctx.messageType)) return false;
  if (!includesValue(when.channels, ctx.channel)) return false;
  if (!includesValue(when.classIds, ctx.classId)) return false;
  if (!includesValue(when.studentIds, ctx.studentId)) return false;
  if (typeof when.minQuestionCount === 'number' && Number(ctx.questionCount || 0) < when.minQuestionCount) return false;
  if (typeof when.maxQuestionCount === 'number' && Number(ctx.questionCount || 0) > when.maxQuestionCount) return false;
  return true;
}

function getBaseTemplateKey(type) {
  if (/打卡/.test(type)) return 'checkin';
  if (/复盘/.test(type)) return 'weeklyReview';
  return 'dailyLearning';
}

function buildMessageByType(type, templates, reminderRules, recipient = {}, courseName = '') {
  const templateKey = getBaseTemplateKey(type);
  const ctx = {
    messageType: type,
    channel: recipient.channel || '',
    studentId: recipient.studentId || 'unknown-student',
    classId: recipient.classId || 'unknown-class',
    questionCount: Number(recipient.questionCount || 0),
    courseName
  };

  const sortedRules = [...(reminderRules.rules || [])].sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
  for (const rule of sortedRules) {
    if (!matchReminderRule(rule, ctx)) continue;
    if (rule.template) return fillTemplate(rule.template, ctx);
  }

  const defaultTemplate =
    reminderRules.fallbackTemplates[templateKey] ||
    templates[templateKey] ||
    templates.wecom ||
    templates.feishu ||
    (templateKey === 'checkin'
      ? '请按时完成今日学习打卡。'
      : (templateKey === 'weeklyReview' ? '请完成本周学习复盘。' : '请按计划完成今日学习任务。'));
  return fillTemplate(defaultTemplate, ctx);
}

function getRecipientsByChannel(channel, targetsConfig, singleTarget) {
  const fromConfig = Array.isArray(targetsConfig[channel]) ? targetsConfig[channel] : [];
  if (fromConfig.length > 0) {
    return fromConfig
      .filter(item => item && item.target)
      .map(item => ({
        target: String(item.target),
        studentId: String(item.studentId || 'unknown-student'),
        classId: String(item.classId || 'unknown-class'),
        questionCount: Number(item.questionCount || 0),
        channel
      }));
  }
  if (!singleTarget) return [];
  return [{
    target: String(singleTarget),
    studentId: 'unknown-student',
    classId: 'unknown-class',
    questionCount: 0,
    channel
  }];
}

function main() {
  const planPathArg = getArg('--plan');
  const planPath = planPathArg
    ? path.resolve(planPathArg)
    : path.join(process.cwd(), 'output', 'reminders', `督学提醒计划-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`);
  const agentId = getArg('--agent', 'teaching');
  const wecomTarget = getArg('--wecom-target', process.env.WECOM_TARGET);
  const feishuTarget = getArg('--feishu-target', process.env.FEISHU_TARGET);
  const targetsFile = getArg('--targets-file', process.env.REMINDER_TARGETS_FILE);
  const reminderRulesPath = getArg('--rules', process.env.REMINDER_RULES_PATH || DEFAULT_REMINDER_RULES_PATH);
  const dryRun = process.argv.includes('--dry-run');

  if (!fs.existsSync(planPath)) {
    throw new Error(`计划文件不存在: ${planPath}`);
  }
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  const reminderRules = loadReminderRules(reminderRulesPath);
  const targetsConfig = (targetsFile && fs.existsSync(path.resolve(targetsFile)))
    ? JSON.parse(fs.readFileSync(path.resolve(targetsFile), 'utf8'))
    : {};
  const schedules = Array.isArray(plan.schedules) ? plan.schedules : [];
  if (schedules.length === 0) {
    throw new Error('计划文件内缺少 schedules');
  }

  const existingNames = new Set();
  if (!dryRun) {
    const existingRaw = runOpenclaw(['cron', 'list', '--json']);
    const existing = parseJsonFromMixedOutput(existingRaw);
    for (const job of (existing.jobs || [])) existingNames.add(job.name);
  }
  const created = [];
  const skipped = [];

  for (const s of schedules) {
    const channels = Array.isArray(s.channels) ? s.channels : [];
    const msgType = s.messageType || '督学提醒';
    for (const ch of channels) {
      const isWecom = ch === 'wecom';
      const isFeishu = ch === 'feishu';
      const recipients = getRecipientsByChannel(
        ch,
        targetsConfig,
        isWecom ? wecomTarget : (isFeishu ? feishuTarget : null)
      );
      for (const recipient of recipients) {
        const msg = buildMessageByType(
          msgType,
          plan.templates || {},
          reminderRules,
          recipient,
          plan.targetCourse || '本课程'
        );
        const suffix = recipient.studentId && recipient.studentId !== 'unknown-student' ? `-${recipient.studentId}` : '';
        const name = normalizeName(`督学-${ch}-${s.id}${suffix}`);
        if (existingNames.has(name)) {
          skipped.push({ name, reason: 'exists' });
          continue;
        }

        const args = [
          'cron', 'add',
          '--name', name,
          '--agent', agentId,
          '--cron', s.cron,
          '--message', msg,
          '--announce',
          '--channel', ch,
          '--to', recipient.target,
          '--json'
        ];
        if (dryRun) {
          created.push({
            id: 'dry-run',
            name,
            channel: ch,
            cron: s.cron,
            to: recipient.target,
            studentId: recipient.studentId,
            classId: recipient.classId,
            messagePreview: msg.slice(0, 120)
          });
          continue;
        }
        const out = runOpenclaw(args);
        const parsed = parseJsonFromMixedOutput(out);
        created.push({
          id: parsed.id,
          name: parsed.name,
          channel: ch,
          cron: s.cron,
          to: recipient.target,
          studentId: recipient.studentId,
          classId: recipient.classId
        });
      }
    }
  }

  console.log(JSON.stringify({ planPath, rulesPath: reminderRulesPath, dryRun, created, skipped }, null, 2));
}

main();
