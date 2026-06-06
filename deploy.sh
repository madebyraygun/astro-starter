#!/usr/bin/env bash
set -euo pipefail

# Build the site locally, then mirror dist/ to the server over rsync.
# Per-site settings live in deploy.env (created by Push Pop, gitignored):
#   DEPLOY_HOST=user@server
#   DEPLOY_PATH=/var/www/.../public_html
# Optional overrides: DEPLOY_PORT (default 22), DEPLOY_KEY (default ~/.ssh/id_rsa).

[ -f deploy.env ] && source ./deploy.env

HOST="${DEPLOY_HOST:?Set DEPLOY_HOST in deploy.env to user@server}"
REMOTE_PATH="${DEPLOY_PATH:?Set DEPLOY_PATH in deploy.env to the remote web root}"
SSH_PORT="${DEPLOY_PORT:-22}"
SSH_KEY="${DEPLOY_KEY:-$HOME/.ssh/id_rsa}"

dry=
[[ "${1:-}" == "--dry-run" ]] && dry=--dry-run

SSH_CMD="ssh -p ${SSH_PORT} -i ${SSH_KEY}"

rm -rf dist
npm run build

rsync -avz --delete ${dry:+"$dry"} \
  -e "${SSH_CMD}" \
  --exclude '.DS_Store' \
  dist/ "${HOST}:${REMOTE_PATH%/}/"

if [[ -n "$dry" ]]; then
  echo "Dry run complete — nothing transferred."
else
  echo "Deployed dist/ → ${HOST}:${REMOTE_PATH%/}/"
fi
