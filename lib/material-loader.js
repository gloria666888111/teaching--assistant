/**
 * 教学资料加载器
 *
 * 核心功能：
 * 1. 查找和读取课程资料（教材、课件、讲义等）
 * 2. 构建课程的"知识上下文"用于LLM
 * 3. 提供统一的接口供各个教学技能使用
 */

const fs = require('fs').promises;
const path = require('path');
const { PDFExtract } = require('./pdf-extract');

class MaterialLoader {
  /** 非课程目录名（在 teaching-data 根下排除，不作为课程文件夹） */
  static NON_COURSE_DIRS = ['course-materials', 'templates', 'textbooks'];

  constructor(config = {}) {
    this.baseDir = path.join(__dirname, '..', 'teaching-data');
    /** 课程目录：直接放在 teaching-data 根下，按课程名分文件夹 */
    this.textbooksDir = this.baseDir;
    this.materialsDir = path.join(this.baseDir, 'course-materials');
    this.cache = new Map(); // 缓存已加载的资料
    this.pdfExtract = new PDFExtract();
    /** 可选：传入后可使用 filterByChapters 的 useSemantic 或直接调用 filterByChaptersSemantic */
    this.llmClient = config.llmClient || null;
  }

  /**
   * 解析章节参数为数字数组
   * @param {string|array} chapters - "3-5" | [3,4,5] | ["第3章"]
   * @returns {number[]}
   */
  _parseChapterRanges(chapters) {
    if (chapters == null) return [];
    if (typeof chapters === 'string') {
      const match = chapters.match(/(\d+)[-~至]?(\d+)?/);
      if (match && match[2] != null) {
        const start = parseInt(match[1], 10);
        const end = parseInt(match[2], 10);
        const arr = [];
        for (let i = start; i <= end; i++) arr.push(i);
        return arr;
      }
      const num = parseInt(chapters.replace(/\D/g, ''), 10);
      return Number.isInteger(num) ? [num] : [];
    }
    if (Array.isArray(chapters)) {
      return chapters.map(ch => {
        if (typeof ch === 'number') return ch;
        return parseInt(String(ch).replace(/\D/g, ''), 10);
      }).filter(n => Number.isInteger(n));
    }
    return [];
  }

