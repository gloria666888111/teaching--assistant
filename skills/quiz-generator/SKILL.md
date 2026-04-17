---
name: quiz-generator
description: Generate chapter quizzes with difficulty levels (Basic/Advanced/Challenge), detailed explanations, and multiple output formats (Markdown/HTML/JSON). Use when user asks for generating quiz questions, self-assessment materials, chapter tests, or practice exercises from course materials.
---

# Quiz Generator

智能自测题生成器，为课程章节生成带难度分级和详细解析的自测题。

## 功能特性

### 📊 难度分级
- **基础题（Basic）** - 检测基本概念理解
- **进阶题（Advanced）** - 测试知识应用能力
- **挑战题（Challenge）** - 挑战综合分析能力

### 📝 题型支持
- **选择题**（单选/多选）
- **判断题**
- **填空题**
- **代码分析题**
- **简单设计题**

### 📤 输出格式
- **Markdown** - 文档格式，适合打印和阅读
- **HTML** - 交互式网页，支持在线答题
- **JSON** - 系统格式，可导入LMS

### 🎯 核心功能
- 基于教材内容生成题目
- 智能难度分类
- 自动生成详细解析
- 支持自定义题目数量
- 题目质量验证

## 使用方式

### 基础用法

```
为《Python程序设计》第3章生成自测题
```

### 指定难度

```
为《数据结构》第2章生成20道基础题
为《操作系统》第4章生成10道挑战题
```

### 指定题型

```
为《计算机网络》第3章生成选择题和判断题各10道
```

### 多难度混合

```
为《数据库系统》第5章生成自测题：基础10题、进阶10题、挑战5题
```

### 完整参数

```
为《Java程序设计》第1-3章生成自测题，基础15题、进阶10题、挑战5题，输出Markdown和HTML格式
```

## 参数解析

### 课程信息
- 课程名称：`《课程名》`
- 章节范围：`第X章`、`第X-Y章`

### 难度配置
- 基础题数量：`基础X题`、`basic X`
- 进阶题数量：`进阶X题`、`advanced X`
- 挑战题数量：`挑战X题`、`challenge X`

### 题型配置
- 选择题：`选择题`、`choice`
- 判断题：`判断题`、`true_false`
- 填空题：`填空题`、`fill`
- 代码分析题：`代码分析题`、`code_analysis`
- 简单设计题：`简单设计题`、`design`

### 输出格式
- Markdown：`Markdown`、`md`
- HTML：`HTML`、`html`
- JSON：`JSON`、`json`

## 工作流程

### 1. 解析用户请求
提取课程名、章节、难度、题型、数量等参数

### 2. 加载课程资料
使用 MaterialLoader 加载教材内容

### 3. 提取知识点
分析章节内容，识别关键知识点

### 4. 生成题目
根据知识点和难度要求生成题目

### 5. 生成解析
为每道题生成详细的解答解析

### 6. 格式化输出
根据指定格式生成最终文件

## 题目类型说明

### 选择题
```markdown
1. Python中列表的特点是什么？
   A. 有序可变
   B. 有序不可变
   C. 无序可变
   D. 无序不可变
   答案：A
   难度：基础
   解析：列表是Python中最常用的数据结构之一，特点是有序且可变，可以存储任意类型的元素。
```

### 判断题
```markdown
2. Python中元组是不可变的。
   答案：正确
   难度：基础
   解析：元组是不可变序列，创建后不能修改其元素。
```

### 填空题
```markdown
3. Python中用于输出内容的内置函数是______。
   答案：print
   难度：基础
   解析：print() 是Python中最常用的输出函数，用于将内容打印到控制台。
```

### 代码分析题
```markdown
4. 分析以下代码的输出结果：
   ```python
   a = [1, 2, 3]
   b = a
   b[0] = 10
   print(a[0])
   ```
   答案：10
   难度：进阶
   解析：在Python中，列表是可变对象。当执行 b = a 时，b 和 a 指向同一个列表对象。因此修改 b[0] 也会影响 a[0]。
```

### 简单设计题
```markdown
5. 设计一个函数，判断一个数字是否为素数。
   答案：
   ```python
   def is_prime(n):
       if n < 2:
           return False
       for i in range(2, int(n**0.5) + 1):
           if n % i == 0:
               return False
       return True
   ```
   难度：挑战
   解析：素数是只能被1和自身整除的大于1的自然数。算法通过检查从2到√n的所有数，如果都不能整除n，则n是素数。
```

## 输出格式示例

### Markdown 格式
```markdown
# 《Python程序设计》第3章 自测题

## 基础题（10题）

1. ...

## 进阶题（10题）

1. ...

## 挑战题（5题）

1. ...

## 参考答案

1. ...
```

### HTML 格式
```html
<!DOCTYPE html>
<html>
<head>
    <title>自测题 - 第3章</title>
    <style>
        .quiz-container { ... }
        .question { ... }
        .answer { ... }
    </style>
</head>
<body>
    <div class="quiz-container">
        <h1>《Python程序设计》第3章 自测题</h1>
        <!-- 题目内容 -->
    </div>
    <script>
        // 交互逻辑
    </script>
</body>
</html>
```

