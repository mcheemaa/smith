import { expect, test } from "bun:test";
import { endsWithQuestion, pullRequestUrls } from "../src/linear/reply.ts";
import { handleLinearEvent, sessionPrompt } from "../src/linear/session.ts";
import type { AgentSessionEvent } from "../src/linear/webhook.ts";
import type { LinearAuth } from "../src/linear/token.ts";
import type { Runner } from "../src/runner.ts";

function event(overrides: Record<string, unknown>): AgentSessionEvent {
	return {
		type: "AgentSessionEvent",
		action: "created",
		agentSession: {
			id: "session-1",
			issue: {
				id: "i1",
				identifier: "ENG-42",
				title: "Fix login",
				url: "https://linear.app/x/issue/ENG-42",
				description: "Users cannot log in.",
			},
		},
		...overrides,
	} as unknown as AgentSessionEvent;
}

test("a created session prefers Linear's prompt context", () => {
	const prompt = sessionPrompt(event({ promptContext: "Context from Linear", guidance: [{ body: "Be brief." }] }));
	expect(prompt).toBe("Context from Linear\n\nGuidance: Be brief.");
});

test("a created session without context describes the issue and the request", () => {
	const prompt = sessionPrompt(
		event({
			agentSession: {
				id: "s",
				issue: { identifier: "ENG-1", title: "T", url: "u", description: "D" },
				comment: { body: "@smith please" },
			},
		}),
	);
	expect(prompt).toBe("Issue ENG-1: T\nu\n\nD\n\nThe request:\n@smith please");
});

test("a prompted session uses the follow-up body", () => {
	expect(
		sessionPrompt(
			event({ action: "prompted", agentActivity: { content: { type: "prompt", body: "Also add tests" } } }),
		),
	).toBe("Also add tests");
	expect(sessionPrompt(event({ action: "prompted" }))).toBe("");
});

test("finds unique pull request links", () => {
	const text =
		"Opened https://github.com/acme/app/pull/12 and again https://github.com/acme/app/pull/12, plus https://github.com/acme/lib/pull/7.";
	expect(pullRequestUrls(text)).toEqual(["https://github.com/acme/app/pull/12", "https://github.com/acme/lib/pull/7"]);
});

test("a reply that ends with a question is a question", () => {
	expect(endsWithQuestion("Should I also migrate the users table?")).toBe(true);
	expect(endsWithQuestion("Done. PR is up.\n")).toBe(false);
});

function recordingDeps() {
	const calls: string[] = [];
	const auth = { client: async () => ({ createAgentActivity: async () => ({}) }) } as unknown as LinearAuth;
	const runner = {
		handle: async (job: { key: string }) => {
			calls.push(`handle:${job.key}`);
		},
		stop: (key: string) => {
			calls.push(`stop:${key}`);
		},
	} as unknown as Runner;
	return { deps: { auth, runner, hasSession: () => false }, calls };
}

test("a session the agent created itself is ignored", () => {
	const { deps, calls } = recordingDeps();
	const issue = { identifier: "ENG-9", title: "T", url: "u", description: "D" };
	handleLinearEvent(
		event({
			webhookId: crypto.randomUUID(),
			appUserId: "app-1",
			agentSession: { id: "s-self", creatorId: "app-1", issue },
		}),
		deps,
	);
	expect(calls).toEqual([]);
});

test("a session a person created is worked", () => {
	const { deps, calls } = recordingDeps();
	const issue = { identifier: "ENG-9", title: "T", url: "u", description: "D" };
	handleLinearEvent(
		event({
			webhookId: crypto.randomUUID(),
			appUserId: "app-1",
			agentSession: { id: "s-human", creatorId: "user-7", issue },
		}),
		deps,
	);
	expect(calls).toEqual(["handle:linear:s-human"]);
});
