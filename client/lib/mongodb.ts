import { MongoClient } from 'mongodb';

// Connection URI from environment variables
const uri = process.env.MONGODB_URI;
const dbName = 'adhyayanai';

let cachedClient: MongoClient | null = null;
let cachedDb: any = null;

if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

export async function connectToDatabase() {
  // If we already have a connection, use it
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // Create a new connection
  try {
    const client = await MongoClient.connect(uri!);
    const db = client.db(dbName);

    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

// Helper for development mode when no MongoDB is available
export function getMockDb() {
  return {
    collection: (collectionName: string) => ({
      insertOne: async (data: any) => {
        console.log(`[MOCK DB] Would insert into ${collectionName}:`, data);
        return { 
          insertedId: `mock-id-${Date.now()}`,
          acknowledged: true
        };
      },
      findOne: async (query: any) => {
        console.log(`[MOCK DB] Would query ${collectionName} with:`, query);
        return null;
      },
      updateOne: async (query: any, update: any) => {
        console.log(`[MOCK DB] Would update ${collectionName} with query:`, query);
        console.log(`[MOCK DB] Update operations:`, update);
        return {
          matchedCount: 1,
          modifiedCount: 1,
          acknowledged: true
        };
      }
    })
  };
}
