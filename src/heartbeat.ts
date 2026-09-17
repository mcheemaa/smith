import { join } from "node:path";
import type { WebClient } from "@slack/web-api";
import { Cron } from "croner";
import type { Config } from "./config.ts";
import { describeError, log } from "./log.ts";
import type { Runner } from "./runner.ts";
import type { HeartbeatTarget } from "./types.ts";

// Every few hours the agent wakes up, reads its heartbeat prompt, and does whatever it asks.
export function startHeartbeat(deps: { config: Config; runner: Runner; slack: WebClient }): Cron | undefined {
	const { config } = deps;
	if (!config.HEARTBEAT_CRON) return undefined;
	const owner = config.SLACK_ALLOWED_USERS[0];
	const options = {
		name: "heartbeat",
		protect: true,
		catch: (error: unknown) => log.error("heartbeat.crash", { error: describeError(error) }),
	};
	return new Cron(config.HEARTBEAT_CRON, options, async () => {
		const prompt = await Bun.file(join(config.SMITH_HOME, "heartbeat.md")).text();
		const channel = config.SLACK_HEARTBEAT_CHANNEL;
		let target: HeartbeatTarget = { surface: "heartbeat" };
		if (channel) {
			const root = await deps.slack.chat.postMessage({
				channel,
				markdown_text: `Heartbeat, ${new Date().toUTCString()}`,
			});
			if (root.ts) target = { surface: "heartbeat", channel, threadTs: root.ts, ...(owner ? { userId: owner } : {}) };
		}
		await deps.runner.handle({
			key: "heartbeat",
			prompt,
			context: {
				surface: "heartbeat",
				description: target.channel
					? "This is your scheduled heartbeat. Nobody asked you anything; your reply is posted to your heartbeat channel, so make it a short report. Nobody answers during a heartbeat, so act on your own judgment."
					: "This is your scheduled heartbeat. Nobody asked you anything and nobody reads the reply beyond the log, so act on what you find and keep the report to a few lines.",
			},
			target,
		});
	});
}
