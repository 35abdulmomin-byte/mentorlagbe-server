import { Router } from "express";
import { ObjectId } from "mongodb";
import { getCollections } from "../db.js";
import { verifyToken, verifyTutor } from "../middleware/auth.js";

const router = Router();

// এই router এর সব রুট শুধু লগইন করা tutor এর জন্য
router.use(verifyToken, verifyTutor);

const FREE_LIMIT = 2;

// ফর্মের ডেটা যাচাই, ভুল থাকলে বার্তা ফেরত দেয়
const validate = (body) => {
  const {
    title,
    subject,
    classLevel,
    mode,
    location,
    monthlyFee,
    daysPerWeek,
    description,
    bannerImage,
  } = body;

  if (!title || title.trim().length < 5)
    return "Title কমপক্ষে ৫ অক্ষরের হতে হবে";
  if (!subject || subject.trim().length < 2) return "Subject দাও";
  if (!classLevel || classLevel.trim().length < 2) return "Class level দাও";
  if (mode !== "Online" && mode !== "Offline")
    return "Mode Online বা Offline হতে হবে";
  if (!location || location.trim().length < 2) return "Location দাও";

  const fee = Number(monthlyFee);
  if (!Number.isFinite(fee) || fee <= 0 || fee > 100000)
    return "Monthly fee সঠিক নয়";

  const days = Number(daysPerWeek);
  if (!Number.isInteger(days) || days < 1 || days > 7)
    return "Days per week ১ থেকে ৭ এর মধ্যে হতে হবে";

  if (!description || description.trim().length < 20)
    return "Description কমপক্ষে ২০ অক্ষরের হতে হবে";
  if (!bannerImage || !/^https?:\/\//i.test(bannerImage))
    return "Banner image দাও";

  return null;
};

// শুধু অনুমোদিত ফিল্ডগুলো নেওয়া (approvalStatus ইত্যাদি client থেকে আসবে না)
const clean = (body) => ({
  title: body.title.trim(),
  subject: body.subject.trim(),
  classLevel: body.classLevel.trim(),
  mode: body.mode,
  location: body.location.trim(),
  monthlyFee: Number(body.monthlyFee),
  daysPerWeek: Number(body.daysPerWeek),
  description: body.description.trim(),
  bannerImage: body.bannerImage,
});

// GET /tutor/stats
router.get("/stats", async (req, res) => {
  try {
    const { tuitions, applications, users } = await getCollections();
    const email = req.user.email;

    const [total, active, applicants, user] = await Promise.all([
      tuitions.countDocuments({ tutorEmail: email }),
      tuitions.countDocuments({
        tutorEmail: email,
        approvalStatus: "approved",
        isActive: true,
      }),
      applications.countDocuments({ tutorEmail: email }),
      users.findOne({ email }, { projection: { plan: 1 } }),
    ]);

    res.send({
      total,
      active,
      applicants,
      plan: user?.plan || "free",
      limit: user?.plan === "pro" ? null : FREE_LIMIT,
    });
  } catch (err) {
    res.status(500).send({ message: "Failed to load stats" });
  }
});

// GET /tutor/tuitions  -> নিজের সব tuition
router.get("/tuitions", async (req, res) => {
  try {
    const { tuitions } = await getCollections();
    const data = await tuitions
      .find({ tutorEmail: req.user.email })
      .sort({ createdAt: -1 })
      .toArray();
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: "Failed to load tuitions" });
  }
});

// GET /tutor/tuitions/:id  -> edit পেজের জন্য একটা tuition
router.get("/tuitions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid tuition id" });
    }
    const { tuitions } = await getCollections();
    const tuition = await tuitions.findOne({
      _id: new ObjectId(id),
      tutorEmail: req.user.email,
    });
    if (!tuition) {
      return res.status(404).send({ message: "Tuition not found" });
    }
    res.send(tuition);
  } catch (err) {
    res.status(500).send({ message: "Failed to load tuition" });
  }
});

