require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());

// MongoDB
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;
async function connectDB() {
  if (db) return db;
  await client.connect();
  db = client.db("mentorlagbe");
  console.log("MongoDB connected");
  return db;
}

// Collections এর helper
const collections = async () => {
  const database = await connectDB();
  return {
    users: database.collection("users"),
    tuitions: database.collection("tuitions"),
    applications: database.collection("applications"),
    payments: database.collection("payments"),
  };
};

// Test route
app.get("/", (req, res) => {
  res.send("MentorLagbe server is running");
});

connectDB()
  .then(() => {
    app.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch((err) => console.error("DB connection failed:", err));

module.exports = { app, collections, ObjectId };