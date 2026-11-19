import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("MentorLagbe server is running");
});

connectDB()
  .then(() => {
    app.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch((err) => console.error("DB connection failed:", err));