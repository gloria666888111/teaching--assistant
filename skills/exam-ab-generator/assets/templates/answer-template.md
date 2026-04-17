# {{COURSE_NAME}} - {{EXAM_TYPE}} 参考答案与评分标准

## {{VERSION}}卷参考答案

### 一、单选题

{{#EACH SINGLE_CHOICE}}
{{INDEX}}. **答案**: {{ANSWER}}
   **解析**: {{EXPLANATION}}
   **评分标准**: 答对给满分，答错不给分
   **知识点**: {{KNOWLEDGE_POINT}}
{{/EACH}}

---

### 二、多选题

{{#EACH MULTI_CHOICE}}
{{INDEX}}. **答案**: {{ANSWER}}
   **解析**: {{EXPLANATION}}
   **评分标准**: 全对给满分，少选扣一半，错选不给分
   **知识点**: {{KNOWLEDGE_POINT}}
{{/EACH}}

---

### 三、填空题

{{#EACH FILL_BLANK}}
{{INDEX}}. **答案**: {{ANSWER}}
   **解析**: {{EXPLANATION}}
   **评分标准**: 每空{{SCORE}}分
   **知识点**: {{KNOWLEDGE_POINT}}
{{/EACH}}

---

### 四、简答题

{{#EACH SHORT_ANSWER}}
{{INDEX}}. **答案**:

   {{ANSWER_CONTENT}}

   **解析**: {{EXPLANATION}}
   **评分标准**:
   - 要点1: {{SCORE_1}}分
   - 要点2: {{SCORE_2}}分
   - ...
   **知识点**: {{KNOWLEDGE_POINT}}
{{/EACH}}

---

### 五、综合题

{{#EACH COMPREHENSIVE}}
{{INDEX}}. **答案**:

   {{ANSWER_CONTENT}}

   **解析**: {{EXPLANATION}}
   **评分标准**:
   - 正确性: {{SCORE_CORRECTNESS}}分
   - 完整性: {{SCORE_COMPLETENESS}}分
   - 规范性: {{SCORE_STANDARD}}分
   **知识点**: {{KNOWLEDGE_POINT}}
{{/EACH}}

---

## 知识点覆盖统计

| 章节 | {{A}}卷题数 | {{B}}卷题数 | 总题数 | 覆盖率 |
|------|-----------|-----------|--------|--------|
{{#EACH CHAPTER}}
| {{CHAPTER_NUM}} | {{A_COUNT}} | {{B_COUNT}} | {{TOTAL}} | {{COVERAGE}}% |
{{/EACH}}

**总计**: {{TOTAL_QUESTIONS}}题，覆盖率: {{TOTAL_COVERAGE}}%
