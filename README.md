# OpenClaw 智能教学助手

## 项目简介

本项目是一个面向高校课程场景的智能教学助手，基于 OpenClaw 构建统一入口，打通“教学材料生成、群聊答疑、学情分析、督学提醒”全流程。  
当前仓库为轻量可复现版本，保留核心代码与代表性产物，便于在 GitHub 展示与快速上手。

## 核心解决的教学场景痛点

- 备课效率低：教师需要反复产出题目、试卷、实验和课件，人工成本高。
- 群聊重复答疑多：截止时间、考试安排、资料位置等问题高频重复。
- 学情反馈分散：问答记录难以沉淀，教师难快速把握班级薄弱点与趋势。
- 个性化支持不足：学生缺少基于历史问答与章节薄弱点的针对性建议。

## 项目核心功能模块

- 教学材料生成：自测题、AB试卷、实验方案、课程内容、PPT 大纲。
- 双通道问答：
  - 教务答疑：规则优先 -> FAQ -> AI 兜底。
  - 课程答疑：基于教材/知识库检索增强后生成回答。
- 学情分析：答疑日志自动结构化沉淀，聚合输出课程/班级维度摘要。
- 督学提醒：生成提醒计划并通过脚本映射到 cron 任务。
- GUI 双端界面：`teaching-assistant-gui/` 提供教师端与学生端网页入口。
- 代表性结果：`output-samples/` 提供题目、试卷、实验、FAQ、学情、提醒样例。

## 核心技术栈（OpenClaw重点）

- OpenClaw 统一入口调度：`teaching-assistant.js` 负责意图识别与多技能分发。
- Skills 模块化能力：`skills/` 下拆分 quiz/exam/experiment/course-content/ai-ppt 等能力。
- 规则引擎与自动回复：`config/auto-reply-rules.json` + `lib/auto-reply-rules.js`。
- 学情日志与聚合：`lib/learning-log.js` + `scripts/learning-analytics-report.js`。
- 提醒编排：`config/reminder-rules.json` + `scripts/apply-reminder-cron.js`。
- 检索增强：本地教材（`teaching-data/`）+ 可选 Dify 知识库检索。
- GUI 层：`teaching-assistant-gui/server.js` 作为前后端桥接，教师端已对接 4 项能力 API。

## 项目文件结构树（核心文件说明）

```text
project-github-lite/
├── README.md                              # 项目说明
├── teaching-assistant.js                  # OpenClaw统一入口（意图识别+调度）
├── index.js                               # 命令行入口
├── cli.js                                 # CLI辅助入口
├── config/
│   ├── auto-reply-rules.json              # 教务自动回复规则
│   └── reminder-rules.json                # 差异化提醒规则
├── lib/
│   ├── auto-reply-rules.js                # 规则匹配与回复决策
│   ├── learning-log.js                    # 答疑日志写入/读取
│   ├── teaching-admin.js                  # 教师面板、FAQ、提醒计划
│   ├── course-qa.js                       # 课程答疑与知识点总结
│   └── semantic-context.js                # 教材上下文检索（本地/Dify）
├── scripts/
│   ├── learning-analytics-report.js       # 学情报告与摘要生成
│   └── apply-reminder-cron.js             # 提醒计划映射cron
├── skills/                                # 各教学能力模块（Skills）
├── teaching-assistant-gui/                # 双端GUI（教师端/学生端）
│   ├── server.js                          # GUI后端桥接（/api/quiz|exam|experiment|ppt）
│   ├── package.json
│   └── public/
│       ├── teacher.html                   # 教师端界面
│       ├── student.html                   # 学生端界面
│       └── js/teacher.js                  # 教师端API调用
├── teaching-data/
│   └── 人工智能引论/textbook.md            # 单课程演示教材
└── output-samples/                        # 代表性生成产物样例
```

## 本地运行/部署步骤（可复现）

1. **准备环境**
  - Node.js 18+（建议）
  - 在项目根目录创建 `config.env`，配置 LLM（及可选 Dify）密钥。
2. **安装依赖（按需）**
  - 本仓库为轻量包，若需完整运行全部 Skills，可按 `skills/*/package.json` 分模块安装依赖。
3. **执行示例命令**
  - 生成自测题：  
   `node teaching-assistant.js "为《人工智能引论》第3章生成自测题"`
  - 课程答疑：  
  `node teaching-assistant.js "《人工智能引论》第3章 什么是盲目搜索？"`
  - 学情分析：  
  `node teaching-assistant.js "学情分析"`
  - 教师面板：  
  `node teaching-assistant.js "教师管理面板"`
4. **查看输出**
  - 运行样例产物：`output-samples/`
  - 实际运行生成产物：默认输出到 `output/`（若启用完整运行链路）
5. **提醒任务（可选）**
  - `node scripts/apply-reminder-cron.js --plan <提醒计划json> --dry-run`
  - 验证无误后再连接实际通道参数执行。
6. **启动 GUI（可选）**
  - `cd teaching-assistant-gui && npm install`
  - `npm start`
  - 打开 `http://localhost:3765`
  - 若工作区路径不同，可设置：`WORKSPACE_ROOT=/path/to/clawwork/workspace npm start`

