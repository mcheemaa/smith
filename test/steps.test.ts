import { expect, test } from "bun:test";
import { Steps } from "../src/slack/steps.ts";

test("consecutive steps fold into one entry that ends with the count", () => {
	const steps = new Steps();
	expect(steps.start("a", "Read posts.ts")).toMatchObject({
		id: "steps-1",
		title: "Read posts.ts",
		status: "in_progress",
	});
	expect(steps.start("b", "pnpm type-check")).toMatchObject({
		id: "steps-1",
		title: "pnpm type-check",
		details: "Read posts.ts\npnpm type-check",
	});
	expect(steps.finish("a", true)).toBeUndefined();
	expect(steps.finish("b", false)).toMatchObject({ id: "steps-1", details: "Read posts.ts\npnpm type-check (failed)" });
	expect(steps.close()).toEqual({
		type: "task_update",
		id: "steps-1",
		title: "2 steps, 1 failed",
		status: "complete",
		details: "Read posts.ts\npnpm type-check (failed)",
	});
	expect(steps.close()).toBeUndefined();
	expect(steps.start("c", "gh pr create")).toMatchObject({ id: "steps-2", title: "gh pr create" });
	expect(steps.close()?.title).toBe("1 step");
});
