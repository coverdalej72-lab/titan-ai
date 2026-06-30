// Stripe Configuration and Payment Handlers
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Pricing tiers in AUD cents
const PLANS = {
  free: { price: 0, name: 'Free', interval: 'month', features: 5 },
  pro: { price: 7900, name: 'Pro', interval: 'month', features: -1 }, // -1 = unlimited
  enterprise: { price: 19900, name: 'Enterprise', interval: 'month', features: -1 }
};

// Create Stripe Checkout Session
async function createCheckoutSession(user, planId) {
  const plan = PLANS[planId];
  if (!plan || plan.price === 0) return null;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'aud',
          product_data: {
            name: `Titan AI - ${plan.name} Plan`,
            description: planId === 'pro' 
              ? 'Unlimited AI builds, all 8 agents, custom domains, hot leads' 
              : 'Everything in Pro + autopilot, sales agent, white-label, API access',
          },
          unit_amount: plan.price,
          recurring: { interval: plan.interval },
        },
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.SITE_URL || 'http://localhost:3000'}/dashboard?upgraded=true`,
    cancel_url: `${process.env.SITE_URL || 'http://localhost:3000'}/pricing?cancelled=true`,
    customer_email: user.email,
    metadata: {
      userId: user.id,
      planId: planId,
      abn: user.abn || ''
    }
  });

  return session;
}

// Handle Stripe Webhook
async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      await handleCheckoutComplete(session);
      break;
    
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      await handleSubscriptionUpdate(subscription);
      break;
    
    case 'customer.subscription.deleted':
      const deletedSub = event.data.object;
      await handleSubscriptionCancel(deletedSub);
      break;
    
    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      await handlePaymentSuccess(invoice);
      break;
    
    case 'invoice.payment_failed':
      const failedInvoice = event.data.object;
      await handlePaymentFailure(failedInvoice);
      break;
    
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
}

// Event handlers
async function handleCheckoutComplete(session) {
  const { userId, planId } = session.metadata;
  console.log(`User ${userId} upgraded to ${planId}`);
  
  // Update user in database
  // TODO: Implement actual database update
  // db.users.update(userId, { plan: planId, stripeCustomerId: session.customer });
}

async function handleSubscriptionUpdate(subscription) {
  console.log(`Subscription ${subscription.id} updated to ${subscription.status}`);
  // Update user plan status
}

async function handleSubscriptionCancel(subscription) {
  console.log(`Subscription ${subscription.id} cancelled`);
  // Downgrade user to free plan
}

async function handlePaymentSuccess(invoice) {
  console.log(`Payment successful for invoice ${invoice.id}`);
  // Record payment, send receipt
}

async function handlePaymentFailure(invoice) {
  console.log(`Payment failed for invoice ${invoice.id}`);
  // Send payment failure notification
}

// Create customer portal session (for managing subscriptions)
async function createPortalSession(customerId) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.SITE_URL || 'http://localhost:3000'}/dashboard`
  });
  return session;
}

module.exports = {
  createCheckoutSession,
  handleWebhook,
  createPortalSession,
  PLANS
};
