#!/usr/bin/env bash
# Prepares a fresh Ubuntu box for Smith. Run as root: bash install.sh <git url of this repository>
set -euo pipefail

repo="${1:?usage: install.sh <repository url>}"

apt-get update -qq
apt-get install -y -qq git curl unzip ripgrep jq

if ! command -v gh >/dev/null; then
	mkdir -p -m 755 /etc/apt/keyrings
	curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o /etc/apt/keyrings/githubcli-archive-keyring.gpg
	chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
	echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" >/etc/apt/sources.list.d/github-cli.list
	apt-get update -qq
	apt-get install -y -qq gh
fi

if ! command -v node >/dev/null || [ "$(node -v | cut -c2-3)" -lt 22 ]; then
	curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
	apt-get install -y -qq nodejs >/dev/null 2>&1
fi

id smith >/dev/null 2>&1 || useradd --create-home --shell /bin/bash smith

sudo -u smith bash -c 'command -v ~/.bun/bin/bun >/dev/null || curl -fsSL https://bun.sh/install | bash'
sudo -u smith bash -c 'command -v ~/.local/bin/claude >/dev/null || curl -fsSL https://claude.ai/install.sh | bash'
npm i -g vercel >/dev/null 2>&1
npx -y playwright@latest install-deps chromium >/dev/null 2>&1
sudo -u smith bash -c 'npx -y playwright@latest install chromium >/dev/null 2>&1'
sudo -u smith bash -c "[ -d ~/smith ] || git clone '$repo' ~/smith"
sudo -u smith bash -c 'cd ~/smith && ~/.bun/bin/bun install --frozen-lockfile'

install -m 644 /home/smith/smith/deploy/smith.service /etc/systemd/system/smith.service
systemctl daemon-reload
systemctl enable smith

cat <<'EOF'

Installed. Finish as the smith user (sudo -iu smith):
  claude auth login
  gh auth login
  cp ~/smith/.env.example ~/smith/.env.local and fill it in
Then, as root: systemctl start smith && journalctl -fu smith
EOF
