/**
 * Experiment Designer - 演示脚本
 *
 * 演示如何使用实验设计系统
 */

const ExperimentDesigner = require('../index');

// 创建设计器实例
const designer = new ExperimentDesigner();

// 演示函数
async function demo() {
  console.log('🧪 Experiment Designer - 演示\n');
  console.log('=' .repeat(60));

  // 演示1：基本使用
  console.log('\n【演示1】设计基础实验');
  console.log('-'.repeat(60));

  const result1 = await designer.designExperiment({
    courseName: '数据结构',
    chapters: ['第3章 栈和队列'],
    difficulty: '基础',
    language: 'python'
  });

  if (result1.success) {
    console.log(`✅ 实验：${result1.experiment.experimentTitle}`);
    console.log(`   类型：${result1.experiment.experimentType}`);
    console.log(`   难度：${result1.experiment.difficulty.name}`);
    console.log(`   代码文件：${result1.implementation.path}`);
    console.log(`   手册文件：${result1.manuals.markdown.path}`);
  } else {
    console.log(`❌ 失败：${result1.error}`);
  }

  // 演示2：进阶实验
  console.log('\n【演示2】设计进阶实验');
  console.log('-'.repeat(60));

  const result2 = await designer.designExperiment({
    courseName: '数据结构',
    chapters: ['第4章 链表'],
    difficulty: '进阶',
    language: 'python'
  });

  if (result2.success) {
    console.log(`✅ 实验：${result2.experiment.experimentTitle}`);
    console.log(`   类型：${result2.experiment.experimentType}`);
    console.log(`   难度：${result2.experiment.difficulty.name}`);
  } else {
    console.log(`❌ 失败：${result2.error}`);
  }

  // 演示3：综合实验
  console.log('\n【演示3】设计综合实验');
  console.log('-'.repeat(60));

  const result3 = await designer.designExperiment({
    courseName: '数据结构',
    chapters: ['第3章 栈和队列', '第4章 链表'],
    difficulty: '综合',
    language: 'python'
  });

  if (result3.success) {
    console.log(`✅ 实验：${result3.experiment.experimentTitle}`);
    console.log(`   类型：${result3.experiment.experimentType}`);
    console.log(`   难度：${result3.experiment.difficulty.name}`);
  } else {
    console.log(`❌ 失败：${result3.error}`);
  }

  // 演示4：列出课程
  console.log('\n【演示4】列出支持的课程');
  console.log('-'.repeat(60));

  const courses = designer.listCourses();
  console.log('可用课程：');
  courses.forEach(course => {
    console.log(`  - ${course.name}`);
  });

  // 演示5：列出实验类型
  console.log('\n【演示5】列出支持的实验类型');
  console.log('-'.repeat(60));

  const types = designer.listExperimentTypes();
  console.log('实验类型：');
  types.forEach(type => {
    console.log(`  - ${type.name} (${type.type}): ${type.description}`);
  });

  // 演示6：列出语言
  console.log('\n【演示6】列出的编程语言');
  console.log('-'.repeat(60));

  const languages = designer.listLanguages();
  console.log('支持的编程语言：');
  languages.forEach(lang => {
    console.log(`  - ${lang.name} (${lang.lang}): ${lang.extension}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ 演示完成！\n');
}

// 执行演示
(async () => {
  try {
    await demo();
  } catch (error) {
    console.error('❌ 演示出错：', error);
  }
})();
