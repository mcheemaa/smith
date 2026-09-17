import { LinearClient } from "@linear/sdk";
import { log } from "../log.ts";

// Changing the scope list revokes every existing token for the app, so it stays fixed.
const SCOPES = "read,write,issues:create,comments:create,app:assignable,app:mentionable";
const REFRESH_AFTER_MS = 12 * 3_600_000;

// Linear's client credentials grant: Smith mints its own app token and mints again when it ages or is rejected.
export class LinearAuth {
	private token: { value: string; mintedAt: number } | undefined;

	constructor(
		private readonly clientId: string,
		private readonly clientSecret: string,
	) {}

	async accessToken(): Promise<string> {
		if (!this.token || Date.now() - this.token.mintedAt > REFRESH_AFTER_MS) await this.mint();
		return (this.token as { value: string }).value;
	}

	async client(): Promise<LinearClient> {
		return new LinearClient({ accessToken: await this.accessToken() });
	}

	invalidate(): void {
		this.token = undefined;
	}

	private async mint(): Promise<void> {
		const response = await fetch("https://api.linear.app/oauth/token", {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				grant_type: "client_credentials",
				scope: SCOPES,
				client_id: this.clientId,
				client_secret: this.clientSecret,
			}),
		});
		const body = (await response.json()) as { access_token?: string; expires_in?: number; error?: string };
		if (!response.ok || !body.access_token) {
			throw new Error(`Linear refused a client credentials token: ${body.error ?? response.status}`);
		}
		this.token = { value: body.access_token, mintedAt: Date.now() };
		log.info("linear.token", { expiresInDays: Math.round((body.expires_in ?? 0) / 86_400) });
	}
}
