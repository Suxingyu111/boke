#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export NPM_CONFIG_CACHE="${NPM_CONFIG_CACHE:-/tmp/boke-npm-cache}"
export npm_config_cache="$NPM_CONFIG_CACHE"

echo "== Git 工作区 =="
git status --short --untracked-files=all

echo "== 个人路径扫描 =="
if git grep -n '/Users/' -- .; then
  echo "发现 /Users/ 个人路径，请先清理。" >&2
  exit 1
fi
if git grep -n 'C:\\Users' -- .; then
  echo "发现 Windows 用户目录路径，请先清理。" >&2
  exit 1
fi

echo "== Gitleaks =="
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks detect --source=. --redact --no-banner
else
  go run github.com/zricethezav/gitleaks/v8@v8.30.1 detect --source=. --redact --no-banner
fi

echo "== 后端 =="
(
  cd server
  npm ci --cache "$NPM_CONFIG_CACHE"
  npm test -- --runInBand
  npm run build
  npm audit
  npm run supply-chain:verify
)

echo "== 前端 =="
(
  cd client
  npm ci --cache "$NPM_CONFIG_CACHE"
  npm run typecheck
  npm test
  npm run build
  npm audit
)

echo "开源前检查通过。"
