# 智能教学助手双端 GUI

基于 Web 的智能教学助手双端界面，**教师端**部分功能已对接 OpenClaw/clawwork 的 4 个技能，其余模块与**学生端**为界面设计占位。

## 功能说明

### 教师端（实际接入 4 项）

| 模块             | 状态     | 说明 |
|------------------|----------|------|
| 智能出题组卷     | ✅ 已对接 | 自测题、AB 卷、实验方案、PPT 四个子项，调用 `clawwork/workspace` 下 skills |
| 学情数据看板     | 仅设计   | 预留统计卡片，待后端数据接口 |
| 作业管理与自动批改 | 仅设计   | 预留列表与批改区，待后端 |
| 学生学习状态预警 | 仅设计   | 预留预警列表，待后端 |
| 班级知识点掌握统计 | 仅设计   | 预留统计面板，待后端 |

### 学生端（全部仅设计）

- 用户信息栏、教材知识点侧边栏、AI 教学对话区、在线答题与错题本、学习进度展示区均为界面占位，待后端与 OpenClaw 对话/答题接口对接。

## 运行方式

1. **安装依赖**
   ```bash
   cd teaching-assistant-gui
   npm install
   ```

2. **启动服务**（会同时提供静态页面与 API）
   ```bash
   npm start
   ```
   默认端口：`3765`，打开 http://localhost:3765

3. **指定工作区（可选）**  
   后端会到 `clawwork/workspace` 下执行 skills，默认工作区为：
   - `~/Desktop/clawwork/workspace`  
   若需修改，可设置环境变量：
   ```bash
   WORKSPACE_ROOT=/path/to/clawwork/workspace npm start
   ```

## 项目结构

```
teaching-assistant-gui/
├── server.js          # 后端桥接：调用 4 个 skills，提供 /api/quiz|exam|experiment|ppt
├── package.json
├── README.md
└── public/
    ├── index.html     # 入口（学生端 / 教师端）
    ├── teacher.html   # 教师端
    ├── student.html   # 学生端
    ├── css/style.css
    ├── js/teacher.js  # 教师端 4 项 API 调用
    └── js/student.js  # 学生端占位
```

## API（教师端已用）

- `POST /api/quiz/generate`   body: `{ course, chapter, basic?, advanced?, challenge? }`
- `POST /api/exam/generate`   body: `{ course, type, chapters? }`
- `POST /api/experiment/generate`  body: `{ course, chapter, difficulty? }`
- `POST /api/ppt/generate`   body: `{ query }`
- `GET /api/courses`   返回课程列表（从 workspace 的 teaching-data/textbooks 读取）

生成结果落在 workspace 的 `output/quizzes|exams|experiments|ppts/` 下，与本地运行 skills 一致。
