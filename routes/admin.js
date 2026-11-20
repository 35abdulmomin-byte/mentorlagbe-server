import { Router } from "express";
import { ObjectId } from "mongodb";
import { getCollections } from "../db.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = Router();

// এই router এর সব রুট শুধু admin এর জন্য
router.use(verifyToken, verifyAdmin);

const ROLES = ["student", "tutor", "admin"];

// BetterAuth এর _id ObjectId বা string যেকোনোটা হতে পারে, দুটোই মেলানো
const idFilter = (id) =>
  ObjectId.isValid(id)
    ? { $or: [{ _id: new ObjectId(id) }, { _id: id }] }
    : { _id: id };

// GET /admin/stats
router.get("/stats", async (req, res) => {
  try {
    const { users, tuitions, payments } = await getCollections();

    const [totalUsers, totalTutors, pending, approved, revenueAgg] =
      await Promise.all([
        users.countDocuments({}),
        users.countDocuments({ role: "tutor" }),
        tuitions.countDocuments({ approvalStatus: "pending" }),
        tuitions.countDocuments({ approvalStatus: "approved" }),
        payments
          .aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }])
          .toArray(),
      ]);

    res.send({
      totalUsers,
      totalTutors,
      pendingTuitions: pending,
      approvedTuitions: approved,
      revenue: revenueAgg[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).send({ message: "Failed to load stats" });
  }
});

// GET /admin/users
router.get("/users", async (req, res) => {
  try {
    const { users } = await getCollections();
    const data = await users
      .find(
        {},
        {
          projection: {
            name: 1,
            email: 1,
            image: 1,
            role: 1,
            plan: 1,
            phone: 1,
            createdAt: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: "Failed to load users" });
  }
});

// PATCH /admin/users/:id/role
router.patch("/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!ROLES.includes(role)) {
      return res.status(400).send({ message: "Invalid role" });
    }

    const { users } = await getCollections();
    const target = await users.findOne(idFilter(id));
    if (!target) {
      return res.status(404).send({ message: "User not found" });
    }

    // নিজের role বদলে নিজেকে admin থেকে নামানো আটকানো
    if (target.email === req.user.email) {
      return res
        .status(400)
        .send({ message: "নিজের role নিজে বদলানো যায় না" });
    }

    await users.updateOne(
      { _id: target._id },
      { $set: { role, updatedAt: new Date() } }
    );
    res.send({ updated: true, role });
  } catch (err) {
    res.status(500).send({ message: "Failed to update role" });
  }
});

// GET /admin/tuitions?status=pending|approved|rejected
router.get("/tuitions", async (req, res) => {
  try {
    const { tuitions } = await getCollections();
    const { status } = req.query;

    const query = {};
    if (["pending", "approved", "rejected"].includes(status)) {
      query.approvalStatus = status;
    }

    const data = await tuitions.find(query).sort({ createdAt: -1 }).toArray();
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: "Failed to load tuitions" });
  }
});

// PATCH /admin/tuitions/:id/approval
router.patch("/tuitions/:id/approval", async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid tuition id" });
    }
    if (approvalStatus !== "approved" && approvalStatus !== "rejected") {
      return res
        .status(400)
        .send({ message: "approvalStatus approved বা rejected হতে হবে" });
    }

    const { tuitions } = await getCollections();
    const result = await tuitions.updateOne(
      { _id: new ObjectId(id) },
      { $set: { approvalStatus, reviewedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Tuition not found" });
    }
    res.send({ updated: true, approvalStatus });
  } catch (err) {
    res.status(500).send({ message: "Failed to update approval" });
  }
});

// GET /admin/transactions
router.get("/transactions", async (req, res) => {
  try {
    const { payments } = await getCollections();
    const data = await payments.find({}).sort({ paidAt: -1 }).toArray();
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: "Failed to load transactions" });
  }
});

export default router;