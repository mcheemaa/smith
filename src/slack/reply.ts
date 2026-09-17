import type { AnyChunk, WebClient } from "@slack/web-api";
import { describeError, log } from "../log.ts";
import type { Reply, RunResult, SlackTarget } from "../types.ts";
import { Steps } from "./steps.ts";

const FLUSH_MS = 3000;
const MESSAGE_LIMIT = 11_000;

// Splits long markdown on paragraph boundaries so each piece stays under Slack's limit.
export function splitMarkdown(text: string, limit = MESSAGE_LIMIT): string[] {
	const pieces: string[] = [];
	let current = "";
	for (const paragraph of text.split("\n\n")) {
		const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
		if (candidate.length <= limit) {
			current = candidate;
			continue;
		}
		if (current) pieces.push(current);
		current = paragraph.length <= limit ? paragraph : paragraph.slice(0, limit);
	}
	if (current) pieces.push(current);
	return pieces;
}

// Streams the reply into one Slack message: a task timeline plus the answer, flushed a few times a minute.
export class SlackReply implements Reply {
	private streamer: ReturnType<WebClient["chatStream"]> | undefined;
	private streamingBroken = false;
	private pendingText = "";
	private readonly pendingTasks = new Map<string, AnyChunk>();
	private readonly steps = new Steps();
	private timer: ReturnType<typeof setTimeout> | undefined;
	private flushing: Promise<void> = Promise.resolve();

	constructor(
		private readonly client: WebClient,
		private readonly target: Omit<SlackTarget, "surface">,
	) {
		void this.react("add", "eyes");
	}

	text(delta: string): void {
		this.queue(this.steps.close());
		this.pendingText += delta;
		this.schedule();
	}

	tool(id: string, title: string): void {
		this.queue(this.steps.start(id, title));
	}

	toolDone(id: string, ok: boolean): void {
		this.queue(this.steps.finish(id, ok));
	}

	private queue(chunk: AnyChunk | undefined): void {
		if (chunk?.type !== "task_update") return;
		this.pendingTasks.set(chunk.id, chunk);
		this.schedule();
	}

	async done(result: RunResult): Promise<void> {
		await this.finish(result.ok ? result.text : `Something went wrong: ${result.error ?? "unknown error"}`);
		await this.react("add", result.ok ? "white_check_mark" : "x");
	}

	async fail(error: Error): Promise<void> {
		await this.finish(`Something went wrong: ${error.message}`);
		await this.react("add", "x");
	}

	private async finish(text: string): Promise<void> {
		this.queue(this.steps.close());
		await this.flushNow();
		try {
			if (this.streamer && !this.streamingBroken) await this.streamer.stop();
			else if (text) for (const piece of splitMarkdown(text)) await this.post(piece);
		} catch (error) {
			log.error("slack.finish_failed", { error: describeError(error) });
		}
		await this.react("remove", "eyes");
		if (this.target.assistant) await this.clearStatus();
	}

	// The assistant "is on it" indicator only goes away when told to; unattended it would linger for an hour.
	private async clearStatus(): Promise<void> {
		try {
			await this.client.assistant.threads.setStatus({
				channel_id: this.target.channel,
				thread_ts: this.target.threadTs,
				status: "",
			});
		} catch (error) {
			log.warn("slack.status_clear_failed", { error: describeError(error) });
		}
	}

	private post(markdown: string) {
		return this.client.chat.postMessage({
			channel: this.target.channel,
			thread_ts: this.target.threadTs,
			markdown_text: markdown,
		});
	}

	private async react(action: "add" | "remove", name: string): Promise<void> {
		if (!this.target.originTs) return;
		try {
			await this.client.reactions[action]({ channel: this.target.channel, timestamp: this.target.originTs, name });
		} catch {
			// Reactions are decoration; a missing scope or a repeat must not fail the run.
		}
	}

	private schedule(): void {
		this.timer ??= setTimeout(() => void this.flushNow(), FLUSH_MS);
	}

	private flushNow(): Promise<void> {
		clearTimeout(this.timer);
		this.timer = undefined;
		this.flushing = this.flushing.then(() => this.flush());
		return this.flushing;
	}

	private async flush(): Promise<void> {
		const text = this.pendingText;
		const tasks = [...this.pendingTasks.values()];
		this.pendingText = "";
		this.pendingTasks.clear();
		if (this.streamingBroken || (!text && tasks.length === 0)) return;
		const chunks: AnyChunk[] = text ? [...tasks, { type: "markdown_text", text }] : tasks;
		try {
			this.streamer ??= this.client.chatStream({
				channel: this.target.channel,
				thread_ts: this.target.threadTs,
				...(this.target.teamId ? { recipient_team_id: this.target.teamId } : {}),
				...(this.target.userId ? { recipient_user_id: this.target.userId } : {}),
				buffer_size: Number.MAX_SAFE_INTEGER,
			});
			await this.streamer.append({ chunks });
		} catch (error) {
			this.streamingBroken = true;
			this.pendingText = text;
			log.warn("slack.stream_failed", { error: describeError(error) });
		}
	}
}
