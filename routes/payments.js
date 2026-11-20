import { Router } from "express";
import { getCollections } from "../db.js";
import { verifyToken } from "../middleware/auth.js";
import { PLANS, fulfillSession, getStripe } from "../utils/stripe.js";

const router = Router();

const isProd = process.env.NODE_ENV === "production";

// POST /payments/checkout  -> Stripe Checkout session তৈরি করে url ফেরত দেয়
router.post("/checkout", verifyToken, async (req, res) => {
  try {
    const { users } = await getCollections();
    const user = await users.findOne({ email: req.user.email });

    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    const plan = PLANS[user.role];
    if (!plan) {
      return res
        .status(400)
        .send({ message: "শুধু Student আর Tutor রা Pro Plan কিনতে পারে" });
    }
    if (user.plan === "pro") {
      return res.status(400).send({ message: "তুমি আগে থেকেই Pro Plan এ আছ" });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: plan.amount * 100,
            product_data: {
              name: plan.name,
              description: plan.description,
            },
          },
        },
      ],
      metadata: {
        email: user.email,
        role: user.role,
        planName: plan.name,
      },
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
    });

    res.send({ url: session.url });
  } catch (err) {
    console.error("[payments/checkout] error:", err.type || "", err.message);
    res.status(500).send({
      // development এ আসল কারণ দেখাবে, production এ সাধারণ বার্তা
      message: isProd
        ? "Checkout শুরু করা যায়নি"
        : `Checkout শুরু করা যায়নি: ${err.message}`,
    });
  }
});

// POST /payments/verify  -> success পেজ থেকে session যাচাই করে plan আপডেট করে
router.post("/verify", verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (
      !sessionId ||
      typeof sessionId !== "string" ||
      !sessionId.startsWith("cs_")
    ) {
      return res.status(400).send({ message: "Invalid session id" });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // অন্য কারও session দিয়ে নিজের plan বদলানো আটকানো
    if (session.metadata?.email !== req.user.email) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    if (session.payment_status !== "paid") {
      return res.status(400).send({ message: "Payment সম্পন্ন হয়নি" });
    }

    await fulfillSession(session);

    const { payments } = await getCollections();
    const payment = await payments.findOne({ stripeSessionId: session.id });

    res.send({ paid: true, plan: "pro", payment });
  } catch (err) {
    console.error("[payments/verify] error:", err.type || "", err.message);
    res.status(500).send({
      message: isProd
        ? "Payment যাচাই করা যায়নি"
        : `Payment যাচাই করা যায়নি: ${err.message}`,
    });
  }
});

// Stripe Webhook (ঐচ্ছিক, বাড়তি নিরাপত্তা)
// এই হ্যান্ডলার express.json() এর আগে raw body দিয়ে mount করা হয়
export const stripeWebhook = async (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(400).send("Webhook secret সেট করা নেই");
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      secret
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      await fulfillSession(event.data.object);
    }
    res.send({ received: true });
  } catch (err) {
    console.error("[webhook] error:", err.message);
    res.status(500).send("Webhook handler failed");
  }
};

export default router;