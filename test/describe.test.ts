import { expect, test } from "bun:test";
import { describeTool } from "../src/agent/describe.ts";

test("describes tool calls in one short line", () => {
	expect(describeTool("Bash", { command: "bun test\necho done" })).toBe("bun test");
	expect(describeTool("Edit", { file_path: "/w/app/src/login.ts" })).toBe("Edit login.ts");
	expect(describeTool("Grep", { pattern: "TODO" })).toBe("Grep TODO");
	expect(describeTool("Agent", { description: "Review the diff" })).toBe("Review the diff");
	expect(describeTool("mcp__linear__get_issue", {})).toBe("linear get_issue");
	expect(describeTool("Bash", { command: "x".repeat(200) })).toHaveLength(90);
});
