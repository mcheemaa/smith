import { describeError, log } from "../log.ts";
import type { Reply, RunResult } from "../types.ts";
import type { LinearAuth } from "./token.ts";

const ACTION_INTERVAL_MS = 15_000;
const QUIET_TOOLS = new Set(["Read", "Grep", "Glob", "TodoWrite", "WebFetch", "WebSearch"]);

export function pullRequestUrls(text: string): string[] {
	return [...new Set(text.match(/https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/g) ?? [])];
}

// A reply that ends by asking something is a question for the person, not a finished response.
export function endsWithQuestion(text: string): boolean {
	return /\?\s*$/.test(text.trim());
}

// Mirrors the run into Linear's agent session as activities; the final text becomes the response.
export class LinearReply implements Reply {
	private lastActionAt = 0;

	constructor(
		private readonly auth: LinearAuth,
		private readonly sessionId: string,
	) {}

	text(): void {}

	tool(_id: string, title: string): void {
		const tool = title.split(" ")[0] ?? "";
		const now = Date.now();
		if (QUIET_TOOLS.has(tool) || now - this.lastActionAt < ACTION_INTERVAL_MS) return;
		this.lastActionAt = now;
		void this.activity({ type: "action", action: "Working", parameter: title }, true);
	}

	toolDone(): void {}

	async done(result: RunResult): Promise<void> {
		if (!result.ok) {
			await this.activity({ type: "error", body: `Something went wrong: ${result.error ?? "unknown error"}` });
			return;
		}
		const urls = pullRequestUrls(result.text);
		if (urls.length > 0) {
			await this.call((client) =>
				client.updateAgentSession(this.sessionId, {
					addedExternalUrls: urls.map((url) => ({ label: url.replace("https://github.com/", ""), url })),
				}),
			).catch((error) => log.warn("linear.external_urls_failed", { error: describeError(error) }));
		}
		await this.activity({ type: endsWithQuestion(result.text) ? "elicitation" : "response", body: result.text });
	}

	async fail(error: Error): Promise<void> {
		await this.activity({ type: "error", body: `Something went wrong: ${error.message}` });
	}

	private async activity(content: Record<string, unknown>, ephemeral = false): Promise<void> {
		try {
			await this.call((client) => client.createAgentActivity({ agentSessionId: this.sessionId, content, ephemeral }));
		} catch (error) {
			log.error("linear.activity_failed", { sessionId: this.sessionId, error: describeError(error) });
		}
	}

	// A rejected token is minted again once; anything else propagates.
	private async call<T>(request: (client: Awaited<ReturnType<LinearAuth["client"]>>) => Promise<T>): Promise<T> {
		try {
			return await request(await this.auth.client());
		} catch (error) {
			if (!/401|unauthenticated|unauthorized/i.test(describeError(error))) throw error;
			this.auth.invalidate();
			return request(await this.auth.client());
		}
	}
}
