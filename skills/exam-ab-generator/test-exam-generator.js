/**
 * Exam AB Generator - 测试脚本
 * 运行: node test-exam-generator.js
 */

const { ExamABGenerator } = require('./index');

async function runTests() {
  console.log('=== Exam AB Generator 测试 ===\n');

  const generator = new ExamABGenerator();

  const testCases = [
    {
      name: '基础试卷生成',
      input: '为《Python程序设计》第3章生成期末试卷'
    },
    {
      name: 'AB卷生成',
      input: '为《Python程序设计》第3-5章生成期末试卷AB两卷'
    },
    {
      name: '指定难度',
      input: '为《数据结构》第2章生成100分试卷，难度中等'
    },
    {
      name: '指定题型',
      input: '为《操作系统》第4章生成试卷，选择题20分，填空题20分，简答题40分，综合题20分'
    },
    {
      name: '完整参数',
      input: '为《Java程序设计》第1-3章生成期末考试，100分，2小时，AB两卷，难度中等'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      console.log(`【测试】${testCase.name}`);
      console.log(`输入: ${testCase.input}`);
      
      const result = await generator.generate(testCase.input);
      
      if (result && result.length > 0) {
        console.log(`✓ 测试通过`);
        console.log(`输出长度: ${result.length} 字符\n`);
        passed++;
      } else {
        console.log(`✗ 测试失败: 输出为空\n`);
        failed++;
      }
    } catch (error) {
      console.log(`✗ 测试失败: ${error.message}\n`);
      failed++;
    }
  }

  console.log('=== 测试总结 ===');
  console.log(`通过: ${passed}/${testCases.length}`);
  console.log(`失败: ${failed}/${testCases.length}`);
  console.log(`成功率: ${(passed / testCases.length * 100).toFixed(1)}%`);

  process.exit(failed === 0 ? 0 : 1);
}

runTests().catch(error => {
  console.error('测试运行失败:', error);
  process.exit(1);
});
