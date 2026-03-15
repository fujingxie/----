# 班级养宠

一个基于 React + Vite + Cloudflare Workers + D1 的班级宠物养成与课堂管理演示项目。

## 当前能力

- 教师账号注册/登录，激活码校验与会员等级返回
- 多班级切换与创建
- 学生导入、改名、宠物唤醒、课堂互动、宠物重置
- 商店补货、编辑、下架与兑换，含库存校验
- 奖惩规则新增、编辑、删除，等级阈值管理、操作日志
- 前端已接入 Worker API，数据可落到 D1

## 本地开发

先安装依赖：

```bash
npm install
```

初始化本地 D1：

```bash
npm run db:init:local
```

启动 Worker API：

```bash
npm run dev:api
```

另开一个终端启动前端：

```bash
npm run dev
```

说明：

- 前端默认通过 `vite.config.js` 中的代理把 `/api` 请求转发到 `http://127.0.0.1:8787`
- Worker 本地运行依赖 `wrangler`
- 本地默认预置了 3 个激活码：`CLASS-VIP1-2026`、`CLASS-VIP2-2026`、`CLASS-PERM-2026`
- 新账号需要先用激活码注册，之后再使用账号密码登录

## D1 结构

数据库迁移文件在 `migrations/0001_init.sql`，当前包含：

- `users`
- `classes`
- `students`
- `shop_items`
- `rules`
- `class_settings`
- `logs`

参考结构保留在 `schema.sql`

## Cloudflare 配置

当前 `wrangler.toml` 使用的是本地开发占位 ID：

- `database_id = "00000000-0000-0000-0000-000000000000"`
- `preview_database_id = "00000000-0000-0000-0000-000000000000"`

如果你要部署到真实 Cloudflare 环境，请先：

1. 在 Cloudflare 控制台创建 D1 数据库
2. 把真实 `database_id` 和 `preview_database_id` 填回 `wrangler.toml`
3. 执行远程迁移：

```bash
npm run db:init:remote
```

## 宠物资源

宠物图片目前需要你自己补到：

```text
public/assets/pets/
```

命名规则：

- `egg.png`
- `[pet_id]1.png` 到 `[pet_id]7.png`

当前使用的 `pet_id` 定义在 `src/api/petLibrary.js`

## 校验命令

```bash
npm run lint
npm run build
npm run verify:pets
npm run verify:contracts
```
