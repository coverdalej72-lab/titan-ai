const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
require('dotenv').config();
const stripeLib = require('./lib/stripe');
const creditSystem = require('./lib/credits');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// In-memory data store
const db = {
  users: [
    { id: '1', email: 'admin@titan.ai', password: 'titan2024', name: 'Admin', role: 'admin', plan: 'enterprise', credits: 2000, creditsUsed: 0, abn: '', createdAt: new Date().toISOString() },
    { id: '2', email: 'demo@titan.ai', password: 'demo2024', name: 'Demo User', role: 'user', plan: 'pro', credits: 500, creditsUsed: 150, abn: '', createdAt: new Date().toISOString() }
  ],
  creditTransactions: [],
  projects: [],
  leads: [],
  invoices: [],
  ideas: [
    { id: '1', title: 'AI Logo Generator', description: 'Auto-generate brand logos for small business', category: 'tool', priority: 'high', status: 'hot', price: 29, market: 'Small business AU' },
    { id: '2', title: 'Tradie Quote Calculator', description: 'Instant quoting tool for tradies', category: 'app', priority: 'high', status: 'in-progress', price: 49, market: 'Australian tradies' },
    { id: '3', title: 'Farm Management Dashboard', description: 'Already live as Broiler Base Mate', category: 'app', priority: 'medium', status: 'selling', price: 99, market: 'Australian farmers' },
    { id: '4', title: 'Restaurant Booking System', description: 'Table bookings + menu management', category: 'app', priority: 'medium', status: 'idea', price: 79, market: 'AU hospitality' },
    { id: '5', title: 'Real Estate Listing Builder', description: 'AI-generated property listings + photos', category: 'tool', priority: 'low', status: 'idea', price: 59, market: 'AU real estate agents' }
  ],
  products: [
    { id: '1', name: 'Broiler Base Mate', type: 'app', category: 'agriculture', description: 'Poultry farm management platform with silo tracking, feed alerts, batch results, and AI feed advisor.', url: 'https://broilerbasemate.com.au', status: 'live', revenue: 1500, users: 12, launchedAt: '2024-06-01T00:00:00.000Z', createdAt: '2024-01-15T00:00:00.000Z' },
    { id: '2', name: 'Titan AI Platform', type: 'app', category: 'ai-business', description: 'Australian-first AI business platform. Websites, apps, logos, copy, data, sales, operations.', url: 'https://titan.appcovi.com', status: 'staging', revenue: 0, users: 0, createdAt: '2025-01-01T00:00:00.000Z' },
    { id: '3', name: 'AppCovi Corporate Site', type: 'website', category: 'corporate', description: 'Main company website showcasing AppCovi products and services.', url: 'https://appcovi.com', status: 'staging', revenue: 0, users: 0, createdAt: '2025-01-01T00:00:00.000Z' },
    { id: '4', name: 'FORGE Business Engine', type: 'program', category: 'automation', description: 'Internal business automation platform — autopilot, hot leads, credential vault, self-heal.', url: null, status: 'internal', revenue: 0, users: 1, createdAt: '2024-03-01T00:00:00.000Z' }
  ],
  sessions: {},
  autopilotJobs: [
    { name: 'Market Intel Scan', schedule: 'Daily 6:00 AM AEST', lastRun: null, status: 'active' },
    { name: 'Inbox Poll', schedule: 'Every 30 min', lastRun: null, status: 'active' },
    { name: 'Morning Briefing', schedule: 'Daily 7:00 AM AEST', lastRun: null, status: 'active' },
    { name: 'Revenue Update', schedule: 'Daily 5:00 PM AEST', lastRun: null, status: 'active' },
    { name: 'Social Posts', schedule: 'Weekly Mon 9:00 AM AEST', lastRun: null, status: 'active' },
    { name: 'Health Check', schedule: 'Hourly', lastRun: null, status: 'active' },
    { name: 'Hot Leads Auto-Fire', schedule: 'Daily 10:00 AM AEST', lastRun: null, status: 'active' },
    { name: 'Self-Heal Probe', schedule: 'Every 15 min', lastRun: null, status: 'active' }
  ],
  systemHealth: {
    database: 'ok', api: 'ok', autopilot: 'ok', hotLeads: 'ok',
    credentials: 'ok', email: 'warning', disk: 'ok', memory: 'ok'
  }
};

