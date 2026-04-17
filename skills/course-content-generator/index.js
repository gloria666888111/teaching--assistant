/**
 * Course Content Generator - 课程内容生成器
 *
 * 根据课程资料生成详细的课件内容，用于辅助 PPT 生成
 */

const { MaterialLoader } = require('../../lib/material-loader');
const { LLMClient } = require('../../lib/llm-client');
const { getCourseForChapters } = require('../../lib/semantic-context');

class CourseContentGenerator {
  constructor(options = {}) {
    this.materialLoader = options.materialLoader || new MaterialLoader();
    this.llmClient = (options.llmConfig && options.llmConfig.apiKey)
      ? new LLMClient({
          provider: options.llmConfig.provider || 'volcengine',
          apiKey: options.llmConfig.apiKey,
          model: options.llmConfig.model || 'deepseek-chat',
          timeout: options.llmConfig.timeout || 180000,
          extractChapterTimeout: options.llmConfig.extractChapterTimeout
        })
      : null;
    this.difyRetriever = options.difyRetriever || null;
    this.useDify = options.useDify !== false;

    // 内容类型配置
    this.contentTypes = {
      courseware: {
        name: '教学课件',
        description: '生成适合 PPT 展示的教学内容',
        maxLength: 5000
      },
      outline: {
        name: '教学大纲',
        description: '生成课程大纲结构',
        maxLength: 3000
      },
      keypoints: {
        name: '重点难点',
        description: '提取课程重点和难点',
        maxLength: 2000
      },
      summary: {
        name: '章节总结',
        description: '生成章节内容总结',
        maxLength: 3000
      }
    };
  }

