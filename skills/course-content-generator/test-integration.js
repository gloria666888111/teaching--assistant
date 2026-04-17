/**
 * 测试课程内容生成器和 PPT 生成器的集成
 */

const { CourseContentGenerator } = require('./index');

async function testCourseContentGeneration() {
  console.log('📚 Course Content Generator - 集成测试\n');

  const generator = new CourseContentGenerator();

  try {
    // 测试 1: 生成教学课件内容
    console.log('测试 1: 生成教学课件内容\n');
    const courseware = await generator.generateCourseContent({
      courseName: 'Python程序设计',
      chapters: ['第3章 流程控制'],
      contentType: 'courseware'
    });

    console.log('\n✅ 测试 1 成功！\n');
    console.log(`课程名称: ${courseware.courseName}`);
    console.log(`章节: ${courseware.chapters.join(', ')}`);
    console.log(`内容类型: ${courseware.contentTypeName}`);
    console.log(`内容长度: ${courseware.content.length} 字符`);
    console.log(`结构: ${JSON.stringify(courseware.structure, null, 2)}`);

    console.log('\n' + '='.repeat(60));
    console.log('内容预览（前500字符）：');
    console.log('='.repeat(60) + '\n');
    console.log(courseware.content.substring(0, 500) + '...\n');

    // 测试 2: 构建 PPT 查询字符串
    console.log('\n测试 2: 构建 PPT 查询字符串\n');
    const pptQuery = generator.buildPPTQuery(courseware);

    console.log('✅ 测试 2 成功！\n');
    console.log('PPT 查询字符串（前800字符）：');
    console.log('='.repeat(60) + '\n');
    console.log(pptQuery.substring(0, 800) + '...\n');

    // 测试 3: 生成重点难点
    console.log('\n测试 3: 生成重点难点\n');
    const keypoints = await generator.generateCourseContent({
      courseName: 'Python程序设计',
      chapters: ['第3章 流程控制'],
      contentType: 'keypoints'
    });

    console.log('\n✅ 测试 3 成功！\n');
    console.log(`内容类型: ${keypoints.contentTypeName}`);
    console.log(`内容长度: ${keypoints.content.length} 字符`);
    console.log(`结构: ${JSON.stringify(keypoints.structure, null, 2)}`);

    console.log('\n' + '='.repeat(60));
    console.log('内容预览（前300字符）：');
    console.log('='.repeat(60) + '\n');
    console.log(keypoints.content.substring(0, 300) + '...\n');

    // 测试 4: 生成章节总结
    console.log('\n测试 4: 生成章节总结\n');
    const summary = await generator.generateCourseContent({
      courseName: 'Python程序设计',
      chapters: ['第3章 流程控制'],
      contentType: 'summary'
    });

    console.log('\n✅ 测试 4 成功！\n');
    console.log(`内容类型: ${summary.contentTypeName}`);
    console.log(`内容长度: ${summary.content.length} 字符`);

    console.log('\n' + '='.repeat(60));
    console.log('内容预览（前300字符）：');
    console.log('='.repeat(60) + '\n');
    console.log(summary.content.substring(0, 300) + '...\n');

    console.log('\n🎉 所有测试成功！\n');

    console.log('\n' + '='.repeat(60));
    console.log('使用示例：');
    console.log('='.repeat(60));
    console.log('\n1. 生成课程内容：');
    console.log(`const content = await generator.generateCourseContent({`);
    console.log(`  courseName: 'Python程序设计',`);
    console.log(`  chapters: ['第3章 流程控制'],`);
    console.log(`  contentType: 'courseware'`);
    console.log(`});\n`);

    console.log('2. 构建 PPT 查询：');
    console.log(`const pptQuery = generator.buildPPTQuery(content);\n`);

    console.log('3. 调用 PPT 生成器（需要配置 BAIDU_API_KEY）：');
    console.log(`python skills/ai-ppt-generator/scripts/random_ppt_theme.py --query "${pptQuery.substring(0, 50)}..."\n`);

  } catch (error) {
    console.error('\n❌ 测试失败：\n');
    console.error(error);
  }
}

// 运行测试
testCourseContentGeneration();
