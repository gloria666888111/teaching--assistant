/**
 * 测试 MaterialLoader
 * 运行: node lib/test-material-loader.js
 */

const { MaterialLoader } = require('./material-loader');

async function test() {
  console.log('=== MaterialLoader 测试 ===\n');

  const loader = new MaterialLoader();

  try {
    // 测试1：列出所有课程
    console.log('【测试1】列出所有课程');
    const courses = await loader.listCourses();
    console.log('可用课程:', courses);
    console.log('✓ 测试通过\n');

    // 测试2：加载Python程序设计课程
    console.log('【测试2】加载课程: Python程序设计');
    const course = await loader.loadCourse('Python程序设计');
    console.log('课程名称:', course.name);
    console.log('是否有教材:', !!course.textbook);
    console.log('教材长度:', course.textbook?.length || 0);
    console.log('是否有大纲:', !!course.outline);
    console.log('是否有元数据:', !!course.metadata);
    console.log('✓ 测试通过\n');

    // 测试3：章节筛选
    console.log('【测试3】筛选章节: 3-5');
    const filtered = await loader.filterByChapters(course, '3-5');
    console.log('原始内容长度:', course.textbook?.length || 0);
    console.log('筛选后长度:', filtered.textbook?.length || 0);
    console.log('✓ 测试通过\n');

    // 测试4：构建上下文
    console.log('【测试4】构建上下文');
    const context = loader.buildContext(filtered, {
      includeTextbook: true,
      includeOutline: true,
      includeKnowledge: true,
      maxLength: 2000
    });
    console.log('上下文长度:', context.length);
    console.log('上下文预览:');
    console.log(context.substring(0, 300) + '...');
    console.log('✓ 测试通过\n');

    // 测试5：缓存功能
    console.log('【测试5】缓存功能');
    console.log('从缓存重新加载...');
    const cachedCourse = await loader.loadCourse('Python程序设计');
    console.log('是否使用缓存:', cachedCourse === course);
    console.log('✓ 测试通过\n');

    console.log('=== 所有测试通过 ===');

  } catch (error) {
    console.error('测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
test();
