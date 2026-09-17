import { expect, test } from "bun:test";
import { claudeSettings } from "../src/settings.ts";

test("keeps the user's own settings and adds the two Smith needs", () => {
	expect(claudeSettings({ theme: "dark" }, "/home/smith/.smith/memory")).toEqual({
		theme: "dark",
		autoMemoryDirectory: "/home/smith/.smith/memory",
		enableAllProjectMcpServers: true,
		attribution: { commit: "", pr: "" },
	});
});