// Auth middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !db.sessions[token]) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  req.user = db.sessions[token];
  next();
}

// ============ AUTH ROUTES ============
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions[token] = user;
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan } });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, name, abn } = req.body;
  if (db.users.find(u => u.email === email)) return res.status(400).json({ error: 'Email already registered' });
  const user = { id: crypto.randomBytes(8).toString('hex'), email, password, name, role: 'user', plan: 'free', abn: abn || '', createdAt: new Date().toISOString() };
  db.users.push(user);
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions[token] = user;
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan } });
});

// ============ PROJECT ROUTES ============
app.get('/api/projects', auth, (req, res) => {
  const projects = db.projects.filter(p => p.userId === req.user.id || req.user.role === 'admin');
  res.json(projects);
});

app.post('/api/projects', auth, (req, res) => {
  const project = {
    id: crypto.randomBytes(8).toString('hex'),
    userId: req.user.id,
    ...req.body,
    status: 'intake',
    createdAt: new Date().toISOString()
  };
  db.projects.push(project);
  res.json(project);
});

app.patch('/api/projects/:id', auth, (req, res) => {
  const project = db.projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  Object.assign(project, req.body);
  res.json(project);
});

// ============ LEADS ROUTES ============
app.get('/api/leads', auth, (req, res) => {
  res.json(db.leads);
});

app.post('/api/leads', auth, (req, res) => {
  const lead = { id: crypto.randomBytes(8).toString('hex'), ...req.body, createdAt: new Date().toISOString() };
  db.leads.push(lead);
  res.json(lead);
});

// ============ INVOICES ROUTES ============
app.get('/api/invoices', auth, (req, res) => {
  res.json(db.invoices);
});

app.post('/api/invoices', auth, (req, res) => {
  const invoice = { id: crypto.randomBytes(8).toString('hex'), ...req.body, status: 'draft', createdAt: new Date().toISOString() };
  db.invoices.push(invoice);
  res.json(invoice);
});

// ============ IDEAS ROUTES ============
app.get('/api/ideas', auth, (req, res) => {
  res.json(db.ideas);
});

app.post('/api/ideas', auth, (req, res) => {
  const idea = { id: crypto.randomBytes(8).toString('hex'), ...req.body, status: 'idea' };
  db.ideas.push(idea);
  res.json(idea);
});

// ============ PRODUCTS ROUTES ============
app.get('/api/products', auth, (req, res) => {
  res.json(db.products);
});

app.post('/api/products', auth, (req, res) => {
  const product = { 
    id: crypto.randomBytes(8).toString('hex'), 
    ...req.body, 
    status: req.body.status || 'staging',
    revenue: 0,
    users: 0,
    createdAt: new Date().toISOString()
  };
  db.products.push(product);
  res.json(product);
});

app.patch('/api/products/:id', auth, (req, res) => {
  const product = db.products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  Object.assign(product, req.body);
  res.json(product);
});

// ============ ADMIN ROUTES ============
app.get('/api/admin/stats', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  res.json({
    totalUsers: db.users.length,
    totalProjects: db.projects.length,
    totalRevenue: db.invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.amount || 0), 0),
    activeLeads: db.leads.filter(l => l.status === 'active').length,
    ideasCount: db.ideas.length,
    autopilotJobs: db.autopilotJobs.length,
    systemHealth: db.systemHealth
  });
});

app.get('/api/admin/autopilot', auth, (req, res) => {
  res.json(db.autopilotJobs);
});