// POST /tutor/tuitions  -> নতুন tuition (Free plan এ সর্বোচ্চ ২টা)
router.post("/tuitions", async (req, res) => {
  try {
    const error = validate(req.body);
    if (error) return res.status(400).send({ message: error });

    const { tuitions, users } = await getCollections();
    const tutor = await users.findOne({ email: req.user.email });
    if (!tutor) {
      return res.status(404).send({ message: "User not found" });
    }

    if (tutor.plan !== "pro") {
      const count = await tuitions.countDocuments({
        tutorEmail: tutor.email,
      });
      if (count >= FREE_LIMIT) {
        return res.status(403).send({
          message: `Free plan এ সর্বোচ্চ ${FREE_LIMIT}টা tuition পোস্ট করা যায়। Pro তে আপগ্রেড করো`,
        });
      }
    }

    const doc = {
      ...clean(req.body),
      tutorName: tutor.name,
      tutorEmail: tutor.email,
      approvalStatus: "pending",
      isActive: true,
      createdAt: new Date(),
    };

    const result = await tuitions.insertOne(doc);
    res.status(201).send({ insertedId: result.insertedId });
  } catch (err) {
    res.status(500).send({ message: "Failed to post tuition" });
  }
});

// PUT /tutor/tuitions/:id  -> edit (আবার admin এর অনুমোদনের জন্য pending হবে)
router.put("/tuitions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid tuition id" });
    }

    const error = validate(req.body);
    if (error) return res.status(400).send({ message: error });

    const { tuitions, applications } = await getCollections();
    const data = clean(req.body);

    const result = await tuitions.updateOne(
      { _id: new ObjectId(id), tutorEmail: req.user.email },
      {
        $set: {
          ...data,
          approvalStatus: "pending",
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Tuition not found" });
    }

    // আগের applications এর তথ্যও নতুন করে মিলিয়ে দেওয়া
    await applications.updateMany(
      { tuitionId: new ObjectId(id) },
      {
        $set: {
          tuitionTitle: data.title,
          subject: data.subject,
          monthlyFee: data.monthlyFee,
        },
      }
    );

    res.send({ updated: true });
  } catch (err) {
    res.status(500).send({ message: "Failed to update tuition" });
  }
});

// PATCH /tutor/tuitions/:id/status  -> Active / Closed toggle
router.patch("/tuitions/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid tuition id" });
    }
    if (typeof isActive !== "boolean") {
      return res.status(400).send({ message: "isActive true/false হতে হবে" });
    }

    const { tuitions } = await getCollections();
    const result = await tuitions.updateOne(
      { _id: new ObjectId(id), tutorEmail: req.user.email },
      { $set: { isActive } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Tuition not found" });
    }
    res.send({ updated: true, isActive });
  } catch (err) {
    res.status(500).send({ message: "Failed to update status" });
  }
});

// DELETE /tutor/tuitions/:id
router.delete("/tuitions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid tuition id" });
    }

    const { tuitions, applications } = await getCollections();
    const result = await tuitions.deleteOne({
      _id: new ObjectId(id),
      tutorEmail: req.user.email,
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Tuition not found" });
    }

    // ওই tuition এর সব application ও মুছে ফেলা
    await applications.deleteMany({ tuitionId: new ObjectId(id) });

    res.send({ deleted: true });
  } catch (err) {
    res.status(500).send({ message: "Failed to delete tuition" });
  }
});

// GET /tutor/applicants  -> নিজের tuition গুলোর সব আবেদনকারী
router.get("/applicants", async (req, res) => {
  try {
    const { applications } = await getCollections();
    const data = await applications
      .find({ tutorEmail: req.user.email })
      .sort({ appliedAt: -1 })
      .toArray();
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: "Failed to load applicants" });
  }
});

// PATCH /tutor/applicants/:id  -> accepted / rejected
router.patch("/applicants/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid application id" });
    }
    if (status !== "accepted" && status !== "rejected") {
      return res
        .status(400)
        .send({ message: "Status accepted বা rejected হতে হবে" });
    }

    const { applications } = await getCollections();
    const result = await applications.updateOne(
      { _id: new ObjectId(id), tutorEmail: req.user.email },
      { $set: { status } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Application not found" });
    }
    res.send({ updated: true, status });
  } catch (err) {
    res.status(500).send({ message: "Failed to update application" });
  }
});

export default router;