# 班级养宠生产环境部署说明（一步步操作）

本文档适用于当前项目（`Cloudflare Workers + D1 + Cloudflare Pages`）。

- API Worker: `class-pets-api`
- Pages 项目: `banjiyangchong-web`
- 线上域名: `https://www.banjiyangchong.tech`

---

## 1. 部署前准备

### 1.1 环境要求

1. 安装 Node.js 18+（建议 20+）
2. 安装依赖：

```bash
npm install
```

3. 确认可用的 wrangler（通过 npx 调用）：

```bash
npx wrangler --version
```

### 1.2 Cloudflare 登录

如果是本机人工部署：

```bash
npx wrangler login
```

如果是 CI/CD：

1. 在 Cloudflare 创建 API Token（Workers + D1 + Pages 发布权限）
2. 配置环境变量：

```bash
export CLOUDFLARE_API_TOKEN="你的token"
```

---

## 2. 手动部署流程（推荐先熟悉一次）

### 2.1 代码质量检查

```bash
npm run lint
npm run build
```

### 2.2 发布数据库迁移（D1 远程）

```bash
npx wrangler d1 migrations apply class_pets_db --remote
```

如果显示 `No migrations to apply!` 属于正常。

### 2.3 发布 API Worker

```bash
npx wrangler deploy
```

成功后会看到：
- 路由（例如 `www.banjiyangchong.tech/api/*`）
- `Current Version ID`

### 2.4 发布前端 Pages

```bash
npx wrangler pages deploy dist --project-name banjiyangchong-web --commit-dirty=true
```

成功后会输出一个临时预览地址（`*.pages.dev`）。

---

## 3. 部署后验证

### 3.1 验证 API

```bash
curl -sS https://www.banjiyangchong.tech/api/public/system-flags/free-register
```

预期返回 JSON。

### 3.2 验证前端是否更新

```bash
curl -sS https://www.banjiyangchong.tech/ | rg "index-.*\\.js|title"
```

看 `index-xxxx.js` 的哈希是否变化。

---

## 4. 常见问题排查

### 4.1 页面还是旧版本

1. 浏览器强刷（Mac: `Cmd + Shift + R`）
2. 无痕窗口打开
3. 清站点缓存/LocalStorage
4. 确认访问的是 `https://www.banjiyangchong.tech/`

### 4.2 wrangler 报鉴权错误

- 本机：重新执行 `npx wrangler login`
- CI：检查 `CLOUDFLARE_API_TOKEN` 是否存在且权限完整

### 4.3 迁移失败

1. 确认 `wrangler.toml` 中 D1 `database_id` 正确
2. 确认账号对该 D1 有权限
3. 先执行：

```bash
npx wrangler d1 migrations list class_pets_db --remote
```

---

## 5. 一键脚本（推荐）

根目录已提供脚本：

```bash
./deploy-production.sh
```

常用参数示例：

```bash
# 跳过依赖安装
./deploy-production.sh --skip-install

# 只发布 API，不发前端
./deploy-production.sh --skip-pages

# 指定 Pages 项目
./deploy-production.sh --pages-project your-pages-project
```

查看全部参数：

```bash
./deploy-production.sh --help
```

