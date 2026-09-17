import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import { $ } from "bun";
import { type Config, paths } from "./config.ts";
import { log } from "./log.ts";

export function repoName(url: string): string {
	return basename(url.replace(/\/+$/, "")).replace(/\.git$/, "");
}

// Seeded once from the repo; after that the copy on the box belongs to the agent and its owner.
function seed(from: string, to: string): void {
	if (!existsSync(to)) copyFileSync(from, to);
}

export async function prepareWorkspace(config: Config, agentDir: string): Promise<string> {
	const { workspace, runs } = paths(config);
	mkdirSync(workspace, { recursive: true });
	mkdirSync(runs, { recursive: true });
	seed(join(agentDir, "CLAUDE.md"), join(workspace, "CLAUDE.md"));
	seed(join(agentDir, "heartbeat.md"), join(config.SMITH_HOME, "heartbeat.md"));
	for (const url of config.SMITH_REPOS) {
		const dir = join(workspace, repoName(url));
		if (existsSync(dir)) continue;
		log.info("workspace.clone", { url });
		await $`git clone ${url} ${dir}`.quiet();
	}
	return workspace;
}
