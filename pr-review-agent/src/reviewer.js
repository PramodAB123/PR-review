import { buildSystemPrompt } from './loader.js';
import { callLLM } from './llm.js';

/**
 * Runs the review-diff skill.
 * Builds the full system prompt + user message, calls LLM, returns review.
 */
export async function reviewDiff(agent, diff, meta) {
    const systemPrompt = buildSystemPrompt(agent, 'review-diff');

    const userMessage = [
        '## Pull Request Context',
        `Title:         ${meta.title}`,
        `Author:        ${meta.author?.login || 'Unknown'}`,
        `Base branch:   ${meta.baseRefName || 'main'}`,
        `Files changed: ${meta.changedFiles || '?'}`,
        `Lines added:   +${meta.additions || 0}`,
        `Lines removed: -${meta.deletions || 0}`,
        '',
        '## Unified Diff to Review',
        '',
        diff,
    ].join('\n');

    const adapter = process.env.LLM_ADAPTER || 'groq';
    console.log(`  Prompt size: ${(systemPrompt.length + userMessage.length).toLocaleString()} chars`);
    console.log(`  Calling ${adapter}...`);

    const start = Date.now();
    const review = await callLLM(systemPrompt, userMessage);
    const secs = ((Date.now() - start) / 1000).toFixed(1);

    console.log(`  Review received in ${secs}s (${review.length} chars)`);
    return review;
}

/**
 * Determines the GitHub review action based on review content.
 *
 * BLOCKER present      → request-changes (PR blocked)
 * Clean approval line  → approve (PR ready to merge)
 * Anything else        → comment (warnings or suggestions)
 */
export function getAction(reviewText) {
    if (reviewText.includes('🔴 BLOCKER') || reviewText.includes('BLOCKER')) {
        return 'request-changes';
    }
    if (reviewText.includes('VERDICT: Approve — no issues found')) {
        return 'approve';
    }
    return 'comment';
}

/**
 * Extracts the VERDICT line from the review for log display.
 */
export function extractVerdict(reviewText) {
    const line = reviewText.split('\n').find(l => l.trim().startsWith('VERDICT:'));
    return line?.trim() || 'VERDICT: (not found)';
}

/**
 * Counts findings by severity.
 */
export function countFindings(reviewText) {
    return {
        blockers: (reviewText.match(/🔴 BLOCKER/g) || []).length,
        warnings: (reviewText.match(/🟡 WARNING/g) || []).length,
        suggestions: (reviewText.match(/🔵 SUGGESTION/g) || []).length,
    };
}