#!/usr/bin/env bash
# Runs on the server through SSH. Only deploy the commit that passed CI.
set -euo pipefail

deploy_path=${1:?Usage: deploy.sh /absolute/repository/path commit-sha}
deploy_commit=${2:?Usage: deploy.sh /absolute/repository/path commit-sha}

if [[ "$deploy_path" != /* || ! "$deploy_commit" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'Expected an absolute repository path and a full Git commit SHA.' >&2
  exit 1
fi

cd "$deploy_path"

# Also serializes manual invocations with Actions deployments.
exec 9>.git/deploy.lock
flock -w 600 9

if [[ "$(git branch --show-current)" != main ]]; then
  echo 'The deployment checkout must be on main.' >&2
  exit 1
fi

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo 'Tracked files have local changes. Move server settings into .env or compose.override.yaml before deploying.' >&2
  exit 1
fi

export GIT_TERMINAL_PROMPT=0
export GIT_SSH_COMMAND='ssh -o BatchMode=yes -o StrictHostKeyChecking=yes'
git fetch origin main

if [[ "$(git rev-parse FETCH_HEAD)" != "$deploy_commit" ]]; then
  echo 'A newer main commit is available; its workflow will deploy it. Skipping this older run.'
  exit 0
fi

git merge --ff-only "$deploy_commit"
if [[ "$(git rev-parse HEAD)" != "$deploy_commit" ]]; then
  echo 'The server checkout does not match the validated commit.' >&2
  exit 1
fi

# A failed build leaves the currently running container in place.
docker compose build homepage
docker compose up -d --no-build --wait --wait-timeout 120 homepage
docker compose ps homepage
printf 'Deployed commit %s\n' "$deploy_commit"
