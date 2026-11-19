import { Router } from "express";
import { ObjectId } from "mongodb";
import { getCollections } from "../db.js";

const router = Router();

// শুধু approved আর active পোস্ট public এ দেখাবে
const PUBLIC_QUERY = { approvalStatus: "approved", isActive: true };

// regex এর বিশেষ চিহ্ন escape করা (search সুরক্ষিত রাখার জন্য)
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /tuitions/filters  -> ড্রপডাউনের জন্য subject আর class level এর তালিকা
router.get("/filters", async (req, res) => {
  try {
    const { tuitions } = await getCollections();
    const subjects = await tuitions.distinct("subject", PUBLIC_QUERY);
    const classLevels = await tuitions.distinct("classLevel", PUBLIC_QUERY);
    res.send({
      subjects: subjects.sort(),
      classLevels: classLevels.sort(),
      modes: ["Online", "Offline"],
    });
  } catch (err) {
    res.status(500).send({ message: "Failed to load filters" });
  }
});

// GET /tuitions?search=&subject=&classLevel=&mode=&sort=&page=&limit=
router.get("/", async (req, res) => {
  try {
    const { tuitions } = await getCollections();
    const { search, subject, classLevel, mode, sort } = req.query;

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 9, 1), 50);

    const query = { ...PUBLIC_QUERY };

    // Server-side search (title বা subject)
    if (search && search.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), "i");
      query.$or = [{ title: regex }, { subject: regex }];
    }

    // Server-side filter
    if (subject) query.subject = subject;
    if (classLevel) query.classLevel = classLevel;
    if (mode === "Online" || mode === "Offline") query.mode = mode;

    // Sort
    let sortBy = { createdAt: -1 };
    if (sort === "fee-low") sortBy = { monthlyFee: 1 };
    if (sort === "fee-high") sortBy = { monthlyFee: -1 };

    const total = await tuitions.countDocuments(query);
    const data = await tuitions
      .find(query)
      .sort(sortBy)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    res.send({
      tuitions: data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).send({ message: "Failed to load tuitions" });
  }
});

// GET /tuitions/:id  -> একটা tuition এর বিস্তারিত
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid tuition id" });
    }

    const { tuitions } = await getCollections();
    const tuition = await tuitions.findOne({
      _id: new ObjectId(id),
      ...PUBLIC_QUERY,
    });

    if (!tuition) {
      return res.status(404).send({ message: "Tuition not found" });
    }
    res.send(tuition);
  } catch (err) {
    res.status(500).send({ message: "Failed to load tuition" });
  }
});

export default router;