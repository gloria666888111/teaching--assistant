/**
 * Experiment Designer - 测试脚本
 *
 * 测试实验设计系统的各个组件
 */

const ExperimentDesigner = require('./index');
const fs = require('fs-extra');

// 测试结果记录
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * 记录测试结果
 */
function recordTest(name, passed, message) {
  testResults.tests.push({
    name,
    passed,
    message
  });

  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}`);
    console.log(`   ${message}`);
  }
}

/**
 * 测试1：基础实验设计
 */
async function testBasicExperiment() {
  console.log('\n【测试1】基础实验设计');
  console.log('-'.repeat(60));

  const designer = new ExperimentDesigner();

  try {
    const result = await designer.designExperiment({
      courseName: '数据结构',
      chapters: ['第3章 栈和队列'],
      difficulty: '基础',
      language: 'python'
    });

    const passed = result.success &&
                   result.experiment &&
                   result.experiment.experimentTitle &&
                   result.implementation &&
                   result.implementation.fileName &&
                   result.testCases &&
                   result.testCases.length > 0 &&
                   result.gradingCriteria &&
                   result.gradingCriteria.total === 100 &&
                   result.manuals &&
                   result.manuals.markdown &&
                   result.manuals.word;

    recordTest(
      '基础实验设计',
      passed,
      passed ? '所有组件正常工作' : '部分组件缺失'
    );

    if (passed) {
      console.log(`   实验标题：${result.experiment.experimentTitle}`);
      console.log(`   实验类型：${result.experiment.experimentType}`);
      console.log(`   代码文件：${result.implementation.fileName}`);
      console.log(`   测试用例：${result.testCases.length} 个`);
      console.log(`   评分标准：总分 ${result.gradingCriteria.total} 分`);
    }

    return passed;
  } catch (error) {
    recordTest('基础实验设计', false, error.message);
    return false;
  }
}

/**
 * 测试2：进阶实验设计
 */
async function testAdvancedExperiment() {
  console.log('\n【测试2】进阶实验设计');
  console.log('-'.repeat(60));

  const designer = new ExperimentDesigner();

  try {
    const result = await designer.designExperiment({
      courseName: '数据结构',
      chapters: ['第4章 链表'],
      difficulty: '进阶',
      language: 'python'
    });

    const passed = result.success &&
                   result.experiment.difficulty.name === '进阶' &&
                   result.testCases.length > 2 && // 进阶实验应该有更多测试用例
                   result.gradingCriteria.breakdown.length >= 3;

    recordTest(
      '进阶实验设计',
      passed,
      passed ? '难度和测试用例正确' : '难度或测试用例不符合预期'
    );

    if (passed) {
      console.log(`   实验标题：${result.experiment.experimentTitle}`);
      console.log(`   难度：${result.experiment.difficulty.name}`);
      console.log(`   测试用例：${result.testCases.length} 个`);
    }

    return passed;
  } catch (error) {
    recordTest('进阶实验设计', false, error.message);
    return false;
  }
}

/**
 * 测试3：综合实验设计
 */
async function testComprehensiveExperiment() {
  console.log('\n【测试3】综合实验设计');
  console.log('-'.repeat(60));

  const designer = new ExperimentDesigner();

  try {
    const result = await designer.designExperiment({
      courseName: '数据结构',
      chapters: ['第3章 栈和队列', '第4章 链表'],
      difficulty: '综合',
      language: 'python'
    });

    const passed = result.success &&
                   result.experiment.difficulty.name === '综合' &&
                   result.testCases.length > 3 && // 综合实验应该有更多测试用例
                   result.gradingCriteria.breakdown.some(b => b.category === '加分项');

    recordTest(
      '综合实验设计',
      passed,
      passed ? '难度和评分标准正确' : '难度或评分标准不符合预期'
    );

    if (passed) {
      console.log(`   实验标题：${result.experiment.experimentTitle}`);
      console.log(`   难度：${result.experiment.difficulty.name}`);
      console.log(`   测试用例：${result.testCases.length} 个`);
    }

    return passed;
  } catch (error) {
    recordTest('综合实验设计', false, error.message);
    return false;
  }
}

/**
 * 测试4：不同编程语言
 */
async function testDifferentLanguages() {
  console.log('\n【测试4】不同编程语言');
  console.log('-'.repeat(60));

  const designer = new ExperimentDesigner();
  const languages = ['python', 'c', 'cpp', 'java'];
  let passedCount = 0;

  for (const lang of languages) {
    try {
      const result = await designer.designExperiment({
        courseName: '数据结构',
        chapters: ['第3章 栈和队列'],
        difficulty: '基础',
        language: lang
      });

      if (result.success && result.implementation.language === lang) {
        passedCount++;
        console.log(`   ${lang.toUpperCase()}: ✅`);
      } else {
        console.log(`   ${lang.toUpperCase()}: ❌`);
      }
    } catch (error) {
      console.log(`   ${lang.toUpperCase()}: ❌ (${error.message})`);
    }
  }

  const allPassed = passedCount === languages.length;
  recordTest(
    '不同编程语言',
    allPassed,
    `${passedCount}/${languages.length} 语言测试通过`
  );

  return allPassed;
}

/**
 * 测试5：文件输出
 */
async function testFileOutput() {
  console.log('\n【测试5】文件输出');
  console.log('-'.repeat(60));

  const designer = new ExperimentDesigner();

  try {
    const result = await designer.designExperiment({
      courseName: '数据结构',
      chapters: ['第3章 栈和队列'],
      difficulty: '基础',
      language: 'python'
    });

    if (!result.success) {
      recordTest('文件输出', false, '实验设计失败');
      return false;
    }

    // 检查文件是否存在
    const codeFile = result.implementation.path;
    const markdownFile = result.manuals.markdown.path;
    const wordFile = result.manuals.word.path;

    const filesExist = await Promise.all([
      fs.pathExists(codeFile),
      fs.pathExists(markdownFile),
      fs.pathExists(wordFile)
    ]);

    const allExist = filesExist.every(exists => exists);

    recordTest(
      '文件输出',
      allExist,
      `代码文件：${filesExist[0] ? '✅' : '❌'}, Markdown：${filesExist[1] ? '✅' : '❌'}, Word：${filesExist[2] ? '✅' : '❌'}`
    );

    if (allExist) {
      console.log(`   代码文件：${codeFile}`);
      console.log(`   Markdown：${markdownFile}`);
      console.log(`   Word：${wordFile}`);
    }

    return allExist;
  } catch (error) {
    recordTest('文件输出', false, error.message);
    return false;
  }
}

/**
 * 测试6：批量设计
 */
async function testBatchDesign() {
  console.log('\n【测试6】批量设计');
  console.log('-'.repeat(60));

  const designer = new ExperimentDesigner();

  try {
    const results = await designer.batchDesign({
      courseName: '数据结构',
      chapters: ['第3章 栈和队列', '第4章 链表'],
      difficulty: '基础',
      language: 'python'
    });

    const allPassed = results.every(result => result.success);

    recordTest(
      '批量设计',
      allPassed,
      `${results.filter(r => r.success).length}/${results.length} 实验设计成功`
    );

    if (allPassed) {
      results.forEach(result => {
        console.log(`   - ${result.experiment.experimentTitle}: ✅`);
      });
    }

    return allPassed;
  } catch (error) {
    recordTest('批量设计', false, error.message);
    return false;
  }
}

/**
 * 测试7：实验变体
 */
async function testExperimentVariants() {
  console.log('\n【测试7】实验变体');
  console.log('-'.repeat(60));

  const designer = new ExperimentDesigner();

  try {
    const variants = await designer.generateVariants({
      courseName: '数据结构',
      chapters: ['第3章 栈和队列'],
      difficulties: ['基础', '进阶', '综合'],
      language: 'python'
    });

    const difficulties = variants.map(v => v.experiment.difficulty.name);
    const expected = ['基础', '进阶', '综合'];
    const allMatch = expected.every(d => difficulties.includes(d));

    recordTest(
      '实验变体',
      allMatch,
      `生成了 ${variants.length} 个变体`
    );

    if (allMatch) {
      variants.forEach(variant => {
        console.log(`   - ${variant.experiment.difficulty.name}: ${variant.experiment.experimentTitle}`);
      });
    }

    return allMatch;
  } catch (error) {
    recordTest('实验变体', false, error.message);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🧪 Experiment Designer - 测试套件\n');
  console.log('='.repeat(60));

  // 运行所有测试
  await testBasicExperiment();
  await testAdvancedExperiment();
  await testComprehensiveExperiment();
  await testDifferentLanguages();
  await testFileOutput();
  await testBatchDesign();
  await testExperimentVariants();

  // 输出测试结果
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果汇总\n');
  console.log(`总测试数：${testResults.passed + testResults.failed}`);
  console.log(`通过：${testResults.passed} ✅`);
  console.log(`失败：${testResults.failed} ❌`);
  console.log(`通过率：${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

  if (testResults.failed > 0) {
    console.log('\n失败的测试：');
    testResults.tests.filter(t => !t.passed).forEach(t => {
      console.log(`  - ${t.name}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  if (testResults.failed === 0) {
    console.log('🎉 所有测试通过！');
  } else {
    console.log('⚠️  部分测试失败，请检查。');
  }
}

// 执行测试
(async () => {
  try {
    await runTests();
  } catch (error) {
    console.error('❌ 测试运行出错：', error);
  }
})();
