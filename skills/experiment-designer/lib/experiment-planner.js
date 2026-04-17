/**
 * ExperimentPlanner - 实验规划器
 *
 * 分析课程内容，识别知识点，规划实验题目
 * 指定章节时优先使用语义抽取（需传入 llmClient）。
 */

const { getCourseForChapters } = require('../../../lib/semantic-context');

class ExperimentPlanner {
  constructor(materialLoader, difficultyClassifier, llmClient = null) {
    this.materialLoader = materialLoader;
    this.difficultyClassifier = difficultyClassifier;
    this.llmClient = llmClient;

    // 实验类型判断规则
    this.experimentTypeRules = {
      programming: {
        keywords: ['算法', '数据结构', '编程', '代码', '实现', '函数', '类'],
        courses: ['数据结构', '算法', '程序设计', '编译原理', '人工智能']
      },
      configuration: {
        keywords: ['配置', '环境', '安装', '部署', '搭建', '设置'],
        courses: ['操作系统', '计算机网络', '计算机系统', 'Linux']
      },
      analysis: {
        keywords: ['分析', '性能', '测试', '数据', '统计', '评估'],
        courses: ['人工智能', '数据分析', '机器学习', '数据挖掘']
      },
      design: {
        keywords: ['设计', '架构', '系统', '数据库', '建模', 'UML'],
        courses: ['软件工程', '数据库', '系统设计', '架构']
      },
      comprehensive: {
        keywords: ['项目', '综合', '实战', '系统', '完整'],
        courses: ['综合', '项目', '毕业设计']
      }
    };
  }

  /**
   * 规划实验
   */
  async planExperiment(options = {}) {
    const {
      courseName,
      chapters = [],
      difficulty = null,
      type = null,
      difyRetriever = null,
      useDify = true
    } = options;

    // 课程与章节内容：统一由 getCourseForChapters 解析（Dify 或本地，内部不再重复 loadCourse）
    const selectedCourse = await getCourseForChapters({
      materialLoader: this.materialLoader,
      llmClient: this.llmClient,
      courseName,
      chapters: chapters.length > 0 ? chapters : null,
      difyRetriever,
      useDify
    });

    if (!selectedCourse || (!selectedCourse.textbook && !selectedCourse.outline && !selectedCourse.knowledge)) {
      throw new Error(`课程 "${courseName}" 未找到或无可用内容`);
    }

    const content = [
      selectedCourse.textbook || '',
      selectedCourse.outline || '',
      selectedCourse.knowledge || ''
    ].filter(s => s.trim()).join('\n\n');

    // 判断实验类型（用 courseName 与 content，selectedCourse 即「课程」）
    const experimentType = type || this.inferExperimentType(courseName, content);

    // 判断难度
    const difficultyLevel = this.difficultyClassifier.classify({
      courseName,
      content: content,
      level: difficulty
    });

    console.log(`[ExperimentPlanner] 难度级别：`, JSON.stringify(difficultyLevel, null, 2));

    // 提取知识点
    const knowledgePoints = this.extractKnowledgePoints(selectedCourse);

    // 生成实验题目
    const experiment = this.generateExperimentTitle(
      courseName,
      knowledgePoints,
      experimentType,
      difficultyLevel.name
    );

    // 生成实验目的
    const objectives = this.generateObjectives(knowledgePoints, experimentType);

    // 生成实验步骤
    const steps = this.generateSteps(experimentType, difficultyLevel.name, knowledgePoints);

    // 构建实验规划
    return {
      experimentTitle: experiment,
      experimentType: experimentType,
      difficulty: {
        name: difficultyLevel.name,
        description: difficultyLevel.description,
        complexity: difficultyLevel.complexity,
        timeEstimate: difficultyLevel.timeEstimate,
        codeLines: difficultyLevel.codeLines
      },
      course: {
        name: courseName,
        chapters: chapters.length > 0 ? chapters : '全部章节'
      },
      knowledgePoints,
      objectives,
      steps: this.expandSteps(steps),
      environment: this.inferEnvironment(experimentType, courseName),
      requirements: this.generateRequirements(experimentType, difficultyLevel.name)
    };
  }

  /**
   * 推断实验类型
   */
  inferExperimentType(courseName, content) {
    const lowerCourseName = courseName.toLowerCase();
    const lowerContent = content ? content.toLowerCase() : '';

    let scores = {
      programming: 0,
      configuration: 0,
      analysis: 0,
      design: 0,
      comprehensive: 0
    };

    // 根据课程名称评分
    for (const [type, rule] of Object.entries(this.experimentTypeRules)) {
      for (const keyword of rule.courses) {
        if (lowerCourseName.includes(keyword.toLowerCase())) {
          scores[type] += 3;
        }
      }
    }

    // 根据内容评分
    for (const [type, rule] of Object.entries(this.experimentTypeRules)) {
      for (const keyword of rule.keywords) {
        const regex = new RegExp(keyword, 'gi');
        const matches = content.match(regex);
        if (matches) {
          scores[type] += matches.length;
        }
      }
    }

    // 找出最高分
    const maxScore = Math.max(...Object.values(scores));
    const topType = Object.keys(scores).find(type => scores[type] === maxScore);

    // 如果综合实验分数也很高，优先返回综合实验
    if (scores.comprehensive >= maxScore * 0.8) {
      return 'comprehensive';
    }

    return topType;
  }

