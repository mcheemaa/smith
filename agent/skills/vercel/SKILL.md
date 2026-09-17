---
name: vercel
description: Check deployments, logs, and environment variables on Vercel with the vercel CLI, find a preview URL, or roll production back. Use when a site or app you work on is hosted on Vercel.
---

# Vercel

`VERCEL_TOKEN` is in your environment and the `vercel` CLI reads it. Add `--scope <team>` when the project belongs to a team.

- `vercel ls <project>`: recent deployments with their state and URL.
- `vercel inspect <url>`: one deployment: commit, state, aliases. `--logs` prints its build log.
- `vercel logs <url>`: runtime logs of a deployment.
- `vercel env ls <environment>`: the variable names an environment has; values stay hidden.
- `vercel rollback <url>` and `vercel promote <url>`: point production at an earlier or a specific deployment. Say in the thread when you do.

Production ships by merging to the default branch, never by `vercel --prod` from your machine. A pull request's preview URL is in the Vercel bot's comment on the pull request.
