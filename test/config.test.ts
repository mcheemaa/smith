import { expect, test } from "bun:test";
import { loadConfig, paths } from "../src/config.ts";

const base = { SLACK_BOT_TOKEN: "xoxb-1", SLACK_APP_TOKEN: "xapp-1" };

test("parses lists and applies defaults", () => {
	const config = loadConfig({ ...base, SMITH_REPOS: " a.git, b.git ,", SMITH_HOME: "/tmp/smith" });
	expect(config.SMITH_REPOS).toEqual(["a.git", "b.git"]);
	expect(config.SLACK_ALLOWED_USERS).toEqual([]);
	expect(config.SMITH_MAX_CONCURRENT).toBe(4);
	expect(paths(config).workspace).toBe("/tmp/smith/workspace");
	expect(config.SMITH_SESSION_IDLE_HOURS).toBe(24);
});

test("names every missing or malformed variable", () => {
	expect(() => loadConfig({ SLACK_BOT_TOKEN: "nope" })).toThrow(/SLACK_BOT_TOKEN[\s\S]*SLACK_APP_TOKEN/);
});
