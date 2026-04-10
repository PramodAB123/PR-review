/**
 * Mock Database Layer
 */
const mockData = {
    history: [
        { id: 1, op: 'add', values: [1, 2], result: 3, userId: 'user_01' },
        { id: 2, op: 'mult', values: [5, 4], result: 20, userId: 'user_02' },
        { id: 3, op: 'div', values: [10, 2], result: 5, userId: 'user_01' },
    ],
    users: {
        'user_01': { name: 'Alice', role: 'admin' },
        'user_02': { name: 'Bob', role: 'user' }
    }
};

/**
 * Mocks fetching a user from a database
 */
async function fetchUser(userId) {
    // Simulate DB delay
    return new Promise(resolve => setTimeout(() => resolve(mockData.users[userId]), 10));
}

/**
 * WARNING: N+1 query pattern
 * Fetches history and then fetches user details for each history item one by one.
 */
export async function getHistoryWithUserNames() {
    console.log('Fetching calculation history...');
    const history = mockData.history;

    // N+1 Pattern: We fetch history (1) and then fetch each user (N) individually
    for (const item of history) {
        const user = await fetchUser(item.userId);
        item.userName = user ? user.name : 'Unknown';
    }

    return history;
}
