# Smith

A self-hosted engineering agent with a machine of its own. You talk to it in Slack, hand it issues in Linear, and it ships pull requests on GitHub. It runs on the Claude Agent SDK and signs in the way Claude Code does, with your Claude subscription.

## How it works

One long-running process on a Linux box you can SSH into.

- Slack, over Socket Mode. A direct message or an `@Smith` mention starts a Claude Code session; the reply streams into the thread as a task timeline plus the answer. A channel thread is one conversation, a DM is one long conversation. Follow-ups resume the same session.
- Linear, over the Agents protocol. Assign or mention the agent and Linear sends a webhook; the run shows up as activities in the issue's agent session, with the pull request linked when there is one.
- Heartbeat. A cron wakes the agent every few hours with `~/.smith/heartbeat.md`; it walks its open pull requests and its Linear queue and reports to a channel.

The agent works in `~/.smith/workspace`, where its repositories are cloned and where its manual, `CLAUDE.md`, lives. Sessions are Claude Code sessions on disk, so a restart loses nothing.

## Setup

On the box, as the user that will run Smith:

1. Install [Bun](https://bun.sh), [Claude Code](https://code.claude.com/docs/en/setup), git, and [gh](https://cli.github.com).
2. Sign in: `claude auth login` (or set `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token`) and `gh auth login`.
3. Clone this repository, `bun install`, copy `.env.example` to `.env.local`, and fill it in.
4. Slack: create an app from `deploy/slack-manifest.yaml` at [api.slack.com/apps](https://api.slack.com/apps), install it to your workspace, and copy the bot token and an app-level token with `connections:write` into `.env.local`.
5. Linear (optional): create an OAuth application, authorize it with `actor=app` so it becomes an agent, and point its webhook at `https://<your-host>/linear/webhook` for agent session events. Put the access token and webhook secret in `.env.local`. The webhook needs a public URL; `deploy/Caddyfile.example` shows one way, a Cloudflare Tunnel is another.
6. `bun start`.

`deploy/install.sh` does steps 1 and 3 on a fresh Ubuntu machine and installs a systemd unit. `just deploy user@host` syncs a checkout and restarts.

## Layout

```
agent/CLAUDE.md      the agent's operating manual, seeded into the workspace on first start
agent/heartbeat.md   the heartbeat prompt, seeded into ~/.smith
src/main.ts          boots everything
src/config.ts        environment, validated
src/runner.ts        one run: session lookup, the agent, the transcript, the reply
src/agent/run.ts     the Agent SDK call and the message stream
src/slack/           Bolt app and the streaming reply
src/linear/          webhook, session events, activities
src/heartbeat.ts     the cron
src/queue.ts         one run per conversation at a time, a few overall
src/store.ts         SQLite: which conversation is which session, and every run
deploy/              install script, systemd unit, Slack manifest, Caddy example
```

## Develop

```
bun run typecheck
bun run lint
bun test
bun dev
```
