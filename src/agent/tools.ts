import { basename } from "node:path";
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import type { WebClient } from "@slack/web-api";
import { z } from "zod";
import { describeError } from "../log.ts";

const RESULT_LIMIT = 40_000;

// The agent gets the whole Slack Web API as the bot user; the app's scopes decide what that allows.
export function slackTools(client: WebClient) {
	const call = tool(
		"slack",
		"Call any Slack Web API method as the bot user, such as conversations.history, chat.postMessage, reactions.add, or users.info. Pass the method name and its arguments as Slack documents them.",
		{ method: z.string(), args: z.record(z.string(), z.unknown()).default({}) },
		async ({ method, args }) => {
			try {
				const result = await client.apiCall(method, args);
				return { content: [{ type: "text", text: JSON.stringify(result).slice(0, RESULT_LIMIT) }] };
			} catch (error) {
				return { content: [{ type: "text", text: `Slack error: ${describeError(error)}` }], isError: true };
			}
		},
	);

	const upload = tool(
		"slack_upload",
		"Upload a file from your workspace to a Slack channel, optionally inside a thread.",
		{ path: z.string(), channel: z.string(), thread_ts: z.string().optional(), comment: z.string().optional() },
		async ({ path, channel, thread_ts, comment }) => {
			try {
				const file = { file: path, filename: basename(path), ...(comment ? { initial_comment: comment } : {}) };
				await client.files.uploadV2(
					thread_ts ? { ...file, channel_id: channel, thread_ts } : { ...file, channel_id: channel },
				);
				return { content: [{ type: "text", text: `Uploaded ${basename(path)}.` }] };
			} catch (error) {
				return { content: [{ type: "text", text: `Slack error: ${describeError(error)}` }], isError: true };
			}
		},
	);

	return createSdkMcpServer({ name: "slack", tools: [call, upload] });
}
