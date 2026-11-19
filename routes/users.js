import { Router } from "express";
import { getCollections } from "../db.js";
import { verifyToken } from "../middleware/auth.js";

const router = Router();

const phoneRegex = /^(\+?88)?01[3-9]\d{8}$/;

// GET /users/me  -> নিজের প্রোফাইল
router.get("/me", verifyToken, async (req, res) => {
  try {
    const { users } = await getCollections();
    const user = await users.findOne(
      { email: req.user.email },
      {
        projection: {
          name: 1,
          email: 1,
          image: 1,
          role: 1,
          plan: 1,
          phone: 1,
          bio: 1,
          createdAt: 1,
        },
      }
    );
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    res.send(user);
  } catch (err) {
    res.status(500).send({ message: "Failed to load profile" });
  }
});

// PATCH /users/me  -> নাম, ফোন, bio, ছবি আপডেট
// (role আর plan এখান থেকে বদলানো যায় না)
router.patch("/me", verifyToken, async (req, res) => {
  try {
    const { name, phone, bio, image } = req.body;

    if (!name || name.trim().length < 2 || name.trim().length > 60) {
      return res.status(400).send({ message: "নাম ২ থেকে ৬০ অক্ষরের হতে হবে" });
    }
    if (phone && !phoneRegex.test(phone.trim())) {
      return res.status(400).send({ message: "সঠিক ফোন নম্বর দাও" });
    }
    if (bio && bio.length > 300) {
      return res.status(400).send({ message: "Bio ৩০০ অক্ষরের বেশি হবে না" });
    }
    if (image && !/^https?:\/\//i.test(image)) {
      return res.status(400).send({ message: "ছবির লিংক সঠিক নয়" });
    }

    const { users } = await getCollections();
    const result = await users.updateOne(
      { email: req.user.email },
      {
        $set: {
          name: name.trim(),
          phone: (phone || "").trim(),
          bio: (bio || "").trim(),
          image: image || null,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "User not found" });
    }
    res.send({ updated: true });
  } catch (err) {
    res.status(500).send({ message: "Failed to update profile" });
  }
});

export default router;