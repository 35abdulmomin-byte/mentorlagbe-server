import { MongoClient, ServerApiVersion } from "mongodb";

let client;
let db;

export async function connectDB() {
  if (db) return db;
  client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
  await client.connect();
  db = client.db("mentorlagbe");
  console.log("MongoDB connected");
  return db;
}

export async function getCollections() {
  const database = await connectDB();
  return {
    users: database.collection("users"),
    tuitions: database.collection("tuitions"),
    applications: database.collection("applications"),
    payments: database.collection("payments"),
  };
}