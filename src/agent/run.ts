import { type McpServerConfig, type Options, query, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { Config } from "../config.ts";
import type { Reply, RunResult } from "../types.ts";
import { describeTool } from "./describe.ts";

export type RunInput = {
	prompt: string;
	cwd: string;
	sessionId?: string;
	systemAppend: string;
	mcpServers: Record<string, McpServerConfig>;
	signal: AbortSignal;
	config: Config;
	reply: Pick<Reply, "text" | "tool" | "toolDone">;
	onMessage?: (message: SDKMessage) => void;
};

export async function runAgent(input: RunInput): Promise<RunResult> {
	const { config, reply } = input;
	const abortController = new AbortController();
	input.signal.addEventListener("abort", () => abortController.abort(), { once: true });

	const options: Options = {
		cwd: input.cwd,
		model: config.SMITH_MODEL,
		fallbackModel: config.SMITH_FALLBACK_MODEL,
		effort: config.SMITH_EFFORT,
		maxTurns: config.SMITH_MAX_TURNS,
		abortController,
		permissionMode: "bypassPermissions",
		allowDangerouslySkipPermissions: true,
		permissionPrompts: "none",
		settingSources: ["user", "project"],
		systemPrompt: { type: "preset", preset: "claude_code", append: input.systemAppend, snapshot: true },
		mcpServers: input.mcpServers,
		includePartialMessages: true,
		...(input.sessionId ? { resume: input.sessionId } : {}),
	};

	for await (const message of query({ prompt: input.prompt, options })) {
		input.onMessage?.(message);
		if (message.type === "stream_event" && message.parent_tool_use_id === null) {
			const event = message.event;
			if (event.type === "content_block_delta" && event.delta.type === "text_delta") reply.text(event.delta.text);
		} else if (message.type === "assistant" && message.parent_tool_use_id === null) {
			for (const block of message.message.content) {
				if (block.type === "tool_use") reply.tool(block.id, describeTool(block.name, block.input));
			}
		} else if (message.type === "user" && message.parent_tool_use_id === null) {
			const content = message.message.content;
			if (typeof content === "string") continue;
			for (const block of content) {
				if (block.type === "tool_result") reply.toolDone(block.tool_use_id, block.is_error !== true);
			}
		} else if (message.type === "result") {
			const ok = message.subtype === "success" && !message.is_error;
			return {
				sessionId: message.session_id,
				ok,
				text: message.subtype === "success" ? message.result : "",
				...(ok ? {} : { error: message.subtype === "success" ? message.result : message.errors.join("; ") }),
				turns: message.num_turns,
				costUsd: message.total_cost_usd,
			};
		}
	}
	throw new Error("The agent ended without a result");
}