  /**
   * 根据课程名称加载所有相关资料
   * @param {string} courseName - 课程名称
   * @returns {object} 课程资料对象
   */
  async loadCourse(courseName) {
    // 检查缓存
    if (this.cache.has(courseName)) {
      console.log(`[MaterialLoader] 从缓存加载: ${courseName}`);
      return this.cache.get(courseName);
    }

    console.log(`[MaterialLoader] 正在加载课程资料: ${courseName}`);

    const course = {
      name: courseName,
      textbook: null,
      outline: null,
      knowledge: null,
      slides: [],
      notes: [],
      cases: [],
      exercises: [],
      references: null
    };

    try {
      // 1. 查找教材目录
      const textbookDir = await this.findCourseDir(this.textbooksDir, courseName);
      if (textbookDir) {
        // 加载教材文件
        const textbookFile = await this.findTextbookFile(textbookDir);
        if (textbookFile) {
          course.textbook = await this.readFile(textbookFile);
        }

        // 加载大纲
        const outlineFile = path.join(textbookDir, 'outline.md');
        try {
          course.outline = await this.readFile(outlineFile);
        } catch {
          // 大纲文件不存在，尝试从教材提取
          console.log(`[MaterialLoader] 大纲文件不存在，可从教材提取`);
        }

        // 加载知识点
        const knowledgeFile = path.join(textbookDir, 'knowledge.md');
        try {
          course.knowledge = await this.readFile(knowledgeFile);
        } catch {
          // 知识点文件不存在，可后续用LLM生成
          console.log(`[MaterialLoader] 知识点文件不存在，可用LLM生成`);
        }

        // 加载元数据
        const metadataFile = path.join(textbookDir, 'metadata.json');
        try {
          const metadataContent = await fs.readFile(metadataFile, 'utf-8');
          course.metadata = JSON.parse(metadataContent);
        } catch {
          course.metadata = null;
        }
      }

      // 2. 查找课程资料目录
      const materialsDir = await this.findCourseDir(this.materialsDir, courseName);
      if (materialsDir) {
        // 加载课件
        const slidesDir = path.join(materialsDir, 'slides');
        try {
          const slideFiles = await this.readDirRecursive(slidesDir);
          course.slides = await Promise.all(
            slideFiles.map(file => this.readFile(file))
          );
        } catch {
          console.log(`[MaterialLoader] 课件目录不存在`);
        }

        // 加载讲义
        const notesDir = path.join(materialsDir, 'notes');
        try {
          const noteFiles = await this.readDirRecursive(notesDir);
          course.notes = await Promise.all(
            noteFiles.map(file => this.readFile(file))
          );
        } catch {
          console.log(`[MaterialLoader] 讲义目录不存在`);
        }

        // 加载案例
        const casesDir = path.join(materialsDir, 'cases');
        try {
          const caseFiles = await this.readDirRecursive(casesDir);
          course.cases = await Promise.all(
            caseFiles.map(file => this.readFile(file))
          );
        } catch {
          console.log(`[MaterialLoader] 案例目录不存在`);
        }

        // 加载习题
        const exercisesDir = path.join(materialsDir, 'exercises');
        try {
          const exerciseFiles = await this.readDirRecursive(exercisesDir);
          course.exercises = await Promise.all(
            exerciseFiles.map(file => this.readFile(file))
          );
        } catch {
          console.log(`[MaterialLoader] 习题目录不存在`);
        }

        // 加载参考资料
        const referencesFile = path.join(materialsDir, 'references.md');
        try {
          course.references = await this.readFile(referencesFile);
        } catch {
          course.references = null;
        }
      }

      // 缓存结果
      this.cache.set(courseName, course);
      console.log(`[MaterialLoader] 课程资料加载完成`);

      return course;

    } catch (error) {
      console.error(`[MaterialLoader] 加载课程资料失败:`, error.message);
      throw new Error(`无法加载课程"${courseName}"的资料: ${error.message}`);
    }
  }

  /**
   * 根据章节筛选资料内容（规则：按「第N章」标题行切分）
   * @param {object} course - 课程资料对象
   * @param {string|array} chapters - 章节范围，如"3-5"或[3,4,5]
   * @param {object} [options] - { useSemantic: true } 时走语义抽取；可传 options.llmClient 覆盖实例的 llmClient
   * @returns {Promise<object>} 筛选后的课程对象
   */
  async filterByChapters(course, chapters, options = {}) {
    const chapterRanges = this._parseChapterRanges(chapters);
    if (!chapterRanges.length) return { ...course };

    const llmClient = options.llmClient != null ? options.llmClient : this.llmClient;
    if (options.useSemantic && llmClient && typeof llmClient.extractChapterContent === 'function') {
      console.log(`[MaterialLoader] 筛选章节（语义检索）:`, chapterRanges);
      return this.filterByChaptersSemantic(course, chapterRanges, { ...options, llmClient });
    }

    console.log(`[MaterialLoader] 筛选章节:`, chapterRanges);
    const result = { ...course };

    // 筛选函数：只保留“指定章节”内的内容，不保留前言、目录等无章节标题的内容
    const filterContent = (content) => {
      if (!content) return '';

      const lines = content.split('\n');
      const filtered = [];
      let currentChapter = null;
      let inTargetChapter = false;

      for (const line of lines) {
        const chapterMatch = line.match(/第(\d+)章/);
        if (chapterMatch) {
          currentChapter = parseInt(chapterMatch[1]);
          inTargetChapter = chapterRanges.includes(currentChapter);
        }

        // 仅保留目标章节内的行（不保留 currentChapter 为 null 的前言/目录等）
        if (inTargetChapter) {
          filtered.push(line);
        }
      }

      return filtered.join('\n');
    };

    // 应用筛选
    result.textbook = filterContent(course.textbook);
    result.outline = filterContent(course.outline);
    result.knowledge = filterContent(course.knowledge);
    result.slides = (course.slides || []).map(filterContent);
    result.notes = (course.notes || []).map(filterContent);

    return result;
  }

