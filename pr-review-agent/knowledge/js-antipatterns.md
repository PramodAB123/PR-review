# JavaScript Anti-Patterns

## N+1 Query Pattern

### What it is
A database call inside a loop. For 100 items this runs 101 queries.
Works in dev, collapses in production.

### Vulnerable — flag as WARNING
```js
for (const order of orders) {
  order.user = await db.query(
    'SELECT * FROM users WHERE id = $1', [order.userId]
  );
}

orders.forEach(async (order) => {
  order.items = await Item.findAll({ where: { orderId: order.id } });
});
```

### Fix
```js
const userIds = orders.map(o => o.userId);
const users = await db.query(
  'SELECT * FROM users WHERE id = ANY($1)', [userIds]
);
const userMap = Object.fromEntries(users.rows.map(u => [u.id, u]));
orders.forEach(o => { o.user = userMap[o.userId]; });
```

---

## Empty Catch Block

### Vulnerable — flag as WARNING
```js
try {
  await sendEmail(user.email);
} catch (err) {}

try {
  await processPayment(amount);
} catch (err) {
  // TODO handle later
}
```

### Fix
```js
try {
  await sendEmail(user.email);
} catch (err) {
  logger.error('Email failed:', { userId: user.id, err: err.message });
}
```

---

## Sync Operations in Request Handler

### Vulnerable — flag as WARNING
```js
app.get('/config', (req, res) => {
  const data = fs.readFileSync('./config.json', 'utf8');
  res.json(JSON.parse(data));
});
```

### Fix
```js
app.get('/config', async (req, res) => {
  const data = await fs.promises.readFile('./config.json', 'utf8');
  res.json(JSON.parse(data));
});
```

---

## console.log in Production Code

### Vulnerable — flag as WARNING
Any console.log(), console.debug(), console.info() in src/ files.

### Why
Floods logs, leaks internal data, hides real errors.

### Fix
Replace with a proper logger like winston or pino.