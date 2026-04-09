#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

SKIP_INSTALL=0
SKIP_LINT=0
SKIP_BUILD=0
SKIP_MIGRATE=0
SKIP_API=0
SKIP_PAGES=0
NO_VERIFY=0

PAGES_PROJECT_NAME="${PAGES_PROJECT_NAME:-banjiyangchong-web}"
WEB_URL="${WEB_URL:-https://www.banjiyangchong.tech/}"
API_CHECK_URL="${API_CHECK_URL:-https://www.banjiyangchong.tech/api/public/system-flags/free-register}"

usage() {
  cat <<'EOF'
用法:
  ./deploy-production.sh [options]

选项:
  --pages-project <name>  指定 Pages 项目名（默认: banjiyangchong-web）
  --skip-install          跳过 npm install
  --skip-lint             跳过 npm run lint
  --skip-build            跳过 npm run build
  --skip-migrate          跳过 D1 远程迁移
  --skip-api              跳过 Worker API 发布
  --skip-pages            跳过 Pages 前端发布
  --no-verify             跳过部署后线上验证
  -h, --help              显示帮助

环境变量:
  PAGES_PROJECT_NAME      Pages 项目名
  WEB_URL                 线上站点 URL
  API_CHECK_URL           API 验证 URL
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pages-project)
      PAGES_PROJECT_NAME="${2:-}"
      shift 2
      ;;
    --skip-install)
      SKIP_INSTALL=1
      shift
      ;;
    --skip-lint)
      SKIP_LINT=1
      shift
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    --skip-migrate)
      SKIP_MIGRATE=1
      shift
      ;;
    --skip-api)
      SKIP_API=1
      shift
      ;;
    --skip-pages)
      SKIP_PAGES=1
      shift
      ;;
    --no-verify)
      NO_VERIFY=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "未知参数: $1"
      usage
      exit 1
      ;;
  esac
done

log() {
  echo
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

run() {
  log "执行: $*"
  "$@"
}

log "开始生产部署流程"
log "项目目录: $ROOT_DIR"
log "Pages 项目: $PAGES_PROJECT_NAME"

if [[ $SKIP_INSTALL -eq 0 ]]; then
  run npm install
else
  log "跳过依赖安装"
fi

if [[ $SKIP_LINT -eq 0 ]]; then
  run npm run lint
else
  log "跳过 lint"
fi

if [[ $SKIP_BUILD -eq 0 ]]; then
  run npm run build
else
  log "跳过构建"
fi

if [[ $SKIP_MIGRATE -eq 0 ]]; then
  run npx wrangler d1 migrations apply class_pets_db --remote
else
  log "跳过 D1 远程迁移"
fi

if [[ $SKIP_API -eq 0 ]]; then
  run npx wrangler deploy
else
  log "跳过 Worker API 发布"
fi

if [[ $SKIP_PAGES -eq 0 ]]; then
  run npx wrangler pages deploy dist --project-name "$PAGES_PROJECT_NAME" --branch main --commit-dirty=true
else
  log "跳过 Pages 前端发布"
fi

if [[ $NO_VERIFY -eq 0 ]]; then
  log "开始线上验证"
  run curl -sS "$API_CHECK_URL"
  run bash -lc "curl -sS '$WEB_URL' | rg 'index-.*\\.js|title' || true"
else
  log "跳过线上验证"
fi

log "部署流程完成"