  /**
   * 生成课程内容
   * @param {object} options - 选项
   * @returns {object} 课程内容对象
   */
  async generateCourseContent(options = {}) {
    const {
      courseName,
      chapters = [],
      contentType = 'courseware',
      sections = []
    } = options;

    // 验证内容类型
    if (!this.contentTypes[contentType]) {
      throw new Error(`未知的内容类型: ${contentType}`);
    }

    console.log(`[${this.constructor.name}] 生成课程内容...`);
    console.log(`  课程: ${courseName}`);
    console.log(`  章节: ${chapters.join(', ') || '全部'}`);
    console.log(`  类型: ${this.contentTypes[contentType].name}`);

    try {
      // 课程与章节内容：统一由 getCourseForChapters 解析（Dify 或本地）
      const selectedCourse = await getCourseForChapters({
        materialLoader: this.materialLoader,
        llmClient: this.llmClient,
        courseName,
        chapters: chapters.length > 0 ? chapters : null,
        difyRetriever: this.difyRetriever,
        useDify: this.useDify
      });

      if (!selectedCourse) {
        throw new Error(`课程 "${courseName}" 未找到`);
      }

      // 根据内容类型生成内容
      let content = '';
      let structure = null;

      switch (contentType) {
        case 'courseware':
          content = this.generateCoursewareContent(selectedCourse, sections);
          structure = this.buildCoursewareStructure(selectedCourse);
          break;
        case 'outline':
          content = this.generateOutlineContent(selectedCourse);
          structure = this.buildOutlineStructure(selectedCourse);
          break;
        case 'keypoints':
          content = this.generateKeyPointsContent(selectedCourse);
          structure = this.buildKeyPointsStructure(selectedCourse);
          break;
        case 'summary':
          content = this.generateSummaryContent(selectedCourse);
          structure = this.buildSummaryStructure(selectedCourse);
          break;
      }

      // 截断过长的内容
      const maxLength = this.contentTypes[contentType].maxLength;
      if (content.length > maxLength) {
        content = content.substring(0, maxLength) + '\n\n...';
      }

      console.log(`✅ 内容生成完成: ${content.length} 字符`);

      return {
        courseName,
        chapters: chapters.length > 0 ? chapters : ['全部章节'],
        contentType,
        contentTypeName: this.contentTypes[contentType].name,
        content,
        structure
      };
    } catch (error) {
      console.error(`❌ 内容生成失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 生成教学课件内容
   */
  generateCoursewareContent(course, sections = []) {
    let content = '';

    // 添加标题
    if (course.name) {
      content += `# ${course.name}\n\n`;
    }

    // 添加大纲
    if (course.outline) {
      content += `## 课程大纲\n${course.outline}\n\n`;
    }

    // 添加知识点
    if (course.knowledge) {
      content += `## 知识点\n${course.knowledge}\n\n`;
    }

    // 添加教材内容（简化版）
    if (course.textbook) {
      content += `## 课程内容\n`;

      // 如果指定了章节，按章节组织
      if (sections.length > 0) {
        for (const section of sections) {
          content += `\n### ${section}\n`;
          // 这里可以根据 section 从 textbook 中提取相关内容
        }
      } else {
        content += `${this.simplifyTextbookContent(course.textbook, 1500)}\n\n`;
      }
    }

    return content;
  }

  /**
   * 生成大纲内容
   */
  generateOutlineContent(course) {
    let content = '';

    if (course.outline) {
      content += `# ${course.name} - 课程大纲\n\n`;
      content += course.outline;
    }

    return content;
  }

  /**
   * 生成重点难点内容
   */
  generateKeyPointsContent(course) {
    let content = '';

    content += `# ${course.name} - 重点难点\n\n`;

    // 从知识点中提取重点
    if (course.knowledge) {
      content += `## 重点知识点\n`;
      content += course.knowledge + '\n\n';
    }

    return content;
  }

  /**
   * 生成章节总结
   */
  generateSummaryContent(course) {
    let content = '';

    content += `# ${course.name} - 章节总结\n\n`;

    if (course.textbook) {
      content += `## 内容概要\n`;
      content += this.simplifyTextbookContent(course.textbook, 2000) + '\n\n';
    }

    return content;
  }

  /**
   * 简化教材内容（提取关键段落）
   */
  simplifyTextbookContent(textbook, maxLength = 1500) {
    if (!textbook) return '';

    // 按段落分割
    const paragraphs = textbook.split('\n\n').filter(p => p.trim());

    // 选择关键段落（包含关键词的段落）
    const keywords = ['定义', '概念', '原理', '方法', '步骤', '例子', '注意'];
    const keyParagraphs = paragraphs.filter(p =>
      keywords.some(keyword => p.includes(keyword))
    );

    // 如果关键段落不够，使用前几个段落
    let selectedParagraphs;
    if (keyParagraphs.length >= 5) {
      selectedParagraphs = keyParagraphs.slice(0, 8);
    } else {
      selectedParagraphs = paragraphs.slice(0, 8);
    }

    let content = selectedParagraphs.join('\n\n');

    // 截断到最大长度
    if (content.length > maxLength) {
      content = content.substring(0, maxLength);
      const lastNewline = content.lastIndexOf('\n');
      if (lastNewline > 0) {
        content = content.substring(0, lastNewline);
      }
    }

    return content;
  }

  /**
   * 构建课件结构
   */
  buildCoursewareStructure(course) {
    const structure = {
      title: course.name || '课程',
      sections: []
    };

    // 从大纲中提取结构
    if (course.outline) {
      const lines = course.outline.split('\n');
      let currentSection = null;

      for (const line of lines) {
        const trimmed = line.trim();

        // 检测章节标题（简单的启发式规则）
        if (/^#+\s+/.test(trimmed)) {
          // Markdown 标题
          const level = trimmed.match(/^#+/)[0].length;
          const title = trimmed.replace(/^#+\s+/, '');

          if (level === 1 && !structure.title.includes(title)) {
            structure.title = title;
          } else if (level === 2 || (level === 1 && structure.sections.length === 0)) {
            currentSection = { title, points: [] };
            structure.sections.push(currentSection);
          } else if (currentSection && level >= 2) {
            currentSection.points.push(title);
          }
        } else if (/^\d+\./.test(trimmed) || /^[-*]\s/.test(trimmed)) {
          // 列表项
          if (currentSection) {
            currentSection.points.push(trimmed);
          }
        }
      }
    }

    return structure;
  }

  /**
   * 构建大纲结构
   */
  buildOutlineStructure(course) {
    return this.buildCoursewareStructure(course);
  }

  /**
   * 构建重点难点结构
   */
  buildKeyPointsStructure(course) {
    const structure = {
      title: '重点与难点',
      keyPoints: [],
      difficulties: []
    };

    if (course.knowledge) {
      // 简单的启发式提取
      const lines = course.knowledge.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (/^[-*]\s/.test(trimmed) || /^\d+\./.test(trimmed)) {
          structure.keyPoints.push(trimmed);
        }
      }
    }

    return structure;
  }

  /**
   * 构建总结结构
   */
  buildSummaryStructure(course) {
    return {
      title: `${course.name} - 总结`,
      sections: [{
        title: '内容概要',
        points: [this.simplifyTextbookContent(course.textbook, 500)]
      }]
    };
  }

  /**
   * 生成 PPT 查询字符串
   * @param {object} courseContent - 课程内容对象
   * @returns {string} PPT 查询字符串
   */
  buildPPTQuery(courseContent) {
    const { courseName, chapters, content } = courseContent;

    let query = `${courseName}`;

    if (chapters && chapters.length > 0 && chapters[0] !== '全部章节') {
      query += ` - ${chapters.join(', ')}`;
    }

    // 添加内容摘要
    const contentSummary = content.substring(0, 1000);
    if (contentSummary) {
      query += `\n\n${contentSummary}`;
    }

    return query;
  }
}

module.exports = { CourseContentGenerator };
