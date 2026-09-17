import type { TaskUpdateChunk } from "@slack/types";

const TITLE_LIMIT = 256;

type Group = { id: string; steps: string[]; failed: number };

// Consecutive tool calls fold into one timeline entry: the current step while it runs, the count once the stretch ends, every step behind the disclosure.
export class Steps {
	private open: Group | undefined;
	private groups = 0;
	private readonly placed = new Map<string, { group: string; index: number }>();

	start(id: string, title: string): TaskUpdateChunk {
		if (!this.open) this.open = { id: `steps-${++this.groups}`, steps: [], failed: 0 };
		const group = this.open;
		this.placed.set(id, { group: group.id, index: group.steps.length });
		group.steps.push(title);
		return running(group);
	}

	finish(id: string, ok: boolean): TaskUpdateChunk | undefined {
		const place = this.placed.get(id);
		const group = this.open;
		if (ok || !place || !group || place.group !== group.id) return undefined;
		group.failed++;
		group.steps[place.index] = `${group.steps[place.index]} (failed)`;
		return running(group);
	}

	close(): TaskUpdateChunk | undefined {
		const group = this.open;
		if (!group) return undefined;
		this.open = undefined;
		const count = group.steps.length;
		const failed = group.failed ? `, ${group.failed} failed` : "";
		return {
			type: "task_update",
			id: group.id,
			title: `${count} ${count === 1 ? "step" : "steps"}${failed}`,
			status: "complete",
			details: group.steps.join("\n"),
		};
	}
}

function running(group: Group): TaskUpdateChunk {
	const latest = group.steps.at(-1) ?? "";
	const title = latest.length > TITLE_LIMIT ? `${latest.slice(0, TITLE_LIMIT - 3)}...` : latest;
	return { type: "task_update", id: group.id, title, status: "in_progress", details: group.steps.join("\n") };
}