  /**
   * 按章节语义抽取：用 LLM 判断并只保留指定章节的正文（不依赖「第N章」标题格式）
   * 需在构造时传入 llmClient 或调用时通过 options.llmClient 传入。
   * @param {object} course - 课程资料对象
   * @param {number[]} chapterNumbers - 章节号数组，如 [10]
   * @param {object} [options] - { maxFullLength: 40000, llmClient } 等
   * @returns {Promise<object>} 筛选后的课程对象（textbook 为抽取出的章节正文）
   */
  async filterByChaptersSemantic(course, chapterNumbers, options = {}) {
    const llmClient = options.llmClient != null ? options.llmClient : this.llmClient;
    if (!llmClient || typeof llmClient.extractChapterContent !== 'function') {
      console.warn('[MaterialLoader] 未配置 llmClient 或缺少 extractChapterContent，回退到规则筛选');
      return await this.filterByChapters(course, chapterNumbers, {});
    }
    const maxLength = options.maxFullLength != null ? options.maxFullLength : 40000;
    const fullContext = this.buildContext(course, {
      includeTextbook: true,
      includeOutline: true,
      includeKnowledge: false,
      includeSlides: false,
      includeNotes: false,
      includeCases: false,
      maxLength
    });
    const extracted = await llmClient.extractChapterContent(
      fullContext,
      course.name,
      chapterNumbers
    );
    const result = { ...course };
    if (extracted && extracted.length >= 200) {
      result.textbook = extracted;
      result.outline = '';
      result.knowledge = '';
      result.slides = [];
      result.notes = [];
      return result;
    }
    console.warn('[MaterialLoader] 语义抽取结果过短，回退到规则筛选');
    return await this.filterByChapters(course, chapterNumbers, {});
  }

  /**
   * 构建用于LLM的上下文
   * @param {object} course - 课程资料对象
   * @param {object} options - 选项
   * @returns {string} 格式化的上下文文本
   */
  buildContext(course, options = {}) {
    const {
      includeTextbook = true,
      includeOutline = true,
      includeKnowledge = true,
      includeSlides = true,
      includeNotes = true,
      includeCases = true,
      maxLength = 50000 // 上下文最大长度（字符）
    } = options;

    let context = '';
    context += `# 课程: ${course.name}\n\n`;

    // 添加元数据
    if (course.metadata) {
      context += `## 课程信息\n`;
      context += `- 课程代码: ${course.metadata.courseCode || 'N/A'}\n`;
      context += `- 教材: ${course.metadata.author || 'N/A'}《${course.name}》\n`;
      context += `- 出版社: ${course.metadata.publisher || 'N/A'}\n`;
      context += `- 章节数: ${course.metadata.chapters || 'N/A'}\n\n`;
    }

    // 添加大纲
    if (includeOutline && course.outline) {
      context += `## 课程大纲\n`;
      context += course.outline + '\n\n';
    }

    // 添加知识点
    if (includeKnowledge && course.knowledge) {
      context += `## 知识点\n`;
      context += course.knowledge + '\n\n';
    }

    // 添加教材内容
    if (includeTextbook && course.textbook) {
      context += `## 教材内容\n`;
      context += course.textbook + '\n\n';
    }

    // 添加课件
    if (includeSlides && course.slides.length > 0) {
      context += `## 课件内容\n`;
      course.slides.forEach((slide, idx) => {
        context += `### 课件 ${idx + 1}\n${slide}\n\n`;
      });
    }

    // 添加讲义
    if (includeNotes && course.notes.length > 0) {
      context += `## 讲义内容\n`;
      course.notes.forEach((note, idx) => {
        context += `### 讲义 ${idx + 1}\n${note}\n\n`;
      });
    }

    // 添加案例
    if (includeCases && course.cases.length > 0) {
      context += `## 案例内容\n`;
      course.cases.forEach((caseItem, idx) => {
        context += `### 案例 ${idx + 1}\n${caseItem}\n\n`;
      });
    }

    // 截断超长内容
    if (context.length > maxLength) {
      console.log(`[MaterialLoader] 上下文过长 (${context.length}字符)，截断到 ${maxLength} 字符`);
      context = context.substring(0, maxLength) + '\n\n... (内容已截断)';
    }

    return context;
  }

