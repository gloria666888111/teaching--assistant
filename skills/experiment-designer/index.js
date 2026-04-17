/**
 * Experiment Designer - 实验设计系统主入口
 *
 * 根据课程内容自动设计实验案例，生成示例实现和实验手册
 */

const path = require('path');
const fs = require('fs');
const fsp = fs.promises;

// 引入依赖
const { MaterialLoader } = require('../../lib/material-loader');
const { LLMClient } = require('../../lib/llm-client');
const DifficultyClassifier = require('./lib/difficulty-classifier');
const ExperimentPlanner = require('./lib/experiment-planner');
const ImplementationGenerator = require('./lib/implementation-generator');
const TestCaseGenerator = require('./lib/test-case-generator');
const ManualBuilder = require('./lib/manual-builder');

class ExperimentDesigner {
  constructor(options = {}) {
    // 初始化组件
    this.materialLoader = options.materialLoader || new MaterialLoader();
    this.difficultyClassifier = options.difficultyClassifier || new DifficultyClassifier();
    const llmClient = (options.llmConfig && (options.llmConfig.apiKey))
      ? new LLMClient({
          provider: options.llmConfig.provider || 'volcengine',
          apiKey: options.llmConfig.apiKey,
          model: options.llmConfig.model || 'deepseek-chat',
          timeout: options.llmConfig.timeout || 180000,
          extractChapterTimeout: options.llmConfig.extractChapterTimeout
        })
      : null;
    this.experimentPlanner = new ExperimentPlanner(this.materialLoader, this.difficultyClassifier, llmClient);
    this.difyRetriever = options.difyRetriever || null;
    this.useDify = options.useDify !== false;
    this.implementationGenerator = new ImplementationGenerator();
    this.testCaseGenerator = new TestCaseGenerator(this.difficultyClassifier);
    this.manualBuilder = new ManualBuilder();

    // 配置
    this.config = {
      dataDir: options.dataDir || 'teaching-data/textbooks',
      outputDir: options.outputDir || 'output/experiments',
      codeDir: 'code',
      manualDir: 'manuals'
    };
  }

