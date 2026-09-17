import { expect, test } from "bun:test";
import { RunQueue } from "../src/queue.ts";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test("runs one task at a time per key, in order", async () => {
	const queue = new RunQueue(4);
	const order: string[] = [];
	const first = queue.enqueue("thread", async () => {
		order.push("first:start");
		await sleep(20);
		order.push("first:end");
	});
	const second = queue.enqueue("thread", async () => {
		order.push("second:start");
	});
	await Promise.all([first, second]);
	expect(order).toEqual(["first:start", "first:end", "second:start"]);
	expect(queue.busy("thread")).toBe(false);
});

test("caps how many keys run at once", async () => {
	const queue = new RunQueue(2);
	let running = 0;
	let peak = 0;
	const task = async () => {
		running += 1;
		peak = Math.max(peak, running);
		await sleep(10);
		running -= 1;
	};
	await Promise.all(["a", "b", "c", "d"].map((key) => queue.enqueue(key, task)));
	expect(peak).toBe(2);
});

test("a failed run does not block the next one on that key", async () => {
	const queue = new RunQueue(1);
	await expect(
		queue.enqueue("thread", async () => {
			throw new Error("boom");
		}),
	).rejects.toThrow("boom");
	await expect(queue.enqueue("thread", async () => "ok")).resolves.toBe("ok");
});
