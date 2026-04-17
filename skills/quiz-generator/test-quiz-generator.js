/**
 * Quiz Generator 测试脚本
 * 运行: node test-quiz-generator.js
 */

const { QuizGenerator } = require('./index');

async function runTests() {
  console.log('=== Quiz Generator 测试 ===\n');

  const generator = new QuizGenerator();

  const testCases = [
    {
      name: '基础自测题生成',
      input: '为《Python程序设计》第3章生成自测题'
    },
    {
      name: '指定难度',
      input: '为《Python程序设计》第3章生成基础15题、进阶10题、挑战5题'
    },
    {
      name: '指定题型',
      input: '为《数据结构》第2章生成选择题和判断题各10道'
    },
    {
      name: '多格式输出',
      input: '为《Python程序设计》第3章生成自测题，输出Markdown和HTML格式'
    },
    {
      name: '多章节',
      input: '为《Python程序设计》第1-3章生成自测题，基础20题'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`【测试】${testCase.name}`);
    console.log(`输入: ${testCase.input}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
      const result = await generator.generate(testCase.input, {});
      console.log('✅ 测试通过\n');
      console.log(result.substring(0, 600));
      if (result.length > 600) {
        console.log('...');
      }
    } catch (error) {
      console.log(`❌ 测试失败: ${error.message}\n`);
    }

    console.log('');
  }

  console.log('\n=== 测试完成 ===');
}

// 运行测试
runTests().catch(error => {
  console.error('测试运行失败:', error);
  process.exit(1);
});
