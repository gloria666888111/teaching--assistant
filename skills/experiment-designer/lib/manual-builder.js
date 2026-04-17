/**
 * ManualBuilder - 实验手册构建器
 *
 * 生成实验手册（Markdown和Word格式）
 */

const fs = require('fs');
const path = require('path');
const fsp = fs.promises;

// 尝试引入 docx，如果失败则标记为不可用
let Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType;
let docxAvailable = false;

try {
  const docxModule = require('docx');
  Document = docxModule.Document;
  Packer = docxModule.Packer;
  Paragraph = docxModule.Paragraph;
  TextRun = docxModule.TextRun;
  HeadingLevel = docxModule.HeadingLevel;
  AlignmentType = docxModule.AlignmentType;
  docxAvailable = true;
  console.log('✅ docx 模块已加载');
} catch (error) {
  console.log('⚠️  docx 模块未安装，Word文档生成功能将不可用');
  console.log('   运行: npm install docx fs-extra');
}

class ManualBuilder {
  constructor() {
    // 实验手册模板
    this.template = `# {ExperimentTitle}

## 1. 实验目的

{Objectives}

## 2. 实验环境

### 2.1 硬件要求
- CPU: {HardwareCPU}
- 内存: {HardwareMemory}
- 存储: {HardwareStorage}

### 2.2 软件要求
- 操作系统: {SoftwareOS}
- 编程语言: {SoftwareLanguage}
- 开发工具: {SoftwareTools}

## 3. 实验要求

### 3.1 功能要求
{FunctionRequirements}

### 3.2 性能要求
{PerformanceRequirements}

### 3.3 提交要求
{SubmissionRequirements}

## 4. 实验步骤

{Steps}

## 5. 示例实现

{CodeDescription}

完整代码请见：{CodeFile}

## 6. 测试与验证

### 6.1 测试用例
{TestCases}

### 6.2 预期结果
{ExpectedResults}

## 7. 评分标准

{GradingCriteria}

## 8. 常见问题

{FAQ}

## 9. 参考资料

{References}

---
**实验说明：**
- 本实验为{DifficultyLevel}实验，预计耗时{TimeEstimate}
- 请仔细阅读实验要求，按时完成实验
- 遇到问题请参考常见问题或向老师请教
`;
  }

  /**
   * 构建实验手册
   */
  async buildManual(options = {}) {
    const {
      experiment,
      implementation,
      testCases,
      gradingCriteria,
      outputDir
    } = options;

    // 生成Markdown
    const markdown = this.buildMarkdown(experiment, implementation, testCases, gradingCriteria);

    // 保存Markdown文件
    const markdownPath = path.join(outputDir, `${experiment.experimentTitle}.md`);
    await fsp.writeFile(markdownPath, markdown, 'utf-8');

    const result = {
      markdown: {
        success: true,
        path: markdownPath,
        format: 'Markdown'
      }
    };

    // 生成Word文档（如果 docx 可用）
    if (docxAvailable) {
      const wordPath = path.join(outputDir, `${experiment.experimentTitle}.docx`);
      const wordResult = await this.buildWord(experiment, implementation, testCases, gradingCriteria, wordPath);
      result.word = {
        success: wordResult.success,
        path: wordResult.success ? wordPath : null,
        format: 'Word (DOCX)',
        error: wordResult.error || null
      };
    } else {
      result.word = {
        success: false,
        path: null,
        format: 'Word (DOCX)',
        error: 'docx 模块未安装，请运行: npm install docx fs-extra'
      };
    }

    return result;
  }

  /**
   * 构建Markdown格式的手册
   */
  buildMarkdown(experiment, implementation, testCases, gradingCriteria) {
    let manual = this.template;

    // 替换基本信息
    manual = manual.replace(/{ExperimentTitle}/g, experiment.experimentTitle);

    // 实验目的
    const objectives = experiment.objectives.map(obj => `- ${obj}`).join('\n');
    manual = manual.replace(/{Objectives}/g, objectives);

    // 实验环境
    manual = manual.replace(/{HardwareCPU}/g, experiment.environment.hardware.cpu);
    manual = manual.replace(/{HardwareMemory}/g, experiment.environment.hardware.memory);
    manual = manual.replace(/{HardwareStorage}/g, experiment.environment.hardware.storage);
    manual = manual.replace(/{SoftwareOS}/g, experiment.environment.software.os);
    manual = manual.replace(/{SoftwareLanguage}/g, experiment.environment.software.languages || '根据需求');
    manual = manual.replace(/{SoftwareTools}/g, experiment.environment.software.tools.join(', '));

    // 实验要求
    manual = manual.replace(/{FunctionRequirements}/g, this.formatRequirements(experiment.requirements.function));
    manual = manual.replace(/{PerformanceRequirements}/g, this.formatRequirements(experiment.requirements.performance));
    manual = manual.replace(/{SubmissionRequirements}/g, this.formatRequirements(experiment.requirements.submission));

    // 实验步骤
    manual = manual.replace(/{Steps}/g, this.formatSteps(experiment.steps));

    // 示例实现
    manual = manual.replace(/{CodeDescription}/g, implementation.description);
    manual = manual.replace(/{CodeFile}/g, implementation.fileName);

    // 测试用例
    manual = manual.replace(/{TestCases}/g, this.formatTestCases(testCases));

    // 预期结果
    manual = manual.replace(/{ExpectedResults}/g, this.formatExpectedResults(testCases));

    // 评分标准
    manual = manual.replace(/{GradingCriteria}/g, this.formatGradingCriteria(gradingCriteria));

    // 常见问题
    manual = manual.replace(/{FAQ}/g, this.formatFAQ(experiment));

    // 参考资料
    manual = manual.replace(/{References}/g, this.formatReferences(experiment));

    // 难度和时间
    manual = manual.replace(/{DifficultyLevel}/g, experiment.difficulty.name);
    manual = manual.replace(/{TimeEstimate}/g, experiment.difficulty.timeEstimate);

    return manual;
  }

