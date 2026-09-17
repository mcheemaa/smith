// One-time installation of the app as an agent in a Linear workspace. Smith mints its own tokens afterwards.
// Usage: LINEAR_CLIENT_ID=... LINEAR_CLIENT_SECRET=... bun run scripts/linear-auth.ts

const clientId = process.env.LINEAR_CLIENT_ID;
const clientSecret = process.env.LINEAR_CLIENT_SECRET;
if (!clientId || !clientSecret) {
	console.error("Set LINEAR_CLIENT_ID and LINEAR_CLIENT_SECRET from the application's settings in Linear.");
	process.exit(1);
}

const port = 7890;
const redirectUri = `http://localhost:${port}/callback`;
const scopes = ["read", "write", "issues:create", "comments:create", "app:assignable", "app:mentionable"];
const authorizeUrl = new URL("https://linear.app/oauth/authorize");
authorizeUrl.search = new URLSearchParams({
	client_id: clientId,
	redirect_uri: redirectUri,
	response_type: "code",
	scope: scopes.join(","),
	actor: "app",
	state: crypto.randomUUID(),
}).toString();

console.log(`Open this in your browser and approve the agent:\n\n${authorizeUrl}\n`);

const server = Bun.serve({
	port,
	async fetch(request) {
		const url = new URL(request.url);
		if (url.pathname !== "/callback") return new Response("not found", { status: 404 });
		const code = url.searchParams.get("code");
		if (!code) return new Response("Linear sent no code.", { status: 400 });
		const response = await fetch("https://api.linear.app/oauth/token", {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				client_id: clientId,
				client_secret: clientSecret,
				redirect_uri: redirectUri,
				code,
				grant_type: "authorization_code",
			}),
		});
		const body = (await response.json()) as { access_token?: string; error?: string };
		if (!body.access_token) {
			console.error("Token exchange failed:", body);
			setTimeout(() => process.exit(1), 100);
			return new Response(`Token exchange failed: ${body.error ?? "unknown"}`, { status: 500 });
		}
		console.log("\nInstalled as an agent in the workspace.\n");
		setTimeout(() => {
			server.stop();
			process.exit(0);
		}, 100);
		return new Response("Smith is installed as an agent in this workspace. You can close this tab.");
	},
});
