# {{COURSE_NAME}} - {{EXAM_TYPE}} 试卷（{{VERSION}}卷）

**考试时间**: {{DURATION}}分钟  |  **总分**: {{TOTAL_SCORE}}分
**考试日期**: {{EXAM_DATE}}

**注意事项**:
1. 请在答题卡上作答
2. 题目未注明可使用外部库时，请使用标准库

---

## 一、单选题（每题{{SCORE_PER_SINGLE}}分，共{{TOTAL_SINGLE}}分）

{{#EACH SINGLE_CHOICE}}
{{INDEX}}. {{QUESTION}}（ ）
   A. {{OPTION_A}}
   B. {{OPTION_B}}
   C. {{OPTION_C}}
   D. {{OPTION_D}}

   **[参考知识点]: {{KNOWLEDGE_POINT}} [教材: 第{{CHAPTER}}章 第{{PAGE}}页]**
{{/EACH}}

---

## 二、多选题（每题{{SCORE_PER_MULTI}}分，共{{TOTAL_MULTI}}分）

{{#EACH MULTI_CHOICE}}
{{INDEX}}. {{QUESTION}}（ ）
   A. {{OPTION_A}}
   B. {{OPTION_B}}
   C. {{OPTION_C}}
   D. {{OPTION_D}}
   E. {{OPTION_E}}

   **[参考知识点]: {{KNOWLEDGE_POINT}} [教材: 第{{CHAPTER}}章 第{{PAGE}}页]**
{{/EACH}}

---

## 三、填空题（每题{{SCORE_PER_FILL}}分，共{{TOTAL_FILL}}分）

{{#EACH FILL_BLANK}}
{{INDEX}}. {{QUESTION}} ____________。

   **[参考知识点]: {{KNOWLEDGE_POINT}} [教材: 第{{CHAPTER}}章 第{{PAGE}}页]**
{{/EACH}}

---

## 四、简答题（每题{{SCORE_PER_SHORT}}分，共{{TOTAL_SHORT}}分）

{{#EACH SHORT_ANSWER}}
{{INDEX}}. {{QUESTION}}

   **[参考知识点]: {{KNOWLEDGE_POINT}} [教材: 第{{CHAPTER}}章 第{{PAGE}}页]**
{{/EACH}}

---

## 五、综合题（每题{{SCORE_PER_COMP}}分，共{{TOTAL_COMP}}分）

{{#EACH COMPREHENSIVE}}
{{INDEX}}. {{QUESTION}}

   **[参考知识点]: {{KNOWLEDGE_POINT}} [教材: 第{{CHAPTER}}章 第{{PAGE}}页]**
{{/EACH}}

---

**考试结束，请检查是否漏题**
