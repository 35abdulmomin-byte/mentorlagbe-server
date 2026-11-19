import { Router } from "express";
import { getCollections } from "../db.js";
import { verifyToken, verifyStudent } from "../middleware/auth.js";

const router = Router();

// GET /stats/student  -> student dashboard এর stats
router.get("/student", verifyToken, verifyStudent, async (req, res) => {
  try {
    const { applications, users } = await getCollections();
    const email = req.user.email;

    const [total, accepted, pending, user] = await Promise.all([
      applications.countDocuments({ studentEmail: email }),
      applications.countDocuments({ studentEmail: email, status: "accepted" }),
      applications.countDocuments({ studentEmail: email, status: "pending" }),
      users.findOne({ email }, { projection: { plan: 1 } }),
    ]);

    res.send({ total, accepted, pending, plan: user?.plan || "free" });
  } catch (err) {
    res.status(500).send({ message: "Failed to load stats" });
  }
});

export default router;