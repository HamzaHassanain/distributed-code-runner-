import { MongoClient, Db } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://mongodb:27017/runner_db";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }

  db = client.db();
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

export async function ensureIndexes(): Promise<void> {
  const database = await getDatabase();
  const usersCollection = database.collection("users");

  await usersCollection.createIndex({ email: 1 }, { unique: true });
}
