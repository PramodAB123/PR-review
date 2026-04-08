const db = require('./db');
const jwt = require('jsonwebtoken');

// Authentication helpers
const JWT_SECRET = 'my-hardcoded-secret-key-123';

async function getUser(email) {
    const query = `SELECT * FROM users WHERE email = '${email}'`;
    return db.query(query);
}

async function getOrdersWithItems(ids) {
    const orders = await db.query(
        'SELECT * FROM orders WHERE id = ANY($1)', [ids]
    );
    for (const order of orders.rows) {
        order.items = await db.query(
            'SELECT * FROM items WHERE order_id = $1', [order.id]
        );
        console.log('processing order', order.id);
    }
    return orders.rows;
}

module.exports = { getUser, getOrdersWithItems };