/**
 * Quiz Exporter - 自测题导出器
 *
 * 支持多种格式导出：Markdown、HTML、JSON
 */

class QuizExporter {
  /**
   * 导出所有格式
   * @param {string} courseName - 课程名
   * @param {string} chapterStr - 章节
   * @param {object} questions - 题目
   * @param {array} formats - 格式列表 ['md', 'html', 'json']
   * @returns {Promise<object>} 文件路径
   */
  async exportAll(courseName, chapterStr, questions, formats = ['md']) {
    const files = {};
    const date = new Date().toISOString().split('T')[0];
    const baseFileName = `第${chapterStr}章-${date}`;

    for (const format of formats) {
      switch (format) {
        case 'md':
          files.md = await this.exportMarkdown(courseName, chapterStr, questions, baseFileName);
          break;
        case 'html':
          files.html = await this.exportHTML(courseName, chapterStr, questions, baseFileName);
          break;
        case 'json':
          files.json = await this.exportJSON(courseName, chapterStr, questions, baseFileName);
          break;
        default:
          console.warn(`不支持的格式: ${format}`);
      }
    }

    return files;
  }

  /**
   * 导出 Markdown 格式
   * @param {string} courseName - 课程名
   * @param {string} chapterStr - 章节
   * @param {object} questions - 题目
   * @param {string} baseFileName - 基础文件名
   * @returns {Promise<string>} 文件路径
   */
  async exportMarkdown(courseName, chapterStr, questions, baseFileName) {
    const fs = require('fs').promises;
    const path = require('path');

    const outputDir = path.join(__dirname, '../../../output/quizzes', courseName);
    await fs.mkdir(outputDir, { recursive: true });

    const mdPath = path.join(outputDir, `${baseFileName}-完整版.md`);
    const mdContent = this.generateMarkdown(courseName, chapterStr, questions);
    await fs.writeFile(mdPath, mdContent, 'utf-8');

    // 分别导出各难度
    for (const difficulty of ['basic', 'advanced', 'challenge']) {
      if (questions[difficulty].length > 0) {
        const diffPath = path.join(outputDir, `${baseFileName}-${difficulty === 'basic' ? '基础题' : difficulty === 'advanced' ? '进阶题' : '挑战题'}.md`);
        await fs.writeFile(diffPath, this.generateMarkdownByDifficulty(courseName, chapterStr, questions, difficulty), 'utf-8');
      }
    }

    return mdPath;
  }

  /**
   * 生成 Markdown 内容
   * @param {string} courseName - 课程名
   * @param {string} chapterStr - 章节
   * @param {object} questions - 题目
   * @returns {string} Markdown
   */
  generateMarkdown(courseName, chapterStr, questions) {
    let md = `# 《${courseName}》第${chapterStr}章 自测题\n\n`;
    md += `生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`;

    const sections = [
      { key: 'basic', title: '基础题' },
      { key: 'advanced', title: '进阶题' },
      { key: 'challenge', title: '挑战题' }
    ];

    sections.forEach(section => {
      if (questions[section.key].length > 0) {
        md += `## ${section.title}（${questions[section.key].length}题）\n\n`;
        md += this.generateQuestionsMarkdown(questions[section.key]);
        md += '\n';
      }
    });

    md += `## 参考答案与解析\n\n`;
    md += this.generateAnswersMarkdown(questions);

    return md;
  }

  /**
   * 生成题目 Markdown
   * @param {array} questions - 题目列表
   * @returns {string} Markdown
   */
  generateQuestionsMarkdown(questions) {
    return questions.map((q, idx) => {
      let md = `${idx + 1}. ${q.content}\n`;

      if (q.type === 'choice' && q.options) {
        q.options.forEach(opt => {
          md += `   ${opt}\n`;
        });
      }

      if (q.type === 'code_analysis' && q.code) {
        md += `   \`\`\`python\n${q.code}\n   \`\`\`\n`;
      }

      return md + '\n';
    }).join('');
  }

  /**
   * 生成答案 Markdown
   * @param {object} questions - 题目
   * @returns {string} Markdown
   */
  generateAnswersMarkdown(questions) {
    let md = '';

    const sections = ['basic', 'advanced', 'challenge'];
    const titles = ['基础', '进阶', '挑战'];

    sections.forEach((difficulty, idx) => {
      if (questions[difficulty].length > 0) {
        md += `### ${titles[idx]}题答案\n\n`;

        questions[difficulty].forEach((q, qIdx) => {
          md += `${qIdx + 1}. 答案：${q.answer}\n`;
          md += `   难度：${titles[idx]}\n`;
          md += `   解析：${q.explanation}\n\n`;
        });
      }
    });

    return md;
  }

