import { join } from "node:path";
import { LinearClient } from "@linear/sdk";
import { slackTools } from "./agent/tools.ts";
import { type Config, loadConfig, paths } from "./config.ts";
import { startHeartbeat } from "./heartbeat.ts";
import { handleLinearEvent } from "./linear/session.ts";
import { linearWebhook } from "./linear/webhook.ts";
import { log } from "./log.ts";
import { RunQueue } from "./queue.ts";
import { replyFactory } from "./replies.ts";
import { Runner } from "./runner.ts";
import { createSlackApp } from "./slack/app.ts";
import { Store } from "./store.ts";
import { prepareWorkspace } from "./workspace.ts";

let config: Config;
try {
	config = loadConfig();
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}
const workspace = await prepareWorkspace(config, join(import.meta.dir, "..", "agent"));
const store = new Store(paths(config).db);
const hasSession = (key: string) => store.session(key, config.SMITH_SESSION_IDLE_HOURS * 3_600_000) !== undefined;

const linearToken = config.LINEAR_ACCESS_TOKEN;
const linear = linearToken ? new LinearClient({ accessToken: linearToken }) : undefined;

const slack = createSlackApp({
	config,
	uploadsDir: paths(config).uploads,
	hasSession,
	handle: (job) => runner.handle(job),
});

const runner = new Runner({
	config,
	store,
	queue: new RunQueue(config.SMITH_MAX_CONCURRENT),
	workspace,
	runsDir: paths(config).runs,
	mcpServers: {
		slack: slackTools(slack.client),
		...(linearToken
			? {
					linear: {
						type: "http",
						url: "https://mcp.linear.app/mcp",
						headers: { Authorization: `Bearer ${linearToken}` },
					},
				}
			: {}),
	},
	replyFor: replyFactory({ slack: slack.client, ...(linear ? { linear } : {}) }),
});

await slack.start();
log.info("slack.connected");

if (linear && config.LINEAR_WEBHOOK_SECRET) {
	const webhook = linearWebhook(config.LINEAR_WEBHOOK_SECRET, (event) =>
		handleLinearEvent(event, { client: linear, runner, hasSession }),
	);
	Bun.serve({
		port: config.PORT,
		fetch: (request) => {
			const { pathname } = new URL(request.url);
			if (request.method === "POST" && pathname === "/linear/webhook") return webhook(request);
			if (pathname === "/health") return new Response("ok");
			return new Response("not found", { status: 404 });
		},
	});
	log.info("linear.listening", { port: config.PORT });
}

const heartbeat = startHeartbeat({ config, runner, slack: slack.client });
runner.recover();
log.info("ready", { name: config.SMITH_NAME, workspace, nextHeartbeat: heartbeat?.nextRun()?.toISOString() ?? null });

const shutdown = async () => {
	heartbeat?.stop();
	await slack.stop();
	store.close();
	process.exit(0);
};
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
