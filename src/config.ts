import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

const list = z
	.string()
	.default("")
	.transform((value) =>
		value
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean),
	);

const schema = z.object({
	SMITH_NAME: z.string().default("Smith"),
	SMITH_HOME: z.string().default(join(homedir(), ".smith")),
	SMITH_REPOS: list,
	SMITH_MODEL: z.string().default("claude-fable-5-1"),
	SMITH_FALLBACK_MODEL: z.string().default("claude-opus-5"),
	SMITH_EFFORT: z.enum(["low", "medium", "high", "xhigh", "max"]).default("high"),
	SMITH_MAX_TURNS: z.coerce.number().int().positive().default(300),
	SMITH_MAX_CONCURRENT: z.coerce.number().int().positive().default(4),
	SMITH_RUN_TIMEOUT_MINUTES: z.coerce.number().positive().default(120),
	SMITH_SESSION_IDLE_HOURS: z.coerce.number().positive().default(24),
	SLACK_BOT_TOKEN: z.string().startsWith("xoxb-"),
	SLACK_APP_TOKEN: z.string().startsWith("xapp-"),
	SLACK_ALLOWED_USERS: list,
	SLACK_HEARTBEAT_CHANNEL: z.string().optional(),
	HEARTBEAT_CRON: z.string().default("0 */4 * * *"),
	LINEAR_ACCESS_TOKEN: z.string().optional(),
	LINEAR_WEBHOOK_SECRET: z.string().optional(),
	PORT: z.coerce.number().int().positive().default(8787),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
	const parsed = schema.safeParse(env);
	if (parsed.success) return parsed.data;
	const problems = parsed.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`);
	throw new Error(`Configuration is incomplete:\n${problems.join("\n")}`);
}

export function paths(config: Config) {
	const data = join(config.SMITH_HOME, "data");
	return {
		workspace: join(config.SMITH_HOME, "workspace"),
		data,
		runs: join(data, "runs"),
		uploads: join(data, "uploads"),
		db: join(data, "smith.db"),
	};
}
