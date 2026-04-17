# Quiz Generator 架构文档

## 概述

Quiz Generator 是一个基于 MaterialLoader 和 LLM 的智能测验题目生成系统。

## 架构设计

### 模块结构

```
QuizGenerator (主生成器)
├── MaterialLoader (课程资料加载)
├── LLMClient (题目生成)
├── DifficultyClassifier (难度分类)
├── FeedbackGenerator (解析生成)
└── QuizExporter (多格式导出)
```

### 工作流程

```
1. 用户输入解析
   ↓
2. MaterialLoader 加载课程资料
   ↓
3. 章节筛选和上下文构建
   ↓
4. LLM 生成题目
   ↓
5. 难度分类
   ↓
6. 生成详细解析
   ↓
7. 多格式导出 (Markdown/HTML/JSON)
```

## 核心组件

### 1. QuizGenerator 类

**位置**: `index.js`

**主要方法**:
- `generate(userInput, options)` - 主入口
- `parseInput(input)` - 解析用户输入
- `generateQuestions(params, context)` - 生成题目
- `generateExplanations(questions)` - 生成解析
- `exportQuiz(questions, options)` - 导出文件

**状态管理**:
```javascript
{
  params: {},        // 用户参数
  course: {},        // 课程资料
  questions: [],     // 生成的题目
  results: {}        // 导出结果
}
```

### 2. DifficultyClassifier 类

**位置**: `lib/difficulty-classifier.js`

**功能**:
- 智能难度分类
- 批量分类
- 难度分布调整

**难度级别**:
- `basic` - 基础题
- `advanced` - 进阶题
- `challenge` - 挑战题

**分类依据**:
- 题目复杂度
- 知识点深度
- 解答步骤数量

### 3. FeedbackGenerator 类

**位置**: `lib/feedback-generator.js`

**功能**:
- 生成详细解析
- 支持多种题型
- 批量生成优化

**解析结构**:
```javascript
{
  text: "解析文本",
  steps: ["步骤1", "步骤2", ...],
  references: ["教材X章Y节"],
  tips: "提示信息"
}
```

### 4. QuizExporter 类

**位置**: `lib/quiz-exporter.js`

**功能**:
- Markdown 导出
- HTML 导出（交互式）
- JSON 导出
- 按难度分别导出

**导出格式**:

#### Markdown
- 完整版
- 基础题
- 进阶题
- 挑战题
- 参考答案

#### HTML
- 交互式界面
- 在线答题功能
- 答案显示

#### JSON
- 系统格式
- LMS 导入
- 数据交换

## 配置和选项

### LLM 配置

```javascript
{
  provider: 'zhipu',  // LLM 提供商
  apiKey: '...',       // API 密钥
  model: 'glm-4',      // 模型名称
  timeout: 60000        // 超时时间
}
```

### 生成选项

```javascript
{
  basic: 10,           // 基础题数量
  advanced: 5,         // 进阶题数量
  challenge: 3,        // 挑战题数量
  types: ['choice', 'true_false', 'fill'],  // 题型
  formats: ['md', 'html', 'json']          // 输出格式
}
```

## 错误处理

### 常见错误

1. **课程不存在**
   - 检查 `teaching-data/textbooks/` 目录
   - 确认课程名称正确

2. **章节范围错误**
   - 检查章节编号
   - 确认章节存在于教材中

3. **API 失败**
   - 检查 API 密钥
   - 确认网络连接
   - 检查 API 额度

4. **导出失败**
   - 检查输出目录权限
   - 确认磁盘空间充足

### 错误处理策略

```javascript
try {
  const result = await generator.generate(input);
} catch (error) {
  if (error.message.includes('课程不存在')) {
    // 处理课程不存在错误
  } else if (error.message.includes('API')) {
    // 处理 API 错误
  } else {
    // 处理其他错误
  }
}
```

## 性能优化

### 缓存策略

- **MaterialLoader 缓存**: 课程资料自动缓存
- **LLM 结果缓存**: 题目生成结果缓存
- **解析缓存**: 解析结果缓存

### 批量处理

- 批量生成题目
- 批量生成解析
- 批量导出文件

### 异步处理

- 使用 async/await
- 并行处理独立任务
- 优化 I/O 操作

## 扩展和定制

### 自定义题型

```javascript
// 在 generateQuestions 方法中添加新的题型
if (type === 'custom_type') {
  question = await this.generateCustomQuestion(context);
}
```

### 自定义导出格式

```javascript
// 在 QuizExporter 中添加新的导出方法
exportCustom(questions, options) {
  // 自定义导出逻辑
}
```

### 自定义 LLM 提示

```javascript
// 修改 LLM 提示模板
const prompt = this.buildCustomPrompt(context, options);
```

## 测试

### 单元测试

```javascript
// 测试 DifficultyClassifier
const classifier = new DifficultyClassifier();
const difficulty = classifier.classify(question);
```

### 集成测试

```javascript
// 测试完整流程
const result = await generator.generate('为《Python程序设计》第3章生成自测题');
```

### 性能测试

```javascript
// 测试生成性能
const start = Date.now();
await generator.generate(input);
const duration = Date.now() - start;
console.log(`生成耗时: ${duration}ms`);
```

## 最佳实践

1. **合理分配题目数量**
2. **选择合适的题型组合**
3. **验证生成的题目质量**
4. **人工审核重要题目**
5. **定期更新题库**

## 参考资源

- MaterialLoader 文档: `../lib/material-loader.js`
- LLMClient 文档: `../lib/llm-client.js`
- 测试脚本: `test-quiz-generator.js`
- 示例代码: `scripts/example-quiz.js`