  /**
   * 查找课程目录（支持模糊匹配）
   * @param {string} baseDir - 基础目录
   * @param {string} courseName - 课程名称
   * @returns {string|null} 课程目录路径
   */
  async findCourseDir(baseDir, courseName) {
    try {
      const entries = await fs.readdir(baseDir, { withFileTypes: true });
      let dirs = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
      if (baseDir === this.baseDir) {
        dirs = dirs.filter(d => !MaterialLoader.NON_COURSE_DIRS.includes(d));
      }

      // 精确匹配
      if (dirs.includes(courseName)) {
        return path.join(baseDir, courseName);
      }

      // 模糊匹配
      const normalized = courseName.toLowerCase().replace(/\s/g, '');
      for (const dir of dirs) {
        const normalizedDir = dir.toLowerCase().replace(/\s/g, '');
        if (normalizedDir.includes(normalized) || normalized.includes(normalizedDir)) {
          console.log(`[MaterialLoader] 模糊匹配: "${courseName}" -> "${dir}"`);
          return path.join(baseDir, dir);
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 查找教材文件
   * @param {string} dir - 目录
   * @returns {string|null} 文件路径
   */
  async findTextbookFile(dir) {
    const extensions = ['.md', '.docx', '.pdf', '.txt'];
    const priority = ['textbook', '教材', 'book'];

    try {
      const files = await fs.readdir(dir);

      // 优先查找指定名称的文件
      for (const name of priority) {
        for (const ext of extensions) {
          const file = path.join(dir, name + ext);
          try {
            await fs.access(file);
            return file;
          } catch {
            // 文件不存在，继续尝试
          }
        }
      }

      // 查找任意支持的文件
      for (const file of files) {
        for (const ext of extensions) {
          if (file.toLowerCase().endsWith(ext)) {
            return path.join(dir, file);
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 读取文件内容（支持多种格式）
   * @param {string} filePath - 文件路径
   * @returns {string} 文件内容
   */
  async readFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.md':
      case '.txt':
        return await fs.readFile(filePath, 'utf-8');

      case '.pdf':
        return await this.readPDF(filePath);

      case '.docx':
        return await this.readWord(filePath);

      default:
        throw new Error(`不支持的文件格式: ${ext}`);
    }
  }

  /**
   * 读取PDF文件内容
   * @param {string} filePath - PDF文件路径
   * @returns {string} PDF文本内容
   */
  async readPDF(filePath) {
    console.log(`[MaterialLoader] 读取PDF文件: ${filePath}`);

    try {
      // 使用 PDFExtract 提取文本
      const result = await this.pdfExtract.extract(filePath);

      if (result.success) {
        console.log(`[MaterialLoader] ✓ PDF提取完成: ${result.text.length} 字符`);
        return result.text;
      } else {
        throw new Error('PDF提取失败');
      }
    } catch (error) {
      console.error(`[MaterialLoader] PDF读取失败: ${error.message}`);
      console.error(`[MaterialLoader] 请确保已安装 pdftotext (poppler-utils)`);
      return `[PDF文件: ${path.basename(filePath)}\n\n⚠️ 读取失败: ${error.message}\n\n请安装 pdftotext:\n  Windows: choco install poppler\n  Ubuntu: sudo apt-get install poppler-utils\n  macOS: brew install poppler]`;
    }
  }

  /**
   * 读取Word文档内容
   * @param {string} filePath - Word文档路径
   * @returns {string} Word文档文本内容
   */
  async readWord(filePath) {
    console.log(`[MaterialLoader] 读取Word文档: ${filePath}`);

    try {
      const { spawn } = require('child_process');
      const scriptPath = path.join(__dirname, '..', 'skills', 'word-extract', 'scripts', 'extract_docx.py');

      return new Promise((resolve, reject) => {
        const python = spawn('python', [scriptPath, filePath], {
          cwd: __dirname
        });

        let stdout = '';
        let stderr = '';

        python.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        python.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        python.on('close', (code) => {
          if (code === 0) {
            console.log(`[MaterialLoader] ✓ Word提取完成: ${stdout.length} 字符`);
            resolve(stdout);
          } else {
            reject(new Error(`Word提取失败 (code ${code}): ${stderr}`));
          }
        });

        python.on('error', (error) => {
          reject(new Error(`无法运行Python: ${error.message}\n\n请确保:\n1. Python已安装\n2. python-docx已安装: pip install python-docx`));
        });
      });
    } catch (error) {
      console.error(`[MaterialLoader] Word读取失败: ${error.message}`);
      return `[Word文件: ${path.basename(filePath)}\n\n⚠️ 读取失败: ${error.message}\n\n请确保:\n1. Python已安装\n2. python-docx已安装: pip install python-docx]`;
    }
  }

  /**
   * 递归读取目录下所有文件
   * @param {string} dir - 目录
   * @returns {array} 文件路径数组
   */
  async readDirRecursive(dir) {
    const files = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.readDirRecursive(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // 目录不存在或无权限访问
    }

    return files;
  }

  /**
   * 列出所有可用课程
   * @returns {array} 课程名称数组
   */
  async listCourses() {
    const courses = [];

    try {
      const entries = await fs.readdir(this.textbooksDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !MaterialLoader.NON_COURSE_DIRS.includes(entry.name)) {
          courses.push(entry.name);
        }
      }
    } catch (error) {
      console.error(`[MaterialLoader] 列出课程失败:`, error.message);
    }

    return courses;
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
    console.log(`[MaterialLoader] 缓存已清除`);
  }

  /**
   * 将PDF文件转换为Markdown格式
   * @param {string} pdfPath - PDF文件路径
   * @param {string} outputPath - 输出Markdown文件路径（可选）
   * @returns {Promise<object>} 转换结果
   */
  async convertPDFToMarkdown(pdfPath, outputPath) {
    console.log(`[MaterialLoader] 将PDF转换为Markdown: ${pdfPath}`);

    // 如果没有指定输出路径，自动生成
    if (!outputPath) {
      const pdfDir = path.dirname(pdfPath);
      const pdfName = path.basename(pdfPath, path.extname(pdfPath));
      outputPath = path.join(pdfDir, `${pdfName}.md`);
    }

    try {
      const result = await this.pdfExtract.toMarkdown(pdfPath, outputPath);

      if (result.success) {
        console.log(`[MaterialLoader] ✓ Markdown已保存: ${outputPath}`);
        return result;
      } else {
        throw new Error('PDF转Markdown失败');
      }
    } catch (error) {
      console.error(`[MaterialLoader] PDF转Markdown失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 将Word文档转换为Markdown格式
   * @param {string} wordPath - Word文档路径
   * @param {string} outputPath - 输出Markdown文件路径（可选）
   * @returns {Promise<object>} 转换结果
   */
  async convertWordToMarkdown(wordPath, outputPath) {
    console.log(`[MaterialLoader] 将Word转换为Markdown: ${wordPath}`);

    // 如果没有指定输出路径，自动生成
    if (!outputPath) {
      const wordDir = path.dirname(wordPath);
      const wordName = path.basename(wordPath, path.extname(wordPath));
      outputPath = path.join(wordDir, `${wordName}.md`);
    }

    try {
      const { spawn } = require('child_process');
      const scriptPath = path.join(__dirname, '..', 'skills', 'word-extract', 'scripts', 'extract_docx.py');

      return new Promise((resolve, reject) => {
        const python = spawn('python', [scriptPath, wordPath, '--md', '-o', outputPath], {
          cwd: __dirname
        });

        let stdout = '';
        let stderr = '';

        python.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        python.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        python.on('close', (code) => {
          if (code === 0) {
            console.log(`[MaterialLoader] ✓ Markdown已保存: ${outputPath}`);
            resolve({ success: true, outputPath, text: stdout });
          } else {
            reject(new Error(`Word转Markdown失败 (code ${code}): ${stderr}`));
          }
        });

        python.on('error', (error) => {
          reject(new Error(`无法运行Python: ${error.message}`));
        });
      });
    } catch (error) {
      console.error(`[MaterialLoader] Word转Markdown失败: ${error.message}`);
      throw error;
    }
  }
}

module.exports = { MaterialLoader };