### JSON 格式
```json
{
  "course": "Python程序设计",
  "chapter": 3,
  "questions": [
    {
      "id": 1,
      "type": "choice",
      "difficulty": "basic",
      "content": "Python中列表的特点是什么？",
      "options": ["A. 有序可变", "B. 有序不可变", "C. 无序可变", "D. 无序不可变"],
      "answer": "A",
      "explanation": "列表是有序且可变的..."
    }
  ]
}
```

## 技术实现

### 依赖组件
- **MaterialLoader** - 加载课程资料
- **DifficultyClassifier** - 难度分类
- **FeedbackGenerator** - 解析生成
- **QuizExporter** - 多格式导出

### 核心流程
```javascript
1. parseInput() - 解析用户输入
2. loadCourse() - 加载课程资料
3. extractKnowledgePoints() - 提取知识点
4. generateQuestions() - 生成题目
5. generateExplanations() - 生成解析
6. export() - 导出文件
```

## 质量保证

### 题目验证
- 答案正确性验证
- 题目难度匹配
- 知识点覆盖检查
- 重复题目去重

### 人工审核建议
- 生成后进行预览
- 检查题目合理性
- 验证解析准确性
- 调整难度分布

## 扩展功能

### 批量生成
```
为《数据结构》所有章节生成自测题
```

### 题库集成
```
将题目添加到题库
```

### 历史复用
```
使用之前的题目风格生成新题目
```

### 智能推荐
```
根据知识点推荐题目类型
```

## 注意事项

1. **教材质量** - 题目质量取决于教材内容的完整性
2. **难度平衡** - 建议合理分配不同难度题目的比例
3. **人工审核** - 生成后建议人工审核，确保质量
4. **定期更新** - 根据教学反馈更新题目

## 集成说明

### 在智能助手中使用
已集成到 `teaching-assistant.js`，可通过自然语言直接调用：
```
为《课程名》第X章生成自测题
```

### 独立使用
```javascript
const { QuizGenerator } = require('./skills/quiz-generator');
const generator = new QuizGenerator();
const result = await generator.generate(input, options);
```

## 输出目录结构

```
output/quizzes/
├── {课程名}/
│   ├── 第X章-基础题.md
│   ├── 第X章-进阶题.md
│   ├── 第X章-挑战题.md
│   ├── 第X章-完整版.md
│   ├── 第X章-交互式.html
│   └── 第X章-数据.json
```

## 示例场景

### 场景1：章节复习
```
教师：为《Python程序设计》第3章生成自测题，帮助学生复习
助手：生成了25道题（基础15、进阶8、挑战2），已保存
```

### 场景2：课前预习
```
教师：生成第5章的基础题，让学生课前预习
助手：已生成10道基础题，可以用于课前检测
```

### 场景3：综合测试
```
教师：为前3章生成综合性自测题
助手：生成了40道题（包含所有难度），适合综合测试
```

## 技术实现

### 架构设计

#### 核心模块
- **QuizGenerator** - 主生成器类
  - `generate()` - 主入口方法
  - `parseInput()` - 解析用户输入
  - `generateQuestions()` - 生成题目
  - `generateExplanations()` - 生成解析
  - `exportQuiz()` - 导出文件

#### 辅助模块
- **DifficultyClassifier** - 难度分类器
  - 智能难度分类算法
  - 批量分类功能
  - 难度分布调整

- **FeedbackGenerator** - 解析生成器
  - 生成详细解析
  - 支持多种题型
  - 批量生成优化

- **QuizExporter** - 多格式导出器
  - Markdown 导出
  - HTML 导出（交互式）
  - JSON 导出
  - 按难度分别导出

### 工作流程

```
1. 解析用户请求
   ↓
2. 加载课程资料 (MaterialLoader)
   ↓
3. 提取知识点
   ↓
4. 生成题目
   ↓
5. 难度分类
   ↓
6. 生成解析
   ↓
7. 格式化输出
```

### 依赖关系

- **核心依赖**：无（纯JavaScript实现）
- **可选依赖**：`marked` - Markdown解析（用于HTML导出）
- **运行环境**：Node.js >= 14.0.0

### 文件结构

```
quiz-generator/
├── index.js              # 主入口文件
├── lib/                  # 核心模块
│   ├── difficulty-classifier.js
│   ├── feedback-generator.js
│   ├── quiz-exporter.js
│   └── utils.js
├── templates/            # 题目模板
├── example-quiz.js      # 使用示例
├── test-quiz-generator.js # 测试脚本
├── SKILL.md             # 技能文档
├── _meta.json           # 元数据
└── package.json         # 包配置
```

## 质量保证

### 测试覆盖
- ✅ 基础自测题生成测试
- ✅ 指定难度生成测试
- ✅ 指定题型生成测试
- ✅ 多格式输出测试
- ✅ 错误处理测试

### 代码质量
- ✅ 模块化设计
- ✅ 错误处理机制
- ✅ 输入验证
- ✅ 代码注释完整

## 技术支持

- 完整功能测试：`npm test` 或 `node test-quiz-generator.js`
- 使用示例：`node example-quiz.js`
- 模板文件：`templates/`
- 代码检查：`npm run lint`
- 代码格式化：`npm run format`

## 版本信息

- **当前版本**：1.0.0
- **最后更新**：2026-03-11
- **兼容性**：Node.js >= 14.0.0
- **维护状态**：活跃维护
