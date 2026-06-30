// Credit System - The Money Engine
class CreditSystem {
  constructor() {
    // Cost per action in credits (what it costs you)
    this.costs = {
      'ai-chat': 1,              // Basic chat
      'ai-code-generation': 5,   // Generate code
      'ai-copy': 3,              // Generate copy
      'ai-design': 10,           // Generate design concepts
      'ai-analysis': 5,          // Data analysis
      'website-build': 50,       // Full website build
      'app-build': 100,          // Full app build
      'deployment': 20,          // Deploy to live domain
      'maintenance': 10,         // Monthly maintenance
      'priority-support': 5      // Priority support access
    };

    // Pricing tiers (what customers pay in AUD)
    this.pricing = {
      'starter': {
        price: 29,
        credits: 100,
        features: ['Basic AI chat', '5 website builds', 'Community support']
      },
      'pro': {
        price: 99,
        credits: 500,
        features: ['All AI features', 'Unlimited builds', 'Custom domains', 'Priority support']
      },
      'enterprise': {
        price: 299,
        credits: 2000,
        features: ['Everything in Pro', 'White-label', 'API access', 'Dedicated support', 'SLA']
      },
      'credit-pack': {
        '100-credits': 39,
        '500-credits': 179,
        '2000-credits': 599
      }
    };

    // Profit margins (your cost vs customer price)
    this.margins = {
      'ai-chat': 0.95,           // 95% margin
      'ai-code': 0.90,           // 90% margin
      'website-build': 0.85,     // 85% margin
      'deployment': 0.80,        // 80% margin
      'subscription': 0.92       // 92% margin on recurring
    };
  }

  // Calculate cost to deliver a product
  calculateCost(productType) {
    const credits = this.costs[productType] || 0;
    const baseCostAUD = credits * 0.02; // $0.02 per credit (your API cost)
    return {
      credits,
      costAUD: baseCostAUD,
      costUSD: baseCostAUD * 0.65 // Rough AUD to USD
    };
  }

  // Calculate revenue from a product
  calculateRevenue(productType, customerTier = 'pro') {
    const cost = this.calculateCost(productType);
    const tierPricing = this.pricing[customerTier];
    
    // If customer has credits included, no extra charge
    if (tierPricing && tierPricing.credits >= this.costs[productType]) {
      return {
        revenueAUD: 0, // Included in subscription
        revenueUSD: 0,
        costAUD: cost.costAUD,
        profitAUD: tierPricing.price * this.margins[productType] || 0
      };
    }

    // Otherwise, charge per credit
    const revenueAUD = cost.credits * 0.39; // $0.39 per credit to customer
    const profitAUD = revenueAUD - cost.costAUD;

    return {
      revenueAUD,
      revenueUSD: revenueAUD * 0.65,
      costAUD: cost.costAUD,
      profitAUD,
      margin: ((profitAUD / revenueAUD) * 100).toFixed(1) + '%'
    };
  }

  // Calculate monthly projections
  projectMonthly(activeCustomers) {
    const breakdown = {
      starter: Math.floor(activeCustomers * 0.5),    // 50% on starter
      pro: Math.floor(activeCustomers * 0.35),       // 35% on pro
      enterprise: Math.floor(activeCustomers * 0.15) // 15% on enterprise
    };

    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;

    // Subscription revenue
    Object.entries(breakdown).forEach(([tier, count]) => {
      const revenue = count * this.pricing[tier].price;
      const cost = count * (this.pricing[tier].credits * 0.02); // Avg usage
      const profit = revenue - cost;
      
      totalRevenue += revenue;
      totalCost += cost;
      totalProfit += profit;
    });

    // Additional credit pack sales (estimate 20% buy extra)
    const creditPackRevenue = activeCustomers * 0.2 * 179; // Avg $179 pack
    const creditPackCost = activeCustomers * 0.2 * (500 * 0.02); // 500 credits avg
    totalRevenue += creditPackRevenue;
    totalCost += creditPackCost;
    totalProfit += creditPackRevenue - creditPackCost;

    return {
      customers: breakdown,
      revenue: {
        AUD: totalRevenue,
        USD: totalRevenue * 0.65
      },
      costs: {
        AUD: totalCost,
        USD: totalCost * 0.65
      },
      profit: {
        AUD: totalProfit,
        USD: totalProfit * 0.65,
        margin: ((totalProfit / totalRevenue) * 100).toFixed(1) + '%'
      },
      arr: { // Annual Recurring Revenue
        AUD: totalRevenue * 12,
        USD: totalRevenue * 12 * 0.65
      }
    };
  }

  // Generate pricing page content
  generatePricingPage() {
    return `
# Titan AI Pricing

## Simple, Transparent Pricing

### Starter - $29 AUD/month
- 100 credits included
- Basic AI chat
- 5 website builds
- Community support
- Perfect for: Small businesses, freelancers

**Most Popular**
### Pro - $99 AUD/month
- 500 credits included
- All AI features (code, copy, design, analysis)
- Unlimited builds
- Custom domains
- Priority support
- Perfect for: Growing businesses, agencies

### Enterprise - $299 AUD/month
- 2000 credits included
- Everything in Pro
- White-label option
- API access
- Dedicated support
- SLA guarantee
- Perfect for: Large teams, resellers

### Credit Packs
Need more credits? Buy as you go:
- 100 credits - $39 AUD
- 500 credits - $179 AUD (save 10%)
- 2000 credits - $599 AUD (save 20%)

## What Are Credits?

Credits are how you pay for AI actions:
- Basic chat: 1 credit
- Code generation: 5 credits
- Copywriting: 3 credits
- Design concepts: 10 credits
- Full website build: 50 credits
- Full app build: 100 credits
- Deployment: 20 credits

Your subscription includes credits every month. Buy more when you need them.

## Why This Model Works

**For You:**
- Predictable monthly costs
- Only pay for what you use
- Scale as you grow
- No hidden fees

**For Us:**
- Recurring revenue (subscriptions)
- Usage-based upsell (credits)
- High margins (85-95%)
- Customer lock-in (data, builds, domains)
`;
  }
}

module.exports = new CreditSystem();
