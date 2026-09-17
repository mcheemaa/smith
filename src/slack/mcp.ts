// The agent's Slack tools, served over stdio to the Claude Code process that spawns this script.
// The SDK's in-process server would be simpler, but under Bun its tools never reach the model (verified on 0.3.274).
import { basename } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { LogLevel, WebClient } from "@slack/web-api";
import { z } from "zod";

const RESULT_LIMIT = 40_000;

const client = new WebClient(process.env.SLACK_BOT_TOKEN, { logLevel: LogLevel.ERROR });
const server = new McpServer({ name: "slack", version: "1.0.0" });

const failure = (error: unknown) => ({
	content: [{ type: "text" as const, text: `Slack error: ${error instanceof Error ? error.message : String(error)}` }],
	isError: true,
});

server.registerTool(
	"slack",
	{
		description:
			"Call any Slack Web API method as the bot user, such as conversations.history, chat.postMessage, conversations.setPurpose, reactions.add, or users.info. Pass the method name and its arguments as Slack documents them.",
		inputSchema: { method: z.string(), args: z.record(z.string(), z.unknown()).default({}) },
	},
	async ({ method, args }) => {
		try {
			const result = await client.apiCall(method, args);
			return { content: [{ type: "text", text: JSON.stringify(result).slice(0, RESULT_LIMIT) }] };
		} catch (error) {
			return failure(error);
		}
	},
);

server.registerTool(
	"slack_upload",
	{
		description: "Upload a file from your workspace to a Slack channel, optionally inside a thread.",
		inputSchema: {
			path: z.string(),
			channel: z.string(),
			thread_ts: z.string().optional(),
			comment: z.string().optional(),
		},
	},
	async ({ path, channel, thread_ts, comment }) => {
		try {
			const file = { file: path, filename: basename(path), ...(comment ? { initial_comment: comment } : {}) };
			await client.files.uploadV2(
				thread_ts ? { ...file, channel_id: channel, thread_ts } : { ...file, channel_id: channel },
			);
			return { content: [{ type: "text", text: `Uploaded ${basename(path)}.` }] };
		} catch (error) {
			return failure(error);
		}
	},
);

await server.connect(new StdioServerTransport());