  /**
   * 提取知识点
   */
  extractKnowledgePoints(course) {
    const points = [];
    const content = course.content || '';

    // 使用正则表达式提取章节标题
    const chapterRegex = /##\s+(第[一二三四五六七八九十\d]+章[^\n]*)/g;
    const sectionRegex = /###\s+([^\n]+)/g;

    // 提取章节
    let chapterMatch;
    while ((chapterMatch = chapterRegex.exec(content)) !== null) {
      points.push({
        type: 'chapter',
        title: chapterMatch[1].trim()
      });
    }

    // 提取小节
    let sectionMatch;
    while ((sectionMatch = sectionRegex.exec(content)) !== null) {
      points.push({
        type: 'section',
        title: sectionMatch[1].trim()
      });
    }

    // 如果没有提取到，从课程大纲获取
    if (points.length === 0 && course.outline) {
      const outline = course.outline;
      const lines = outline.split('\n');
      for (const line of lines) {
        if (line.trim() && !line.startsWith('#')) {
          points.push({
            type: 'topic',
            title: line.trim()
          });
        }
      }
    }

    return points.slice(0, 5); // 最多返回5个主要知识点
  }

  /**
   * 生成实验题目
   */
  generateExperimentTitle(courseName, knowledgePoints, experimentType, difficulty) {
    if (knowledgePoints.length === 0) {
      return `${courseName} - ${difficulty}实验`;
    }

    const mainPoint = knowledgePoints[0].title;

    const typeSuffixes = {
      programming: '实现',
      configuration: '配置与应用',
      analysis: '分析与实践',
      design: '设计',
      comprehensive: '综合项目'
    };

    return `${mainPoint}${typeSuffixes[experimentType] || '实验'}`;
  }

  /**
   * 生成实验目的
   */
  generateObjectives(knowledgePoints, experimentType) {
    const objectives = [];

    // 基础目的
    objectives.push('掌握相关知识点的基本概念和原理');

    // 根据实验类型添加特定目的
    switch (experimentType) {
      case 'programming':
        objectives.push('提高编程能力和代码实现技巧');
        objectives.push('理解算法的设计思想和实现方法');
        break;
      case 'configuration':
        objectives.push('掌握系统的配置方法');
        objectives.push('理解配置项的作用和影响');
        break;
      case 'analysis':
        objectives.push('培养数据分析和问题诊断能力');
        objectives.push('学会使用分析工具和方法');
        break;
      case 'design':
        objectives.push('掌握系统设计的基本方法');
        objectives.push('提高架构设计能力');
        break;
      case 'comprehensive':
        objectives.push('综合运用多个知识点完成项目');
        objectives.push('培养系统思维和问题解决能力');
        break;
    }

    // 根据知识点添加特定目的
    for (const point of knowledgePoints.slice(0, 2)) {
      objectives.push(`理解并掌握${point.title}的核心内容`);
    }

    return objectives.slice(0, 5); // 最多5个目的
  }

  /**
   * 生成实验步骤（简化版）
   */
  generateSteps(experimentType, difficulty, knowledgePoints) {
    const steps = [];

    // 通用步骤
    steps.push('环境准备');

    switch (experimentType) {
      case 'programming':
        steps.push('需求分析');
        steps.push('算法设计');
        steps.push('代码实现');
        steps.push('测试验证');
        if (difficulty === '综合') {
          steps.push('性能优化');
          steps.push('文档编写');
        }
        break;

      case 'configuration':
        steps.push('系统安装');
        steps.push('基础配置');
        steps.push('功能验证');
        if (difficulty === '进阶' || difficulty === '综合') {
          steps.push('高级配置');
          steps.push('故障排查');
        }
        break;

      case 'analysis':
        steps.push('数据准备');
        steps.push('分析方案设计');
        steps.push('数据分析实施');
        steps.push('结果可视化');
        if (difficulty === '综合') {
          steps.push('报告撰写');
        }
        break;

      case 'design':
        steps.push('需求分析');
        steps.push('方案设计');
        steps.push('原型构建');
        steps.push('评审优化');
        break;

      case 'comprehensive':
        steps.push('需求分析与规划');
        steps.push('系统设计');
        steps.push('模块实现');
        steps.push('集成测试');
        steps.push('文档编写');
        break;
    }

    return steps;
  }

