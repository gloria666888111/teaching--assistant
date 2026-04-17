/**
 * PDF Extract - PDF文本提取器
 *
 * 使用 pdftotext 提取PDF文件中的文本内容
 * 依赖: poppler-utils (pdftotext 命令)
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;

const execAsync = promisify(exec);

class PDFExtract {
  constructor() {
    // 检查 pdftotext 是否可用
    this.available = false;
    this.pdftotextPath = 'pdftotext';
  }

  /**
   * 检查 pdftotext 是否安装
   */
  async checkAvailability() {
    try {
      // 尝试调用 pdftotext --version
      const { stdout } = await execAsync('pdftotext -v 2>&1');
      if (stdout.includes('poppler')) {
        this.available = true;
        console.log('[PDF Extract] ✓ pdftotext 可用');
        return true;
      }
    } catch (error) {
      console.error('[PDF Extract] ✗ pdftotext 未安装');
      console.error('[PDF Extract] 请安装 poppler-utils:');
      console.error('  - Windows: choco install poppler');
      console.error('  - Ubuntu: sudo apt-get install poppler-utils');
      console.error('  - macOS: brew install poppler');
      return false;
    }
  }

  /**
   * 提取PDF文本
   * @param {string} pdfPath - PDF文件路径
   * @param {object} options - 配置选项
   * @returns {Promise<object>} 提取结果
   */
  async extract(pdfPath, options = {}) {
    const {
      pages = null,           // 页面范围，如 '1-5' 或 '1,3,5'
      encoding = 'UTF-8',     // 文本编码
      layout = 'raw'         // 布局模式: raw, layout, html
    } = options;

    // 检查可用性
    if (!this.available) {
      const isAvailable = await this.checkAvailability();
      if (!isAvailable) {
        throw new Error('pdftotext 不可用，请先安装 poppler-utils');
      }
    }

    // 检查PDF文件是否存在
    try {
      await fs.access(pdfPath);
    } catch {
      throw new Error(`PDF文件不存在: ${pdfPath}`);
    }

    // 构建输出文件路径
    const pdfDir = path.dirname(pdfPath);
    const pdfName = path.basename(pdfPath, path.extname(pdfPath));
    const outputPath = path.join(pdfDir, `${pdfName}.txt`);

    // 构建命令
    let command = `pdftotext`;

    // 添加编码参数
    if (encoding) {
      command += ` -enc ${encoding}`;
    }

    // 添加布局参数
    if (layout === 'raw') {
      command += ' -raw';
    } else if (layout === 'layout') {
      command += ' -layout';
    } else if (layout === 'html') {
      command += ' -htmlmeta';
    }

    // 添加页面范围
    if (pages) {
      command += ` -f ${pages.split('-')[0]}`;
      if (pages.includes('-')) {
        command += ` -l ${pages.split('-')[1]}`;
      }
    }

    command += ` "${pdfPath}" "${outputPath}"`;

    try {
      console.log(`[PDF Extract] 提取文本: ${pdfPath}`);

      const { stderr } = await execAsync(command, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024 // 10MB
      });

      if (stderr && !stderr.includes('syntax')) {
        console.warn(`[PDF Extract] ${stderr}`);
      }

      // 读取提取的文本
      const text = await fs.readFile(outputPath, 'utf-8');

      console.log(`[PDF Extract] ✓ 提取完成: ${text.length} 字符`);

      return {
        success: true,
        text,
        outputPath,
        pages: pages || 'all',
        encoding,
        layout
      };

    } catch (error) {
      console.error('[PDF Extract] 提取失败:', error.message);
      throw new Error(`PDF提取失败: ${error.message}`);
    }
  }

  /**
   * 提取PDF文本并转换为Markdown格式
   * @param {string} pdfPath - PDF文件路径
   * @param {string} outputPath - 输出文件路径
   * @param {object} options - 配置选项
   * @returns {Promise<object>}
   */
  async toMarkdown(pdfPath, outputPath, options = {}) {
    const result = await this.extract(pdfPath, options);

    if (!result.success) {
      return result;
    }

    // 简单的文本转Markdown
    const markdown = this.textToMarkdown(result.text);

    // 保存Markdown文件
    if (outputPath) {
      await fs.writeFile(outputPath, markdown, 'utf-8');
      console.log(`[PDF Extract] ✓ Markdown已保存: ${outputPath}`);
    }

    return {
      success: true,
      markdown,
      outputPath,
      text: result.text,
      ...options
    };
  }

  /**
   * 简单的文本转Markdown
   * @param {string} text - 纯文本
   * @returns {string} Markdown格式
   */
  textToMarkdown(text) {
    let lines = text.split('\n');
    let markdown = [];
    let inCodeBlock = false;

    for (let line of lines) {
      // 跳过空行
      if (!line.trim()) {
        markdown.push('');
        continue;
      }

      // 检测标题（简单的启发式规则）
      if (line.match(/^(第\s*[一二三四五六七八九十百]+\s*章|Chapter\s+\d+|第\s*\d+\s*节)/i)) {
        markdown.push(`\n## ${line.trim()}\n`);
      } else if (line.match(/^\d+\.\s+/)) {
        markdown.push(`\n### ${line.trim()}\n`);
      } else if (line.length < 50 && line === line.toUpperCase()) {
        markdown.push(`\n### ${line.trim()}\n`);
      } else {
        markdown.push(line);
      }
    }

    return markdown.join('\n');
  }
}

module.exports = { PDFExtract };
