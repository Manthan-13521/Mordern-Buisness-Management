/**
 * Seed Test User for Load Testing
 * 
 * Creates or updates user: b@1.com / 625017172 / admin / BIZ001
 * 
 * Usage:
 *   node scripts/seed-test-user.js
 * 
 * Requires MONGODB_URI in .env.local
 */

const bcrypt = require ? require : null;

async function main() {
  // Dynamic import for ESM compatibility
  const mongoose = await import('mongoose');
  const bcryptjs = await import('bcryptjs');
  
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swimming-pool-system';
  
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.default.connect(MONGODB_URI);
  console.log('✅ Connected');

  const UserSchema = new mongoose.default.Schema({
    name: String,
    email: { type: String, unique: true },
    passwordHash: String,
    role: String,
    businessId: String,
    poolId: String,
    hostelId: String,
    isActive: { type: Boolean, default: true },
    subscription: {
      plan: String,
      expiryDate: Date,
    },
  }, { collection: 'users', timestamps: true });

  const User = mongoose.default.models.User || mongoose.default.model('User', UserSchema);

  const email = 'b@1.com';
  const password = '625017172';
  const role = 'admin';
  const businessId = 'BIZ001';

  const passwordHash = await bcryptjs.default.hash(password, 12);

  const existing = await User.findOne({ email });

  if (existing) {
    console.log('📝 User exists. Updating password, role, businessId...');
    existing.passwordHash = passwordHash;
    existing.role = role;
    existing.businessId = businessId;
    existing.isActive = true;
    await existing.save();
    console.log('✅ User updated:', {
      email,
      role,
      businessId,
      id: existing._id.toString(),
    });
  } else {
    console.log('🆕 Creating new user...');
    const user = await User.create({
      name: 'Load Test Admin',
      email,
      passwordHash,
      role,
      businessId,
      isActive: true,
    });
    console.log('✅ User created:', {
      email,
      role,
      businessId,
      id: user._id.toString(),
    });
  }

  await mongoose.default.disconnect();
  console.log('🔌 Disconnected');
}

main().catch(e => {
  console.error('❌ Failed:', e.message);
  process.exit(1);
});
