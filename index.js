import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { connectDB } from "./db.js";
import { auth } from "./auth.js";
import { verifyToken } from "./middleware/auth.js";
import tuitionsRouter from "./routes/tuitions.js";
import applicationsRouter from "./routes/applications.js";
import statsRouter from "./routes/stats.js";
import usersRouter from "./routes/users.js";

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  })
);

// BetterAuth হ্যান্ডলার (অবশ্যই express.json() এর আগে)
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

// লগইনের পর client এই রুট থেকে JWT নেবে
app.post("/jwt", async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      console.error("[/jwt] JWT_SECRET .env এ নেই");
      return res.status(500).send({ message: "Server JWT_SECRET missing" });
    }

    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      console.error(
        "[/jwt] session পাওয়া যায়নি, cookie header:",
        req.headers.cookie ? "আছে" : "নেই"
      );
      return res.status(401).send({ message: "No active session" });
    }

    const token = jwt.sign(
      { email: session.user.email, role: session.user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.send({ token });
  } catch (err) {
    console.error("[/jwt] error:", err);
    res.status(500).send({ message: "Failed to create token" });
  }
});

// টেস্টের জন্য প্রোটেক্টেড রুট
app.get("/me", verifyToken, (req, res) => {
  res.send({ user: req.user });
});

// API routes
app.use("/tuitions", tuitionsRouter);
app.use("/applications", applicationsRouter);
app.use("/stats", statsRouter);
app.use("/users", usersRouter);

app.get("/", (req, res) => {
  res.send("MentorLagbe server is running");
});

connectDB()
  .then(() => {
    app.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch((err) => console.error("DB connection failed:", err));