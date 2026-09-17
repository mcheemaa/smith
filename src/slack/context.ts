import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { WebClient } from "@slack/web-api";
import { describeError, log } from "../log.ts";

type Attachment = { name?: string | null; url_private_download?: string };

// Files people attach are downloaded so the agent can open them like any other file.
export async function saveAttachments(client: WebClient, files: Attachment[], dir: string): Promise<string[]> {
	const paths: string[] = [];
	for (const file of files) {
		if (!file.url_private_download || !file.name) continue;
		try {
			const response = await fetch(file.url_private_download, { headers: { Authorization: `Bearer ${client.token}` } });
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			mkdirSync(dir, { recursive: true });
			const path = join(dir, file.name);
			await Bun.write(path, response);
			paths.push(path);
		} catch (error) {
			log.warn("slack.attachment_failed", { name: file.name, error: describeError(error) });
		}
	}
	return paths;
}

// When mentioned inside an existing thread, the conversation so far is the context for the request.
export async function threadHistory(
	client: WebClient,
	channel: string,
	threadTs: string,
	before: string,
): Promise<string> {
	try {
		const result = await client.conversations.replies({ channel, ts: threadTs, limit: 50 });
		const lines = (result.messages ?? [])
			.filter((message) => message.ts !== before && message.text)
			.map((message) => `<@${message.user ?? message.bot_id ?? "unknown"}>: ${message.text}`);
		return lines.join("\n");
	} catch (error) {
		log.warn("slack.thread_history_failed", { error: describeError(error) });
		return "";
	}
}

export function withContext(text: string, history: string, attachments: string[]): string {
	const parts = [text];
	if (history) parts.push(`The thread so far:\n${history}`);
	if (attachments.length > 0) parts.push(`Attached files:\n${attachments.join("\n")}`);
	return parts.join("\n\n");
}
