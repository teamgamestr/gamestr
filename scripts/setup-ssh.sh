#!/bin/bash
if [ -n "$GITHUB_SSH_KEY" ]; then
  mkdir -p ~/.ssh
  chmod 700 ~/.ssh
  ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null
  echo "$GITHUB_SSH_KEY" | base64 -d > ~/.ssh/id_github 2>/dev/null || echo "$GITHUB_SSH_KEY" > ~/.ssh/id_github
  chmod 600 ~/.ssh/id_github
  cat > ~/.ssh/config << 'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_github
  IdentitiesOnly yes
EOF
  chmod 600 ~/.ssh/config
  echo "SSH configured for GitHub"
fi
