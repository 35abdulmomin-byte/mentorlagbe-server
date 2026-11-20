import Stripe from "stripe";
import { getCollections } from "../db.js";

let stripeInstance;

export const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY .env এ নেই");
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
};

// role অনুযায়ী Pro Plan এর দাম (ডলারে)
export const PLANS = {
  tutor: {
    name: "Pro Tutor Plan",
    amount: 15,
    description: "Unlimited tuition posts and verified badge",
  },
  student: {
    name: "Pro Student Plan",
    amount: 10,
    description: "Priority booking for tuition applications",
  },
};

// payment এর উপর unique index, যাতে একই session দুইবার সেভ না হয়
export async function ensurePaymentIndexes() {
  try {
    const { payments } = await getCollections();
    await payments.createIndex({ stripeSessionId: 1 }, { unique: true });
  } catch (err) {
    console.error("Payment index তৈরি করা যায়নি:", err.message);
  }
}

// পেমেন্ট সফল হলে payments এ রেকর্ড আর users এ plan: "pro"
// verify রুট আর webhook দুটোই এটা ব্যবহার করে, তাই দুইবার চললেও সমস্যা নেই
export async function fulfillSession(session) {
  if (session.payment_status !== "paid") return null;

  const email = session.metadata?.email;
  if (!email) return null;

  const { users, payments } = await getCollections();
  const user = await users.findOne({ email });
  if (!user) return null;

  const doc = {
    userEmail: user.email,
    userName: user.name,
    userRole: session.metadata?.role || user.role,
    planName:
      session.metadata?.planName || PLANS[user.role]?.name || "Pro Plan",
    amount: (session.amount_total || 0) / 100,
    currency: session.currency || "usd",
    transactionId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || session.id,
    stripeSessionId: session.id,
    paymentStatus: "paid",
    paidAt: new Date(),
  };

  try {
    await payments.updateOne(
      { stripeSessionId: session.id },
      { $setOnInsert: doc },
      { upsert: true }
    );
  } catch (err) {
    // একই সময়ে verify আর webhook এলে duplicate key আসতে পারে, সেটা ঠিক আছে
    if (err.code !== 11000) throw err;
  }

  await users.updateOne(
    { email },
    { $set: { plan: "pro", updatedAt: new Date() } }
  );

  return doc;
}