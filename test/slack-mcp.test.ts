import { expect, test } from "bun:test";
import { join } from "node:path";

// Speaks the protocol to the real script, the way Claude Code does.
test("the Slack MCP server lists both tools over stdio", async () => {
	const proc = Bun.spawn([process.execPath, join(import.meta.dir, "..", "src", "slack", "mcp.ts")], {
		env: { ...process.env, SLACK_BOT_TOKEN: "xoxb-test" },
		stdin: "pipe",
		stdout: "pipe",
		stderr: "pipe",
	});
	const send = (message: object) => proc.stdin.write(`${JSON.stringify(message)}\n`);
	send({
		jsonrpc: "2.0",
		id: 1,
		method: "initialize",
		params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "0" } },
	});
	send({ jsonrpc: "2.0", method: "notifications/initialized" });
	send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
	await proc.stdin.flush();
	const reader = proc.stdout.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	const deadline = Date.now() + 10_000;
	let names: string[] | undefined;
	while (!names && Date.now() < deadline) {
		const { value, done } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value);
		for (const line of buffer.split("\n")) {
			if (!line.includes('"id":2')) continue;
			names = (JSON.parse(line).result.tools as { name: string }[]).map((tool) => tool.name);
		}
	}
	proc.kill();
	expect(names).toEqual(["slack", "slack_upload"]);
});
