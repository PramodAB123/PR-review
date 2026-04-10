# Sentinel — AI PR Review Agent

> An autonomous AI-powered pull request reviewer built on the **open-gitagent** standard.  
> Catches security vulnerabilities, bad coding patterns, and logic errors before they reach production — automatically.

---

## 🚀 What It Does

Sentinel reads your GitHub Pull Request diffs, analyzes the code using an LLM grounded in a custom security knowledge base, and posts a structured review comment directly to the PR. It flags issues in two tiers:

| Severity | Symbol | Description |
|---|---|---|
| **BLOCKER** | 🔴 | Critical issues that must be fixed before merge (e.g. hardcoded secrets, `eval()` on user input) |
| **WARNING** | 🟡 | Issues that should be addressed soon (e.g. N+1 queries, missing error handling) |

Every finding includes:
- The exact **file name** and **line number**
- A clear explanation of **why it's dangerous**
- A concrete **Before/After code fix**

---

## 🏗️ Architecture

This project is built directly on the [open-gitagent](https://github.com/open-gitagent/gitagent) standard. Your agent definition **is** the git repo.

```
pr-review-agent/
├── agent.yaml              # Model config, skills, runtime settings
├── SOUL.md                 # Agent identity & personality
├── RULES.md                # Hard behavioral constraints
├── knowledge/
│   ├── index.yaml          # Knowledge base index
│   ├── security-patterns.md   # OWASP & Node.js security rules
│   └── js-antipatterns.md     # JS/Node.js bad practice patterns
├── skills/
│   ├── review-diff/        # Skill: Analyze a git diff & produce findings
│   │   └── SKILL.md
│   └── post-comment/       # Skill: Post review to GitHub via gh CLI
│       └── SKILL.md
├── tools/
│   └── github.yaml         # MCP tool definition for GitHub operations
├── src/
│   ├── index.js            # Main entry point
│   ├── fetcher.js          # Fetches PR diff & metadata via gh CLI
│   ├── reviewer.js         # Builds LLM prompt & parses review output
│   ├── llm.js              # LLM adapter (Groq, OpenAI, Claude)
│   ├── loader.js           # Loads agent.yaml, skills, knowledge base
│   └── poster.js           # Posts review comment to GitHub PR
├── tests/
│   ├── review.test.js      # Unit tests
│   └── fixtures/           # Sample diffs for testing
│       ├── blocker.diff
│       ├── warning.diff
│       └── clean.diff
└── .github/
    └── workflows/
        └── pr-review.yml   # GitHub Actions CI/CD workflow
```

### How It Works

```
GitHub PR ──► gh pr diff ──► LLM (Groq) ──► Structured Review ──► gh pr review (comment)
                  ▲                ▲
           fetcher.js      knowledge base
                          (security-patterns,
                           js-antipatterns)
```

---

## ⚙️ Prerequisites

- **Node.js** `>= 18.0.0`
- **GitHub CLI** (`gh`) — [Install here](https://cli.github.com/) and run `gh auth login`
- A **Groq API key** — Get one free at [console.groq.com](https://console.groq.com)
- A **GitHub PAT** with `pull_requests: Read & Write` scope (for posting reviews)

---

## 🔧 Setup

### 1. Clone the Repository

```bash
git clone https://github.com/PramodAB123/PR-review.git
cd PR-review/pr-review-agent
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example file and fill in your keys:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required: LLM provider key (choose one)
GROQ_API_KEY=your_groq_api_key_here

# Optional: for other LLM providers
# OPENAI_API_KEY=your_openai_key
# ANTHROPIC_API_KEY=your_anthropic_key

# Optional: GitHub token for posting reviews
# If not set, the review is printed to stdout only
GH_TOKEN=your_github_personal_access_token
```

> **Note:** If `GH_TOKEN` is not set, the agent still runs and prints the full review to stdout — it just won't post to GitHub.

### 4. Authenticate GitHub CLI

```bash
gh auth login
```

### 5. Validate Agent Configuration

```bash
npm run validate
```

You should see:
```
✓ agent.yaml — valid
✓ SOUL.md — valid
✓ tools/github.yaml — valid
✓ skills/ — valid
✓ Validation passed (0 warnings)
```

---

## ▶️ Running the Agent

### Review a Live Pull Request

```bash
node src/index.js <PR_NUMBER>
```

**Example:**
```bash
node src/index.js 2
```

### Dry Run (Print Review, Don't Post)

```bash
npm run review:dry -- 2
```

### Using a Specific LLM Provider

```bash
# Groq (default)
npm run review:groq -- 2

# OpenAI
npm run review:openai -- 2

# Anthropic Claude
npm run review:claude -- 2
```

### Run Tests

```bash
npm test
```

---

## 🧠 Knowledge Base

The agent's LLM is grounded with two custom knowledge files:

### `knowledge/security-patterns.md`
Covers OWASP Top 10 and Node.js-specific vulnerabilities:
- Hardcoded secrets & API keys
- Insecure `eval()` usage (Remote Code Execution)
- SQL injection via string concatenation
- Missing input validation
- Broken authentication patterns

### `knowledge/js-antipatterns.md`
Covers common JavaScript/Node.js bad practices:
- N+1 database query loops
- Unhandled Promise rejections
- Excessive `console.log` in production
- Blocking the event loop with synchronous operations

---

## 🛡️ Skills

### `skills/review-diff`
Instructs the agent how to analyze a git diff:
1. Parse each changed file and line
2. Cross-reference against the knowledge base
3. Categorize each finding as BLOCKER or WARNING
4. Produce a structured markdown report with file names & line numbers

### `skills/post-comment`
Instructs the agent how to post the review:
1. Write the review to a temp file (avoids shell escaping issues)
2. Run the appropriate `gh pr review` command
3. Fallback from `--request-changes` to `--comment` if reviewing your own PR
4. Clean up the temp file in a finally block

---

## 🤖 Agent Configuration (`agent.yaml`)

```yaml
spec_version: "0.1.0"
name: pr-review-agent
version: 1.0.0
description: "AI code reviewer — catches security bugs, logic errors, and bad patterns in PRs automatically"
author: PramodAB123
model:
  preferred: claude-opus-4-6
  fallback:
    - llama-3.3-70b-versatile
skills:
  - review-diff
  - post-comment
runtime:
  max_turns: 50
  timeout: 120
```

---

## 🔄 CI/CD (GitHub Actions)

The agent can run automatically on every Pull Request via the included workflow:

**`.github/workflows/pr-review.yml`**

To activate it, add these secrets to your GitHub repository:
- `GROQ_API_KEY` — Your Groq API key
- `GH_TOKEN` — A PAT with `pull_requests: write` permission

The workflow triggers on every `pull_request` event and automatically posts the Sentinel review as a comment.

---

## 🧪 Test Bed: `calculator-app`

The `calculator-app/` directory in this repo is a **deliberately vulnerable** test application for validating Sentinel's detection capabilities. It contains:

| File | Vulnerability | Severity |
|---|---|---|
| `src/calculator.js` | `eval()` on raw user input | 🔴 BLOCKER |
| `src/config.js` | Hardcoded `API_KEY` & `JWT_SECRET` | 🔴 BLOCKER |
| `src/api.js` | Missing `try/catch` in async functions | 🔴 BLOCKER |
| `src/db.js` | N+1 query loop pattern | 🟡 WARNING |
| `src/api.js` | Excessive `console.log` statements | 🟡 WARNING |

---

## 🛠️ Built With

| Technology | Purpose |
|---|---|
| [open-gitagent](https://github.com/open-gitagent/gitagent) | Agent definition standard & validation |
| [gitclaw](https://github.com/open-gitagent/gitclaw) | Agent runtime SDK |
| [Groq](https://groq.com) | Free, fast LLM inference (default) |
| [GitHub CLI (`gh`)](https://cli.github.com/) | PR diff fetching & review posting |
| Node.js | Runtime engine |

---

## 📄 License

MIT © PramodAB123
