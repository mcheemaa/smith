import { join } from "node:path";
import { App, Assistant, LogLevel } from "@slack/bolt";
import type { Config } from "../config.ts";
import { log } from "../log.ts";
import type { Job, SlackTarget } from "../types.ts";
import { saveAttachments, threadHistory, withContext } from "./context.ts";

type Inbound = {
	text: string;
	user: string;
	target: SlackTarget;
	inChannel: boolean;
	files?: Parameters<typeof saveAttachments>[1];
};

type Deps = {
	config: Config;
	uploadsDir: string;
	hasSession: (key: string) => boolean;
	handle: (job: Job) => Promise<void>;
};

export function stripMention(text: string, botUserId: string | undefined): string {
	return botUserId ? text.replaceAll(`<@${botUserId}>`, "").trim() : text.trim();
}

// A channel thread is its own conversation; a DM is one long conversation with each answer threaded.
export function sessionKey(channel: string, threadTs: string, inChannel: boolean): string {
	return inChannel ? `slack:${channel}:${threadTs}` : `slack:${channel}`;
}

function describe(inbound: Inbound): string {
	const where = inbound.inChannel ? "a Slack channel thread" : "a Slack direct message";
	return `You are replying in ${where} to <@${inbound.user}>. Keep replies short and specific; people read them on their phones.`;
}

export function createSlackApp(deps: Deps): App {
	const { config } = deps;
	const app = new App({
		token: config.SLACK_BOT_TOKEN,
		appToken: config.SLACK_APP_TOKEN,
		socketMode: true,
		logLevel: LogLevel.WARN,
	});
	const allowed = new Set(config.SLACK_ALLOWED_USERS);
	const declined = new Set<string>();

	const permitted = (user: string | undefined): user is string =>
		user !== undefined && (allowed.size === 0 || allowed.has(user));

	const decline = async (user: string | undefined, channel: string) => {
		if (!user || declined.has(user)) return;
		declined.add(user);
		await app.client.chat.postMessage({
			channel,
			text: `I only work with the people who run me. Ask them to add you.`,
		});
	};

	const dispatch = async (inbound: Inbound) => {
		const key = sessionKey(inbound.target.channel, inbound.target.threadTs, inbound.inChannel);
		const isReplyInThread = inbound.target.originTs !== inbound.target.threadTs;
		const history =
			inbound.inChannel && isReplyInThread && !deps.hasSession(key) && inbound.target.originTs
				? await threadHistory(app.client, inbound.target.channel, inbound.target.threadTs, inbound.target.originTs)
				: "";
		const attachments = inbound.files
			? await saveAttachments(
					app.client,
					inbound.files,
					join(deps.uploadsDir, inbound.target.originTs ?? String(Date.now())),
				)
			: [];
		const prompt = withContext(inbound.text, history, attachments);
		if (!prompt.trim()) return;
		await deps.handle({
			key,
			prompt,
			context: { surface: "slack", description: describe(inbound) },
			target: inbound.target,
		});
	};

	app.event("app_mention", async ({ event, context }) => {
		if (!permitted(event.user)) return;
		await dispatch({
			text: stripMention(event.text, context.botUserId),
			user: event.user,
			inChannel: true,
			...(event.files ? { files: event.files } : {}),
			target: {
				surface: "slack",
				channel: event.channel,
				threadTs: event.thread_ts ?? event.ts,
				originTs: event.ts,
				...(context.teamId ? { teamId: context.teamId } : {}),
				userId: event.user,
			},
		});
	});

	app.message(async ({ message, context }) => {
		if (message.channel_type !== "im") return;
		if (message.subtype !== undefined && message.subtype !== "file_share") return;
		if (!permitted(message.user)) return decline(message.user, message.channel);
		await dispatch({
			text: stripMention(message.text ?? "", context.botUserId),
			user: message.user,
			inChannel: false,
			...(message.files ? { files: message.files } : {}),
			target: {
				surface: "slack",
				channel: message.channel,
				threadTs: message.thread_ts ?? message.ts,
				originTs: message.ts,
				...(context.teamId ? { teamId: context.teamId } : {}),
				userId: message.user,
			},
		});
	});

	app.assistant(
		new Assistant({
			threadStarted: async ({ setSuggestedPrompts }) => {
				await setSuggestedPrompts({
					title: `Things ${config.SMITH_NAME} can do`,
					prompts: [
						{ title: "Status", message: "What are you working on right now, and what is waiting on me?" },
						{ title: "Pull requests", message: "List your open pull requests with their CI and review state." },
						{ title: "Pick up an issue", message: "Take the top issue assigned to you in Linear and start on it." },
					],
				});
			},
			userMessage: async ({ message, context, setStatus }) => {
				if (message.subtype !== undefined && message.subtype !== "file_share") return;
				if (!message.thread_ts) return;
				if (!permitted(message.user)) return decline(message.user, message.channel);
				await setStatus("is on it...");
				await dispatch({
					text: stripMention(message.text ?? "", context.botUserId),
					user: message.user,
					inChannel: false,
					...(message.files ? { files: message.files } : {}),
					target: {
						surface: "slack",
						channel: message.channel,
						threadTs: message.thread_ts,
						originTs: message.ts,
						...(context.teamId ? { teamId: context.teamId } : {}),
						userId: message.user,
					},
				});
			},
		}),
	);

	app.error(async (error) => {
		log.error("slack.error", { error: error.message });
	});

	return app;
}
