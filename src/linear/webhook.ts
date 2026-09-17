import { type AgentSessionEventWebhookPayload, LinearWebhookClient } from "@linear/sdk/webhooks";

export type AgentSessionEvent = AgentSessionEventWebhookPayload;

// Verifies the signature, answers Linear within its five-second window, and hands the event on.
export function linearWebhook(secret: string, onEvent: (event: AgentSessionEvent) => void) {
	const handler = new LinearWebhookClient(secret).createHandler();
	handler.on("AgentSessionEvent", (payload) => {
		onEvent(payload);
	});
	return (request: Request): Promise<Response> => handler(request);
}
