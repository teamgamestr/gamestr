#!/bin/bash
if [ -n "$GITHUB_SSH_KEY" ]; then
  mkdir -p ~/.ssh
  chmod 700 ~/.ssh
  ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null
  echo "$GITHUB_SSH_KEY" | base64 -d > ~/.ssh/id_ed25519 2>/dev/null || echo "$GITHUB_SSH_KEY" > ~/.ssh/id_ed25519
  chmod 600 ~/.ssh/id_ed25519
  cat > ~/.ssh/config << 'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
EOF
  chmod 600 ~/.ssh/config
  echo "SSH configured for GitHub"
fi