  /**
   * 按难度生成 Markdown
   * @param {string} courseName - 课程名
   * @param {string} chapterStr - 章节
   * @param {object} questions - 题目
   * @param {string} difficulty - 难度
   * @returns {string} Markdown
   */
  generateMarkdownByDifficulty(courseName, chapterStr, questions, difficulty) {
    const qs = questions[difficulty];
    const titles = { basic: '基础', advanced: '进阶', challenge: '挑战' };

    let md = `# 《${courseName}》第${chapterStr}章 - ${titles[difficulty]}题\n\n`;
    md += `生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += this.generateQuestionsMarkdown(qs);
    md += `\n## 参考答案\n\n`;
    md += qs.map((q, idx) => {
      return `${idx + 1}. 答案：${q.answer}\n   解析：${q.explanation}\n`;
    }).join('\n\n');

    return md;
  }

  /**
   * 导出 HTML 格式
   * @param {string} courseName - 课程名
   * @param {string} chapterStr - 章节
   * @param {object} questions - 题目
   * @param {string} baseFileName - 基础文件名
   * @returns {Promise<string>} 文件路径
   */
  async exportHTML(courseName, chapterStr, questions, baseFileName) {
    const fs = require('fs').promises;
    const path = require('path');

    const outputDir = path.join(__dirname, '../../../output/quizzes', courseName);
    await fs.mkdir(outputDir, { recursive: true });

    const htmlPath = path.join(outputDir, `${baseFileName}-交互式.html`);
    const htmlContent = this.generateHTML(courseName, chapterStr, questions);
    await fs.writeFile(htmlPath, htmlContent, 'utf-8');

    return htmlPath;
  }

