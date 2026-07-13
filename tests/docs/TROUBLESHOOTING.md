# Troubleshooting Guide

## Common Issues and Solutions

### Dev Server Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `EADDRINUSE:3000` | Port already in use | `lsof -ti:3000 \| xargs kill -9` |
| `MODULE_NOT_FOUND` | Dependencies not installed | `npm install` |
| `NextAuth missing secret` | No NEXTAUTH_SECRET | Add to `.env.local`: `openssl rand -base64 32` |
| `MongoDB connection refused` | MongoDB not running | `brew services start mongodb-community` |
| `MongooseError: pool closed` | Connection pool exhausted | Reduce VUs or increase pool size |
| `Redis connection failed` | Redis not configured | Falls back to in-memory (graceful) |

### Test Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| All tests fail with 401 | Dev server not running | `npm run dev` |
| Auth tests fail | Test users not seeded | Run seed script |
| Rate limited during tests | Previous test runs | Wait 15 min or restart server |
| `Cannot find module 'typescript'` | tsx not installed | `npm install -g tsx` or `npx tsx` |
| k6 not found | k6 not installed | `brew install k6` |
| Tests timeout | DB slow or under load | Increase timeout or reduce VUs |
| `ECONNREFUSED` on port 3000 | Server not started | `npm run dev` and wait for ready |
| Random 500 errors | DB disconnected | Check `mongosh` connection |
| Edge test fails on unicode | DB collation issue | Verify UTF-8 support in MongoDB |

### Database Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `MongoServerError: Authentication failed` | Wrong credentials | Check MONGODB_URI in .env.local |
| `MongooseError: Operation timed out` | Slow query | Check indexes or reduce load |
| `MongoBulkWriteError: E11000 duplicate key` | Duplicate insert | Check idempotency key handling |
| Collection not found | Seeding not run | Run seed script first |
| `Transaction numbers only allowed on replica sets` | No replica set | Use single writes or set up replica set |

### Performance Test Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| P95 spikes during soak | Memory leak | Monitor with `--out json` and analyze |
| Error rate jumps at VU threshold | Connection pool limit | Increase mongoose poolSize |
| k6 OOM during stress | Too many VUs | Reduce max VUs or add think time |
| Results not comparable | Different hardware | Always note environment in reports |
| Thresholds failing consistently | App needs optimization | See recommendations in certification report |

## Debugging Tests

```bash
# Run single test with verbose output
npx tsx tests/api/auth/auth.test.ts 2>&1

# Check if dev server is running
curl -s http://localhost:3000/api/health | head -c 200

# Check MongoDB
mongosh swimming-pool-system --eval "db.users.count()"

# Check Redis (if configured)
redis-cli ping

# Trace request flow
curl -v http://localhost:3000/api/members?limit=1

# Monitor server logs in real-time
npm run dev 2>&1 | grep -E "error|Error|Error:"
```

## Getting Help

If you encounter an issue not listed here:
1. Check the error logs in the terminal running the dev server
2. Check MongoDB logs: `tail -f /usr/local/var/log/mongodb/mongo.log`
3. Run with verbose output: `NODE_ENV=development npx tsx tests/runner.ts`
4. Check Sentry (if configured) for server-side errors
5. Review the test file header comments for specific prerequisites
