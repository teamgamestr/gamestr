#!/bin/bash
# Setup SSH for Git operations
# This script configures SSH using the GITHUB_SSH_KEY secret

if [ -z "$GITHUB_SSH_KEY" ]; then
  echo "GITHUB_SSH_KEY secret not set"
  exit 1
fi

mkdir -p ~/.ssh
chmod 700 ~/.ssh

echo "$GITHUB_SSH_KEY" | base64 -d > ~/.ssh/id_ed25519
chmod 600 ~/.ssh/id_ed25519

ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null

echo "SSH key configured for GitHub"
