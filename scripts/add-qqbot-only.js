#!/usr/bin/env node
/**
 * 仅添加 QQbot，不修改现有通信方式与其它配置
 * - 将 qqbot 技能中的运行文件复制到 ~/.openclaw/workspace/
 * - 在 openclaw.json 中仅增加 channels.qq（若不存在），不覆盖已有配置
 * 使用：node scripts/add-qqbot-only.js
 * 或：cd /Users/lhx666/Desktop/clawwork/workspace && node scripts/add-qqbot-only.js
 */

const fs = require('fs');
const path = require('path');

const OPENCLAW_DIR = process.env.OPENCLAW_STATE_DIR || path.join(process.env.HOME || process.env.USERPROFILE, '.openclaw');
const OPENCLAW_JSON = path.join(OPENCLAW_DIR, 'openclaw.json');
const WORKSPACE = path.join(OPENCLAW_DIR, 'workspace');
const QQ_QUEUE = path.join(WORKSPACE, 'qq_queue');

// 从本仓库 skills/qqbot 复制到 workspace 的文件
const SCRIPT_DIR = path.resolve(__dirname);
const WORKSPACE_ROOT = path.join(SCRIPT_DIR, '..');
const QQBOT_SKILL = path.join(WORKSPACE_ROOT, 'skills', 'qqbot');
const FILES = ['qq_official_bot.py', 'qq_bot_daemon.sh', 'qq_ai_handler.sh'];

/** 从 skills/qqbot 的 config 里读取你之前填好的 appId / clientSecret */
function loadQqbotCreds() {
  const paths = [
    path.join(QQBOT_SKILL, 'config.example.json'),
    path.join(QQBOT_SKILL, 'config.json')
  ];
  for (const p of paths) {
    if (!fs.existsSync(p)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      const qq = data.qqbot || data.qq || data.channels?.qq;
      if (qq && (qq.appId || qq.appID) && (qq.clientSecret || qq.appSecret)) {
        return {
          appId: String(qq.appId || qq.appID).trim(),
          appSecret: String(qq.clientSecret || qq.appSecret).trim()
        };
      }
    } catch (_) {}
  }
  return null;
}

function main() {
  console.log('🤖 添加 QQbot（仅新增，不改变其它通信与软件）\n');

  if (!fs.existsSync(QQBOT_SKILL)) {
    console.error('❌ 未找到 qqbot 技能目录:', QQBOT_SKILL);
    process.exit(1);
  }

  const creds = loadQqbotCreds();
  if (creds) {
    console.log('📌 使用仓库内已有凭证 config.example.json（appId:', creds.appId + '）');
  } else {
    console.log('⚠️ 未找到 qqbot 凭证，将复制占位符，请稍后编辑 qq_official_bot.py');
  }

  fs.mkdirSync(WORKSPACE, { recursive: true });
  fs.mkdirSync(QQ_QUEUE, { recursive: true });

  console.log('📁 复制 QQ Bot 运行文件到', WORKSPACE);
  for (const name of FILES) {
    const src = path.join(QQBOT_SKILL, name);
    const dest = path.join(WORKSPACE, name);
    if (!fs.existsSync(src)) {
      console.warn('⚠️ 跳过（不存在）:', name);
      continue;
    }
    let content = fs.readFileSync(src, 'utf8');
    if (name === 'qq_official_bot.py' && creds) {
      content = content
        .replace(/APP_ID\s*=\s*["'][^"']*["']/, `APP_ID = "${creds.appId}"`)
        .replace(/APP_SECRET\s*=\s*["'][^"']*["']/, `APP_SECRET = "${creds.appSecret}"`);
      fs.writeFileSync(dest, content, 'utf8');
    } else {
      fs.copyFileSync(src, dest);
    }
    if (name.endsWith('.sh')) {
      try { fs.chmodSync(dest, 0o755); } catch (_) {}
    }
    console.log('   ✅', name);
  }

  let config = {};
  if (fs.existsSync(OPENCLAW_JSON)) {
    try {
      config = JSON.parse(fs.readFileSync(OPENCLAW_JSON, 'utf8'));
    } catch (e) {
      console.warn('⚠️ 读取 openclaw.json 失败，跳过配置合并:', e.message);
    }
  }

  if (!config.channels) config.channels = {};
  if (!config.channels.qq) {
    config.channels.qq = {
      enabled: true,
      appId: creds ? creds.appId : '',
      appSecret: creds ? creds.appSecret : ''
    };
    try {
      fs.mkdirSync(path.dirname(OPENCLAW_JSON), { recursive: true });
      fs.writeFileSync(OPENCLAW_JSON, JSON.stringify(config, null, 2) + '\n', 'utf8');
      console.log('\n📝 已在 openclaw.json 中新增 channels.qq（未改动其它配置）');
    } catch (e) {
      console.warn('⚠️ 写入 openclaw.json 失败:', e.message);
    }
  } else {
    console.log('\n📝 openclaw.json 中已有 channels.qq，未修改');
  }

  const botPy = path.join(WORKSPACE, 'qq_official_bot.py');
  const daemonSh = path.join(WORKSPACE, 'qq_bot_daemon.sh');
  console.log('\n═══════════════════════════════════════════');
  console.log(creds ? '下一步（凭证已从 config.example.json 写入）：' : '下一步（请按顺序完成）：');
  console.log('═══════════════════════════════════════════');
  if (!creds) {
    console.log('1. 编辑 QQ 机器人凭证：');
    console.log('   ', botPy);
    console.log('   将 APP_ID、APP_SECRET 改为你在 QQ 开放平台创建机器人后得到的 AppID / AppSecret');
    console.log('');
  }
  console.log(creds ? '1' : '2', '. 在 QQ 机器人控制台配置 IP 白名单：');
  console.log('   https://bot.q.qq.com/console/ → 开发设置 → IP 白名单');
  console.log('   添加当前公网 IP: curl -s https://api.ipify.org');
  console.log('');
  console.log(creds ? '2' : '3', '. 启动 QQ Bot：');
  console.log('   ', daemonSh, 'start');
  console.log('');
  console.log(creds ? '3' : '4', '. （可选）启动 AI 回复处理器，否则 QQ 消息需手动回复：');
  console.log('   ', path.join(WORKSPACE, 'qq_ai_handler.sh'));
  console.log('   或配置其它服务监听', QQ_QUEUE, '并写入 ai_response_<request_id>.txt');
  console.log('');
  console.log('其它命令：status / stop / restart / log');
  console.log('   ', daemonSh, '{ status | stop | restart | log }');
  console.log('═══════════════════════════════════════════\n');
}

main();
