import { basename } from "node:path";

const MAX = 90;

function clip(text: string): string {
	const line = text.split("\n")[0]?.trim() ?? "";
	return line.length > MAX ? `${line.slice(0, MAX - 1)}…` : line;
}

function field(input: unknown, name: string): string | undefined {
	const value = (input as Record<string, unknown> | undefined)?.[name];
	return typeof value === "string" ? value : undefined;
}

// One short line per tool call, for the timeline people see while the agent works.
export function describeTool(name: string, input: unknown): string {
	switch (name) {
		case "Bash":
			return clip(field(input, "command") ?? "shell");
		case "Read":
		case "Edit":
		case "Write":
			return `${name} ${basename(field(input, "file_path") ?? "")}`.trim();
		case "Grep":
		case "Glob":
			return `${name} ${clip(field(input, "pattern") ?? "")}`.trim();
		case "WebFetch":
			return `Fetch ${clip(field(input, "url") ?? "")}`.trim();
		case "WebSearch":
			return `Search ${clip(field(input, "query") ?? "")}`.trim();
		case "Agent":
			return clip(field(input, "description") ?? "subagent");
		default:
			return name.startsWith("mcp__") ? name.split("__").slice(1).join(" ") : name;
	}
}
