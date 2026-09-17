# Deploying Smith to a box

Any Linux machine you can SSH into as root. Ubuntu 24.04 is what the install script expects. 8 GB of memory is enough; 16 or 32 GB gives builds and tests room.

## Pick the box

Any provider with plain Ubuntu works. Two that are cheap and easy:

- Hostinger KVM 8: 8 vCPU, 32 GB, 400 GB NVMe, US datacenters. Choose a plain Ubuntu 24.04 template (no control panel), a US location, and add your SSH public key at checkout.
- Netcup RS 2000 G12: 8 dedicated cores, 16 GB, 512 GB NVMe, Germany, Austria, or Virginia.

## Install

From your laptop, with `HOST` set to the box's IP or hostname:

```console
ssh root@$HOST 'bash -s' -- https://github.com/mcheemaa/smith.git < deploy/install.sh
```

The script installs git, curl, ripgrep, and gh; creates the `smith` user; installs Bun and Claude Code for that user; clones the repository to `/home/smith/smith`; installs dependencies; and enables the systemd unit. It does not start Smith yet, because two sign-ins and one file are still missing.

## Sign in

On the box, as the smith user:

```console
ssh root@$HOST
sudo -iu smith
claude auth login      # opens a URL; sign in as the agent's Claude account, paste the code back
gh auth login          # sign in as the agent's GitHub account
```

`claude auth login` works over SSH: it prints a URL, you open it on your laptop, and paste the code it gives you into the terminal. If you would rather not keep a login on the box, run `claude setup-token` on your laptop and put the token in `.env.local` as `CLAUDE_CODE_OAUTH_TOKEN`.

## Configure

Fill `.env.local` on your laptop, then copy it up:

```console
just env root@$HOST
```

Or copy it by hand to `/home/smith/smith/.env.local`, owned by `smith`, mode 600.

## Start

```console
ssh root@$HOST 'systemctl start smith && journalctl -fu smith'
```

The log prints `slack.connected` and `ready`. Smith is now answering in Slack.

## Update

From a checkout on your laptop:

```console
just deploy root@$HOST
```

This pulls `main` on the box, installs dependencies, and restarts the service, so commit and push first. Runs that were in progress resume on the next boot.

## Linear webhook

Linear needs to reach the box over HTTPS. Point a DNS name at the box and run Caddy with `deploy/Caddyfile.example` (Caddy gets the certificate itself), or run a Cloudflare Tunnel to port 8787. Then set the webhook URL in the Linear agent app to `https://<name>/linear/webhook`.

## Logs and state

- Service log: `journalctl -fu smith`
- Per-run transcripts: `/home/smith/.smith/data/runs/<run id>.jsonl`
- Sessions and runs: `/home/smith/.smith/data/smith.db`
- The agent's manual and heartbeat prompt: `/home/smith/.smith/workspace/CLAUDE.md` and `/home/smith/.smith/heartbeat.md`
- Repositories: `/home/smith/.smith/workspace/`