  /**
   * 格式化要求列表
   */
  formatRequirements(requirements) {
    if (!requirements || requirements.length === 0) {
      return '- 无特殊要求';
    }
    return requirements.map(req => `- ${req}`).join('\n');
  }

  /**
   * 格式化实验步骤
   */
  formatSteps(steps) {
    return steps.map((step, index) => `
### 步骤${index + 1}：${step.title}

${step.description}
`).join('\n');
  }

  /**
   * 格式化测试用例
   */
  formatTestCases(testCases) {
    if (!testCases || testCases.length === 0) {
      return '- 无测试用例';
    }

    return testCases.map(tc => `
#### ${tc.id} - ${tc.name}（${tc.priority}优先级）

**描述：** ${tc.description}

**步骤：**
${tc.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

**预期：** ${tc.expected}
`).join('\n');
  }

  /**
   * 格式化预期结果
   */
  formatExpectedResults(testCases) {
    if (!testCases || testCases.length === 0) {
      return '- 所有功能正常运行';
    }

    return `
- 所有测试用例通过
- 功能输出符合预期
- 性能达到要求
- 代码质量良好
`;
  }

  /**
   * 格式化评分标准
   */
  formatGradingCriteria(grading) {
    if (!grading || !grading.breakdown) {
      return '- 暂无评分标准';
    }

    let criteria = `总分：${grading.total}分\n\n`;

    for (const category of grading.breakdown) {
      criteria += `### ${category.category}（${category.weight}分）\n\n`;
      for (const item of category.items) {
        criteria += `- **${item.item}**（${item.maxScore}分）：${item.description}\n`;
      }
      criteria += '\n';
    }

    return criteria;
  }

  /**
   * 格式化常见问题
   */
  formatFAQ(experiment) {
    return `
**Q1: 如何准备实验环境？**
A: 请参考"实验环境"部分，安装所需的软件和工具。

**Q2: 遇到错误怎么办？**
A: 检查代码是否正确，查看错误信息，参考示例代码。

**Q3: 实验报告需要包含哪些内容？**
A: 参见"提交要求"部分，确保包含所有必需内容。

**Q4: 代码可以参考示例吗？**
A: 可以参考，但需要理解并修改，不能直接复制。

**Q5: 评分标准是什么？**
A: 参见"评分标准"部分，按标准完成实验。
`;
  }

  /**
   * 格式化参考资料
   */
  formatReferences(experiment) {
    return `
- 实验课程教材
- 相关技术文档
- 示例代码文件
- 在线资源（根据实验类型）
`;
  }

