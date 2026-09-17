export type Surface = "slack" | "linear" | "heartbeat";

export type RunResult = {
	sessionId: string;
	ok: boolean;
	text: string;
	error?: string;
	turns: number;
	costUsd: number;
};

export type SurfaceContext = {
	surface: Surface;
	description: string;
};

export type SlackTarget = {
	surface: "slack";
	channel: string;
	threadTs: string;
	teamId?: string;
	userId?: string;
	originTs?: string;
	assistant?: boolean;
};

export type LinearTarget = { surface: "linear"; sessionId: string };

export type HeartbeatTarget = { surface: "heartbeat"; channel?: string; threadTs?: string; userId?: string };

// Everything needed to rebuild a reply after a restart, so it has to stay plain data.
export type ReplyTarget = SlackTarget | LinearTarget | HeartbeatTarget;

export interface Reply {
	text(delta: string): void;
	tool(id: string, title: string): void;
	toolDone(id: string, ok: boolean): void;
	done(result: RunResult): Promise<void>;
	fail(error: Error): Promise<void>;
}

export type Job = {
	key: string;
	prompt: string;
	context: SurfaceContext;
	target: ReplyTarget;
};
