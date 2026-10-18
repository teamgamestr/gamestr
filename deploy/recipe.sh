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

# Tracked files only: an untracked build artefact or helper script sits happily
# there and does not stop git taking the tip, so it is not a reason to refuse.
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  log "refusing to deploy: the checkout has modified tracked files"
  git status --porcelain --untracked-files=no
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

# The unit reports active before it binds its port, and the watcher checks the
# public URL as soon as this exits: wait for the app to answer locally first,
# otherwise a healthy deploy is recorded as a 502 failure.
code=""
for _ in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "http://127.0.0.1:3001/" 2>/dev/null)
  case "$code" in 2*) break ;; esac
  sleep 1
done
if [ "${code#2}" = "$code" ]; then
  log "$SERVICE is active but has not answered on 127.0.0.1:3001 after 30s (last HTTP ${code:-none})"
  sudo journalctl -u "$SERVICE" -n 20 --no-pager 2>/dev/null | tail -10 || true
  exit 1
fi
log "answering on 127.0.0.1:3001 (HTTP $code)"

log "deployed $(git rev-parse --short HEAD)"
