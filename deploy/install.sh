#!/usr/bin/env bash
# Prepares a fresh Ubuntu box for Smith. Run as root: bash install.sh <git url of this repository>
set -euo pipefail

repo="${1:?usage: install.sh <repository url>}"

apt-get update -qq
apt-get install -y -qq git curl unzip ripgrep

if ! command -v gh >/dev/null; then
	mkdir -p -m 755 /etc/apt/keyrings
	curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o /etc/apt/keyrings/githubcli-archive-keyring.gpg
	chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
	echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" >/etc/apt/sources.list.d/github-cli.list
	apt-get update -qq
	apt-get install -y -qq gh
fi

id smith >/dev/null 2>&1 || useradd --create-home --shell /bin/bash smith

sudo -u smith bash -c 'command -v ~/.bun/bin/bun >/dev/null || curl -fsSL https://bun.sh/install | bash'
sudo -u smith bash -c 'command -v ~/.local/bin/claude >/dev/null || curl -fsSL https://claude.ai/install.sh | bash'
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
