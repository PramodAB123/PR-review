/**
 * Basic calculator logic
 */
export function calculate(expression) {
    console.log(`Calculating: ${expression}`);

    // BLOCKER: Insecure use of eval() on unsanitized input
    try {
        const result = eval(expression); 
        return { success: true, result };
    } catch (error) {
        return { success: false, error: 'Invalid expression' };
    }
}

export function add(a, b) {
    return a + b;
}

export function subtract(a, b) {
    return a - b;
}
