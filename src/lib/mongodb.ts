import { MongoClient, type Db } from "mongodb";

// Fail fast when the server is down: the app shows a clear message after 3 s
// instead of waiting the driver's default 30 s.
const options = { serverSelectionTimeoutMS: 3000 };

// Singleton: one client for the whole app. In development Next.js reloads
// modules on every change, so we keep the client on `globalThis` to avoid
// opening a new connection on each reload.
const globalForMongo = globalThis as unknown as { mongoClient?: MongoClient };

function getClient(): MongoClient {
  if (globalForMongo.mongoClient) {
    return globalForMongo.mongoClient;
  }

  // Local MongoDB (Community Server). Defined in .env.local, see .env.example.
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI in .env.local (e.g. mongodb://127.0.0.1:27017/dh)");
  }

  const client = new MongoClient(uri, options);
  globalForMongo.mongoClient = client;
  return client;
}

// The database name comes from the URI path (".../dh").
export function getDb(): Db {
  return getClient().db();
}

// Closes the connection. Only scripts need it (a server keeps it open).
export async function closeDb(): Promise<void> {
  await globalForMongo.mongoClient?.close();
  globalForMongo.mongoClient = undefined;
}

// Returns true when the server answers, false otherwise. Never throws, so
// callers can show a friendly message instead of a broken page.
export async function isDbAvailable(): Promise<boolean> {
  try {
    await getDb().command({ ping: 1 });
    return true;
  } catch (error) {
    console.error("[mongodb] not available:", (error as Error).message);
    // A failed connection leaves the client closed. Drop it so the next call
    // creates a fresh one (e.g. after the MongoDB service is started).
    globalForMongo.mongoClient = undefined;
    return false;
  }
}
