---
name: experiment-designer
description: 根据课程内容自动设计实验案例，生成示例代码与实验手册。Use when user asks for 设计实验、实验方案、实验手册、为某课程某章设计实验、或 mentions "实验设计","实验方案","实验手册". Outputs Markdown + code to output/experiments/.
---

# Experiment Designer - 课程实验设计技能

## 固定指令（展示/调度用）

**统一入口**（推荐，须在工作区根目录执行）：
```bash
node teaching-assistant.js "为《课程名》第X章设计实验方案"
```
示例：`node teaching-assistant.js "为《数据结构》第3章设计编程实验，难度进阶"`

**直接调用本 skill**（备用，须在工作区根目录）：
```bash
node skills/experiment-designer/index.js --course "课程名" --chapter "章节号" [--difficulty 基础|进阶|综合] [--language python]
```
示例：`node skills/experiment-designer/index.js --course "人工智能引论" --chapter "3" --difficulty 进阶`

教材从 `teaching-data/textbooks/课程名/` 读取；输出到 `output/experiments/课程名/`。

## 概述

Experiment Designer 是一个智能实验设计系统，能够根据课程内容自动设计实验案例，生成示例实现代码，并输出完整的实验手册。

## 功能特性

### 1. 智能实验规划
- 基于课程内容自动生成实验题目
- 支持章节筛选和知识点定位
- 自动判断实验类型（编程/配置/分析/设计/综合）
- 智能难度分级（基础/进阶/综合）

### 2. 代码实现生成
- 根据实验需求生成示例代码
- 支持多种编程语言（Python、C、C++、Java 等）
- 代码规范化和注释完整
- 自动保存为独立文件

### 3. 实验手册生成
- 生成完整的 Markdown 格式实验手册
- 导出为 Word 文档（DOCX）
- 包含实验目的、环境、要求、步骤、示例、评分标准

### 4. 测试用例设计
- 自动设计测试用例
- 提供预期结果
- 评分标准说明

## 支持的课程类型

| 课程类型 | 实验类型 | 示例 |
|---------|---------|------|
| **编程类** | 编程实验 | 编写算法、实现数据结构 |
| **系统类** | 配置实验 | 环境搭建、系统配置 |
| **理论类** | 分析实验 | 数据分析、性能测试 |
| **设计类** | 设计实验 | 系统设计、架构设计 |
| **综合类** | 综合实验 | 完整项目实战 |

## 课程列表

1. 编译原理与技术
2. 操作系统原理与技术实现
3. 高等学校计算机类专业人才培养战略研究报告
4. 计算机科学导论——计算+、互联网+与人工智能
5. 计算机系统：基于RISC-V+Linux平台
6. 计算机组成与实现
7. 人工智能引论
8. 软件工程：理论与实践
9. 深入理解计算机网络
10. 数据结构
11. 数据库管理系统：从基本原理到系统构建

## 实验难度分级

| 级别 | 说明 | 适合人群 |
|------|------|---------|
| **基础** | 验证单一知识点，操作简单 | 初学者 |
| **进阶** | 结合多个知识点，需要思考 | 有基础的学生 |
| **综合** | 完整项目实战，综合运用 | 高年级学生 |

## 实验手册结构

```
1. 实验名称
2. 实验目的
3. 实验环境
   - 硬件要求
   - 软件要求
   - 开发工具
4. 实验要求
   - 功能要求
   - 性能要求
   - 提交要求
5. 实验步骤
   - 步骤1：...
   - 步骤2：...
   - ...
6. 示例实现
   - 代码说明
   - 完整代码（见附件）
7. 测试与验证
   - 测试用例
   - 预期结果
8. 评分标准
   - 功能实现（60%）
   - 代码质量（20%）
   - 实验报告（20%）
9. 常见问题
10. 参考资料
```

## 输出格式

| 格式 | 用途 | 扩展名 |
|------|------|--------|
| **Markdown** | 预览和编辑 | .md |
| **Word** | 分发给学生 | .docx |
| **代码文件** | 示例代码 | 根据语言（.py, .c, .cpp, .java 等） |

## 安装依赖

```bash
npm install
```

所需依赖：
- `marked` - Markdown 解析
- `docx` - Word 文档生成
- `fs-extra` - 文件操作

## 使用方法

### 基本使用

```javascript
const ExperimentDesigner = require('./index');

const designer = new ExperimentDesigner();

// 设计实验
const result = await designer.designExperiment({
  courseName: '数据结构',
  chapters: ['第3章 栈和队列'],
  difficulty: '进阶',
  type: '编程实验'
});

console.log(result);
```

### 命令行使用

```bash
# 基础实验
node skills/experiment-designer/examples/demo-experiment.js

# 指定课程和章节
node skills/experiment-designer/examples/demo-experiment.js --course "数据结构" --chapters "3,4" --difficulty "进阶"
```

