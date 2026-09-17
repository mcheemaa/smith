# Setting up Smith for the first time

A running log of the exact steps, written while doing them. Screenshots to be added where marked.

## Before you start

- A Linux or macOS machine that will run Smith. For the first run, your laptop is fine.
- Bun, git, gh, and Claude Code installed on that machine.
- `claude auth login` completed there with your Claude subscription (or `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token` in `.env.local`).
- `gh auth login` completed there.
- A Slack workspace where you can create apps.

## 1. Create the Slack app

1. Open https://api.slack.com/apps and click **Create New App**. [screenshot: create dialog]
2. Choose **From a manifest**, pick the workspace, switch the editor to **YAML**, paste `deploy/slack-manifest.yaml`, click **Next**, then **Create**. [screenshot: manifest paste]
3. You land on **Basic Information**. Ignore the yellow banner about the new agents experience for now; Smith uses the current assistant API, and the newer one is a later migration. [screenshot: basic information]

## 2. App-level token (Socket Mode)

1. On **Basic Information**, scroll to **App-Level Tokens** and click **Generate Token and Scopes**.
2. Name it `socket`, add the scope `connections:write`, click **Generate**.
3. Copy the token that starts with `xapp-`. It is `SLACK_APP_TOKEN` in `.env.local`. [screenshot: app-level token]

## 3. Icon and colors

1. On **Basic Information**, scroll to **Display Information**.
2. Upload `assets/smith.png` as the app icon. Set the background color to `#1c1b19`; Slack requires a dark one so the white app name is readable.
3. Click **Save Changes**. [screenshot: display information]

## 4. Install the app to the workspace

1. In the left sidebar, click **Install App**, then **Install to Workspace**, then **Allow**.
2. Copy the **Bot User OAuth Token** that starts with `xoxb-`. It is `SLACK_BOT_TOKEN` in `.env.local`. [screenshot: install]

## 5. Check what the manifest set

- **Socket Mode** page: Enable Socket Mode is on.
- **App Home** page: Messages Tab is on, and "Allow users to send Slash commands and messages from the messages tab" is on.
- **Event Subscriptions** page: `app_mention`, `assistant_thread_started`, `assistant_thread_context_changed`, `message.im` are listed.

## 6. Your Slack member ID

In Slack, open your profile, click the three dots, **Copy member ID**. It is `SLACK_ALLOWED_USERS` in `.env.local`. Only the people listed there can talk to Smith; leave it empty to allow the whole workspace.

## 7. Configure and run

1. `cp .env.example .env` and fill in `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_ALLOWED_USERS`, and `SMITH_REPOS` (one git URL to start).
2. `bun start`. The log prints `slack.connected` and then `ready`.
3. In Slack, open **Smith** under Apps and send a message. Reactions on your message show it was received and when it finished; the reply streams into the thread.
4. For a channel, `/invite @Smith` there and mention it.

## 8. Linear

Linear needs to reach the box over HTTPS, so do [deploy.md](deploy.md) first and have a URL like `https://smith.superorgs.sh`.

1. In Linear, open **Settings**, **API**, **Applications**, **Create new**. Name it after the agent, upload `assets/smith.png` as the icon. [screenshot: application form]
2. **Redirect URLs**: add `http://localhost:7890/callback`. **GitHub username**: the agent's GitHub account, so its commits and pull requests are linked. Turn **Client credentials** on; Smith uses it to mint its own tokens.
3. **Webhooks**: turn on, URL `https://<your host>/linear/webhook`, and enable **Agent session events**. Copy the **Signing secret**; it is `LINEAR_WEBHOOK_SECRET`. [screenshot: webhook section]
4. Copy the **Client ID** and **Client secret**.
5. On your laptop, authorize the app as an agent:

   ```console
   LINEAR_CLIENT_ID=... LINEAR_CLIENT_SECRET=... bun run linear-auth
   ```

   Open the printed URL and approve as a workspace admin. This installs the agent; no token to copy.
6. Put `LINEAR_CLIENT_ID`, `LINEAR_CLIENT_SECRET`, and `LINEAR_WEBHOOK_SECRET` in `.env.local`, copy it to the box with `just env`, and restart the service. The log prints `linear.token` and `linear.listening`. Tokens expire after 30 days and Smith mints new ones itself.
7. In Linear, assign an issue to the agent or mention it in a comment. The session appears on the issue within seconds.

## 9. Give it tools

`agent/.mcp.json` is copied into the workspace on first start and lists the services the agent can use. Each one reads its credential from `.env.local`; leave a value unset to leave that tool out.

- **Browser**: Playwright with headless Chromium, installed by `deploy/install.sh`. Nothing to configure.
- **Notion**: create an internal integration at notion.so/profile/integrations, copy its token to `NOTION_TOKEN`, then share the pages and databases it may use with the integration (page menu, Connections).
- **Postgres, read only**: create a read-only role and put its connection string in `DATABASE_URL_READONLY`. The server refuses writes as well.
- **Email**: a Resend API key in `RESEND_API_KEY` and the sender in `RESEND_FROM`. The `email` skill tells the agent how.
- **Trigger.dev**: a personal access token in `TRIGGER_ACCESS_TOKEN`, from the Trigger.dev dashboard under account settings.

Skills under `agent/skills` are copied to the workspace's `.claude/skills` the same way. Add a folder with a `SKILL.md` and it arrives on the next start.

## 10. Deploy to a box

See [deploy.md](deploy.md).
