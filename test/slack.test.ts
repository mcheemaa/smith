import { expect, test } from "bun:test";
import { sessionKey, stripMention } from "../src/slack/app.ts";
import { pressPrompt, withChoice } from "../src/slack/buttons.ts";
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

test("a press becomes a message that stands on its own", () => {
	const press = {
		user: "U1",
		label: "Merge and deploy",
		value: "Merge pull request #7 and deploy it",
		messageText: "PR ready",
	};
	expect(pressPrompt(press)).toBe(
		'<@U1> pressed "Merge and deploy".\n\nMerge pull request #7 and deploy it\n\nThe message with the buttons read:\nPR ready',
	);
	expect(pressPrompt({ ...press, value: "Merge and deploy", messageText: "" })).toBe(
		'<@U1> pressed "Merge and deploy".',
	);
});

test("the buttons turn into a note of the choice", () => {
	const section = { type: "section", text: { type: "mrkdwn", text: "PR ready" } };
	const actions = {
		type: "actions",
		elements: [{ type: "button", text: { type: "plain_text", text: "Merge and deploy" } }],
	};
	const press = { user: "U1", label: "Merge and deploy", value: "", messageText: "" };
	expect(withChoice([section, actions], press)).toEqual([
		section,
		{ type: "context", elements: [{ type: "mrkdwn", text: "<@U1> chose *Merge and deploy*" }] },
	]);
});
