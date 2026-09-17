# Contributing

Thanks for wanting to make Smith better. It is a young, deliberately small project; questions, issues, and ideas are as welcome as patches.

## Getting set up

[docs/setup.md](docs/setup.md) walks the first run end to end: the Slack app, the tokens, the first conversation. [README.md](README.md) has the short version.

## House rules

[AGENTS.md](AGENTS.md) is the working constitution and applies to humans as much as agents. The short version:

- The agent is trusted. No guardrail layer, no approval flows; policy lives in `agent/CLAUDE.md`.
- Small files, one concern each, legible to the owner in a minute.
- TypeScript strict, Biome clean, comments only where a why needs stating.
- Verify library behavior against the installed package, not memory.
- Fix root causes, never symptoms.

## Before you open a PR

Run the gates; CI runs exactly these and nothing else:

```console
bun run typecheck && bun run lint && bun test
```

Keep PRs small and focused, with plain commit messages that name the change. If a change touches what the agent does in Slack or Linear, describe the conversation you proved it with.

## Security

Vulnerabilities go to the private channel in [SECURITY.md](SECURITY.md), not the issue tracker.