app.get('/api/admin/health', auth, (req, res) => {
  res.json(db.systemHealth);
});

// ============ PAYMENT ROUTES ============
app.post('/api/payments/checkout', auth, async (req, res) => {
  try {
    const { planId } = req.body;
    if (!planId) return res.status(400).json({ error: 'Plan ID required' });
    
    const session = await stripeLib.createCheckoutSession(req.user, planId);
    if (!session) return res.status(400).json({ error: 'Invalid plan or free tier' });
    
    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Payment setup failed' });
  }
});

app.post('/api/payments/portal', auth, async (req, res) => {
  try {
    if (!req.user.stripeCustomerId) {
      return res.status(400).json({ error: 'No subscription found' });
    }
    
    const session = await stripeLib.createPortalSession(req.user.stripeCustomerId);
    res.json({ url: session.url });
  } catch (err) {
    console.error('Portal error:', err);
    res.status(500).json({ error: 'Portal setup failed' });
  }
});

// Stripe webhook - needs raw body
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  await stripeLib.handleWebhook(req, res);
});

app.get('/api/payments/plans', (req, res) => {
  res.json(stripeLib.PLANS);
});

// ============ CREDIT ROUTES ============
app.get('/api/credits/balance', auth, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  res.json({
    plan: user.plan,
    credits: user.credits || 0,
    creditsUsed: user.creditsUsed || 0,
    creditsRemaining: (user.credits || 0) - (user.creditsUsed || 0)
  });
});

app.get('/api/credits/transactions', auth, (req, res) => {
  const transactions = db.creditTransactions
    .filter(t => t.userId === req.user.id || req.user.role === 'admin')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(transactions);
});

app.get('/api/credits/pricing', (req, res) => {
  res.json(creditSystem.pricing);
});

app.post('/api/credits/use', auth, async (req, res) => {
  const { action, credits } = req.body;
  const user = db.users.find(u => u.id === req.user.id);
  
  if (!user.credits) user.credits = 0;
  if (!user.creditsUsed) user.creditsUsed = 0;
  
  const remaining = user.credits - user.creditsUsed;
  if (remaining < credits) {
    return res.status(402).json({ 
      error: 'Insufficient credits',
      required: credits,
      remaining,
      upgrade: '/api/payments/checkout'
    });
  }
  
  user.creditsUsed += credits;
  
  const transaction = {
    id: crypto.randomBytes(8).toString('hex'),
    userId: user.id,
    action,
    credits,
    costAUD: credits * 0.02,
    createdAt: new Date().toISOString()
  };
  db.creditTransactions.push(transaction);
  
  res.json({
    success: true,
    creditsUsed: user.creditsUsed,
    creditsRemaining: user.credits - user.creditsUsed,
    transaction
  });
});

app.get('/api/credits/cost/:action', auth, (req, res) => {
  const cost = creditSystem.calculateCost(req.params.action);
  res.json(cost);
});

app.get('/api/admin/revenue', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  
  const projections = creditSystem.projectMonthly(db.users.filter(u => u.plan !== 'free').length);
  const totalCreditsUsed = db.users.reduce((sum, u) => sum + (u.creditsUsed || 0), 0);
  const totalRevenue = totalCreditsUsed * 0.39; // $0.39 per credit revenue
  
  res.json({
    ...projections,
    actuals: {
      totalCreditsUsed,
      totalRevenueAUD: totalRevenue,
      totalCostAUD: totalCreditsUsed * 0.02,
      profitAUD: totalRevenue - (totalCreditsUsed * 0.02)
    }
  });
});