  /**
   * 生成 HTML 内容
   * @param {string} courseName - 课程名
   * @param {string} chapterStr - 章节
   * @param {object} questions - 题目
   * @returns {string} HTML
   */
  generateHTML(courseName, chapterStr, questions) {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>《${courseName}》第${chapterStr}章 自测题</title>
    <style>
        body {
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #2196F3;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #2196F3;
        }
        .question {
            margin-bottom: 25px;
            padding: 15px;
            background: #f9f9f9;
            border-left: 4px solid #2196F3;
            border-radius: 4px;
        }
        .question-content {
            font-size: 16px;
            margin-bottom: 10px;
            font-weight: 500;
        }
        .options {
            margin: 10px 0 10px 20px;
        }
        .option {
            margin: 5px 0;
            padding: 5px 10px;
            cursor: pointer;
            border-radius: 4px;
            transition: background 0.2s;
        }
        .option:hover {
            background: #e3f2fd;
        }
        .code-block {
            background: #263238;
            color: #aed581;
            padding: 15px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            margin: 10px 0;
            overflow-x: auto;
        }
        .answer-toggle {
            margin-top: 15px;
        }
        .toggle-btn {
            background: #2196F3;
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
        }
        .toggle-btn:hover {
            background: #1976D2;
        }
        .answer {
            display: none;
            margin-top: 15px;
            padding: 15px;
            background: #fff3e0;
            border-left: 4px solid #ff9800;
            border-radius: 4px;
        }
        .answer.show {
            display: block;
        }
        .answer-label {
            font-weight: bold;
            color: #e65100;
        }
        .explanation {
            margin-top: 10px;
            color: #666;
            line-height: 1.6;
        }
        .difficulty-tag {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            margin-left: 10px;
        }
        .difficulty-basic { background: #c8e6c9; color: #2e7d32; }
        .difficulty-advanced { background: #fff9c4; color: #f57f17; }
        .difficulty-challenge { background: #ffcdd2; color: #c62828; }
        .footer {
            text-align: center;
            color: #999;
            margin-top: 30px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>《${courseName}》第${chapterStr}章 自测题</h1>
        <p style="text-align: center; color: #666; margin-bottom: 30px;">
            生成时间: ${new Date().toLocaleString('zh-CN')}
        </p>
        ${this.generateQuestionsHTML(questions)}
        <div class="footer">
            <p>点击"查看答案"可查看答案与详细解析</p>
        </div>
    </div>
    <script>
        function toggleAnswer(btn) {
            const answerDiv = btn.nextElementSibling;
            answerDiv.classList.toggle('show');
            btn.textContent = answerDiv.classList.contains('show') ? '隐藏答案' : '查看答案';
        }
    </script>
</body>
</html>`;

    return html;
  }

  /**
   * 生成题目 HTML
   * @param {object} questions - 题目
   * @returns {string} HTML
   */
  generateQuestionsHTML(questions) {
    let html = '';

    const sections = [
      { key: 'basic', title: '基础题', color: 'difficulty-basic' },
      { key: 'advanced', title: '进阶题', color: 'difficulty-advanced' },
      { key: 'challenge', title: '挑战题', color: 'difficulty-challenge' }
    ];

    sections.forEach(section => {
      if (questions[section.key].length > 0) {
        html += `<div class="section">\n`;
        html += `  <div class="section-title">${section.title}（${questions[section.key].length}题）</div>\n`;
        html += questions[section.key].map((q, idx) => {
          let qHtml = `  <div class="question">\n`;
          qHtml += `    <div class="question-content">${idx + 1}. ${q.content}`;
          qHtml += `      <span class="difficulty-tag ${section.color}">${section.title.replace('题', '')}</span>\n`;
          qHtml += `    </div>\n`;

          if (q.type === 'choice' && q.options) {
            qHtml += `    <div class="options">\n`;
            q.options.forEach(opt => {
              qHtml += `      <div class="option">${opt}</div>\n`;
            });
            qHtml += `    </div>\n`;
          }

          if (q.type === 'code_analysis' && q.code) {
            qHtml += `    <div class="code-block">${this.escapeHTML(q.code)}</div>\n`;
          }

          qHtml += `    <div class="answer-toggle">\n`;
          qHtml += `      <button class="toggle-btn" onclick="toggleAnswer(this)">查看答案</button>\n`;
          qHtml += `      <div class="answer">\n`;
          qHtml += `        <div class="answer-label">答案：${this.escapeHTML(String(q.answer))}</div>\n`;
          qHtml += `        <div class="explanation">${this.escapeHTML(q.explanation)}</div>\n`;
          qHtml += `      </div>\n`;
          qHtml += `    </div>\n`;
          qHtml += `  </div>\n`;

          return qHtml;
        }).join('');
        html += `</div>\n`;
      }
    });

    return html;
  }

  /**
   * 导出 JSON 格式
   * @param {string} courseName - 课程名
   * @param {string} chapterStr - 章节
   * @param {object} questions - 题目
   * @param {string} baseFileName - 基础文件名
   * @returns {Promise<string>} 文件路径
   */
  async exportJSON(courseName, chapterStr, questions, baseFileName) {
    const fs = require('fs').promises;
    const path = require('path');

    const outputDir = path.join(__dirname, '../../../output/quizzes', courseName);
    await fs.mkdir(outputDir, { recursive: true });

    const jsonPath = path.join(outputDir, `${baseFileName}-数据.json`);
    const jsonContent = this.generateJSON(courseName, chapterStr, questions);
    await fs.writeFile(jsonPath, jsonContent, 'utf-8');

    return jsonPath;
  }

  /**
   * 生成 JSON 内容
   * @param {string} courseName - 课程名
   * @param {string} chapterStr - 章节
   * @param {object} questions - 题目
   * @returns {string} JSON
   */
  generateJSON(courseName, chapterStr, questions) {
    const allQuestions = [];

    ['basic', 'advanced', 'challenge'].forEach(difficulty => {
      questions[difficulty].forEach(q => {
        allQuestions.push({
          id: q.id,
          type: q.type,
          difficulty: q.difficulty,
          course: courseName,
          chapter: chapterStr,
          content: q.content,
          ...(q.options && { options: q.options }),
          ...(q.code && { code: q.code }),
          answer: q.answer,
          explanation: q.explanation
        });
      });
    });

    return JSON.stringify({
      course: courseName,
      chapter: chapterStr,
      generateTime: new Date().toISOString(),
      totalQuestions: questions.basic.length + questions.advanced.length + questions.challenge.length,
      summary: {
        basic: questions.basic.length,
        advanced: questions.advanced.length,
        challenge: questions.challenge.length
      },
      questions: allQuestions
    }, null, 2);
  }

  /**
   * HTML 转义
   * @param {string} text - 文本
   * @returns {string} 转义后的文本
   */
  escapeHTML(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

module.exports = { QuizExporter };
