import "dotenv/config";
import { auth } from "./auth.js";
import { getCollections } from "./db.js";

const demoUsers = [
  {
    name: "Demo Admin",
    email: "demo-admin@mentorlagbe.com",
    password: "Admin@123",
    role: "admin",
  },
  {
    name: "Demo Tutor",
    email: "demo-tutor@mentorlagbe.com",
    password: "Tutor@123",
    role: "tutor",
  },
  {
    name: "Demo Student",
    email: "demo-student@mentorlagbe.com",
    password: "Student@123",
    role: "student",
  },
];

const run = async () => {
  const { users } = await getCollections();

  for (const demo of demoUsers) {
    const existing = await users.findOne({ email: demo.email });

    if (existing) {
      console.log(`আগে থেকেই আছে: ${demo.email}`);
    } else {
      try {
        await auth.api.signUpEmail({
          body: {
            name: demo.name,
            email: demo.email,
            password: demo.password,
            role: demo.role,
          },
        });
        console.log(`তৈরি হয়েছে: ${demo.email}`);
      } catch (err) {
        console.error(`তৈরি করা যায়নি: ${demo.email}`, err);
        continue;
      }
    }

    // সাইন আপে admin বানানো যায় না, তাই এখানে role সরাসরি বসানো হচ্ছে
    await users.updateOne(
      { email: demo.email },
      { $set: { role: demo.role } }
    );
    console.log(`  role -> ${demo.role}`);
  }

  console.log("\nDemo অ্যাকাউন্ট তৈরি শেষ");
  process.exit(0);
};

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});