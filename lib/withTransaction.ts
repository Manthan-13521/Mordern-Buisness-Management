import mongoose from "mongoose";

/**
 * Executes a callback within a MongoDB transaction if the server supports it
 * (replica set / mongos). Falls back to running without a transaction on
 * standalone servers (typical local dev).
 *
 * This keeps production data safe (atomic rollback) while letting devs run
 * against a plain `mongod` without errors.
 *
 * @param fn  Receives a `ClientSession | null`.  Pass the session to every
 *            Mongoose write inside the callback.  When `null`, writes run
 *            without a session (no transaction).
 */
export async function withTransaction<T>(
  fn: (session: mongoose.ClientSession | null) => Promise<T>
): Promise<T> {
  const conn = mongoose.connection;

  // ── Detect replica-set / mongos support ──────────────────────────────
  let supportsTransactions = false;
  try {
    const admin = conn.db!.admin();
    const info = await admin.serverStatus();
    // A replica-set member exposes `repl`, mongos exposes `process: 'mongos'`
    supportsTransactions =
      !!info.repl || info.process === "mongos";
  } catch {
    // Permissions or standalone — fall through to non-transactional path
  }

  if (!supportsTransactions) {
    // ── Standalone: run without a session ───────────────────────────────
    return fn(null);
  }

  // ── Replica set / Atlas: full ACID transaction ───────────────────────
  const session = await conn.startSession();
  session.startTransaction();
  try {
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}
