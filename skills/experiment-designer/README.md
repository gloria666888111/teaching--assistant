# Experiment Designer - 智能实验设计系统

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/experiment-designer.svg)](https://nodejs.org)

一个智能实验设计系统，能够根据课程内容自动设计实验案例，生成示例实现代码，并输出完整的实验手册（Markdown + Word）。

## ✨ 特性

- 🎯 **智能实验规划** - 基于课程内容自动生成实验题目
- 🔢 **难度分级** - 支持基础、进阶、综合三个难度级别
- 💻 **代码生成** - 自动生成示例代码（支持Python、C、C++、Java）
- 📚 **手册生成** - 输出Markdown和Word格式的完整实验手册
- 🧪 **测试用例** - 自动生成测试用例和评分标准
- 📊 **多种实验类型** - 支持编程、配置、分析、设计、综合实验

## 🚀 快速开始

### 安装依赖

```bash
cd skills/experiment-designer
npm install
```

### 运行演示

```bash
npm run demo
```

### 运行测试

```bash
npm test
```

### 基本使用

```javascript
const ExperimentDesigner = require('./index');

const designer = new ExperimentDesigner();

// 设计一个实验
const result = await designer.designExperiment({
  courseName: '数据结构',
  chapters: ['第3章 栈和队列'],
  difficulty: '进阶',
  language: 'python'
});

console.log(`实验名称：${result.experiment.experimentTitle}`);
console.log(`代码文件：${result.implementation.path}`);
console.log(`手册文件：${result.manuals.markdown.path}`);
```

## 📖 详细文档

请查看 [SKILL.md](./SKILL.md) 了解完整的功能文档。

## 📁 项目结构

```
experiment-designer/
├── index.js                          # 主入口
├── package.json                      # 依赖配置
├── SKILL.md                          # 技能文档
├── README.md                         # 本文件
├── test-experiment-designer.js       # 测试脚本
├── lib/                              # 核心库
│   ├── difficulty-classifier.js      # 难度分类器
│   ├── experiment-planner.js         # 实验规划器
│   ├── implementation-generator.js   # 代码生成器
│   ├── test-case-generator.js        # 测试用例生成器
│   └── manual-builder.js             # 手册构建器
└── examples/                         # 示例代码
    └── demo-experiment.js            # 演示脚本
```

## 🎓 支持的课程

- 编译原理与技术
- 操作系统原理与技术实现
- 计算机科学导论
- 计算机系统：基于RISC-V+Linux平台
- 计算机组成与实现
- 人工智能引论
- 软件工程：理论与实践
- 深入理解计算机网络
- 数据结构
- 数据库管理系统：从基本原理到系统构建

## 🔧 API参考

### designExperiment(options)

设计单个实验

**参数：**
- `courseName` (string) - 课程名称
- `chapters` (string[]) - 章节列表
- `difficulty` (string) - 难度（基础/进阶/综合）
- `type` (string) - 实验类型（可选）
- `language` (string) - 编程语言（默认：python）
- `outputDir` (string) - 输出目录（可选）

**返回：**
```javascript
{
  success: boolean,
  experiment: object,      // 实验信息
  implementation: object,   // 代码实现
  testCases: array,        // 测试用例
  gradingCriteria: object, // 评分标准
  manuals: object,         // 手册文件
  outputDir: string        // 输出目录
}
```

### batchDesign(options)

批量设计实验

**参数：**
- `courseName` (string) - 课程名称
- `chapters` (string[]) - 章节列表
- `difficulty` (string) - 难度
- `type` (string) - 实验类型（可选）
- `language` (string) - 编程语言（默认：python）

**返回：** 实验结果数组

### generateVariants(options)

生成实验变体

**参数：**
- `courseName` (string) - 课程名称
- `chapters` (string[]) - 章节列表
- `difficulties` (string[]) - 难度列表
- `language` (string) - 编程语言（默认：python）

**返回：** 不同难度的实验结果数组

## 📊 实验类型

| 类型 | 说明 | 示例 |
|------|------|------|
| **编程实验** | 代码实现和算法设计 | 栈的实现、排序算法 |
| **配置实验** | 环境搭建和系统配置 | Linux环境配置、数据库安装 |
| **分析实验** | 数据分析和性能测试 | 算法性能分析、数据挖掘 |
| **设计实验** | 系统设计和架构设计 | 数据库设计、系统架构 |
| **综合实验** | 完整项目实战 | 学生管理系统、搜索引擎 |

## 🎯 难度级别

| 级别 | 说明 | 预计时间 |
|------|------|---------|
| **基础** | 验证单一知识点，操作简单 | 2-4小时 |
| **进阶** | 结合多个知识点，需要思考 | 4-8小时 |
| **综合** | 完整项目实战，综合运用 | 8-16小时 |

## 📝 输出格式

### Markdown手册

- 清晰的格式和结构
- 易于查看和编辑
- 适合版本控制

### Word手册

- 正式文档格式
- 适合打印和分发
- 支持进一步编辑

### 代码文件

- 独立的代码文件
- 完整的注释
- 包含测试用例

## ⚙️ 配置

```javascript
const designer = new ExperimentDesigner({
  dataDir: 'teaching-data/textbooks',  // 课程资料目录
  outputDir: 'output/experiments',     // 输出目录
  codeDir: 'code',                     // 代码子目录
  manualDir: 'manuals'                 // 手册子目录
});
```

## 🔌 集成到教学助手

实验设计系统已经集成到智能教学助手中：

```bash
node teaching-assistant.js "为《数据结构》第3章设计编程实验，难度进阶"
```

## 📚 使用示例

### 示例1：基础实验

```javascript
const result = await designer.designExperiment({
  courseName: '数据结构',
  chapters: ['第3章 栈和队列'],
  difficulty: '基础',
  language: 'python'
});
```

### 示例2：进阶实验

```javascript
const result = await designer.designExperiment({
  courseName: '操作系统',
  chapters: ['第5章 进程管理'],
  difficulty: '进阶',
  language: 'c'
});
```

### 示例3：综合实验

```javascript
const result = await designer.designExperiment({
  courseName: '软件工程',
  chapters: ['第3章 软件设计'],
  difficulty: '综合',
  language: 'java'
});
```

### 示例4：批量生成

```javascript
const results = await designer.batchDesign({
  courseName: '数据结构',
  chapters: ['第3章', '第4章', '第5章'],
  difficulty: '基础',
  language: 'python'
});
```

## 🧪 测试

运行测试套件：

```bash
npm test
```

测试覆盖：
- ✅ 基础实验设计
- ✅ 进阶实验设计
- ✅ 综合实验设计
- ✅ 不同编程语言
- ✅ 文件输出
- ✅ 批量设计
- ✅ 实验变体生成

## 🤝 贡献

欢迎贡献代码、报告问题或提出建议！

## 📄 许可证

MIT License - 详见 [LICENSE](../../LICENSE) 文件

## 👨‍💻 作者

Clawdbot Intelligent Teaching Assistant

## 🙏 致谢

感谢所有贡献者！

---

**开始设计你的第一个实验吧！** 🚀
