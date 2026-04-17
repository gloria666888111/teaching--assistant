---
name: course-content-generator
description: 根据课程资料生成详细课件内容，用于辅助 PPT 生成。Use when user needs to generate courseware content from textbooks/outline, or to prepare structured content for ai-ppt-generator. Supports 教学大纲、知识点详解、重点难点总结、案例分析.
---

# Course Content Generator - 课程内容生成器

根据课程资料生成详细的课件内容，用于辅助 PPT 生成。

## 固定指令（展示/调度用）

**统一入口**（推荐，须在工作区根目录执行）：
```bash
node teaching-assistant.js "为《课程名》生成课程内容/教学大纲/重点难点"
```
示例：`node teaching-assistant.js "为《操作系统》生成课程内容与重点难点"`

**直接调用**（备用）：`node skills/course-content-generator/example-usage.js`（需在工作区根目录，且 teaching-data 中已有对应课程）。教材从 `teaching-data/textbooks/课程名/` 读取。

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

## 使用方式

在 workspace 根目录执行（需先有 teaching-data）：

```bash
node skills/course-content-generator/example-usage.js
```

或由智能体调用：根据用户请求的课程名与章节，从 `teaching-data/textbooks/课程名/` 加载资料，生成内容后可供 PPT 生成使用。

## 输出

生成的结构化内容包含 courseName、chapters、contentType、content、structure（sections/points）等，便于后续传给 `skills/ai-ppt-generator`。