### 集成到教学助手

```bash
# 通过智能助手使用
node teaching-assistant.js "为《数据结构》第3章设计编程实验，难度进阶"
```

## 工作流程

```
1. 加载课程资料（MaterialLoader）
        ↓
2. 分析课程内容，识别知识点
        ↓
3. 根据课程类型判断实验类型
        ↓
4. 规划实验题目和难度
        ↓
5. 生成实验步骤和示例代码
        ↓
6. 构建实验手册（Markdown）
        ↓
7. 导出 Word 文档
        ↓
8. 保存代码文件
        ↓
9. 输出实验包（手册 + 代码）
```

## 组件说明

### 1. ExperimentPlanner (lib/experiment-planner.js)
- 实验规划器
- 分析课程内容
- 生成实验题目
- 判断实验类型

### 2. ImplementationGenerator (lib/implementation-generator.js)
- 代码生成器
- 生成示例代码
- 代码规范化
- 注释生成

### 3. ManualBuilder (lib/manual-builder.js)
- 手册构建器
- 生成实验手册
- 支持多种格式
- 模板渲染

### 4. DifficultyClassifier (lib/difficulty-classifier.js)
- 难度分类器
- 判断实验难度
- 调整复杂度

### 5. TestCaseGenerator (lib/test-case-generator.js)
- 测试用例生成器
- 设计测试方案
- 生成评分标准

## 实验模板

### 编程实验模板 (templates/programming.md)
适用于编程类实验，包含代码实现部分。

### 配置实验模板 (templates/configuration.md)
适用于系统配置和环境搭建类实验。

### 分析实验模板 (templates/analysis.md)
适用于数据分析和性能测试类实验。

### 设计实验模板 (templates/design.md)
适用于系统设计和架构设计类实验。

### 综合实验模板 (templates/comprehensive.md)
适用于完整项目实战类实验。

## 输出示例

### 实验手册预览（Markdown）

```markdown
# 实验：栈的应用 - 表达式求值

## 1. 实验目的
- 掌握栈的基本操作
- 理解栈在表达式求值中的应用
- 实现中缀表达式转后缀表达式

## 2. 实验环境
- 操作系统：Windows/Linux/macOS
- 编程语言：Python 3.8+
- 开发工具：PyCharm / VS Code

## 3. 实验要求
...

## 4. 实验步骤
...

## 5. 示例实现
完整代码见：`expression_evaluator.py`

## 6. 测试与验证
...

## 7. 评分标准
...
```

### 代码示例（Python）

```python
# expression_evaluator.py
class Stack:
    def __init__(self):
        self.items = []

    def push(self, item):
        self.items.append(item)

    def pop(self):
        if not self.is_empty():
            return self.items.pop()
        return None

    def is_empty(self):
        return len(self.items) == 0

# ... 完整代码
```

## 高级功能

### 自定义实验模板
```javascript
result = await designer.designExperiment({
  courseName: '数据结构',
  customTemplate: 'templates/custom.md',
  ...
});
```

### 批量生成实验
```javascript
const experiments = await designer.batchDesign({
  courseName: '数据结构',
  chapters: ['第1章', '第2章', '第3章'],
  difficulty: '基础'
});
```

### 实验变体生成
```javascript
// 为同一主题生成不同难度的实验
const variants = await designer.generateVariants({
  topic: '二叉树遍历',
  difficulties: ['基础', '进阶', '综合']
});
```

## 注意事项

1. **课程资料要求**
   - 必须先加载课程资料到 `teaching-data/textbooks/` 目录
   - 资料格式必须是 Markdown
   - 章节标题需要使用 `## 第X章 标题` 格式

2. **代码生成限制**
   - 当前代码生成基于模板和规则
   - 复杂算法可能需要手动调整
   - 建议人工审查生成的代码

3. **Word 导出**
   - 需要安装 `docx` 库
   - 某些 Markdown 格式可能无法完全保留
   - 建议使用 Markdown 作为主格式

4. **性能考虑**
   - 首次运行会生成缓存
   - 大型课程可能需要较长处理时间
   - 建议分章节处理

## 故障排查

### 问题：找不到课程资料
**解决方案：** 检查 `teaching-data/textbooks/` 目录下是否存在对应课程

### 问题：代码生成失败
**解决方案：** 检查实验类型是否支持代码生成

### 问题：Word 导出失败
**解决方案：** 检查是否安装了 `docx` 库

## 开发计划

- [x] 基础架构搭建
- [x] 实验规划器
- [x] 代码生成器
- [x] 手册构建器
- [x] 难度分类器
- [x] 模板系统
- [ ] 集成 LLM API（智能生成）
- [ ] 批量生成功能
- [ ] 实验变体生成
- [ ] Web 界面

## 作者

Clawdbot Intelligent Teaching Assistant

## 版本

v1.0.0 - 2026-03-08

## 许可

MIT License
