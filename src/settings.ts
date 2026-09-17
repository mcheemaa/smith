import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

type Settings = Record<string, unknown>;

// Claude Code keeps the agent's memory where these settings point, and connects the workspace's servers without an interactive approval.
export function claudeSettings(existing: Settings, memoryDir: string): Settings {
	return { ...existing, autoMemoryDirectory: memoryDir, enableAllProjectMcpServers: true };
}

export function writeClaudeSettings(memoryDir: string): void {
	const dir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
	const file = join(dir, "settings.json");
	const existing = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Settings) : {};
	mkdirSync(dir, { recursive: true });
	writeFileSync(file, `${JSON.stringify(claudeSettings(existing, memoryDir), null, 2)}\n`);
}
