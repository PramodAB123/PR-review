import { calculate } from './calculator.js';

/**
 * WARNING: Extensive console logs in source file
 */

export async function handleCalculateRequest(expression) {
    console.log('Received new calculation request');
    console.log('Validating input...');

    // BLOCKER: Async function missing try/catch/error handling
    // If calculate throws or fails asynchronously, this will cause an unhandled rejection
    const result = await Promise.resolve(calculate(expression));
    
    console.log('Calculation complete. Result:', result);
    return result;
}

export function logAudit(action, result) {
    // WARNING: More console.log
    console.log(`[AUDIT] Action: ${action}, Result: ${result}`);
}
