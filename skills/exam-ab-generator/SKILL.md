---
name: exam-ab-generator
description: Generate exam papers (A/B versions) with answers and rubrics from textbook/course materials. Use when user asks for 出试卷、AB卷、期末考试、期中考试、试卷编制.
---

# Exam AB Generator

## 固定指令（展示/调度用）

**统一入口**（推荐，须在工作区根目录执行）：
```bash
node teaching-assistant.js "为《课程名》第X-Y章生成期末/期中试卷，AB两卷"
```
示例：`node teaching-assistant.js "为《Python程序设计》第3-5章生成期末试卷，100分，2小时，AB两卷"`

本 skill 由统一入口按意图调用，教材从 `teaching-data/textbooks/课程名/` 读取；输出到 `output/exams/课程名/`。

## Overview

Generate professional exam papers (A/B versions) from textbook/course materials with standard answers, detailed explanations, and grading rubrics. Each version covers the same knowledge points with different questions while maintaining equivalent difficulty.

## Workflow Decision Tree

```
Start → Parse Request → Load Course Materials → Build Knowledge Base → Generate Exam A → Validate → Generate Exam B → Validate → Output
```

## Step 1: Parse User Request

Extract exam parameters from user request:

| Parameter | Description | Default | Example Detection |
|-----------|-------------|---------|-------------------|
| Course Name | Target course | Required | "Python程序设计", "数据结构" |
| Chapters | Chapter range | All | "第3-5章", "1-8章" |
| Exam Type | Exam category | Final | "期末", "期中", "单元测试" |
| Total Score | Maximum points | 100 | "100分", "总分150" |
| Duration | Exam time (minutes) | 120 | "2小时", "90分钟" |
| Question Types | Type distribution | Auto | "选择题20分, 填空题20分, 简答题40分, 综合题20分" |
| Difficulty | Overall difficulty | Medium | "简单", "中等", "困难" |
| Versions | Number of papers | 1 (A only) | "AB两卷", "生成两份" |

**Example Requests:**
- "为《Python程序设计》第3-5章生成期末试卷AB两卷"
- "出一份数据结构期中考试题，100分，2小时"
- "为计算机网络课程生成AB卷，难度中等"

## Step 2: Load Course Materials

### Identify Source Material

The system automatically loads course materials from the teaching-data library:

**Default Location:** `teaching-data/textbooks/{course-name}/`

**Supported Formats:**
- PDF textbooks (.pdf)
- Markdown files (.md)
- Text files (.txt)

**Optional Files:**
- `textbook.md/.pdf` - Main textbook content (required)
- `outline.md` - Course outline (recommended)
- `knowledge.md` - Knowledge points extracted from textbook (auto-generated if missing)
- `metadata.json` - Course metadata (author, publisher, etc.)

**Additional Resources:** `teaching-data/course-materials/{course-name}/`
- `slides/` - Course slides/PPTs
- `notes/` - Lecture notes
- `cases/` - Case studies
- `exercises/` - Historical exercises

**Example Structure:**
```
teaching-data/
├── textbooks/
│   └── Python程序设计/
│       ├── textbook.md          # 教材内容
│       ├── outline.md           # 课程大纲
│       ├── knowledge.md         # 知识点（可选）
│       └── metadata.json        # 元数据（可选）
└── course-materials/
    └── Python程序设计/
        ├── slides/
        ├── notes/
        └── cases/
```

### Build Knowledge Context

The MaterialLoader automatically:
1. Finds course materials (supports fuzzy matching)
2. Reads textbook, outlines, and supporting materials
3. Filters content by chapter if specified
4. Builds a unified context for LLM

**Context Includes:**
- Course metadata (if available)
- Course outline
- Knowledge points
- Textbook content (filtered by chapter)
- Lecture notes
- Case studies

**Automatic Features:**
- Fuzzy course name matching
- Chapter filtering (e.g., "3-5" → extracts Chapters 3, 4, 5)
- Content caching for performance
- Context length optimization

## Step 3: Generate Exam A

### Determine Question Distribution

Default distribution (100 points):
```
Single Choice (单选题): 15 × 2 = 30 points
Multiple Choice (多选题): 5 × 4 = 20 points
Fill-in-Blank (填空题): 10 × 2 = 20 points
Short Answer (简答题): 4 × 5 = 20 points
Comprehensive (综合题): 1 × 10 = 10 points
```

**Difficulty Balance:**
- A卷: Basic questions ≥ 70%
- B卷: Advanced questions ≥ 70%

### Generate Questions

For each question type:

1. **Select Knowledge Points**
   - Ensure chapter coverage matches user request
   - Balance difficulty levels
   - Avoid over-representation of single chapters

2. **Generate Question Content**
   ```
   For each knowledge point:
     - Analyze textbook/slide content
     - Draft question that tests understanding
     - Create distractors based on course materials
     - Reference: [Chapter X, specific section]
   ```

3. **Create Answer Key**
   ```
   For each question:
     - Correct answer
     - Detailed explanation
     - Grading rubric (how points are awarded)
     - Knowledge point tag
   ```

## Step 4: Validate Exam A

