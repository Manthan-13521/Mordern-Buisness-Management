const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/aqua-sync";

async function run() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db();
        const collection = db.collection('businesstransactions');
        const latest = await collection.findOne({ category: 'SALE' }, { sort: { createdAt: -1 } });
        console.log("LAST_SALE_RECORD:", JSON.stringify(latest));
    } finally {
        await client.close();
    }
}
run().catch(console.dir);
