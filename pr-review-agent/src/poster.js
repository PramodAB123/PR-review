import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Posts the review to GitHub as a PR review comment.
 *
 * If GH_TOKEN is missing — prints to stdout (local dev mode).
 * If gh command fails   — prints review text so nothing is lost.
 */
export function postReview(prNumber, reviewMarkdown, action) {

    // No token — print to stdout
    if (!process.env.GH_TOKEN) {
        console.log('\n  No GH_TOKEN — printing review to stdout\n');
        console.log('─'.repeat(60));
        console.log(reviewMarkdown);
        console.log('─'.repeat(60));
        console.log('\n  Add GH_TOKEN to .env to post to GitHub');
        return;
    }

    // Write to temp file — avoids shell escaping with backticks and quotes
    const tmpFile = join(tmpdir(), `pr-review-${prNumber}-${Date.now()}.md`);

    try {
        writeFileSync(tmpFile, reviewMarkdown, 'utf8');

        const cmd = `gh pr review ${prNumber} --${action} --body-file "${tmpFile}"`;
        console.log(`  Running: ${cmd}`);

        execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
        console.log(`  Posted to PR #${prNumber} — action: ${action}`);

    } catch (err) {
        const stderr = err.stderr?.toString() || err.message;
        console.error('\nFailed to post review:');
        console.error(stderr);

        // Print review so it is not lost
        console.log('\n--- Review (save this manually) ---');
        console.log(reviewMarkdown);
        console.log('--- End ---');

        process.exit(1);

    } finally {
        if (existsSync(tmpFile)) {
            try { unlinkSync(tmpFile); } catch { }
        }
    }
}