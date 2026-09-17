import type { WebClient } from "@slack/web-api";
import { LinearReply } from "./linear/reply.ts";
import type { LinearAuth } from "./linear/token.ts";
import { log } from "./log.ts";
import { SlackReply } from "./slack/reply.ts";
import type { Reply, ReplyTarget, RunResult } from "./types.ts";

class LogReply implements Reply {
	text(): void {}
	tool(): void {}
	toolDone(): void {}
	async done(result: RunResult): Promise<void> {
		log.info("heartbeat.done", { ok: result.ok, text: result.text });
	}
	async fail(error: Error): Promise<void> {
		log.error("heartbeat.failed", { error: error.message });
	}
}

// Rebuilds the right Reply from plain target data, whether the job is fresh or recovered after a restart.
export function replyFactory(deps: { slack: WebClient; linear?: LinearAuth }) {
	return (target: ReplyTarget): Reply => {
		switch (target.surface) {
			case "slack":
				return new SlackReply(deps.slack, target);
			case "linear":
				if (!deps.linear) throw new Error("Linear is not configured");
				return new LinearReply(deps.linear, target.sessionId);
			case "heartbeat":
				return target.channel && target.threadTs
					? new SlackReply(deps.slack, {
							channel: target.channel,
							threadTs: target.threadTs,
							...(target.userId ? { userId: target.userId } : {}),
						})
					: new LogReply();
		}
	};
}