  /**
   * 扩展实验步骤（详细描述）
   */
  expandSteps(steps) {
    const stepDetails = {
      '环境准备': '准备开发环境和必要的工具软件',
      '需求分析': '理解实验要求，分析功能需求',
      '算法设计': '设计算法思路，绘制流程图',
      '代码实现': '编写代码，实现核心功能',
      '测试验证': '设计测试用例，验证功能正确性',
      '性能优化': '分析性能瓶颈，进行优化',
      '文档编写': '编写实验报告和代码注释',
      '系统安装': '安装必要的软件和依赖包',
      '基础配置': '完成基本配置项设置',
      '功能验证': '验证配置是否生效',
      '高级配置': '进行高级配置和调优',
      '故障排查': '识别并解决配置问题',
      '数据准备': '收集和整理实验数据',
      '分析方案设计': '设计分析方法和步骤',
      '数据分析实施': '执行数据分析，收集结果',
      '结果可视化': '使用图表展示分析结果',
      '报告撰写': '撰写分析报告，总结发现',
      '方案设计': '设计整体方案和架构',
      '原型构建': '构建原型或MVP',
      '评审优化': '评审设计方案，进行优化',
      '需求分析与规划': '分析需求，制定项目计划',
      '系统设计': '设计系统架构和模块',
      '模块实现': '实现各个功能模块',
      '集成测试': '集成各模块，进行整体测试'
    };

    return steps.map(step => ({
      title: step,
      description: stepDetails[step] || '完成该步骤的相关工作'
    }));
  }

  /**
   * 推断实验环境
   */
  inferEnvironment(experimentType, courseName) {
    const environments = {
      programming: {
        hardware: {
          cpu: '任意',
          memory: '4GB以上',
          storage: '10GB以上'
        },
        software: {
          os: 'Windows/Linux/macOS',
          languages: this.inferProgrammingLanguage(courseName),
          tools: ['VS Code', 'PyCharm', 'IntelliJ IDEA']
        }
      },
      configuration: {
        hardware: {
          cpu: '双核以上',
          memory: '8GB以上',
          storage: '50GB以上'
        },
        software: {
          os: 'Linux推荐',
          tools: ['Docker', 'SSH', '配置文件编辑器']
        }
      },
      analysis: {
        hardware: {
          cpu: '四核以上',
          memory: '8GB以上',
          storage: '20GB以上'
        },
        software: {
          os: '任意',
          tools: ['Python数据分析库', 'Jupyter Notebook', '可视化工具']
        }
      },
      design: {
        hardware: {
          cpu: '任意',
          memory: '4GB以上',
          storage: '10GB以上'
        },
        software: {
          os: '任意',
          tools: ['UML工具', '设计软件', '文档编辑器']
        }
      },
      comprehensive: {
        hardware: {
          cpu: '四核以上',
          memory: '16GB以上',
          storage: '100GB以上'
        },
        software: {
          os: 'Linux推荐',
          languages: '根据项目需求',
          tools: ['开发工具', '数据库', '容器']
        }
      }
    };

    return environments[experimentType] || environments.programming;
  }

  /**
   * 推断编程语言
   */
  inferProgrammingLanguage(courseName) {
    const languageMap = {
      'Python': ['Python程序设计', '人工智能引论', '数据分析'],
      'C': ['编译原理', '计算机组成', '操作系统'],
      'C++': ['数据结构', '算法'],
      'Java': ['软件工程'],
      'SQL': ['数据库'],
      'Shell': ['Linux', '操作系统']
    };

    const lowerCourseName = courseName.toLowerCase();
    for (const [language, courses] of Object.entries(languageMap)) {
      for (const course of courses) {
        if (lowerCourseName.includes(course.toLowerCase())) {
          return language;
        }
      }
    }

    return 'Python'; // 默认
  }

  /**
   * 生成实验要求
   */
  generateRequirements(experimentType, difficulty) {
    const requirements = {
      function: [],
      performance: [],
      submission: []
    };

    // 功能要求
    requirements.function.push('实现核心功能');
    if (difficulty === '进阶' || difficulty === '综合') {
      requirements.function.push('处理边界情况');
      requirements.function.push('提供友好的用户界面');
    }

    // 性能要求
    if (experimentType === 'programming') {
      requirements.performance.push('代码运行正常');
      if (difficulty === '进阶') {
        requirements.performance.push('时间复杂度合理');
      }
      if (difficulty === '综合') {
        requirements.performance.push('通过性能测试');
      }
    }

    // 提交要求
    requirements.submission.push('提交源代码');
    requirements.submission.push('提交实验报告');
    if (difficulty === '综合') {
      requirements.submission.push('提交设计文档');
    }

    return requirements;
  }
}

module.exports = ExperimentPlanner;
