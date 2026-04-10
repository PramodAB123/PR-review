import { handleCalculateRequest } from './api.js';
import { getHistoryWithUserNames } from './db.js';
import { CONFIG } from './config.js';

async function main() {
    console.log(`--- Starting Calculator App on port ${CONFIG.PORT} ---`);

    // Example 1: Calculation
    const expr = '2 + 2 * (10 / 5)';
    console.log(`Processing: ${expr}`);
    const result = await handleCalculateRequest(expr);
    console.log('Final Outcome:', result);

    // Example 2: DB History (N+1 demonstration)
    console.log('\n--- Calculation History ---');
    const history = await getHistoryWithUserNames();
    history.forEach(item => {
        console.log(`ID: ${item.id}, Op: ${item.op}, Result: ${item.result}, User: ${item.userName}`);
    });
}

main();
