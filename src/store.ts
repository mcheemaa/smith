import { Database } from "bun:sqlite";
import type { Job } from "./types.ts";

const schema = `
CREATE TABLE IF NOT EXISTS sessions (
  key TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  job TEXT NOT NULL,
  status TEXT NOT NULL,
  session_id TEXT,
  turns INTEGER,
  cost_usd REAL,
  error TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT
);
`;

type RunOutcome = {
	sessionId?: string;
	status: "succeeded" | "failed";
	turns?: number;
	costUsd?: number;
	error?: string;
};

export class Store {
	private readonly db: Database;

	constructor(path: string) {
		this.db = new Database(path, { create: true });
		this.db.exec("PRAGMA journal_mode = WAL");
		this.db.exec(schema);
	}

	// A conversation left alone for long enough starts a fresh session next time.
	session(key: string, maxAgeMs: number): string | undefined {
		const row = this.db
			.query<{ session_id: string; updated_at: number }, [string]>(
				"SELECT session_id, updated_at FROM sessions WHERE key = ?",
			)
			.get(key);
		if (!row || Date.now() - row.updated_at > maxAgeMs) return undefined;
		return row.session_id;
	}

	saveSession(key: string, sessionId: string): void {
		this.db
			.query(
				`INSERT INTO sessions (key, session_id, updated_at) VALUES (?, ?, ?)
				 ON CONFLICT(key) DO UPDATE SET session_id = excluded.session_id, updated_at = excluded.updated_at`,
			)
			.run(key, sessionId, Date.now());
	}

	forgetSession(key: string): void {
		this.db.query("DELETE FROM sessions WHERE key = ?").run(key);
	}

	startRun(id: string, job: Job): void {
		this.db
			.query("INSERT INTO runs (id, key, job, status, started_at) VALUES (?, ?, ?, 'running', ?)")
			.run(id, job.key, JSON.stringify(job), new Date().toISOString());
	}

	finishRun(id: string, outcome: RunOutcome): void {
		this.db
			.query(
				"UPDATE runs SET session_id = ?, status = ?, turns = ?, cost_usd = ?, error = ?, ended_at = ? WHERE id = ?",
			)
			.run(
				outcome.sessionId ?? null,
				outcome.status,
				outcome.turns ?? null,
				outcome.costUsd ?? null,
				outcome.error ?? null,
				new Date().toISOString(),
				id,
			);
	}

	// Runs still marked running when the process starts were cut off by the previous shutdown.
	takeInterruptedRuns(): Job[] {
		const rows = this.db.query<{ job: string }, []>("SELECT job FROM runs WHERE status = 'running'").all();
		this.db
			.query("UPDATE runs SET status = 'interrupted', ended_at = ? WHERE status = 'running'")
			.run(new Date().toISOString());
		return rows.map((row) => JSON.parse(row.job) as Job);
	}

	close(): void {
		this.db.close();
	}
}