  /**
   * 构建Word文档
   */
  async buildWord(experiment, implementation, testCases, gradingCriteria, outputPath) {
    try {
      // 创建Word文档
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // 标题
            new Paragraph({
              text: experiment.experimentTitle,
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),

            // 实验目的
            new Paragraph({
              text: '1. 实验目的',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 }
            }),
            ...experiment.objectives.map(obj =>
              new Paragraph({
                text: `• ${obj}`,
                bullet: { level: 0 },
                spacing: { before: 100, after: 100 }
              })
            ),

            // 实验环境
            new Paragraph({
              text: '2. 实验环境',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 }
            }),
            new Paragraph({
              text: `硬件要求：`,
              spacing: { before: 100, after: 100 }
            }),
            new Paragraph({
              text: `CPU: ${experiment.environment.hardware.cpu}`,
              spacing: { before: 50, after: 50 }
            }),
            new Paragraph({
              text: `内存: ${experiment.environment.hardware.memory}`,
              spacing: { before: 50, after: 50 }
            }),
            new Paragraph({
              text: `存储: ${experiment.environment.hardware.storage}`,
              spacing: { before: 50, after: 200 }
            }),
            new Paragraph({
              text: `软件要求：`,
              spacing: { before: 100, after: 100 }
            }),
            new Paragraph({
              text: `操作系统: ${experiment.environment.software.os}`,
              spacing: { before: 50, after: 50 }
            }),
            new Paragraph({
              text: `编程语言: ${experiment.environment.software.languages || '根据需求'}`,
              spacing: { before: 50, after: 50 }
            }),
            new Paragraph({
              text: `开发工具: ${experiment.environment.software.tools.join(', ')}`,
              spacing: { before: 50, after: 200 }
            }),

            // 实验要求
            new Paragraph({
              text: '3. 实验要求',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 }
            }),
            new Paragraph({
              text: '功能要求：',
              spacing: { before: 100, after: 100 }
            }),
            ...(experiment.requirements.function.map(req =>
              new Paragraph({
                text: `• ${req}`,
                bullet: { level: 0 },
                spacing: { before: 50, after: 50 }
              })
            )),
            new Paragraph({
              text: '性能要求：',
              spacing: { before: 200, after: 100 }
            }),
            ...(experiment.requirements.performance.map(req =>
              new Paragraph({
                text: `• ${req}`,
                bullet: { level: 0 },
                spacing: { before: 50, after: 50 }
              })
            )),
            new Paragraph({
              text: '提交要求：',
              spacing: { before: 200, after: 100 }
            }),
            ...(experiment.requirements.submission.map(req =>
              new Paragraph({
                text: `• ${req}`,
                bullet: { level: 0 },
                spacing: { before: 50, after: 200 }
              })
            )),

            // 实验步骤
            new Paragraph({
              text: '4. 实验步骤',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 }
            }),
            ...this.buildWordSteps(experiment.steps),

            // 示例实现
            new Paragraph({
              text: '5. 示例实现',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 }
            }),
            new Paragraph({
              text: implementation.description.trim(),
              spacing: { before: 100, after: 100 }
            }),
            new Paragraph({
              text: `完整代码请见：${implementation.fileName}`,
              spacing: { before: 100, after: 200 }
            }),

            // 测试与验证
            new Paragraph({
              text: '6. 测试与验证',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 }
            }),
            ...this.buildWordTestCases(testCases),

            // 评分标准
            new Paragraph({
              text: '7. 评分标准',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 }
            }),
            ...this.buildWordGrading(gradingCriteria),

            // 难度和时间
            new Paragraph({
              text: '',
              spacing: { before: 400, after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `实验难度：${experiment.difficulty.name}    预计耗时：${experiment.difficulty.timeEstimate}`,
                  bold: true
                })
              ]
            })
          ]
        }]
      });

      // 打包文档
      const buffer = await Packer.toBuffer(doc);
      await fsp.writeFile(outputPath, buffer);

      return { success: true, path: outputPath };
    } catch (error) {
      console.error('Word文档生成失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 构建Word格式的步骤
   */
  buildWordSteps(steps) {
    const children = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      children.push(
        new Paragraph({
          text: `步骤${i + 1}：${step.title}`,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          text: step.description,
          spacing: { before: 100, after: 200 }
        })
      );
    }

    return children;
  }

  /**
   * 构建Word格式的测试用例
   */
  buildWordTestCases(testCases) {
    const children = [];

    if (!testCases || testCases.length === 0) {
      children.push(new Paragraph({ text: '暂无测试用例', spacing: { before: 100, after: 100 } }));
      return children;
    }

    for (const tc of testCases) {
      children.push(
        new Paragraph({
          text: `${tc.id} - ${tc.name}（${tc.priority}优先级）`,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          text: `描述：${tc.description}`,
          spacing: { before: 100, after: 100 }
        }),
        new Paragraph({
          text: '步骤：',
          spacing: { before: 100, after: 50 }
        }),
        ...tc.steps.map((s, i) =>
          new Paragraph({
            text: `${i + 1}. ${s}`,
            numbering: { reference: 'numbered', level: 0 },
            spacing: { before: 50, after: 50 }
          })
        ),
        new Paragraph({
          text: `预期：${tc.expected}`,
          spacing: { before: 100, after: 200 }
        })
      );
    }

    return children;
  }

  /**
   * 构建Word格式的评分标准
   */
  buildWordGrading(grading) {
    const children = [];

    if (!grading || !grading.breakdown) {
      children.push(new Paragraph({ text: '暂无评分标准', spacing: { before: 100, after: 100 } }));
      return children;
    }

    children.push(new Paragraph({
      text: `总分：${grading.total}分`,
      spacing: { before: 100, after: 200 }
    }));

    for (const category of grading.breakdown) {
      children.push(
        new Paragraph({
          text: `${category.category}（${category.weight}分）`,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 }
        })
      );

      for (const item of category.items) {
        children.push(
          new Paragraph({
            text: `• ${item.item}（${item.maxScore}分）：${item.description}`,
            bullet: { level: 0 },
            spacing: { before: 100, after: 100 }
          })
        );
      }

      children.push(new Paragraph({ text: '', spacing: { before: 100, after: 100 } }));
    }

    return children;
  }
}

module.exports = ManualBuilder;
