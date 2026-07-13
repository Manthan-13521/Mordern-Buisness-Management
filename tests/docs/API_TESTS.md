# API Tests Documentation

## Purpose
This document describes the API test patterns, conventions, and architecture used across the AquaSync test suite.

## Test File Header Template

Every test file must begin with a header comment block:

```
/*
 * ========================================================================
 * [TEST FILE NAME]
 * ========================================================================
 *
 * Purpose:
 *   [What is being tested]
 *
 * Expected Behavior:
 *   [Expected outcomes]
 *
 * Required Environment Variables:
 *   [Variables needed]
 *
 * Required Test Data:
 *   [Data prerequisites]
 *
 * How to Execute:
 *   [Command to run]
 *
 * Expected Output:
 *   [What the output looks like]
 *
 * Success Criteria:
 *   [What constitutes success]
 *
 * Failure Criteria:
 *   [What constitutes failure]
 *
 * Related APIs:
 *   [Related endpoint paths]
 *
 * Related Collections:
 *   [Database collections used]
 *
 * Related Middleware:
 *   [Middleware that processes these requests]
 *
 * Related Business Flow:
 *   [Cross-reference to business flow]
 *
 * Estimated Execution Time: [time]
 * Author: [name]
 * Last Updated: [date]
 * ========================================================================
 */
```

## Test Utilities

### TestClient
```typescript
import { TestClient, TEST_USERS } from "../../helpers";

const client = new TestClient();
await client.login(TEST_USERS.poolAdmin);
const res = await client.get("/api/members");
const res = await client.post("/api/members", { name: "Test", phone: "123" });
const res = await client.put("/api/members/[id]", { name: "Updated" });
const res = await client.del("/api/members/[id]");
```

### TestRunner
```typescript
import { TestRunner } from "../../helpers";

const runner = new TestRunner();
await runner.run("Suite Name", [
  { name: "Test name", fn: async () => { /* test logic */ } },
]);
const summary = runner.summary();
```

### Pattern: Test Status Codes

```typescript
// Success
if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);

// Rejection (validation)
if (res.status === 200) throw new Error("Empty name should be rejected");

// Auth required
if (res.status !== 401 && res.status !== 302) throw new Error("Auth required");
```

### Pattern: Parse Response
```typescript
const data = await res.json();
if (!data._id) throw new Error("No ID returned");
```

## Test Categories

| Category | Description | Pattern |
|----------|-------------|---------|
| Positive | Valid input, expected success | `status === 200` |
| Negative | Invalid input, expected rejection | `status !== 200` |
| Auth | Different roles, unauthenticated | `status === 401/403` |
| Tenant | Cross-tenant access | `status === 401/403` |
| Edge | Nulls, extremes, special chars | Varies |
| Security | Injection, XSS, CSRF | Varies |

## Assertion Patterns

```typescript
// Simple status check
if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);

// Response shape
const data = await res.json();
if (!data.user) throw new Error("User field missing");
if (data.user.role !== "admin") throw new Error(`Wrong role: ${data.user.role}`);

// Array response
if (!Array.isArray(data)) throw new Error("Expected array");
if (data.length === 0) console.log("[INFO] Empty array");

// Graceful check (non-fatal)
if (res.status === 429) console.log("[INFO] Rate limited");
```
