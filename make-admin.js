import "dotenv/config";
import { getCollections } from "./db.js";

const email = process.argv[2];

if (!email) {
  console.error("ব্যবহার: npm run make-admin -- your@email.com");
  process.exit(1);
}

const run = async () => {
  const { users } = await getCollections();
  const result = await users.updateOne(
    { email: email.trim().toLowerCase() },
    { $set: { role: "admin" } }
  );

  if (result.matchedCount === 0) {
    console.error(`"${email}" ইমেইলে কোনো user পাওয়া যায়নি। আগে Sign Up করো।`);
    process.exit(1);
  }

  console.log(`${email} এখন admin`);
  process.exit(0);
};

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});