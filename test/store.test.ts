import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/store.ts";
import type { Job } from "../src/types.ts";

const job: Job = {
	key: "slack:C1:1.1",
	prompt: "fix it",
	context: { surface: "slack", description: "" },
	target: { surface: "slack", channel: "C1", threadTs: "1.1" },
};

function freshStore() {
	return new Store(join(mkdtempSync(join(tmpdir(), "smith-")), "smith.db"));
}

test("remembers a session until it goes idle", () => {
	const store = freshStore();
	store.saveSession("k", "s1");
	expect(store.session("k", 60_000)).toBe("s1");
	expect(store.session("k", -1)).toBeUndefined();
	store.forgetSession("k");
	expect(store.session("k", 60_000)).toBeUndefined();
});

test("hands back runs that were still running, once", () => {
	const store = freshStore();
	store.startRun("r1", job);
	store.startRun("r2", { ...job, key: "other" });
	store.finishRun("r2", { status: "succeeded", turns: 3, costUsd: 0.1 });
	expect(store.takeInterruptedRuns()).toEqual([job]);
	expect(store.takeInterruptedRuns()).toEqual([]);
});
