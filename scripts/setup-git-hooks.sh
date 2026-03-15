#!/bin/sh
# Install git hooks from scripts/git-hooks into the active Git hooks directory.
# Safe to run repeatedly. Supports regular clones and linked worktrees.
set -e

root=$(git rev-parse --show-toplevel 2>/dev/null || true)

if [ -z "$root" ]; then
  echo "Skipping git hook installation: not inside a Git worktree"
  exit 0
fi

hooks_dir=$(git rev-parse --git-path hooks)

cd "$root"
src=scripts/git-hooks

if [ ! -d "$src" ]; then
  echo "Skipping git hook installation: missing $src"
  exit 0
fi

mkdir -p "$hooks_dir"

for hook in commit-msg; do
  if [ -f "$src/$hook" ]; then
    cp "$src/$hook" "$hooks_dir/$hook"
    chmod +x "$hooks_dir/$hook"
    echo "Installed $hooks_dir/$hook"
  fi
done
