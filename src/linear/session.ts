import type { LinearClient } from "@linear/sdk";
import { describeError, log } from "../log.ts";
import type { Runner } from "../runner.ts";
import type { AgentSessionEvent } from "./webhook.ts";

export function sessionPrompt(event: AgentSessionEvent): string {
	if (event.action === "prompted") {
		const body = (event.agentActivity?.content as { body?: unknown } | undefined)?.body;
		return typeof body === "string" ? body : "";
	}
	const parts: string[] = [];
	if (event.promptContext) parts.push(event.promptContext);
	const issue = event.agentSession.issue;
	if (!event.promptContext && issue) {
		parts.push(`Issue ${issue.identifier}: ${issue.title}\n${issue.url}`);
		if (issue.description) parts.push(issue.description);
	}
	const comment = event.agentSession.comment?.body;
	if (comment) parts.push(`The request:\n${comment}`);
	for (const rule of event.guidance ?? []) {
		if (rule.body) parts.push(`Guidance: ${rule.body}`);
	}
	return parts.join("\n\n");
}

function describe(event: AgentSessionEvent): string {
	const issue = event.agentSession.issue;
	const subject = issue ? `Linear issue ${issue.identifier} (${issue.url})` : "a Linear agent session";
	return `You are working ${subject}. The person reads your reply inside Linear as this session's response, so keep it factual and link the pull request when there is one.`;
}

type Deps = { client: LinearClient; runner: Runner; hasSession: (key: string) => boolean };

// Linear redelivers webhooks it did not hear back from in time, so every delivery is remembered once.
const seen = new Set<string>();
const SEEN_LIMIT = 1000;

export function handleLinearEvent(event: AgentSessionEvent, deps: Deps): void {
	if (seen.has(event.webhookId)) return;
	seen.add(event.webhookId);
	if (seen.size > SEEN_LIMIT) seen.delete(seen.values().next().value as string);

	const session = event.agentSession;
	const key = `linear:${session.id}`;
	if (event.action === "prompted" && event.agentActivity?.signal === "stop") {
		deps.runner.stop(key);
		return;
	}
	if (event.action === "created") {
		if (deps.hasSession(key)) return;
		deps.client
			.createAgentActivity({ agentSessionId: session.id, content: { type: "thought", body: "Looking at this now." } })
			.catch((error) => log.error("linear.ack_failed", { sessionId: session.id, error: describeError(error) }));
	}
	const prompt = sessionPrompt(event);
	if (!prompt) return;
	void deps.runner.handle({
		key,
		prompt,
		context: { surface: "linear", description: describe(event) },
		target: { surface: "linear", sessionId: session.id },
	});
}
