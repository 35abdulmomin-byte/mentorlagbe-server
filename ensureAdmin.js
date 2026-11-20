import { auth } from "./auth.js";
import { getCollections } from "./db.js";

// server চালু হলে .env এর ADMIN_EMAIL দিয়ে admin অ্যাকাউন্ট তৈরি বা ঠিক করে
export async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "MentorLagbe Admin";

  if (!email || !password) {
    console.log("ADMIN_EMAIL বা ADMIN_PASSWORD সেট নেই, admin তৈরি বাদ দেওয়া হলো");
    return;
  }
  if (password.length < 6) {
    console.error("ADMIN_PASSWORD কমপক্ষে ৬ অক্ষরের হতে হবে");
    return;
  }

  const { users } = await getCollections();
  const existing = await users.findOne({ email });

  if (!existing) {
    try {
      await auth.api.signUpEmail({
        body: { name, email, password, role: "student" },
      });
      console.log(`Admin অ্যাকাউন্ট তৈরি হয়েছে: ${email}`);
    } catch (err) {
      console.error("Admin তৈরি করা যায়নি:", err);
      return;
    }
  }

  // সাইন আপে admin বানানো যায় না, তাই role সরাসরি বসানো হচ্ছে
  await users.updateOne({ email }, { $set: { role: "admin" } });
  console.log(`Admin প্রস্তুত: ${email}`);
}