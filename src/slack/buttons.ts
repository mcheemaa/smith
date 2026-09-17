import type { Block, KnownBlock } from "@slack/web-api";

export type Press = { user: string; label: string; value: string; messageText: string };

// A press becomes a message from the person: what they chose, the instruction the button carried, and the message it sat on.
export function pressPrompt(press: Press): string {
	const lines = [`<@${press.user}> pressed "${press.label}".`];
	if (press.value && press.value !== press.label) lines.push(press.value);
	if (press.messageText) lines.push(`The message with the buttons read:\n${press.messageText}`);
	return lines.join("\n\n");
}

// The buttons turn into a note of the choice, so nobody presses them twice.
export function withChoice(blocks: readonly (Block | KnownBlock)[], press: Press): (Block | KnownBlock)[] {
	return blocks.map((block) =>
		block.type === "actions"
			? { type: "context", elements: [{ type: "mrkdwn", text: `<@${press.user}> chose *${press.label}*` }] }
			: block,
	);
}
