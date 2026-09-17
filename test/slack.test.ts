import { expect, test } from "bun:test";
import { sessionKey, stripMention } from "../src/slack/app.ts";
import { splitMarkdown } from "../src/slack/reply.ts";

test("strips the bot mention and surrounding whitespace", () => {
	expect(stripMention("<@U1> fix the login bug ", "U1")).toBe("fix the login bug");
	expect(stripMention("hello <@U1>", "U1")).toBe("hello");
	expect(stripMention("  hello  ", undefined)).toBe("hello");
});

test("channel threads get their own key, direct messages share one", () => {
	expect(sessionKey("C1", "171.001", true)).toBe("slack:C1:171.001");
	expect(sessionKey("D1", "171.001", false)).toBe("slack:D1");
	expect(sessionKey("D1", "171.002", false)).toBe("slack:D1");
});

test("splits long markdown on paragraph boundaries", () => {
	const [a, b, c] = ["a".repeat(40), "b".repeat(40), "c".repeat(40)];
	expect(splitMarkdown(`${a}\n\n${b}\n\n${c}`, 90)).toEqual([`${a}\n\n${b}`, c]);
	expect(splitMarkdown("short")).toEqual(["short"]);
	expect(splitMarkdown("")).toEqual([]);
});
