#!/usr/bin/env bash
# Deploy recipe for gamestr.
#
# Run by the host deploy watcher (nostr-deploy-watch) after it fast-forwards
# this checkout to the tip published on Nostr. The watcher owns pulling from the
# GRASP servers, the service and public-URL inventory, and the post-deploy URL
# check; this file owns everything specific to building and activating gamestr.
#
# Contract:
#   - runs as the deploy user, with the repository root as the working directory
#   - exits non-zero on any failure, so the watcher records a failed deploy
#   - leaves no tracked file modified: a dirty checkout cannot be fast-forwarded,
#     and stashing it (what the old shared deploy script did) hides exactly the
#     drift it needs to be told about
set -euo pipefail

cd "$(dirname "$0")/.."

APP=gamestr
SERVICE="${APP}.service"
log() { printf '[%s] %s\n' "$APP" "$*"; }

if [ -n "$(git status --porcelain)" ]; then
  log "refusing to deploy: the checkout has modifications"
  git status --short
  exit 1
fi

log "building $(git rev-parse --short HEAD)"
npm ci --no-audit --no-fund
npm run build

log "restarting $SERVICE"
sudo systemctl restart "$SERVICE"
if ! systemctl is-active --quiet "$SERVICE"; then
  log "$SERVICE is not running after the restart"
  sudo systemctl status "$SERVICE" --no-pager | tail -20 || true
  exit 1
fi

log "deployed $(git rev-parse --short HEAD)"
