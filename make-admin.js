import "dotenv/config";
import { getCollections } from "./db.js";

const email = process.argv[2];

if (!email) {
  console.error("ব্যবহার: npm run make-admin -- your@email.com");
  process.exit(1);
}

const run = async () => {
  const { users } = await getCollections();
  const query = { email: email.trim().toLowerCase() };

  const before = await users.findOne(query, {
    projection: { email: 1, role: 1 },
  });

  if (!before) {
    console.error(`"${email}" ইমেইলে কোনো user পাওয়া যায়নি।`);
    const all = await users
      .find({}, { projection: { email: 1, role: 1 } })
      .toArray();
    console.log("ডেটাবেসে থাকা ইউজার:");
    all.forEach((u) => console.log(` - ${u.email} (${u.role})`));
    process.exit(1);
  }

  console.log(`আগে: ${before.email} -> ${before.role}`);

  await users.updateOne(query, { $set: { role: "admin" } });

  const after = await users.findOne(query, {
    projection: { email: 1, role: 1 },
  });
  console.log(`এখন: ${after.email} -> ${after.role}`);
  process.exit(0);
};

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});