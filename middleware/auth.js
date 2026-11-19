import jwt from "jsonwebtoken";
import { getCollections } from "../db.js";

// টোকেন যাচাই
export const verifyToken = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    req.user = decoded; // { email, role }
    next();
  } catch (err) {
    return res.status(401).send({ message: "Invalid or expired token" });
  }
};

// রোল চেক (ডেটাবেস থেকে, যাতে রোল বদলালে সাথে সাথে কার্যকর হয়)
const verifyRole = (role) => async (req, res, next) => {
  try {
    const { users } = await getCollections();
    const user = await users.findOne({ email: req.user.email });
    if (!user || user.role !== role) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    next();
  } catch (err) {
    res.status(500).send({ message: "Server error" });
  }
};

export const verifyStudent = verifyRole("student");
export const verifyTutor = verifyRole("tutor");
export const verifyAdmin = verifyRole("admin");