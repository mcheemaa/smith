// One run at a time per key (a Slack thread, a Linear session), a bounded number overall.
export class RunQueue {
	private readonly tails = new Map<string, Promise<unknown>>();
	private readonly waiting: Array<() => void> = [];
	private running = 0;

	constructor(private readonly limit: number) {}

	enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
		const previous = this.tails.get(key) ?? Promise.resolve();
		const next = previous.then(
			() => this.withSlot(task),
			() => this.withSlot(task),
		);
		this.tails.set(key, next);
		const settle = () => {
			if (this.tails.get(key) === next) this.tails.delete(key);
		};
		next.then(settle, settle);
		return next;
	}

	busy(key: string): boolean {
		return this.tails.has(key);
	}

	private async withSlot<T>(task: () => Promise<T>): Promise<T> {
		await this.acquire();
		try {
			return await task();
		} finally {
			this.release();
		}
	}

	private acquire(): Promise<void> {
		if (this.running < this.limit) {
			this.running += 1;
			return Promise.resolve();
		}
		return new Promise((resolve) => {
			this.waiting.push(() => {
				this.running += 1;
				resolve();
			});
		});
	}

	private release(): void {
		this.running -= 1;
		this.waiting.shift()?.();
	}
}
