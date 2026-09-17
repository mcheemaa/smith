import { expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { linearWebhook } from "../src/linear/webhook.ts";

const secret = "shh";

function signed(payload: Record<string, unknown>): Request {
	const body = JSON.stringify({ ...payload, webhookTimestamp: Date.now() });
	const signature = createHmac("sha256", secret).update(body).digest("hex");
	return new Request("http://smith/linear/webhook", {
		method: "POST",
		headers: { "content-type": "application/json", "linear-signature": signature },
		body,
	});
}

const event = {
	type: "AgentSessionEvent",
	action: "created",
	webhookId: "w1",
	agentSession: { id: "s1", issue: { id: "i1", identifier: "ENG-1", title: "T", url: "u" } },
};

test("accepts a correctly signed agent session event", async () => {
	const received: string[] = [];
	const handle = linearWebhook(secret, (payload) => {
		received.push(payload.agentSession.id);
	});
	const response = await handle(signed(event));
	expect(response.status).toBe(200);
	expect(received).toEqual(["s1"]);
});

test("rejects a bad signature", async () => {
	const handle = linearWebhook(secret, () => {
		throw new Error("should not be called");
	});
	const request = signed(event);
	const tampered = new Request(request, {
		headers: { ...Object.fromEntries(request.headers), "linear-signature": "0".repeat(64) },
	});
	const response = await handle(tampered);
	expect(response.ok).toBe(false);
});
