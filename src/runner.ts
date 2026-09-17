import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { McpServerConfig, SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { FileSink } from "bun";
import { systemAppend } from "./agent/prompt.ts";
import { runAgent } from "./agent/run.ts";
import type { Config } from "./config.ts";
import { asError, describeError, log } from "./log.ts";
import type { RunQueue } from "./queue.ts";
import type { Store } from "./store.ts";
import type { Job, Reply, ReplyTarget, RunResult } from "./types.ts";

type Deps = {
	config: Config;
	store: Store;
	queue: RunQueue;
	workspace: string;
	runsDir: string;
	mcpServers: () => Promise<Record<string, McpServerConfig>>;
	replyFor: (target: ReplyTarget) => Reply;
};

const RESUME_FAILED = /No conversation found/i;

export class Runner {
	private readonly controllers = new Map<string, AbortController>();

	constructor(private readonly deps: Deps) {
		mkdirSync(deps.runsDir, { recursive: true });
	}

	handle(job: Job): Promise<void> {
		return this.deps.queue.enqueue(job.key, () => this.run(job));
	}

	stop(key: string): void {
		this.controllers.get(key)?.abort();
	}

	// Runs cut off by the last shutdown continue in their sessions, which already hold the original request.
	recover(): void {
		for (const job of this.deps.store.takeInterruptedRuns()) {
			const resumed = this.sessionFor(job.key) !== undefined;
			log.info("run.recover", { key: job.key, resumed });
			void this.handle(
				resumed
					? { ...job, prompt: "Your previous run was interrupted by a restart. Pick up where you left off." }
					: job,
			);
		}
	}

	private sessionFor(key: string): string | undefined {
		return this.deps.store.session(key, this.deps.config.SMITH_SESSION_IDLE_HOURS * 3_600_000);
	}

	private async run(job: Job): Promise<void> {
		const { config, store } = this.deps;
		const runId = crypto.randomUUID();
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), config.SMITH_RUN_TIMEOUT_MINUTES * 60_000);
		this.controllers.set(job.key, controller);
		const transcript = Bun.file(join(this.deps.runsDir, `${runId}.jsonl`)).writer();
		const reply = this.deps.replyFor(job.target);

		store.startRun(runId, job);
		log.info("run.start", { runId, key: job.key, surface: job.context.surface });
		try {
			let result: RunResult;
			try {
				result = await this.execute(job, reply, this.sessionFor(job.key), controller.signal, transcript);
			} catch (error) {
				if (!RESUME_FAILED.test(describeError(error))) throw error;
				log.warn("run.resume_failed", { runId, key: job.key });
				store.forgetSession(job.key);
				result = await this.execute(job, reply, undefined, controller.signal, transcript);
			}
			store.saveSession(job.key, result.sessionId);
			store.finishRun(runId, {
				sessionId: result.sessionId,
				status: result.ok ? "succeeded" : "failed",
				turns: result.turns,
				costUsd: result.costUsd,
				...(result.error ? { error: result.error } : {}),
			});
			log.info("run.end", { runId, key: job.key, ok: result.ok, turns: result.turns, costUsd: result.costUsd });
			await reply.done(result);
		} catch (error) {
			store.finishRun(runId, { status: "failed", error: describeError(error) });
			log.error("run.crash", { runId, key: job.key, error: describeError(error) });
			await reply.fail(asError(error));
		} finally {
			clearTimeout(timer);
			this.controllers.delete(job.key);
			await transcript.end();
		}
	}

	private async execute(
		job: Job,
		reply: Reply,
		sessionId: string | undefined,
		signal: AbortSignal,
		transcript: FileSink,
	): Promise<RunResult> {
		const { config } = this.deps;
		return runAgent({
			prompt: job.prompt,
			cwd: this.deps.workspace,
			...(sessionId ? { sessionId } : {}),
			systemAppend: systemAppend(config.SMITH_NAME, job.context),
			mcpServers: await this.deps.mcpServers(),
			signal,
			config,
			reply,
			onMessage: (message) => {
				transcript.write(`${JSON.stringify(message)}\n`);
				this.watch(job.key, message);
			},
		});
	}

	private watch(key: string, message: SDKMessage): void {
		if (message.type === "rate_limit_event" && message.rate_limit_info.status !== "allowed") {
			log.warn("rate_limit", { key, ...message.rate_limit_info });
		} else if (message.type === "system" && message.subtype === "init") {
			const unavailable = message.mcp_servers.filter(
				(server) => server.status === "failed" || server.status === "needs-auth",
			);
			if (unavailable.length > 0) log.warn("mcp.unavailable", { key, servers: unavailable });
		}
	}
}
