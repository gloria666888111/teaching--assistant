/**
 * 示例：生成课程内容并集成 PPT 生成
 *
 * 这个示例展示了如何使用 CourseContentGenerator 和 ai-ppt-generator
 * 来完成完整的课件生成流程
 */

const { CourseContentGenerator } = require('./skills/course-content-generator');

async function exampleGenerateCourseware() {
  console.log('📚 示例：生成课程课件\n');

  const generator = new CourseContentGenerator();

  // 步骤 1: 定义课程参数
  const courseParams = {
    courseName: 'Python程序设计',
    chapters: ['第3章 流程控制'],
    contentType: 'courseware'
  };

  console.log('步骤 1: 生成课程内容\n');
  console.log(`  课程: ${courseParams.courseName}`);
  console.log(`  章节: ${courseParams.chapters.join(', ')}`);
  console.log(`  类型: ${courseParams.contentType}\n`);

  // 步骤 2: 生成课程内容
  const courseContent = await generator.generateCourseContent(courseParams);

  console.log(`✅ 内容生成完成: ${courseContent.content.length} 字符\n`);

  // 步骤 3: 构建适合 PPT 生成器的查询字符串
  const pptQuery = generator.buildPPTQuery(courseContent);

  console.log('步骤 2: 构建 PPT 查询字符串\n');
  console.log(`查询长度: ${pptQuery.length} 字符\n`);

  // 步骤 4: 显示内容结构
  console.log('步骤 3: 内容结构\n');
  console.log(JSON.stringify(courseContent.structure, null, 2));
  console.log('\n');

  // 步骤 5: 生成完整的使用说明
  console.log('='.repeat(70));
  console.log('使用说明');
  console.log('='.repeat(70));
  console.log('\n【方案 1】使用教学助手（推荐）\n');
  console.log('直接通过 teaching-assistant.js 调用：');
  console.log('\n```');
  console.log('node teaching-assistant.js "为《Python程序设计》第3章生成PPT"');
  console.log('```\n');

  console.log('【方案 2】直接调用 PPT 生成器\n');
  console.log('需要先配置环境变量：');
  console.log('```');
  console.log('export BAIDU_API_KEY=your_api_key_here');
  console.log('```\n');
  console.log('然后运行 Python 脚本：');
  console.log('```');
  console.log('python skills/ai-ppt-generator/scripts/random_ppt_theme.py \\');
  console.log('  --query "Python程序设计 - 第3章 流程控制\\n\\n');
  console.log(`\\n${pptQuery.substring(0, 200)}..."`);
  console.log('```\n');

  console.log('【方案 3】使用教学助手并指定模板\n');
  console.log('```');
  console.log('node teaching-assistant.js "为《数据结构》生成PPT，使用企业商务模板"');
  console.log('```\n');

  console.log('【内容类型选项】\n');
  console.log('- courseware: 教学课件（默认）');
  console.log('- outline: 教学大纲');
  console.log('- keypoints: 重点难点');
  console.log('- summary: 章节总结\n');

  return {
    courseContent,
    pptQuery: pptQuery.substring(0, 500) + '...'
  };
}

async function exampleGenerateMultipleContentTypes() {
  console.log('\n\n📚 示例：生成多种类型的内容\n');
  console.log('='.repeat(70));

  const generator = new CourseContentGenerator();

  const contentTypes = ['courseware', 'outline', 'keypoints', 'summary'];
  const courseName = 'Python程序设计';
  const chapters = ['第3章 流程控制'];

  for (const type of contentTypes) {
    console.log(`\n【${type}】\n`);

    try {
      const content = await generator.generateCourseContent({
        courseName,
        chapters,
        contentType: type
      });

      console.log(`✅ 生成成功`);
      console.log(`   长度: ${content.content.length} 字符`);
      console.log(`   预览: ${content.content.substring(0, 100)}...`);
    } catch (error) {
      console.log(`❌ 生成失败: ${error.message}`);
    }
  }
}

async function exampleWithRealWorldData() {
  console.log('\n\n📚 示例：真实场景应用\n');
  console.log('='.repeat(70));

  const generator = new CourseContentGenerator();

  // 场景 1: 教师准备课程
  console.log('\n【场景 1】教师准备课程\n');
  console.log('教师需要为《数据结构》课程准备 PPT 课件');

  try {
    const courseware = await generator.generateCourseContent({
      courseName: '数据结构',
      chapters: ['第2章 栈和队列'],
      contentType: 'courseware'
    });

    console.log(`✅ 已生成课件内容: ${courseware.content.length} 字符`);
    console.log(`   章节数量: ${courseware.structure.sections.length}`);
  } catch (error) {
    console.log(`⚠️  课程未找到: ${error.message}`);
    console.log('   提示：请先添加课程资料到 teaching-data/ 目录');
  }

  // 场景 2: 生成总结材料
  console.log('\n【场景 2】生成章节总结\n');
  console.log('为学生生成《Python程序设计》第3章的总结材料');

  try {
    const summary = await generator.generateCourseContent({
      courseName: 'Python程序设计',
      chapters: ['第3章 流程控制'],
      contentType: 'summary'
    });

    console.log(`✅ 已生成总结: ${summary.content.length} 字符`);
  } catch (error) {
    console.log(`⚠️  生成失败: ${error.message}`);
  }

  // 场景 3: 准备考试重点
  console.log('\n【场景 3】准备考试重点\n');
  console.log('为《Python程序设计》课程准备重点和难点');

  try {
    const keypoints = await generator.generateCourseContent({
      courseName: 'Python程序设计',
      chapters: [], // 全部章节
      contentType: 'keypoints'
    });

    console.log(`✅ 已生成重点: ${keypoints.content.length} 字符`);
    console.log(`   重点数量: ${keypoints.structure.keyPoints.length}`);
  } catch (error) {
    console.log(`⚠️  生成失败: ${error.message}`);
  }
}

// 运行示例
async function runExamples() {
  try {
    await exampleGenerateCourseware();
    await exampleGenerateMultipleContentTypes();
    await exampleWithRealWorldData();

    console.log('\n\n' + '='.repeat(70));
    console.log('所有示例运行完成！');
    console.log('='.repeat(70));
  } catch (error) {
    console.error('\n❌ 示例运行失败：\n');
    console.error(error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runExamples();
}

module.exports = {
  exampleGenerateCourseware,
  exampleGenerateMultipleContentTypes,
  exampleWithRealWorldData
};
