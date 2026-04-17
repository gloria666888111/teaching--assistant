/**
 * 简化版测试 - 不依赖 docx
 */

const ExperimentDesigner = require('./index');

async function simpleTest() {
  console.log('🧪 Experiment Designer - 简化版测试\n');
  console.log(`当前工作目录: ${process.cwd()}`);
  console.log(`输出目录: output/experiments\n`);

  const designer = new ExperimentDesigner({
    outputDir: 'output/experiments'
  });

  try {
    console.log('设计基础实验...\n');
    console.log('参数：courseName="数据结构", chapters=["第3章 栈和队列"], difficulty="基础", language="python"\n');

    const result = await designer.designExperiment({
      courseName: '数据结构',
      chapters: ['第3章 栈和队列'],
      difficulty: '基础',
      language: 'python'
    });

    if (result.success) {
      console.log('\n✅ 测试成功！\n');
      console.log(`实验名称：${result.experiment.experimentTitle}`);
      console.log(`实验类型：${result.experiment.experimentType}`);
      console.log(`难度：${result.experiment.difficulty.name}`);
      console.log(`知识点数量：${result.experiment.knowledgePoints.length}`);
      console.log(`测试用例：${result.testCases.length} 个`);
      console.log(`评分标准：总分 ${result.gradingCriteria.total} 分`);
      console.log(`\n输出目录：${result.outputDir}`);

      console.log('\n实验目的：');
      result.experiment.objectives.forEach(obj => {
        console.log(`  - ${obj}`);
      });

      console.log('\n功能要求：');
      result.experiment.requirements.function.forEach(req => {
        console.log(`  - ${req}`);
      });

      console.log(`\n代码文件：${result.implementation.path}`);
      console.log(`Markdown手册：${result.manuals.markdown.path}`);

      return true;
    } else {
      console.log('\n❌ 测试失败！\n');
      console.log(`错误：${result.error}`);
      return false;
    }
  } catch (error) {
    console.error('\n❌ 测试出错：\n');
    console.error(error);
    return false;
  }
}

// 运行测试
simpleTest().then(success => {
  if (success) {
    console.log('\n🎉 所有组件正常工作！');
  } else {
    console.log('\n⚠️  部分功能可能需要检查');
  }
});
