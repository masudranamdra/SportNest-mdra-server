require('dotenv').config();
const { MongoClient } = require('mongodb');

const pairs = [
  ['users', 'user'],
  ['sessions', 'session'],
  ['accounts', 'account'],
];

const copyCollection = async (db, fromName, toName) => {
  const collections = await db.listCollections().toArray();
  const names = new Set(collections.map((collection) => collection.name));

  if (!names.has(fromName)) {
    return { fromName, toName, copied: 0, skipped: 0, missing: true };
  }

  await db.createCollection(toName).catch((error) => {
    if (error.codeName !== 'NamespaceExists') throw error;
  });

  const source = db.collection(fromName);
  const target = db.collection(toName);
  const docs = await source.find({}).toArray();
  let copied = 0;
  let skipped = 0;

  for (const doc of docs) {
    const existing = await target.findOne(
      toName === 'user' && doc.email ? { $or: [{ _id: doc._id }, { email: doc.email }] } : { _id: doc._id }
    );

    if (existing) {
      skipped += 1;
      continue;
    }

    await target.insertOne(doc);
    copied += 1;
  }

  return { fromName, toName, copied, skipped, missing: false };
};

const ensureIndexes = async (db) => {
  await db.collection('user').createIndex({ email: 1 }, { unique: true });
  await db.collection('session').createIndex(
    { token: 1 },
    { unique: true, sparse: true }
  );
  await db.collection('session').createIndex(
    { tokenHash: 1 },
    { unique: true, sparse: true }
  );
  await db.collection('session').createIndex({ userId: 1 });
  await db.collection('session').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection('account').createIndex({ userId: 1 });
  await db.collection('bookings').dropIndex('facility_id_1_booking_date_1_time_slot_1_status_1').catch((error) => {
    if (error.codeName !== 'IndexNotFound') throw error;
  });
  await db.collection('bookings').createIndex(
    { facility_id: 1, booking_date: 1, time_slot: 1 },
    {
      unique: true,
      partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } },
    }
  );
};

const main = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  try {
    const db = client.db(process.env.MONGODB_DB || undefined);
    const results = [];

    for (const [fromName, toName] of pairs) {
      results.push(await copyCollection(db, fromName, toName));
    }

    await ensureIndexes(db);

    if (process.env.DROP_LEGACY_AUTH_COLLECTIONS === 'true') {
      for (const [fromName] of pairs) {
        await db.collection(fromName).drop().catch((error) => {
          if (error.codeName !== 'NamespaceNotFound') throw error;
        });
      }
    }

    console.table(results);
    console.log('Auth collection migration complete.');
  } finally {
    await client.close();
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
