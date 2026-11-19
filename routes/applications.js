import { Router } from "express";
import { ObjectId } from "mongodb";
import { getCollections } from "../db.js";
import { verifyToken, verifyStudent } from "../middleware/auth.js";

const router = Router();

const phoneRegex = /^(\+?88)?01[3-9]\d{8}$/;

// GET /applications/my  -> student এর সব application
router.get("/my", verifyToken, verifyStudent, async (req, res) => {
  try {
    const { applications } = await getCollections();
    const data = await applications
      .find({ studentEmail: req.user.email })
      .sort({ appliedAt: -1 })
      .toArray();
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: "Failed to load applications" });
  }
});

// GET /applications/check/:tuitionId  -> student আগে apply করেছে কি না
router.get(
  "/check/:tuitionId",
  verifyToken,
  verifyStudent,
  async (req, res) => {
    try {
      const { tuitionId } = req.params;
      if (!ObjectId.isValid(tuitionId)) {
        return res.status(400).send({ message: "Invalid tuition id" });
      }

      const { applications } = await getCollections();
      const existing = await applications.findOne({
        tuitionId: new ObjectId(tuitionId),
        studentEmail: req.user.email,
      });

      res.send({ applied: !!existing });
    } catch (err) {
      res.status(500).send({ message: "Failed to check application" });
    }
  }
);

// POST /applications  -> student নতুন application জমা দেবে
router.post("/", verifyToken, verifyStudent, async (req, res) => {
  try {
    const { tuitionId, studentPhone, preferredSchedule, studentNote } =
      req.body;

    if (!tuitionId || !ObjectId.isValid(tuitionId)) {
      return res.status(400).send({ message: "Invalid tuition id" });
    }
    if (!studentPhone || !phoneRegex.test(studentPhone.trim())) {
      return res.status(400).send({ message: "সঠিক ফোন নম্বর দাও" });
    }
    if (!preferredSchedule || preferredSchedule.trim().length < 3) {
      return res.status(400).send({ message: "Preferred schedule দাও" });
    }

    const { tuitions, applications, users } = await getCollections();

    // শুধু approved + active tuition এ apply করা যাবে
    const tuition = await tuitions.findOne({
      _id: new ObjectId(tuitionId),
      approvalStatus: "approved",
      isActive: true,
    });
    if (!tuition) {
      return res.status(404).send({ message: "Tuition not found" });
    }

    const student = await users.findOne({ email: req.user.email });
    if (!student) {
      return res.status(404).send({ message: "User not found" });
    }

    // Duplicate application আটকানো
    const existing = await applications.findOne({
      tuitionId: tuition._id,
      studentEmail: student.email,
    });
    if (existing) {
      return res
        .status(409)
        .send({ message: "তুমি আগেই এই tuition এ apply করেছ" });
    }

    const doc = {
      tuitionId: tuition._id,
      tuitionTitle: tuition.title,
      subject: tuition.subject,
      monthlyFee: tuition.monthlyFee,
      tutorName: tuition.tutorName,
      tutorEmail: tuition.tutorEmail,
      studentName: student.name,
      studentEmail: student.email,
      studentPhone: studentPhone.trim(),
      preferredSchedule: preferredSchedule.trim(),
      studentNote: (studentNote || "").trim(),
      status: "pending",
      appliedAt: new Date(),
    };

    const result = await applications.insertOne(doc);
    res.status(201).send({ insertedId: result.insertedId });
  } catch (err) {
    res.status(500).send({ message: "Failed to submit application" });
  }
});

// DELETE /applications/:id  -> শুধু নিজের pending application cancel করা যাবে
router.delete("/:id", verifyToken, verifyStudent, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid application id" });
    }

    const { applications } = await getCollections();
    const result = await applications.deleteOne({
      _id: new ObjectId(id),
      studentEmail: req.user.email,
      status: "pending",
    });

    if (result.deletedCount === 0) {
      return res.status(400).send({
        message: "শুধু pending application cancel করা যায়",
      });
    }
    res.send({ deleted: true });
  } catch (err) {
    res.status(500).send({ message: "Failed to cancel application" });
  }
});

export default router;