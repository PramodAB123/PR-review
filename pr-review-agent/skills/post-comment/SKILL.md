---
name: post-comment
description: "Posts review markdown as a GitHub PR review using gh CLI"
allowed-tools: Bash
---

# Post Comment

## Input
- prNumber — integer
- reviewMarkdown — full review as string
- action — request-changes | comment | approve

## Steps

1. If GH_TOKEN not set — print review to stdout and exit cleanly

2. Write review to temp file:
   /tmp/pr-review-{prNumber}-{timestamp}.md
   Reason: avoids shell escaping issues with backticks and quotes

3. Run correct gh command:
   request-changes → gh pr review N --request-changes --body-file /tmp/...
   comment         → gh pr review N --comment --body-file /tmp/...
   approve         → gh pr review N --approve --body-file /tmp/...

4. Print: "Review posted to PR #N — action: {action}"

5. Delete temp file in finally block

6. On failure — print stderr, print review text, exit code 1
   Never swallow errors silently