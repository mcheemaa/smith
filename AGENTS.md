# Working in this repository

Conventions for anyone changing Smith, human or agent.

## What Smith is

A self-hosted engineering agent on the Claude Agent SDK. One owner per install, no UI. Slack is the conversation, Linear is the queue, GitHub is where the work lands. The TypeScript here is plumbing: it routes messages to Claude Code sessions, streams progress back, and remembers which thread belongs to which session. Everything the agent knows about how to work lives in `agent/CLAUDE.md` and `agent/heartbeat.md`, not in code.

## Non-negotiables

- The agent is trusted. It runs with permissions bypassed and no guardrail layer; policy is written in its manual, not enforced in code. Do not add hooks, allowlists, or approval flows.
- Small and legible. Every file has one concern and stays under a screen or two. If you cannot explain a file to the owner in a minute, it is too big.
- Comments only where a why deserves one. Code that needs narration is not finished.
- Nothing is done until verified: `bun run typecheck`, `bun run lint`, and `bun test` clean, and the real flow exercised.
- No secrets in the repository. `.env` is gitignored; `.env.example` lists names only.

## Code standards

- TypeScript strict, no `any`, no suppressions. Biome formats and lints.
- Verify library behavior against the installed package in `node_modules`, not memory.
- Prefer the platform: `bun:sqlite`, `Bun.file`, `Bun.serve`, `Bun.$`.
- The Reply interface is the only boundary between a surface (Slack, Linear, heartbeat) and the agent runtime.

## Voice

No em dashes anywhere. No emoji in code or copy. No marketing language. Commit messages name the change in plain words, without attribution footers.
