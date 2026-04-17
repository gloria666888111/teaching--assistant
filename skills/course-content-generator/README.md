# Course Content Generator - 课程内容生成器

根据课程资料生成详细的课件内容，用于辅助 PPT 生成。

## 功能

1. **基于课程资料生成内容**
   - 从教材、大纲、知识点中提取内容
   - 按章节组织内容
   - 生成适合 PPT 的结构化内容

2. **支持多种内容类型**
   - 教学大纲生成
   - 知识点详解
   - 重点难点总结
   - 案例分析

3. **配合 PPT 生成器使用**
   - 将生成的详细内容传递给 ai-ppt-generator
   - 生成结构化的教学课件

## 使用方法

```javascript
const CourseContentGenerator = require('./index');

const generator = new CourseContentGenerator({
  baseDir: '../teaching-data'
});

// 生成课件内容
const content = await generator.generateCourseContent({
  courseName: 'Python程序设计',
  chapters: ['第3章 流程控制'],
  contentType: 'courseware'
});

console.log(content);
```

## 输出格式

生成的课程内容包括：

```json
{
  "courseName": "Python程序设计",
  "chapters": ["第3章 流程控制"],
  "contentType": "courseware",
  "content": "详细的课程内容...",
  "structure": {
    "title": "第3章 流程控制",
    "sections": [
      {
        "title": "3.1 条件语句",
        "points": ["if语句", "elif语句", "else语句"]
      },
      ...
    ]
  }
}
```

## 与 PPT 生成器配合

```javascript
// 1. 生成课程内容
const content = await generator.generateCourseContent({
  courseName: 'Python程序设计',
  chapters: ['第3章 流程控制'],
  contentType: 'courseware'
});

// 2. 构建适合 PPT 生成器的查询
const pptQuery = `Python程序设计课程 - 第3章 流程控制
${content.content.substring(0, 1000)}...`;

// 3. 调用 PPT 生成器
// (由 teaching-assistant.js 处理)
```
