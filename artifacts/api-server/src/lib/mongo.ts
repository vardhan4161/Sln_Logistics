import { MongoClient, type Db } from "mongodb";
import { logger } from "./logger.js";
import { seedLocations, seedRoutes, seedVehicles } from "./seed-data.js";

let client: MongoClient | null = null;
let db: Db | null = null;

type CounterDocument = {
  _id: string;
  seq: number;
};

export async function connectMongo(): Promise<Db> {
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI environment variable is required for MongoDB connection.",
    );
  }

  if (!client) {
    client = new MongoClient(uri, {
      serverApi: {
        version: "1",
        strict: true,
        deprecationErrors: true,
      },
    });
  }

  await client.connect();
  db = client.db();

  await Promise.all([
    db.collection("counters").createIndex({ _id: 1 }),
    db.collection("locations").createIndex({ id: 1 }, { unique: true }),
    db.collection("locations").createIndex({ name: 1 }, { unique: true }),
    db.collection("vehicles").createIndex({ id: 1 }, { unique: true }),
    db.collection("vehicles").createIndex({ vehicle_no: 1 }, { unique: true }),
    db.collection("routes").createIndex({ id: 1 }, { unique: true }),
    db.collection("routes").createIndex(
      { from_location: 1, to_location: 1, weight_mt: 1 },
      { unique: true },
    ),
    db.collection("invoice_sequences").createIndex(
      { month_key: 1 },
      { unique: true },
    ),
    db.collection("trips").createIndex({ id: 1 }, { unique: true }),
    db.collection("trips").createIndex({ serial_no: -1 }),
  ]);

  await seedMongo(db);

  logger.info({ uri: uri.replace(/^(mongodb\+srv:\/\/[^:]+):.*@/, "$1:*****@") }, "Connected to MongoDB");

  return db;
}

export function getDb(): Db {
  if (!db) throw new Error("Database not connected");
  return db;
}

export async function nextNumericId(name: string): Promise<number> {
  const result = await getDb().collection<CounterDocument>("counters").findOneAndUpdate(
    { _id: name as any },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true },
  );

  if (!result || !result.seq) {
    throw new Error(`Failed to generate sequence for ${name}`);
  }

  return result.seq;
}

async function seedMongo(db: Db) {
  const locationsCount = await db.collection("locations").countDocuments();
  if (locationsCount === 0) {
    logger.info("Seeding locations...");
    const docs = seedLocations.map((name: any, index: any) => ({
      id: index + 1,
      name,
    }));
    await db.collection("locations").insertMany(docs);
    await db.collection("counters").updateOne(
      { _id: "location_id" as any },
      { $set: { seq: seedLocations.length } },
      { upsert: true }
    );
  }

  const vehiclesCount = await db.collection("vehicles").countDocuments();
  if (vehiclesCount === 0) {
    logger.info("Seeding vehicles...");
    const docs = seedVehicles.map((vehicle_no: any, index: any) => ({
      id: index + 1,
      vehicle_no,
    }));
    await db.collection("vehicles").insertMany(docs);
    await db.collection("counters").updateOne(
      { _id: "vehicle_id" as any },
      { $set: { seq: seedVehicles.length } },
      { upsert: true }
    );
  }

  const routesCount = await db.collection("routes").countDocuments();
  if (routesCount === 0) {
    logger.info("Seeding routes...");
    const docs = seedRoutes.map((route: any, index: any) => ({
      id: index + 1,
      ...route,
    }));
    await db.collection("routes").insertMany(docs);
    await db.collection("counters").updateOne(
      { _id: "route_id" as any },
      { $set: { seq: seedRoutes.length } },
      { upsert: true }
    );
  }
}
