import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { $ } from "bun";
import { type Config, paths } from "./config.ts";
import { log } from "./log.ts";

export function repoName(url: string): string {
	return basename(url.replace(/\/+$/, "")).replace(/\.git$/, "");
}

// Copied once from the repo; after that the copy on the box belongs to the agent and its owner.
function seed(from: string, to: string): void {
	if (!existsSync(to)) copyFileSync(from, to);
}

// Each skill folder is seeded the same way, so new skills arrive and edited ones are kept.
function seedSkills(from: string, to: string): void {
	if (!existsSync(from)) return;
	mkdirSync(to, { recursive: true });
	for (const name of readdirSync(from)) {
		if (!existsSync(join(to, name))) cpSync(join(from, name), join(to, name), { recursive: true });
	}
}

export async function prepareWorkspace(config: Config, agentDir: string): Promise<string> {
	const { workspace, runs } = paths(config);
	mkdirSync(workspace, { recursive: true });
	mkdirSync(runs, { recursive: true });
	seed(join(agentDir, "CLAUDE.md"), join(workspace, "CLAUDE.md"));
	seed(join(agentDir, ".mcp.json"), join(workspace, ".mcp.json"));
	seed(join(agentDir, "heartbeat.md"), join(config.SMITH_HOME, "heartbeat.md"));
	seedSkills(join(agentDir, "skills"), join(workspace, ".claude", "skills"));
	for (const url of config.SMITH_REPOS) {
		const dir = join(workspace, repoName(url));
		if (existsSync(dir)) continue;
		log.info("workspace.clone", { url });
		await $`git clone ${url} ${dir}`.quiet();
	}
	return workspace;
}
