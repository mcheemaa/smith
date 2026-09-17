# Setting up Smith for the first time

A running log of the exact steps, written while doing them. Screenshots to be added where marked.

## Before you start

- A Linux or macOS machine that will run Smith. For the first run, your laptop is fine.
- Bun, git, gh, and Claude Code installed on that machine.
- `claude auth login` completed there with your Claude subscription (or `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token` in `.env`).
- `gh auth login` completed there.
- A Slack workspace where you can create apps.

## 1. Create the Slack app

1. Open https://api.slack.com/apps and click **Create New App**. [screenshot: create dialog]
2. Choose **From a manifest**, pick the workspace, switch the editor to **YAML**, paste `deploy/slack-manifest.yaml`, click **Next**, then **Create**. [screenshot: manifest paste]
3. You land on **Basic Information**. Ignore the yellow banner about the new agents experience for now; Smith uses the current assistant API, and the newer one is a later migration. [screenshot: basic information]

## 2. App-level token (Socket Mode)

1. On **Basic Information**, scroll to **App-Level Tokens** and click **Generate Token and Scopes**.
2. Name it `socket`, add the scope `connections:write`, click **Generate**.
3. Copy the token that starts with `xapp-`. It is `SLACK_APP_TOKEN` in `.env`. [screenshot: app-level token]

## 3. Icon and colors

1. On **Basic Information**, scroll to **Display Information**.
2. Upload `assets/smith.png` as the app icon. Set the background color to `#1c1b19`; Slack requires a dark one so the white app name is readable.
3. Click **Save Changes**. [screenshot: display information]

## 4. Install the app to the workspace

1. In the left sidebar, click **Install App**, then **Install to Workspace**, then **Allow**.
2. Copy the **Bot User OAuth Token** that starts with `xoxb-`. It is `SLACK_BOT_TOKEN` in `.env`. [screenshot: install]

## 5. Check what the manifest set

- **Socket Mode** page: Enable Socket Mode is on.
- **App Home** page: Messages Tab is on, and "Allow users to send Slash commands and messages from the messages tab" is on.
- **Event Subscriptions** page: `app_mention`, `assistant_thread_started`, `assistant_thread_context_changed`, `message.im` are listed.

## 6. Your Slack member ID

In Slack, open your profile, click the three dots, **Copy member ID**. It is `SLACK_ALLOWED_USERS` in `.env`. Only the people listed there can talk to Smith; leave it empty to allow the whole workspace.

## 7. Configure and run

1. `cp .env.example .env` and fill in `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_ALLOWED_USERS`, and `SMITH_REPOS` (one git URL to start).
2. `bun start`. The log prints `slack.connected` and then `ready`.
3. In Slack, open **Smith** under Apps and send a message. Reactions on your message show it was received and when it finished; the reply streams into the thread.
4. For a channel, `/invite @Smith` there and mention it.

## 8. Linear

To be written when the Linear agent app is registered.

## 9. Deploy to a box

To be written when the box is chosen. `deploy/install.sh` and the `Justfile` are the starting point.
