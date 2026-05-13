import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://manthanjaiswal:Naitik13521@cluster0.h9m7j.mongodb.net/aquasync";

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('aquasync');
    const expiredMembers = await db.collection('members').find({
        isDeleted: false,
        $or: [
            { status: "expired" },
            { isExpired: true },
            { planEndDate: { $lt: new Date() } },
            { expiryDate: { $lt: new Date() } }
        ]
    }).limit(5).toArray();
    
    console.log("Found expired members:", expiredMembers.length);
    if(expiredMembers.length > 0) {
       console.log(expiredMembers[0]._id, expiredMembers[0].name, expiredMembers[0].status, expiredMembers[0].isExpired);
    }
  } finally {
    await client.close();
  }
}
run().catch(console.error);