**Validation Checklist:**
- [ ] All questions reference textbook sections
- [ ] Knowledge point coverage ≥ 90%
- [ ] No duplicate questions or variants
- [ ] All answers are correct
- [ ] Difficulty distribution matches requirements
- [ ] Total score equals specified value

**If validation fails:** Regenerate problematic questions.

## Step 5: Generate Exam B

**Key Rules for B卷:**
- Different questions from A卷
- Same knowledge point coverage
- Equivalent difficulty
- Different question angles/variations

**Example:**
```
A卷 Question: "What is the output of print(list(range(5)))?"
B卷 Question: "Which of the following creates a list [0, 1, 2, 3, 4]?"
```

Validate B卷 using same checklist as A卷.

## Step 6: Output Results

### Output Format (Markdown)

Generate in `output/exams/`:

```
output/exams/
└── {course-name}/
    ├── {exam-type}-A.md
    ├── {exam-type}-B.md
    └── {exam-type}-answers.md
```

### Exam Template

```markdown
# {Course Name} - {Exam Type} 试卷（{A/B}卷）

**考试时间**: {duration}分钟  |  **总分**: {total_score}分
**考试日期**: {date}

**注意事项**:
1. 请在答题卡上作答
2. 题目未注明可使用外部库时，请使用标准库

---

## 一、单选题（每题{score}分，共{total}分）

1. [Question content]（ ）
   A. Option A
   B. Option B
   C. Option C
   D. Option D

   **[参考知识点]: {knowledge-point} [教材: 第{chapter}章 第{page}页]**

---

## 二、多选题（每题{score}分，共{total}分）

1. [Question content]（ ）
   A. Option A
   B. Option B
   C. Option C
   D. Option E

   **[参考知识点]: {knowledge-point} [教材: 第{chapter}章 第{page}页]**

---

## 三、填空题（每题{score}分，共{total}分）

1. [Question stem] ____________。

   **[参考知识点]: {knowledge-point} [教材: 第{chapter}章 第{page}页]**

---

## 四、简答题（每题{score}分，共{total}分）

1. [Question prompt]

   **[参考知识点]: {knowledge-point} [教材: 第{chapter}章 第{page}页]**

---

## 五、综合题（每题{score}分，共{total}分）

1. [Question prompt with scenario/requirements]

   **[参考知识点]: {knowledge-point} [教材: 第{chapter}章 第{page}页]**

---

**考试结束，请检查是否漏题**
```

### Answer Key Template

```markdown
# {Course Name} - {Exam Type} 参考答案与评分标准

## A卷参考答案

### 一、单选题

1. **答案**: B
   **解析**: [Detailed explanation]
   **评分标准**: 答对给满分，答错不给分
   **知识点**: {knowledge-point}

---

## B卷参考答案

[Same structure as A卷]

---

## 知识点覆盖统计

| 章节 | A卷题数 | B卷题数 | 总题数 | 覆盖率 |
|------|---------|---------|--------|--------|
| 第1章 | 3 | 3 | 6 | 100% |
| 第2章 | 4 | 4 | 8 | 100% |
| ... | ... | ... | ... | ... |
```

## Quality Assurance

### Content Validation

- **Accuracy**: All answers verified against textbook
- **Completeness**: Knowledge point coverage ≥ 90%
- **Appropriateness**: Questions match course level
- **Originality**: No direct copying from textbook

### Format Validation

- **Consistency**: Uniform formatting across A/B versions
- **Clarity**: Clear instructions and question wording
- **Completeness**: All sections present (questions, instructions)

### Output Summary

After generation, provide summary to user:

```markdown
✅ 试卷生成完成

**试卷信息**:
- 课程: {Course Name}
- 章节: {Chapters}
- 试卷类型: {Exam Type}
- 总分: {Total Score}分
- 考试时间: {Duration}分钟

**题型分布**:
- 单选题: {N}题 × {score}分 = {total}分
- 多选题: {N}题 × {score}分 = {total}分
- 填空题: {N}题 × {score}分 = {total}分
- 简答题: {N}题 × {score}分 = {total}分
- 综合题: {N}题 × {score}分 = {total}分

**输出文件**:
- A卷: output/exams/{course-name}/{exam-type}-A.md
- B卷: output/exams/{course-name}/{exam-type}-B.md
- 参考答案: output/exams/{course-name}/{exam-type}-answers.md

**需要调整吗？** (题型分布/难度/题目替换)
```

## References

### Template Resources

If question templates are needed, create in `assets/templates/`:
- `single-choice-template.md`
- `short-answer-template.md`
- `comprehensive-question-template.md`

### Configuration Files

If course-specific configurations are needed, create in `assets/configs/`:
- `{course-name}-exam-config.json` - Custom question types and distribution
- `{course-name}-knowledge-map.json` - Knowledge point structure

## Advanced Features

### Custom Question Types

If user requests specific question types:
- Programming/Coding questions
- Algorithm analysis questions
- Case study questions
- Experiment design questions

Adapt workflow to include these types with appropriate templates.

### Batch Generation

For multiple exams (multiple chapters/units):
1. Generate sequentially
2. Ensure knowledge point coverage across all exams
3. Provide consolidated report

### Quality Metrics

Track and report:
- Question difficulty distribution
- Knowledge point coverage percentage
- Originality score (vs. textbook)
- Estimated completion time
