import 'dotenv/config';
import { loadAgent } from './loader.js';
import { fetchPRDiff, fetchPRMeta } from './fetcher.js';
import { reviewDiff, getAction, extractVerdict, countFindings } from './reviewer.js';
import { postReview } from './poster.js';

const DRY_RUN = process.env.DRY_RUN === 'true';
const prNumber = process.argv[2];
const adapter = process.env.LLM_ADAPTER || 'groq';

async function main() {

    // ── Banner ───────────────────────────────────────────────
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║       PR Review Agent  v1.0.0        ║');
    console.log('╚══════════════════════════════════════╝');
    console.log(`  PR:      #${prNumber}`);
    console.log(`  Adapter: ${adapter}`);
    console.log(`  Dry run: ${DRY_RUN}\n`);

    // ── Validate inputs ──────────────────────────────────────
    if (!prNumber || isNaN(Number(prNumber))) {
        console.error('Usage:');
        console.error('  node src/index.js <PR_NUMBER>');
        console.error('  DRY_RUN=true node src/index.js <PR_NUMBER>');
        console.error('  LLM_ADAPTER=claude node src/index.js <PR_NUMBER>');
        process.exit(1);
    }

    const keyMap = { groq: 'GROQ_API_KEY', openai: 'OPENAI_API_KEY', claude: 'ANTHROPIC_API_KEY' };
    const requiredKey = keyMap[adapter];
    if (requiredKey && !process.env[requiredKey]) {
        console.error(`Error: ${requiredKey} is not set in .env`);
        if (adapter === 'groq') console.error('Get free key at: console.groq.com');
        process.exit(1);
    }

    // ── Step 1 — Load agent definition ──────────────────────
    console.log('[1/4] Loading agent definition...');
    const agent = loadAgent('.');
    console.log(`  Agent:     ${agent.meta.name}`);
    console.log(`  Skills:    ${Object.keys(agent.skills).join(', ')}`);
    console.log(`  Knowledge: ${Object.keys(agent.knowledge).join(', ')}`);

    // ── Step 2 — Fetch PR from GitHub ────────────────────────
    console.log('\n[2/4] Fetching PR from GitHub...');
    const [diff, meta] = await Promise.all([
        fetchPRDiff(prNumber),
        fetchPRMeta(prNumber),
    ]);

    console.log(`  Title:  "${meta.title}"`);
    console.log(`  Author: ${meta.author?.login}`);
    console.log(`  Files:  ${meta.changedFiles} changed (+${meta.additions} -${meta.deletions})`);

    if (!diff.trim()) {
        console.log('\nNo diff found — PR has no file changes. Nothing to review.');
        process.exit(0);
    }

    // ── Step 3 — Run review ──────────────────────────────────
    console.log('\n[3/4] Running review-diff skill...');
    const review = await reviewDiff(agent, diff, meta);
    const action = getAction(review);
    const verdict = extractVerdict(review);
    const counts = countFindings(review);

    console.log('\n' + '─'.repeat(60));
    console.log('REVIEW OUTPUT:');
    console.log('─'.repeat(60));
    console.log(review);
    console.log('─'.repeat(60));
    console.log(`  Blockers:    ${counts.blockers}`);
    console.log(`  Warnings:    ${counts.warnings}`);
    console.log(`  Suggestions: ${counts.suggestions}`);
    console.log(`  Verdict:     ${verdict}`);
    console.log(`  Action:      ${action}`);

    // ── Step 4 — Post to GitHub ──────────────────────────────
    if (DRY_RUN) {
        console.log('\n[4/4] DRY_RUN=true — review printed above, not posted to GitHub');
        process.exit(0);
    }

    console.log('\n[4/4] Posting review to GitHub...');
    postReview(prNumber, review, action);

    console.log('\nDone.\n');
}

main().catch(err => {
    console.error('\nFatal error:', err.message);
    process.exit(1);
});