---
name: review-diff
description: "Analyzes a git diff and produces structured code review feedback"
allowed-tools: Bash Read
knowledge:
  - security-patterns
  - js-antipatterns
---

# Review Diff

## Input
- Unified diff string — lines starting with + are additions
- PR metadata — title, author, base branch

## Process — follow this order

Pass 1 — Read the whole diff to understand what the PR does

Pass 2 — Scan every + line for BLOCKER patterns from RULES.md
Use security-patterns.md knowledge for exact pattern matching

Pass 3 — Scan every + line for WARNING patterns
Use js-antipatterns.md knowledge for N+1 and other patterns

Pass 4 — Write findings grouped by severity
All BLOCKERs first, then WARNINGs, then SUGGESTIONs

Pass 5 — Write verdict line

## Output Format

No preamble. Start with first finding immediately.

🔴 BLOCKER — `filename.js:lineNumber`
[One paragraph explaining what can go wrong]

```js
// Before
vulnerable code

// After  
safe code
```

If no issues: write "No issues found." then verdict.

## Example BLOCKER

🔴 BLOCKER — `src/auth.js:14`
This query builds SQL by inserting email directly into the string.
An attacker can pass ' OR '1'='1' -- to log in as any user without
knowing their password.

```js
// Before
db.query(`SELECT * FROM users WHERE email = '${email}'`)

// After
db.query('SELECT * FROM users WHERE email = $1', [email])
```

## Constraints
- Only comment on + lines (additions)
- Never comment on - lines (deletions) or context lines
- Keep total review under 600 words
- End with exactly one VERDICT line