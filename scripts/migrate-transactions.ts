import mongoose from 'mongoose';
import { BusinessSale } from '../models/BusinessSale';
import { BusinessPayment } from '../models/BusinessPayment';
import { BusinessTransaction } from '../models/BusinessTransaction';

async function migrate() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.error('MONGODB_URI is not defined');
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const sales = await BusinessSale.find({});
    console.log(`Found ${sales.length} sales`);

    const payments = await BusinessPayment.find({});
    console.log(`Found ${payments.length} payments`);

    let count = 0;

    for (const s of sales) {
      await BusinessTransaction.updateOne(
        { 
          customerId: s.customerId, 
          businessId: s.businessId, 
          date: s.date, 
          amount: s.totalAmount, 
          category: 'SALE' 
        },
        {
          customerId: s.customerId,
          businessId: s.businessId,
          date: s.date,
          category: 'SALE',
          transactionType: (s as any).saleType || 'sent',
          amount: s.totalAmount,
          items: s.items,
          transportationCost: s.transportationCost,
          createdAt: (s as any).createdAt,
          updatedAt: (s as any).updatedAt
        },
        { upsert: true }
      );
      count++;
      if (count % 10 === 0) console.log(`Migrated ${count} entries...`);
    }

    for (const p of payments) {
      await BusinessTransaction.updateOne(
        { 
          customerId: p.customerId, 
          businessId: p.businessId, 
          date: p.date, 
          amount: p.amount, 
          category: 'PAYMENT' 
        },
        {
          customerId: p.customerId,
          businessId: p.businessId,
          date: p.date,
          category: 'PAYMENT',
          transactionType: (p as any).paymentType || 'received',
          amount: p.amount,
          paymentMethod: p.type,
          notes: p.notes,
          createdAt: (p as any).createdAt,
          updatedAt: (p as any).updatedAt
        },
        { upsert: true }
      );
      count++;
      if (count % 10 === 0) console.log(`Migrated ${count} entries...`);
    }

    console.log(`Successfully migrated ${count} entries in total.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
