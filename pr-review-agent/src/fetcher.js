import { execSync } from 'child_process';

// Trim diffs larger than this to protect LLM context window
const MAX_DIFF_LINES = 4000;

/**
 * Fetches the unified diff for a PR using gh CLI.
 * Exits process on failure — nothing works without the diff.
 */
export function fetchPRDiff(prNumber) {
    console.log(`  Running: gh pr diff ${prNumber}`);

    try {
        const diff = execSync(`gh pr diff ${prNumber}`, {
            encoding: 'utf8',
            maxBuffer: 1024 * 1024 * 10,  // 10MB
        });

        if (!diff || !diff.trim()) return '';

        const lines = diff.split('\n');

        // Guard: trim massive diffs
        if (lines.length > MAX_DIFF_LINES) {
            const omitted = lines.length - MAX_DIFF_LINES;
            console.warn(`  Diff too large (${lines.length} lines) — trimming`);
            return [
                ...lines.slice(0, MAX_DIFF_LINES),
                '',
                `[Diff trimmed — ${omitted} lines omitted. Review covers first portion only.]`,
            ].join('\n');
        }

        console.log(`  Diff: ${lines.length} lines, ${diff.length} chars`);
        return diff;

    } catch (err) {
        const msg = err.stderr?.toString() || err.message;
        console.error('Failed to fetch diff:', msg);

        if (msg.includes('not found')) console.error(`PR #${prNumber} does not exist`);
        if (msg.includes('authentication')) console.error('Run: gh auth login');

        process.exit(1);
    }
}

/**
 * Fetches PR metadata — title, author, branch info.
 * Non-fatal: returns defaults if it fails.
 */
export function fetchPRMeta(prNumber) {
    try {
        const raw = execSync(
            `gh pr view ${prNumber} --json title,author,baseRefName,additions,deletions,changedFiles`,
            { encoding: 'utf8' }
        );
        return JSON.parse(raw);
    } catch {
        console.warn('  Could not fetch PR metadata — using defaults');
        return {
            title: 'Unknown',
            author: { login: 'Unknown' },
            baseRefName: 'main',
            additions: 0,
            deletions: 0,
            changedFiles: 0,
        };
    }
}