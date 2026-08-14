# 借还本 MVP

家庭借还款账本助手（household-IOU-book）— 本地 Web 版。

帮助家庭记录与亲戚、朋友、机构之间的借还流水，实时掌握**应收（别人欠我的）**与**应付（我欠别人的）**余额，并通过图表与报告辅助复盘。每位注册用户拥有独立账本，数据互不共享。

## 功能概览


| 模块   | 说明                                       |
| ---- | ---------------------------------------- |
| 用户认证 | 注册 / 登录 / 退出；JWT 会话（1 小时）；CSRF 防护；登录速率限制 |
| 概览   | 总应收 / 总应付，按相关方汇总                         |
| 记一笔  | 模板表单 → 预览确认 → 提交；支持凭证附件                  |
| 流水   | 列表筛选、详情、编辑、单删 / 批删                       |
| 图表   | 年度应收 / 应付柱状图，年末按相关方拆分                    |
| 相关方  | 亲戚 / 朋友 / 机构 CRUD；单方详情与流水                |
| 数据管理 | Excel 导出 / 导入校对；PDF 分析报告下载               |


**技术栈**：Next.js 16 · React 19 · Prisma · SQLite · Tailwind CSS 4

## 环境要求

- Node.js 20+
- npm 10+



## 快速开始

```bash
cd mvp
npm install
cp .env.example .env.local
# 编辑 .env.local，设置 AUTH_SECRET（至少 16 位随机字符串）

npx prisma migrate dev
npx prisma db seed    # 可选：填充演示数据（会清空现有数据）
npm run dev
```

浏览器访问 [http://localhost:3000](http://localhost:3000)

### 演示账号

执行 `npm run db:seed` 后可用：


| 用户名        | 密码                  | 说明                |
| ---------- | ------------------- | ----------------- |
| `testSeed` | `testSeed-20260811` | 含 5 个相关方、12 条示例流水 |
| `test`     | `test-20260811`     | 空账本，供测试           |




## 常用命令


| 命令                   | 说明                  |
| -------------------- | ------------------- |
| `npm run dev`        | 启动开发服务器             |
| `npm run dev:stop`   | 停止占用 3000 端口的开发服务   |
| `npm run build`      | 生产构建                |
| `npm run start`      | 启动生产服务器             |
| `npm run test`       | 运行单元测试              |
| `npm run db:migrate` | 数据库迁移               |
| `npm run db:seed`    | 填充演示数据（**会清空全部数据**） |
| `npm run db:studio`  | 打开 Prisma Studio    |
| `npm run lint`       | ESLint 检查           |




## 环境变量


| 变量             | 必填  | 说明                                  |
| -------------- | --- | ----------------------------------- |
| `DATABASE_URL` | ✅   | SQLite 路径，默认 `file:./prisma/dev.db` |
| `AUTH_SECRET`  | ✅   | JWT 签名密钥，至少 16 位随机字符串               |
| `COOKIE_SECURE` | ❌  | `true`/`false`；HTTP 生产部署设为 `false` |
| `BASE_PATH`     | ❌  | 子路径部署，默认 `/jiehuanben`；根路径部署设为空字符串 |


详见 `.env.example`。

## 页面导航


| 路由                     | 说明                |
| ---------------------- | ----------------- |
| `/jiehuanben/`         | 概览（默认子路径）        |
| `/jiehuanben/records/new` | 记一笔            |
| `/jiehuanben/records`  | 流水列表              |
| `/jiehuanben/charts`   | 图表                |
| `/jiehuanben/parties`  | 相关方管理             |
| `/jiehuanben/settings/data` | 数据管理（Excel / PDF） |
| `/jiehuanben/login` · `/jiehuanben/register` | 登录 · 注册 |


未登录访问业务页面会重定向至 `/login`；PDF 报告通过「数据管理」页下载，无需单独 npm 脚本。

## 项目结构

```
mvp/
├── assets/fonts/        # PDF 字体（npm install 时下载，见 assets/fonts/README.md）
├── prisma/              # 数据模型、迁移、seed
├── src/
│   ├── proxy.ts         # 请求鉴权网关（Next.js 16）
│   ├── app/             # 页面、Server Actions、API Routes
│   ├── components/      # UI 与业务组件
│   └── lib/
│       ├── auth/        # 会话、CSRF、密码、用户名查重
│       ├── ledger/      # 余额计算与流水 CRUD
│       ├── party/       # 相关方服务
│       ├── excel/       # Excel 导入导出
│       ├── report/      # PDF 分析报告
│       └── storage/     # 本地凭证存储
├── uploads/             # 运行时附件（gitignore）
├── data/exports/        # 导出备份（gitignore）
└── scripts/             # CLI 工具（inspect、smoke-test 等）
```



## 开发提示

- **控制台中文乱码（Windows）**：项目 npm 脚本已自动切换 UTF-8（`scripts/with-utf8.cjs`）。若 Cursor 内置终端仍乱码，可先执行 `chcp 65001`，或在 Windows「区域设置 → Beta: 使用 Unicode UTF-8」中开启全局 UTF-8
- **Windows EPERM**：开发服务器运行时执行 `prisma generate` 可能报权限错误，先运行 `npm run dev:stop`
- **seed 后无法登录 / 重定向循环**：执行 seed 会清空用户表，浏览器中旧的 JWT Cookie 会失效；刷新后系统会自动清除并跳转登录页
- **生产 HTTP 登录后刷新丢 Cookie**：`NODE_ENV=production` 且用 `http://IP` 访问时，须在 `.env` 设置 `COOKIE_SECURE=false` 并重新 build；长期建议配置 HTTPS
- **生产访问路径**：默认部署在 `/jiehuanben/`；Nginx 需反向代理该子路径，详见 `部署.md`
- **生产 PDF 导出**：`git pull` 后执行 `npm install` 会自动下载 PDF 字体；若下载失败可运行 `npm run fonts:ensure`，或安装系统 Noto/黑体字体
- **数据文件**：SQLite 数据库位于 `prisma/prisma/dev.db`（Prisma 路径解析），不上传 Git



## 文档

- [产品需求](./产品需求.md) — 功能定义、业务规则、验收标准
- [架构设计](./架构设计.md) — 技术架构、模块划分、安全设计

