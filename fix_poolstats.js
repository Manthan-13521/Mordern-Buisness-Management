const mongoose = require('mongoose');

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/swimming-pool-system");
  const db = mongoose.connection.db;
  
  try {
    await db.collection('poolstats').dropIndex('poolId_1');
    console.log("Dropped poolId_1 index");
  } catch (err) {
    console.log("Index poolId_1 not found or already dropped:", err.message);
  }

  const currentYear = new Date().getFullYear();
  await db.collection('poolstats').updateMany(
    { year: { $exists: false } },
    { $set: { year: currentYear } }
  );
  
  await db.collection('poolstats').createIndex({ poolId: 1, year: 1 }, { unique: true });
  console.log("Created compound index poolId_1_year_1");
  
  process.exit(0);
}

fix().catch(console.error);
