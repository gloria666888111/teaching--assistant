/**
 * Quiz Generator 使用示例
 * 运行: node example-quiz.js
 */

const { QuizGenerator } = require('./index');

async function example() {
  console.log('=== Quiz Generator 使用示例 ===\n');

  const generator = new QuizGenerator();

  // 示例1：基础自测题
  console.log('【示例1】为《Python程序设计》第3章生成自测题\n');
  try {
    const result1 = await generator.generate('为《Python程序设计》第3章生成自测题', {});
    console.log(result1);
  } catch (error) {
    console.error('错误:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // 示例2：指定难度
  console.log('【示例2】指定难度\n');
  try {
    const result2 = await generator.generate(
      '为《Python程序设计》第3章生成基础15题、进阶10题、挑战5题',
      {}
    );
    console.log(result2);
  } catch (error) {
    console.error('错误:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // 示例3：多格式输出
  console.log('【示例3】多格式输出\n');
  try {
    const result3 = await generator.generate(
      '为《Python程序设计》第3章生成自测题，输出Markdown和HTML格式',
      {}
    );
    console.log(result3);
  } catch (error) {
    console.error('错误:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // 示例4：多章节
  console.log('【示例4】多章节\n');
  try {
    const result4 = await generator.generate(
      '为《Python程序设计》第1-3章生成自测题，基础20题',
      {}
    );
    console.log(result4);
  } catch (error) {
    console.error('错误:', error.message);
  }
}

// 运行示例
example().catch(error => {
  console.error('示例运行失败:', error);
  process.exit(1);
});