  /**
   * 设计实验
   */
  async designExperiment(options = {}) {
    console.log('🔬 开始设计实验...');

    const {
      courseName,
      chapters = [],
      difficulty = null,
      type = null,
      language = 'python',
      outputDir = this.config.outputDir
    } = options;

    try {
      // 1. 规划实验
      console.log('📋 规划实验...');
      const experiment = await this.experimentPlanner.planExperiment({
        courseName,
        chapters,
        difficulty,
        type,
        difyRetriever: this.difyRetriever,
        useDify: this.useDify
      });

      console.log(`✅ 实验规划完成：${experiment.experimentTitle}`);
      console.log(`   类型：${experiment.experimentType}`);
      console.log(`   难度：${experiment.difficulty.name}`);

      // 2. 生成代码实现
      console.log('💻 生成代码实现...');
      const implementation = this.implementationGenerator.generateImplementation({
        experimentTitle: experiment.experimentTitle,
        experimentType: experiment.experimentType,
        knowledgePoints: experiment.knowledgePoints,
        difficulty: experiment.difficulty.name,
        language
      });

      console.log(`✅ 代码生成完成：${implementation.fileName}`);

      // 3. 生成测试用例
      console.log('🧪 生成测试用例...');
      const testCases = this.testCaseGenerator.generateTestCases({
        experimentType: experiment.experimentType,
        experimentTitle: experiment.experimentTitle,
        difficulty: experiment.difficulty.name,
        knowledgePoints: experiment.knowledgePoints
      });

      console.log(`✅ 测试用例生成完成：${testCases.length} 个`);

      // 4. 生成评分标准
      console.log('📊 生成评分标准...');
      const gradingCriteria = this.testCaseGenerator.generateGradingCriteria({
        experimentType: experiment.experimentType,
        difficulty: experiment.difficulty.name
      });

      console.log(`✅ 评分标准生成完成：总分 ${gradingCriteria.total} 分`);

      // 5. 保存代码文件
      console.log('💾 保存代码文件...');
      const codeOutputDir = path.join(outputDir, experiment.experimentTitle, this.config.codeDir);
      await fsp.mkdir(codeOutputDir, { recursive: true });
      const codePath = path.join(codeOutputDir, implementation.fileName);
      await this.implementationGenerator.saveCodeFile(implementation.code, codePath);

      console.log(`✅ 代码文件保存：${codePath}`);

      // 6. 构建实验手册
      console.log('📚 构建实验手册...');
      const manualOutputDir = path.join(outputDir, experiment.experimentTitle, this.config.manualDir);
      await fsp.mkdir(manualOutputDir, { recursive: true });
      const manualResult = await this.manualBuilder.buildManual({
        experiment,
        implementation,
        testCases,
        gradingCriteria,
        outputDir: manualOutputDir
      });

      console.log(`✅ Markdown手册保存：${manualResult.markdown.path}`);
      console.log(`✅ Word手册保存：${manualResult.word.path}`);

      // 7. 返回结果
      const result = {
        success: true,
        experiment,
        implementation: {
          ...implementation,
          path: codePath
        },
        testCases,
        gradingCriteria,
        manuals: manualResult,
        outputDir: path.join(outputDir, experiment.experimentTitle)
      };

      console.log('🎉 实验设计完成！');
      console.log(`📂 输出目录：${result.outputDir}`);

      return result;

    } catch (error) {
      console.error('❌ 实验设计失败：', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 批量设计实验
   */
  async batchDesign(options = {}) {
    const {
      courseName,
      chapters = [],
      difficulty = '基础',
      type = null,
      language = 'python'
    } = options;

    console.log('🔄 开始批量设计实验...');

    const results = [];

    // 为每个章节设计实验
    for (const chapter of chapters) {
      console.log(`\n处理章节：${chapter}`);

      const result = await this.designExperiment({
        courseName,
        chapters: [chapter],
        difficulty,
        type,
        language
      });

      results.push(result);
    }

    console.log('\n✅ 批量设计完成！');
    return results;
  }

  /**
   * 生成实验变体
   */
  async generateVariants(options = {}) {
    const {
      courseName,
      chapters = [],
      difficulties = ['基础', '进阶', '综合'],
      language = 'python'
    } = options;

    console.log('🔄 开始生成实验变体...');

    const variants = [];

    for (const difficulty of difficulties) {
      console.log(`\n生成难度：${difficulty}`);

      const result = await this.designExperiment({
        courseName,
        chapters,
        difficulty,
        language
      });

      if (result.success) {
        variants.push(result);
      }
    }

    console.log('\n✅ 变体生成完成！');
    return variants;
  }

  /**
   * 列出支持的课程
   */
  listCourses() {
    const courses = this.materialLoader.listCourses();
    return courses;
  }

  /**
   * 列出支持的实验类型
   */
  listExperimentTypes() {
    return [
      { type: 'programming', name: '编程实验', description: '代码实现和算法设计' },
      { type: 'configuration', name: '配置实验', description: '环境搭建和系统配置' },
      { type: 'analysis', name: '分析实验', description: '数据分析和性能测试' },
      { type: 'design', name: '设计实验', description: '系统设计和架构设计' },
      { type: 'comprehensive', name: '综合实验', description: '完整项目实战' }
    ];
  }

  /**
   * 列出支持的语言
   */
  listLanguages() {
    return [
      { lang: 'python', name: 'Python', extension: '.py' },
      { lang: 'c', name: 'C', extension: '.c' },
      { lang: 'cpp', name: 'C++', extension: '.cpp' },
      { lang: 'java', name: 'Java', extension: '.java' }
    ];
  }

  /**
   * 获取配置
   */
  getConfig() {
    return this.config;
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

// 导出
module.exports = ExperimentDesigner;

// 如果直接运行此文件
if (require.main === module) {
  const args = process.argv.slice(2);
  let courseName = null;
  let chapters = [];
  let difficulty = '进阶';
  let language = 'python';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--course' && args[i + 1]) {
      courseName = args[++i].replace(/^["']|["']$/g, '');
    } else if (args[i] === '--chapter' && args[i + 1]) {
      const ch = args[++i].replace(/^["']|["']$/g, '');
      chapters = [ch.includes('第') ? ch : `第${ch}章`];
    } else if (args[i] === '--difficulty' && args[i + 1]) {
      difficulty = args[++i];
    } else if (args[i] === '--language' && args[i + 1]) {
      language = args[++i];
    }
  }

  if (!courseName) {
    console.log('🧪 Experiment Designer - 直接运行用法\n');
    console.log('  推荐通过统一入口（会正确解析课程名）：');
    console.log('    node teaching-assistant.js "为《人工智能引论》第3章设计实验"\n');
    console.log('  或带参数运行本技能：');
    console.log('    node skills/experiment-designer/index.js --course "人工智能引论" --chapter 3 [--difficulty 进阶] [--language python]\n');
    process.exit(1);
  }

  const designer = new ExperimentDesigner();

  (async () => {
    console.log('🧪 Experiment Designer - 直接运行\n');
    console.log(`课程: ${courseName}, 章节: ${chapters.join('、') || '未指定'}, 难度: ${difficulty}\n`);

    try {
      const result = await designer.designExperiment({
        courseName,
        chapters: chapters.length > 0 ? chapters : [],
        difficulty,
        language
      });

      if (result.success) {
        console.log('\n✅ 实验设计成功！');
        console.log(`实验名称：${result.experiment.experimentTitle}`);
        console.log(`输出目录：${result.outputDir}`);
      } else {
        console.log('\n❌ 实验设计失败！');
        console.log(`错误：${result.error}`);
        process.exit(1);
      }
    } catch (error) {
      console.error('运行错误：', error);
      process.exit(1);
    }
  })();
}
