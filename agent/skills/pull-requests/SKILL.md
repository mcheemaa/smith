---
name: pull-requests
description: How to branch, commit, and open a pull request with gh so it reads like one a careful engineer wrote. Use whenever work ends in a pull request.
---

# Pull requests

## Branch

One task, one branch, in a worktree so parallel tasks never collide:

```bash
git fetch origin
git worktree add .worktrees/<branch> -b <branch> origin/<default branch>
```

Name the branch after the Linear issue (`<team>-<number>-<slug>`, the issue's own copy-branch-name value) so Linear attaches the pull request to it. Every task has an issue; create one first if it does not.

## Commits

Small steps. The subject names the change in plain words, under 70 characters, no trailing period: `Add retry to the Slack upload`, `Fix the login redirect on expired sessions`. No emoji, no ticket numbers in the subject, and no attribution anywhere: no `Co-Authored-By` trailer, no "Generated with Claude Code" line, in commits, pull requests, or issues. The work is yours.

## Before opening

Run what the repository runs: its tests, linter, and typecheck. If something fails and it is not yours, say so in the pull request instead of hiding it.

## Open it

```bash
gh pr create --title "<the change>" --body "$(cat <<'EOF'
<What changed and why, two to five sentences. Plain words.>

<How you verified it: the commands you ran and what they showed.>

Closes <issue id>.
EOF
)"
```

Use `--draft` while it is unfinished. Never merge your own pull request unless the person asked for that explicitly.

## Screenshots

GitHub has no way to upload an image into a pull request from the command line, so images live in a repository made for them. When a `screenshots` repository is cloned in your workspace, add the files under `<repository>/<issue>/` with names that say page, width, and theme (`docs-1440-dark.png`), commit, push, and embed them from there. Light and dark side by side, one row per width:

```html
<img src="https://github.com/<org>/screenshots/blob/main/<repository>/<issue>/docs-1440-light.png?raw=true" width="49%" alt="/docs at 1440, light"> <img src="https://github.com/<org>/screenshots/blob/main/<repository>/<issue>/docs-1440-dark.png?raw=true" width="49%" alt="/docs at 1440, dark">
```

The same files go into the Slack thread with `mcp__slack__slack_upload`.

## After opening

Watch checks with `gh pr checks <number> --watch`. Read review comments with `gh pr view <number> --comments`, address them on the same branch, and reply on the thread where a reviewer asked something.

## Writing rules

No em dashes anywhere: not in titles, bodies, commit messages, or comments. Use commas, periods, or regular dashes. No buzzwords, no slogans. Describe what the code does, not how impressive it is.