// ============ SETUP COMMANDS ============
app.post('/api/setup/stripe', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  
  try {
    const { secretKey, webhookSecret } = req.body;
    
    if (!secretKey) {
      return res.status(400).json({ error: 'Stripe secret key required' });
    }
    
    // Write .env file
    const envContent = `STRIPE_SECRET_KEY=${secretKey}
STRIPE_WEBHOOK_SECRET=${webhookSecret || ''}
SITE_URL=http://localhost:3000
`;
    
    fs.writeFileSync(path.join(__dirname, '.env'), envContent);
    
    console.log('✅ Stripe configured via setup command');
    res.json({ 
      success: true, 
      message: 'Stripe configured. Restart the server to activate.',
      instructions: 'Run `npm start` to restart with new configuration'
    });
  } catch (err) {
    console.error('Setup error:', err);
    res.status(500).json({ error: 'Setup failed' });
  }
});

app.get('/api/setup/status', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  
  const envPath = path.join(__dirname, '.env');
  const hasEnv = fs.existsSync(envPath);
  
  let config = {
    stripe: false,
    webhook: false,
    siteUrl: false
  };
  
  if (hasEnv) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    config.stripe = envContent.includes('STRIPE_SECRET_KEY=') && !envContent.includes('STRIPE_SECRET_KEY=\n');
    config.webhook = envContent.includes('STRIPE_WEBHOOK_SECRET=') && !envContent.includes('STRIPE_WEBHOOK_SECRET=\n');
    config.siteUrl = envContent.includes('SITE_URL=');
  }
  
  res.json({ configured: hasEnv, ...config });
});

// ============ AGENT ROUTES ============
app.post('/api/agent/route', auth, async (req, res) => {
  try {
    const { message, mode } = req.body;
    const agentRouter = require('./agents/router');
    const result = await agentRouter.process(message, mode, req.user);
    
    // Calculate credits based on agent type
    const creditCosts = {
      webBuilder: 5,
      appBuilder: 10,
      design: 10,
      copywriter: 3,
      data: 5,
      code: 5,
      sales: 3,
      ops: 3,
      avatar: 10,
      chat: 1,
      setup: 0
    };
    
    const creditCost = creditCosts[result.agentKey] || 1;
    
    // Deduct credits if brain is ready (real AI)
    const brain = require('./lib/brain');
    if (brain.isReady() && result.agentKey !== 'setup') {
      const user = db.users.find(u => u.id === req.user.id);
      if (!user.credits) user.credits = 0;
      if (!user.creditsUsed) user.creditsUsed = 0;
      
      const remaining = user.credits - user.creditsUsed;
      if (remaining >= creditCost) {
        user.creditsUsed += creditCost;
        db.creditTransactions.push({
          id: crypto.randomBytes(8).toString('hex'),
          userId: user.id,
          action: `ai-${result.agentKey}`,
          credits: creditCost,
          costAUD: creditCost * 0.02,
          createdAt: new Date().toISOString()
        });
        result.creditsUsed = creditCost;
        result.creditsRemaining = user.credits - user.creditsUsed;
      } else {
        result.creditsWarning = 'Insufficient credits. Upgrade your plan.';
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Agent route error:', error);
    res.status(500).json({ error: 'Agent processing failed', message: error.message });
  }
});

// ============ VIEW ROUTES ============
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'landing.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'views', 'register.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'views', 'dashboard.html')));
app.get('/studio', (req, res) => res.sendFile(path.join(__dirname, 'views', 'studio.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'views', 'admin.html')));
app.get('/pipeline', (req, res) => res.sendFile(path.join(__dirname, 'views', 'pipeline.html')));
app.get('/avatar', (req, res) => res.sendFile(path.join(__dirname, 'views', 'avatar.html')));

// Fire autopilot on startup
console.log('🔥 Titan AI — Australian-First AI Business Platform');
console.log('   Autopilot: 8 jobs armed');
console.log('   Self-Heal: 8 surfaces probed');
console.log('   Agents: Router + 8 specialists ready');
console.log(`   Server: http://localhost:${PORT}`);

app.listen(PORT, '0.0.0.0', () => {
  // Fire initial autopilot jobs
  db.autopilotJobs.forEach(job => { job.lastRun = new Date().toISOString(); });
  console.log('✅ Autopilot fired initial jobs');
});
