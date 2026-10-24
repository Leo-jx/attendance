# 云计算01班 · 考勤系统

课堂现场签到工具，前端为原生 HTML/CSS/JS，后端为 Cloudflare Worker + D1（SQLite）。
数据统一存于云端，任意设备/浏览器访问同一地址即可看到一致数据。

## 功能

- 课表：冬季作息课表展示，点击色块编辑课程（名称/教室/星期/节次/颜色）。
- 签到：按课程+日期签到，点学生行循环切换「未签到→出勤→请假→缺勤」，支持「全部出勤」「清除本节」、状态筛选与统计卡片。
- 名单：学生增删（支持批量录入，顿号/逗号/空格分隔）。
- 统计：按日期区间/课程查看出勤率与历史，一键导出 CSV。
- 恢复示例：将数据库重置为种子数据。

## 目录结构

```
schema.sql        D1 建表语句
wrangler.toml     Worker 配置（D1 绑定 + 静态资源）
src/index.js      Worker 入口：/api/* 路由 + 静态资源托管
src/db.js         D1 数据访问层
src/seed.js       种子数据（示例课程/学生/节次）
public/           前端静态资源（index.html / styles.css / 各模块 js）
.github/workflows  push 到 main 自动部署
```

## 本地开发

```bash
npm install
wrangler dev          # 本地预览（默认 http://localhost:8787）
```

## 部署到 Cloudflare

```bash
# 1. 创建 D1 数据库，记下输出的 database_id
wrangler d1 create attendance

# 2. 把 database_id 填入 wrangler.toml 的 database_id
# 3. 建表
wrangler d1 execute attendance --remote --file=./schema.sql

# 4. 部署（首次访问会自动写入示例数据）
wrangler deploy
```

部署后访问 `https://attendance.<你的子域>.workers.dev` 即可使用。

## GitHub Actions 自动部署（可选）

在仓库 `Settings → Secrets` 中添加：

- `CLOUDFLARE_API_TOKEN`（需 D1 + Workers 编辑权限）
- `CLOUDFLARE_ACCOUNT_ID`

推送 `main` 分支即自动部署。

## API 概览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/state` | 课程/学生/节次/颜色 |
| GET | `/api/records?course_id=&date=` | 某课某日签到 |
| POST | `/api/records` | 保存单条签到 |
| POST | `/api/records/batch` | 全部出勤 / 清除本节 |
| GET/POST | `/api/students` | 学生列表 / 新增 |
| DELETE | `/api/students/:id` | 删除学生 |
| POST | `/api/courses` | 新增/编辑课程 |
| DELETE | `/api/courses/:id` | 删除课程 |
| POST | `/api/reset` | 恢复示例数据 |
| GET | `/api/stats?from=&to=&course_id=` | 出勤率统计 |
| GET | `/api/export?from=&to=&course_id=` | 导出 CSV |
