# MaterialLoader 集成指南

## 概述

Course Content Generator 使用 MaterialLoader 来加载课程资料，这是技能集的核心组件。

## 基本使用

### 初始化

```javascript
const { MaterialLoader } = require('../../lib/material-loader');

const loader = new MaterialLoader();
```

### 加载课程

```javascript
const course loader.loadCourse('Python程序设计');
```

### 返回结构

```javascript
{
  name: "Python程序设计",
  textbook: "教材内容",
  outline: "大纲内容",
  knowledge: "知识点内容",
  slides: [],
  notes: [],
  cases: [],
  metadata: {}
}
```

## 章节筛选

### 筛选特定章节

```javascript
const filtered = await loader.filterByChapters(course, '3-5');
// 或
const filtered = await loader.filterByChapters(course, [3, 4, 5]);
// 启用语义抽取（需传入 llmClient）
const filteredSemantic = await loader.filterByChapters(course, [10], { useSemantic: true, llmClient });
```

## 上下文构建

### 构建知识上下文

```javascript
const context = loader.buildContext(course, {
  includeTextbook: true,
  includeOutline: true,
  includeKnowledge: true,
  maxLength: 5000
});
```

## 缓存功能

MaterialLoader 自动缓存已加载的课程，提高性能。

## 错误处理

```javascript
try {
  const course = await loader.loadCourse('SomeCourse');
} catch (error) {
  console.error('课程加载失败:', error.message);
}
```

## 最佳实践

1. **复用实例**. 
2. **处理不存在课程**
3. **验证返回数据**
4. **合理使用章节筛选**

## 参考

- MaterialLoader 源码: `lib/material-loader.js`
- 测试脚本: `lib/test-material-loader.js`
