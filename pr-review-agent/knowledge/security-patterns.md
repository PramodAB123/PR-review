# Security Patterns Reference

## SQL Injection

### Vulnerable — always flag as BLOCKER
```js
db.query(`SELECT * FROM users WHERE email = '${email}'`)
db.query("SELECT * FROM users WHERE id = " + userId)
knex.raw(`SELECT * FROM orders WHERE id = ${req.params.id}`)
sequelize.query(`SELECT * FROM users WHERE name = '${name}'`)
```

### Safe — do NOT flag
```js
db.query('SELECT * FROM users WHERE email = $1', [email])
db.query('SELECT * FROM users WHERE id = ?', [userId])
knex('users').where({ email })
User.findOne({ where: { email } })
```

### Fix
Replace string interpolation with parameterized query.
PostgreSQL: use $1, $2 placeholders.
MySQL: use ? placeholders.
ORMs handle it automatically when using their query builder.

---

## Hardcoded Secrets

### Variable names that always mean secret
SECRET, PASSWORD, PASS, KEY, TOKEN, API_KEY, PRIVATE_KEY,
JWT_SECRET, CLIENT_SECRET, WEBHOOK_SECRET, SIGNING_KEY,
DATABASE_URL when it contains credentials inline

### Vulnerable
```js
const JWT_SECRET = 'some-string';
const API_KEY = 'sk-abc123';
const DB_PASS = 'mypassword';
```

### Safe
```js
const JWT_SECRET = process.env.JWT_SECRET;
```

### Fix
```js
// Before
const JWT_SECRET = 'hardcoded-value';

// After
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET env var required');
```

---

## Missing Authentication

### Vulnerable — route with no auth middleware
```js
router.get('/api/users', async (req, res) => {
  const users = await User.findAll();
  res.json(users);
});
```

### Safe — auth middleware present
```js
router.get('/api/users', requireAuth, async (req, res) => {
  const users = await User.findAll();
  res.json(users);
});
```

---

## Unhandled Promise Rejection

### Vulnerable
```js
async function createUser(data) {
  const user = await User.create(data);
  await sendEmail(user.email);
  return user;
}
```

### Safe
```js
async function createUser(data) {
  try {
    const user = await User.create(data);
    await sendEmail(user.email);
    return user;
  } catch (err) {
    logger.error('createUser failed:', err);
    throw err;
  }
}
```