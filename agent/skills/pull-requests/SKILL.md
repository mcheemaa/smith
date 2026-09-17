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

Small steps. The subject names the change in plain words, under 70 characters, no trailing period: `Add retry to the Slack upload`, `Fix the login redirect on expired sessions`. No emoji, no attribution footers, no ticket numbers in the subject.

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

## After opening

Watch checks with `gh pr checks <number> --watch`. Read review comments with `gh pr view <number> --comments`, address them on the same branch, and reply on the thread where a reviewer asked something.

## Writing rules

No em dashes anywhere: not in titles, bodies, commit messages, or comments. Use commas, periods, or regular dashes. No buzzwords, no slogans. Describe what the code does, not how impressive it is.
