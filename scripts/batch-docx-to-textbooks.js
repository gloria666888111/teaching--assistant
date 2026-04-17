#!/usr/bin/env node
/**
 * 批量把 Word 教材转成 md，并写入 teaching-data/textbooks/课程名/textbook.md
 * 使用项目自带 skills/word-extract/scripts/extract_docx.py，需：pip install python-docx
 *
 * 用法：
 *   node scripts/batch-docx-to-textbooks.js [config.json]
 *
 * 配置文件格式（JSON）：课程名 -> docx 绝对路径
 *   {
 *     "Python程序设计": "/path/to/Python教材.docx",
 *     "101系统课程": "/path/to/101教材.docx"
 *   }
 *
 * 若不带参数，会从 scripts/docx-to-textbooks-config.json 读取（若存在）。
 */

const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

const WORKSPACE_ROOT = path.join(__dirname, '..');
const TEXTBOOKS_DIR = path.join(WORKSPACE_ROOT, 'teaching-data', 'textbooks');
const EXTRACT_SCRIPT = path.join(WORKSPACE_ROOT, 'skills', 'word-extract', 'scripts', 'extract_docx.py');

function runPythonExtract(docxPath, outputPath) {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', [EXTRACT_SCRIPT, docxPath, '--md', '-o', outputPath], {
      cwd: WORKSPACE_ROOT
    });
    let stderr = '';
    py.stderr.on('data', (d) => { stderr += d.toString(); });
    py.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `exit ${code}`));
    });
    py.on('error', (err) => reject(err));
  });
}

async function main() {
  const configPath = process.argv[2] || path.join(__dirname, 'docx-to-textbooks-config.json');
  let config;
  try {
    const raw = await fs.readFile(configPath, 'utf8');
    config = JSON.parse(raw);
  } catch (e) {
    if (process.argv[2]) {
      console.error('读取配置失败:', configPath, e.message);
      process.exit(1);
    }
    console.log('用法: node scripts/batch-docx-to-textbooks.js <config.json>');
    console.log('');
    console.log('配置文件示例（docx-to-textbooks-config.json）：');
    console.log(JSON.stringify({
      'Python程序设计': '/path/to/Python教材.docx',
      '101系统课程': '/path/to/101教材.docx'
    }, null, 2));
    console.log('');
    console.log('请创建上述 JSON 文件，把课程名和 docx 绝对路径填好后执行：');
    console.log('  node scripts/batch-docx-to-textbooks.js docx-to-textbooks-config.json');
    process.exit(0);
  }

  const entries = typeof config === 'object' && !Array.isArray(config)
    ? Object.entries(config)
    : Array.isArray(config)
      ? config.map(({ courseName, docxPath }) => [courseName, docxPath])
      : [];
  if (!entries.length) {
    console.error('配置为空，请填写 课程名 -> docx路径');
    process.exit(1);
  }

  await fs.mkdir(TEXTBOOKS_DIR, { recursive: true });
  for (const [courseName, docxPath] of entries) {
    const courseDir = path.join(TEXTBOOKS_DIR, courseName);
    const outputPath = path.join(courseDir, 'textbook.md');
    const absDocx = path.isAbsolute(docxPath) ? docxPath : path.resolve(WORKSPACE_ROOT, docxPath);
    try {
      await fs.mkdir(courseDir, { recursive: true });
      await runPythonExtract(absDocx, outputPath);
      console.log(`✓ ${courseName} -> ${outputPath}`);
    } catch (err) {
      console.error(`✗ ${courseName} (${absDocx}):`, err.message);
    }
  }
}

main();
