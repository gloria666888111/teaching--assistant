#!/usr/bin/env node

/**
 * OpenClaw 智能教学助手 - 主入口
 * 自动加载配置，智能路由到相应的Skill
 */

const { loadEnv, checkRequiredEnv } = require('./lib/config-loader');

// 加载环境配置
loadEnv();

// 检查 LLM 环境变量（至少配置其一：DeepSeek 或 火山方舟）
const hasLLM = !!(process.env.DEEPSEEK_API_KEY || process.env.VOLCENGINE_API_KEY);
if (!hasLLM) {
  console.error('\n❌ 无法继续：未配置 LLM API 密钥');
  console.error('请在 config.env 中配置 DEEPSEEK_API_KEY（推荐）或 VOLCENGINE_API_KEY\n');
  process.exit(1);
}

// 与 teaching-assistant 一致的 Dify / LLM 配置（默认优先 DeepSeek）
const { getDefaultLLMConfig } = require('./teaching-assistant');
const { DifyRetriever } = require('./lib/dify-retriever');
const useDify = process.env.USE_DIFY_KNOWLEDGE !== 'false';
const difyRetriever = (process.env.DIFY_BASE_URL && process.env.DIFY_API_KEY)
  ? new DifyRetriever()
  : null;
const llmConfig = getDefaultLLMConfig();

// 导入Skill
const QuizGenerator = require('./skills/quiz-generator/index');
const ExamABGenerator = require('./skills/exam-ab-generator/index');
const ExperimentDesigner = require('./skills/experiment-designer/index');

/**
 * 智能路由：根据用户输入决定使用哪个Skill
 * @param {string} userInput - 用户输入
 */
async function smartRoute(userInput) {
  const input = userInput.toLowerCase();

  console.log('🤖 智能教学助手');
  console.log(`📝 用户输入: ${userInput}\n`);

  // 路由逻辑
  if (input.includes('自测题') || input.includes('练习题') || input.includes('quiz')) {
    console.log('🎯 识别到请求：生成自测题\n');
    const generator = new QuizGenerator({ ...llmConfig, difyRetriever, useDify });
    await generator.generate(userInput);
  }
  else if (input.includes('试卷') || input.includes('考试') || input.includes('ab卷') || input.includes('exam')) {
    console.log('🎯 识别到请求：生成考试试卷\n');
    const generator = new ExamABGenerator({ ...llmConfig, difyRetriever, useDify });
    await generator.generate(userInput);
  }
  else if (input.includes('实验') || input.includes('experiment')) {
    console.log('🎯 识别到请求：生成实验方案\n');
    const generator = new ExperimentDesigner({ llmConfig, difyRetriever, useDify });
    const courseMatch = userInput.match(/(?:为|给)(?:《|「)(.+?)(?:》|」)/);
    const chapterMatch = userInput.match(/第(\d+)章/);
    const difficultyMatch = userInput.match(/(基础|进阶|综合)/);
    const courseName = courseMatch ? courseMatch[1].trim() : null;
    const chapters = chapterMatch ? [parseInt(chapterMatch[1], 10)] : [];
    const difficulty = difficultyMatch ? difficultyMatch[1] : null;
    let language = 'python';
    const languageMatch = userInput.match(/(python|c|cpp|java)/i);
    if (languageMatch) language = languageMatch[1].toLowerCase();

    if (!courseName) {
      console.log('❌ 请指定课程名称，例如："为《数据结构》第3章设计编程实验"\n');
      return;
    }
    try {
      const result = await generator.designExperiment({
        courseName,
        chapters: chapters.map(c => `第${c}章`),
        difficulty,
        language
      });
      if (result.success) {
        console.log(`\n✅ 实验设计完成！`);
        console.log(`   实验名称：${result.experiment.experimentTitle}`);
        console.log(`   输出目录：${result.outputDir}`);
      } else {
        console.log(`\n❌ 实验设计失败：${result.error}`);
      }
    } catch (err) {
      console.error('\n❌ 实验设计失败:', err.message);
    }
  }
  else if (input.includes('ppt') || input.includes('幻灯片') || input.includes('课件')) {
    console.log('🎯 识别到请求：生成PPT\n');

    if (!process.env.BAIDU_API_KEY) {
      console.error('❌ 未配置 BAIDU_API_KEY，无法生成PPT');
      console.error('请在 config.env 文件中配置 BAIDU_API_KEY\n');
      return;
    }

    const { spawn } = require('child_process');
    const python = spawn('python', ['skills/ai-ppt-generator/scripts/random_ppt_theme.py', '--query', userInput]);

    python.stdout.on('data', (data) => {
      console.log(data.toString());
    });

    python.stderr.on('data', (data) => {
      console.error(data.toString());
    });

    python.on('close', (code) => {
      console.log(`\n${code === 0 ? '✅' : '❌'} PPT生成${code === 0 ? '成功' : '失败'}`);
    });
  }
  else if (input.includes('帮助') || input.includes('help') || userInput.trim() === '') {
    printHelp();
  }
  else {
    console.log('❓ 无法识别请求，请输入 "帮助" 查看可用命令\n');
  }
}

/**
 * 打印帮助信息
 */
function printHelp() {
  console.log(`
📚 OpenClaw 智能教学助手 - 使用帮助

🎯 可用功能：

1️⃣  自测题生成
   示例：
   - "为《人工智能引论》第3章生成自测题"
   - "为《数据结构》第1-5章生成练习题，基础15题，进阶10题"

2️⃣  考试试卷生成
   示例：
   - "为《Python程序设计》生成期末考试AB卷"
   - "为《操作系统》第1-5章生成期中考试，100分，2小时"

3️⃣  实验方案设计
   示例：
   - "为《人工智能引论》第3章设计实验方案"
   - "为《数据结构》第2章设计进阶实验"

4️⃣  PPT生成（需要BAIDU_API_KEY）
   示例：
   - "生成《人工智能引论》第3章的PPT"
   - "生成PPT：人工智能发展趋势"

📝 命令格式：
   node index.js "您的请求"

🔧 配置：
   - 在 config.env 文件中配置API密钥
   - 必需：VOLCENGINE_API_KEY（火山方舟）
   - 可选：BAIDU_API_KEY（用于PPT生成）

📚 更多帮助：
   查看 docs/ 目录中的详细文档

`);
}

// 主程序
async function main() {
  const userInput = process.argv.slice(2).join(' ');

  if (!userInput) {
    printHelp();
    process.exit(0);
  }

  try {
    await smartRoute(userInput);
  } catch (error) {
    console.error('\n❌ 执行失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行主程序
main();
