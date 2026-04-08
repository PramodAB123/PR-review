import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';

// ── Unit tests — no API key, no network ──────────────────────────

describe('getAction', async () => {
    const { getAction } = await import('../src/reviewer.js');

    test('request-changes when BLOCKER emoji present', () => {
        assert.equal(
            getAction('🔴 BLOCKER — src/auth.js:1\nVERDICT: Request changes — 1 blocker(s) found.'),
            'request-changes'
        );
    });

    test('request-changes when BLOCKER text present', () => {
        assert.equal(
            getAction('Found a BLOCKER here.\nVERDICT: Request changes — 1 blocker(s) found.'),
            'request-changes'
        );
    });

    test('approve when exact clean verdict', () => {
        assert.equal(
            getAction('No issues.\nVERDICT: Approve — no issues found.'),
            'approve'
        );
    });

    test('comment for warnings only', () => {
        assert.equal(
            getAction('🟡 WARNING — src/orders.js:8\nVERDICT: Approve with suggestions — 1 warning(s).'),
            'comment'
        );
    });

    test('comment when no verdict line', () => {
        assert.equal(getAction('Looks okay.'), 'comment');
    });
});

describe('countFindings', async () => {
    const { countFindings } = await import('../src/reviewer.js');

    test('counts correctly', () => {
        const review = '🔴 BLOCKER one\n🔴 BLOCKER two\n🟡 WARNING one\n🔵 SUGGESTION one';
        const c = countFindings(review);
        assert.equal(c.blockers, 2);
        assert.equal(c.warnings, 1);
        assert.equal(c.suggestions, 1);
    });

    test('zeros for clean review', () => {
        const c = countFindings('No issues.\nVERDICT: Approve — no issues found.');
        assert.equal(c.blockers, 0);
        assert.equal(c.warnings, 0);
        assert.equal(c.suggestions, 0);
    });
});

describe('loadAgent', async () => {
    const { loadAgent, buildSystemPrompt } = await import('../src/loader.js');
    let agent;

    before(() => { agent = loadAgent('.'); });

    test('SOUL.md loads', () => {
        assert.ok(agent.soul.length > 100, 'SOUL.md too short');
    });

    test('RULES.md loads', () => {
        assert.ok(agent.rules.length > 100, 'RULES.md too short');
    });

    test('review-diff skill loads', () => {
        assert.ok(agent.skills['review-diff'], 'review-diff missing');
    });

    test('post-comment skill loads', () => {
        assert.ok(agent.skills['post-comment'], 'post-comment missing');
    });

    test('knowledge loads', () => {
        assert.ok(agent.knowledge['security-patterns'], 'security-patterns missing');
        assert.ok(agent.knowledge['js-antipatterns'], 'js-antipatterns missing');
    });

    test('system prompt has all sections', () => {
        const p = buildSystemPrompt(agent, 'review-diff');
        assert.ok(p.includes('Agent Identity'));
        assert.ok(p.includes('Hard Rules'));
        assert.ok(p.includes('Reference Knowledge'));
        assert.ok(p.includes('SQL Injection'));
        assert.ok(p.includes('N+1'));
        assert.ok(p.includes('Current Task'));
    });
});

// ── Integration tests — need GROQ_API_KEY ────────────────────────

const hasKey = !!process.env.GROQ_API_KEY;
const SKIP = !hasKey ? 'Set GROQ_API_KEY to run' : false;

describe('live Groq review', async () => {
    const { reviewDiff } = await import('../src/reviewer.js');
    const { loadAgent } = await import('../src/loader.js');

    const meta = {
        title: 'Test PR',
        author: { login: 'dev' },
        baseRefName: 'main',
        changedFiles: 1,
        additions: 20,
        deletions: 0,
    };

    test('detects BLOCKER in blocker.diff', { skip: SKIP }, async () => {
        const agent = loadAgent('.');
        const diff = readFileSync('tests/fixtures/blocker.diff', 'utf8');
        const review = await reviewDiff(agent, diff, meta);

        assert.ok(
            review.includes('BLOCKER') || review.includes('🔴'),
            `Expected BLOCKER.\n${review}`
        );
        assert.ok(review.includes('VERDICT:'), 'Missing VERDICT');
    });

    test('detects WARNING in warning.diff', { skip: SKIP }, async () => {
        const agent = loadAgent('.');
        const diff = readFileSync('tests/fixtures/warning.diff', 'utf8');
        const review = await reviewDiff(agent, diff, meta);

        assert.ok(
            review.includes('WARNING') || review.toLowerCase().includes('n+1') || review.toLowerCase().includes('loop'),
            `Expected WARNING or N+1.\n${review}`
        );
        assert.ok(review.includes('VERDICT:'), 'Missing VERDICT');
    });

    test('approves clean.diff', { skip: SKIP }, async () => {
        const agent = loadAgent('.');
        const diff = readFileSync('tests/fixtures/clean.diff', 'utf8');
        const review = await reviewDiff(agent, diff, meta);

        assert.ok(
            !review.includes('🔴') && !review.includes('BLOCKER'),
            `Clean diff should not have BLOCKER.\n${review}`
        );
        assert.ok(review.includes('VERDICT:'), 'Missing VERDICT');
    });
});