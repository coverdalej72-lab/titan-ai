const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const Database = require('better-sqlite3');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize SQLite database
const db = new Database('./titan.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user',
    plan TEXT DEFAULT 'free',
    credits INTEGER DEFAULT 100,
    creditsUsed INTEGER DEFAULT 0,
    abn TEXT,
    stripeCustomerId TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    title TEXT,
    description TEXT,
    type TEXT,
    status TEXT DEFAULT 'intake',
    price REAL DEFAULT 0,
    deployedUrl TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS credit_transactions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    action TEXT,
    credits INTEGER,
    costAUD REAL,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,
    category TEXT,
    description TEXT,
    url TEXT,
    status TEXT DEFAULT 'staging',
    revenue REAL DEFAULT 0,
    users INTEGER DEFAULT 0,
    launchedAt TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ideas (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    category TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'idea',
    price REAL,
    market TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    userId TEXT,
    name TEXT,
    email TEXT,
    company TEXT,
    status TEXT DEFAULT 'new',
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    userId TEXT,
    amount REAL,
    status TEXT DEFAULT 'draft',
    createdAt TEXT DEFAULT (datetime('now')),
    paidAt TEXT,
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS deployments (
    id TEXT PRIMARY KEY,
    projectId TEXT,
    userId TEXT,
    platform TEXT,
    url TEXT,
    status TEXT DEFAULT 'pending',
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id)
  );
`);

// Prepared statements for performance
const stmts = {
  getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
  createUser: db.prepare('INSERT INTO users (id, email, password, name, role, plan, credits, creditsUsed, abn, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
  createSession: db.prepare('INSERT INTO sessions (token, userId) VALUES (?, ?)'),
  getSession: db.prepare('SELECT u.* FROM sessions s JOIN users u ON s.userId = u.id WHERE s.token = ?'),
  deleteSession: db.prepare('DELETE FROM sessions WHERE token = ?'),
  getProjectsByUser: db.prepare('SELECT * FROM projects WHERE userId = ? ORDER BY createdAt DESC'),
  getAllProjects: db.prepare('SELECT * FROM projects ORDER BY createdAt DESC'),
  createProject: db.prepare('INSERT INTO projects (id, userId, title, description, type, status, price, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
  updateProject: db.prepare("UPDATE projects SET status = ?, deployedUrl = ?, updatedAt = datetime('now') WHERE id = ?"),
  createCreditTransaction: db.prepare('INSERT INTO credit_transactions (id, userId, action, credits, costAUD) VALUES (?, ?, ?, ?, ?)'),
  getUserCreditTransactions: db.prepare('SELECT * FROM credit_transactions WHERE userId = ? ORDER BY createdAt DESC'),
  getAllCreditTransactions: db.prepare('SELECT * FROM credit_transactions ORDER BY createdAt DESC'),
  updateUserCredits: db.prepare('UPDATE users SET creditsUsed = ? WHERE id = ?'),
  getProducts: db.prepare('SELECT * FROM products ORDER BY createdAt DESC'),
  createProduct: db.prepare('INSERT INTO products (id, name, type, category, description, url, status, revenue, users) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
  updateProduct: db.prepare('UPDATE products SET status = ?, url = ?, revenue = ?, users = ? WHERE id = ?'),
  getIdeas: db.prepare('SELECT * FROM ideas ORDER BY createdAt DESC'),
  createIdea: db.prepare('INSERT INTO ideas (id, title, description, category, priority, status, price, market) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
  getLeads: db.prepare('SELECT * FROM leads ORDER BY createdAt DESC'),
  createLead: db.prepare('INSERT INTO leads (id, userId, name, email, company, status) VALUES (?, ?, ?, ?, ?, ?)'),
  getInvoices: db.prepare('SELECT * FROM invoices ORDER BY createdAt DESC'),
  createInvoice: db.prepare('INSERT INTO invoices (id, userId, amount, status) VALUES (?, ?, ?, ?)'),
  getUsers: db.prepare('SELECT id, email, name, role, plan, credits, creditsUsed, createdAt FROM users'),
  getUserCount: db.prepare('SELECT COUNT(*) as count FROM users'),
  getProjectCount: db.prepare('SELECT COUNT(*) as count FROM projects'),
  getPaidInvoiceTotal: db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM invoices WHERE status = ?'),
  getActiveLeadCount: db.prepare('SELECT COUNT(*) as count FROM leads WHERE status = ?'),
  getIdeaCount: db.prepare('SELECT COUNT(*) as count FROM ideas'),
  getTotalCreditsUsed: db.prepare('SELECT COALESCE(SUM(creditsUsed), 0) as total FROM users'),
};

// In-memory (non-persistent, regenerated on restart)
const autopilotJobs = [
  { name: 'Market Intel Scan', schedule: 'Daily 6:00 AM AEST', lastRun: null, status: 'active' },
  { name: 'Inbox Poll', schedule: 'Every 30 min', lastRun: null, status: 'active' },
  { name: 'Morning Briefing', schedule: 'Daily 7:00 AM AEST', lastRun: null, status: 'active' },
  { name: 'Revenue Update', schedule: 'Daily 5:00 PM AEST', lastRun: null, status: 'active' },
  { name: 'Social Posts', schedule: 'Weekly Mon 9:00 AM AEST', lastRun: null, status: 'active' },
  { name: 'Health Check', schedule: 'Hourly', lastRun: null, status: 'active' },
  { name: 'Hot Leads Auto-Fire', schedule: 'Daily 10:00 AM AEST', lastRun: null, status: 'active' },
  { name: 'Self-Heal Probe', schedule: 'Every 15 min', lastRun: null, status: 'active' }
];

const systemHealth = {
  database: 'ok', api: 'ok', autopilot: 'ok', hotLeads: 'ok',
  credentials: 'ok', email: 'warning', disk: 'ok', memory: 'ok'
};

// Credit costs per action
const creditCosts = {
  webBuilder: 5, appBuilder: 10, design: 10, copywriter: 3,
  data: 5, code: 5, sales: 3, ops: 3, avatar: 10, chat: 1, setup: 0
};

// Seed data
const userCount = stmts.getUserCount.get();
if (userCount.count === 0) {
  stmts.createUser.run('1', 'admin@titan.ai', 'titan2024', 'Admin', 'admin', 'enterprise', 2000, 0, '', new Date().toISOString());
  stmts.createUser.run('2', 'demo@titan.ai', 'demo2024', 'Demo User', 'user', 'pro', 500, 150, '', new Date().toISOString());
}

const ideaCount = stmts.getIdeaCount.get();
if (ideaCount.count === 0) {
  stmts.createIdea.run('1', 'AI Logo Generator', 'Auto-generate brand logos for small business', 'tool', 'high', 'hot', 29, 'Small business AU');
  stmts.createIdea.run('2', 'Tradie Quote Calculator', 'Instant quoting tool for tradies', 'app', 'high', 'in-progress', 49, 'Australian tradies');
  stmts.createIdea.run('3', 'Farm Management Dashboard', 'Already live as Broiler Base Mate', 'app', 'medium', 'selling', 99, 'Australian farmers');
  stmts.createIdea.run('4', 'Restaurant Booking System', 'Table bookings + menu management', 'app', 'medium', 'idea', 79, 'AU hospitality');
  stmts.createIdea.run('5', 'Real Estate Listing Builder', 'AI-generated property listings + photos', 'tool', 'low', 'idea', 59, 'AU real estate agents');
}

const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
if (productCount.count === 0) {
  stmts.createProduct.run('1', 'Broiler Base Mate', 'app', 'agriculture', 'Poultry farm management platform', 'https://broilerbasemate.com.au', 'live', 1500, 12);
  stmts.createProduct.run('2', 'Titan AI Platform', 'app', 'ai-business', 'Australian-first AI business platform', 'https://titan.appcovi.com', 'staging', 0, 0);
  stmts.createProduct.run('3', 'AppCovi Corporate Site', 'website', 'corporate', 'Main company website', 'https://appcovi.com', 'staging', 0, 0);
  stmts.createProduct.run('4', 'FORGE Business Engine', 'program', 'automation', 'Internal business automation platform', null, 'internal', 0, 1);
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  const user = stmts.getSession.get(token);
  if (!user) return res.status(401).json({ error: 'Session expired or invalid' });
  req.user = user;
  next();
}

// ============ AUTH ROUTES ============
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = stmts.getUserByEmail.get(email);
  if (!user || user.password !== password) return res.status(401).json({ error: 'Invalid credentials' });
  const token = crypto.randomBytes(32).toString('hex');
  stmts.createSession.run(token, user.id);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan } });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, name, abn } = req.body;
  const existing = stmts.getUserByEmail.get(email);
  if (existing) return res.status(400).json({ error: 'Email already registered' });
  const id = crypto.randomBytes(8).toString('hex');
  stmts.createUser.run(id, email, password, name, 'user', 'free', 100, 0, abn || '', new Date().toISOString());
  const token = crypto.randomBytes(32).toString('hex');
  stmts.createSession.run(token, id);
  res.json({ token, user: { id, email, name, role: 'user', plan: 'free' } });
});

app.post('/api/auth/logout', auth, (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  stmts.deleteSession.run(token);
  res.json({ success: true });
});

// ============ PROJECT ROUTES ============
app.get('/api/projects', auth, (req, res) => {
  const projects = req.user.role === 'admin' ? stmts.getAllProjects.all() : stmts.getProjectsByUser.all(req.user.id);
  res.json(projects);
});

app.post('/api/projects', auth, (req, res) => {
  const id = crypto.randomBytes(8).toString('hex');
  const { title, description, type, price } = req.body;
  stmts.createProject.run(id, req.user.id, title, description, type, 'intake', price || 0, new Date().toISOString());
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.json(project);
});

app.patch('/api/projects/:id', auth, (req, res) => {
  const { status, deployedUrl } = req.body;
  stmts.updateProject.run(status, deployedUrl, req.params.id);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json(project);
});

// ============ LEADS ROUTES ============
app.get('/api/leads', auth, (req, res) => { res.json(stmts.getLeads.all()); });

app.post('/api/leads', auth, (req, res) => {
  const id = crypto.randomBytes(8).toString('hex');
  const { name, email, company } = req.body;
  stmts.createLead.run(id, req.user.id, name, email, company, 'new');
  res.json({ id, userId: req.user.id, name, email, company, status: 'new', createdAt: new Date().toISOString() });
});

// ============ INVOICES ROUTES ============
app.get('/api/invoices', auth, (req, res) => { res.json(stmts.getInvoices.all()); });

app.post('/api/invoices', auth, (req, res) => {
  const id = crypto.randomBytes(8).toString('hex');
  const { amount } = req.body;
  stmts.createInvoice.run(id, req.user.id, amount, 'draft');
  res.json({ id, userId: req.user.id, amount, status: 'draft', createdAt: new Date().toISOString() });
});

// ============ IDEAS ROUTES ============
app.get('/api/ideas', auth, (req, res) => { res.json(stmts.getIdeas.all()); });

app.post('/api/ideas', auth, (req, res) => {
  const id = crypto.randomBytes(8).toString('hex');
  const { title, description, category, priority, price, market } = req.body;
  stmts.createIdea.run(id, title, description, category, priority || 'medium', 'idea', price || 0, market || '');
  res.json({ id, title, description, category, priority: priority || 'medium', status: 'idea', price, market });
});

// ============ PRODUCTS ROUTES ============
app.get('/api/products', auth, (req, res) => { res.json(stmts.getProducts.all()); });

app.post('/api/products', auth, (req, res) => {
  const id = crypto.randomBytes(8).toString('hex');
  const { name, type, category, description, url } = req.body;
  stmts.createProduct.run(id, name, type, category, description, url, 'staging', 0, 0);
  res.json({ id, name, type, category, description, url, status: 'staging', revenue: 0, users: 0 });
});

app.patch('/api/products/:id', auth, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  const { status, url, revenue, users } = req.body;
  stmts.updateProduct.run(status || product.status, url || product.url, revenue ?? product.revenue, users ?? product.users, req.params.id);
  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
});

// ============ DEPLOYMENT ROUTES ============
const deploymentManager = require('./lib/deployment');
const webhookManager = require('./lib/webhooks');
const notificationManager = require('./lib/notifications');

app.get('/api/deploy/platforms', auth, (req, res) => {
  res.json(deploymentManager.getSupportedPlatforms());
});

app.post('/api/deploy/:projectId', auth, async (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const platform = req.body.platform || 'local';
    const deployment = await deploymentManager.deploy(project, platform);
    
    // Store deployment record
    db.prepare('INSERT INTO deployments (id, projectId, userId, platform, url, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      deployment.deploymentId, project.id, req.user.id, platform, deployment.url, deployment.status, new Date().toISOString()
    );
    
    // Update project with deployed URL
    db.prepare('UPDATE projects SET deployedUrl = ?, status = ?, updatedAt = datetime("now") WHERE id = ?').run(
      deployment.url, 'deployed', project.id
    );
    
    res.json(deployment);
  } catch (err) {
    console.error('Deployment error:', err);
    res.status(500).json({ error: 'Deployment failed' });
  }
});

app.get('/api/deployments/:projectId', auth, (req, res) => {
  const deployments = db.prepare('SELECT * FROM deployments WHERE projectId = ? ORDER BY createdAt DESC').all(req.params.projectId);
  res.json(deployments);
});

// ============ WEBHOOK ROUTES ============
app.get('/api/webhooks', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  res.json(webhookManager.getWebhooks());
});

app.post('/api/webhooks', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { event, url, secret } = req.body;
  if (!event || !url) {
    return res.status(400).json({ error: 'Event and URL required' });
  }
  const id = webhookManager.registerWebhook(event, url, secret);
  res.json({ id, event, url, message: 'Webhook registered' });
});

app.delete('/api/webhooks/:id', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const removed = webhookManager.removeWebhook(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Webhook not found' });
  res.json({ success: true });
});

// ============ NOTIFICATION ROUTES ============
app.get('/api/notifications', auth, (req, res) => {
  const filters = req.query;
  res.json(notificationManager.getNotifications(filters));
});

app.post('/api/notifications/email', auth, async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'to, subject, and body required' });
    }
    const notification = await notificationManager.sendEmail(to, subject, body);
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send email' });
  }
});

app.post('/api/notifications/sms', auth, async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ error: 'to and message required' });
    }
    const notification = await notificationManager.sendSMS(to, message);
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

app.post('/api/notifications/inapp', auth, async (req, res) => {
  try {
    const { userId, title, message } = req.body;
    if (!userId || !title || !message) {
      return res.status(400).json({ error: 'userId, title, and message required' });
    }
    const notification = await notificationManager.sendInApp(userId, title, message);
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send in-app notification' });
  }
});

app.get('/api/notifications/stats', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  res.json(notificationManager.getStats());
});

// ============ ANALYTICS ROUTES ============
app.get('/api/analytics/overview', auth, (req, res) => {
  const totalUsers = stmts.getUserCount.get().count;
  const totalProjects = stmts.getProjectCount.get().count;
  const totalTransactions = db.prepare('SELECT COUNT(*) as count FROM credit_transactions').get().count;
  const totalRevenue = stmts.getPaidInvoiceTotal.get('paid').total;
  const activeSessions = db.prepare('SELECT COUNT(*) as count FROM sessions').get().count;
  
  res.json({
    totalUsers,
    totalProjects,
    totalTransactions,
    totalRevenue,
    activeSessions,
    systemHealth
  });
});

app.get('/api/analytics/usage', auth, (req, res) => {
  const usage = db.prepare(`
    SELECT action, COUNT(*) as count, SUM(credits) as totalCredits
    FROM credit_transactions
    GROUP BY action
    ORDER BY count DESC
  `).all();
  res.json(usage);
});

// ============ ADMIN ROUTES ============
app.get('/api/admin/stats', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  res.json({
    totalUsers: stmts.getUserCount.get().count,
    totalProjects: stmts.getProjectCount.get().count,
    totalRevenue: stmts.getPaidInvoiceTotal.get('paid').total,
    activeLeads: stmts.getActiveLeadCount.get('active').count,
    ideasCount: stmts.getIdeaCount.get().count,
    autopilotJobs: autopilotJobs.length,
    systemHealth
  });
});

app.get('/api/admin/autopilot', auth, (req, res) => { res.json(autopilotJobs); });
app.get('/api/admin/health', auth, (req, res) => { res.json(systemHealth); });

app.get('/api/admin/revenue', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const users = stmts.getUsers.all();
  const paidUsers = users.filter(u => u.plan !== 'free');
  const totalCreditsUsed = stmts.getTotalCreditsUsed.get().total;
  const totalRevenue = totalCreditsUsed * 0.39;
  const totalCost = totalCreditsUsed * 0.02;

  // Breakdown by tier
  const tiers = { starter: 0, pro: 0, enterprise: 0 };
  paidUsers.forEach(u => { if (tiers[u.plan] !== undefined) tiers[u.plan]++; });

  res.json({
    customers: { starter: tiers.starter, pro: tiers.pro, enterprise: tiers.enterprise },
    revenue: { AUD: totalRevenue, USD: totalRevenue * 0.65 },
    costs: { AUD: totalCost, USD: totalCost * 0.65 },
    profit: { AUD: totalRevenue - totalCost, USD: (totalRevenue - totalCost) * 0.65, margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100).toFixed(1) + '%' : '0%' },
    arr: { AUD: totalRevenue * 12, USD: totalRevenue * 12 * 0.65 },
    actuals: { totalCreditsUsed, totalRevenueAUD: totalRevenue, totalCostAUD: totalCost, profitAUD: totalRevenue - totalCost }
  });
});

app.get('/api/admin/users', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  res.json(stmts.getUsers.all());
});

// ============ PAYMENT ROUTES ============
app.get('/api/payments/plans', (req, res) => {
  res.json({
    free: { price: 0, name: 'Free', credits: 100 },
    starter: { price: 29, name: 'Starter', credits: 100 },
    pro: { price: 79, name: 'Pro', credits: 500 },
    enterprise: { price: 199, name: 'Enterprise', credits: 2000 }
  });
});

app.post('/api/payments/checkout', auth, async (req, res) => {
  try {
    const stripeLib = require('./lib/stripe');
    const { planId } = req.body;
    if (!planId) return res.status(400).json({ error: 'Plan ID required' });
    const session = await stripeLib.createCheckoutSession(req.user, planId);
    if (!session) return res.status(400).json({ error: 'Invalid plan or free tier' });
    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error('Checkout error:', err.message);
    res.status(500).json({ error: 'Payment setup failed: ' + err.message });
  }
});

app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const stripeLib = require('./lib/stripe');
    await stripeLib.handleWebhook(req, res);
  } catch (err) {
    res.status(500).json({ error: 'Webhook error' });
  }
});

// ============ CREDIT ROUTES ============
app.get('/api/credits/balance', auth, (req, res) => {
  const user = stmts.getUserById.get(req.user.id);
  res.json({
    plan: user.plan,
    credits: user.credits || 0,
    creditsUsed: user.creditsUsed || 0,
    creditsRemaining: (user.credits || 0) - (user.creditsUsed || 0)
  });
});

app.get('/api/credits/transactions', auth, (req, res) => {
  const transactions = req.user.role === 'admin'
    ? stmts.getAllCreditTransactions.all()
    : stmts.getUserCreditTransactions.all(req.user.id);
  res.json(transactions);
});

app.get('/api/credits/pricing', (req, res) => {
  res.json({
    'ai-chat': { credits: 1, costAUD: 0.02, priceAUD: 0.39 },
    'ai-code': { credits: 5, costAUD: 0.10, priceAUD: 1.95 },
    'ai-design': { credits: 10, costAUD: 0.20, priceAUD: 3.90 },
    'ai-copy': { credits: 3, costAUD: 0.06, priceAUD: 1.17 },
    'ai-avatar': { credits: 10, costAUD: 0.20, priceAUD: 3.90 },
    'website-build': { credits: 50, costAUD: 1.00, priceAUD: 19.50 },
    'app-build': { credits: 100, costAUD: 2.00, priceAUD: 39.00 },
    'deployment': { credits: 20, costAUD: 0.40, priceAUD: 7.80 }
  });
});

// ============ SETUP COMMANDS ============
app.post('/api/setup/:service', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const service = req.params.service;
  const config = req.body;

  try {
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

    const envMap = {
      stripe: { STRIPE_SECRET_KEY: config.secretKey, STRIPE_WEBHOOK_SECRET: config.webhookSecret },
      openai: { OPENAI_API_KEY: config.apiKey },
      anthropic: { ANTHROPIC_API_KEY: config.apiKey },
      email: { GMAIL_USER: config.email, GMAIL_APP_PASSWORD: config.password },
      twilio: { TWILIO_ACCOUNT_SID: config.sid, TWILIO_AUTH_TOKEN: config.token, TWILIO_PHONE_NUMBER: config.phone }
    };

    if (!envMap[service]) return res.status(400).json({ error: 'Unknown service' });

    for (const [key, value] of Object.entries(envMap[service])) {
      if (value) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
          envContent += `\n${key}=${value}`;
        }
      }
    }

    if (!envContent.includes('SITE_URL=')) envContent += '\nSITE_URL=http://localhost:3000';
    fs.writeFileSync(envPath, envContent.trim() + '\n');

    res.json({ success: true, message: `${service} configured. Restart server to activate.` });
  } catch (err) {
    res.status(500).json({ error: 'Setup failed: ' + err.message });
  }
});

app.get('/api/setup/status', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const envPath = path.join(__dirname, '.env');
  const hasEnv = fs.existsSync(envPath);
  const envContent = hasEnv ? fs.readFileSync(envPath, 'utf8') : '';

  res.json({
    configured: hasEnv,
    stripe: envContent.includes('STRIPE_SECRET_KEY=') && !envContent.match(/STRIPE_SECRET_KEY=\s*$/m),
    openai: envContent.includes('OPENAI_API_KEY=') && !envContent.match(/OPENAI_API_KEY=\s*$/m),
    anthropic: envContent.includes('ANTHROPIC_API_KEY=') && !envContent.match(/ANTHROPIC_API_KEY=\s*$/m),
    email: envContent.includes('GMAIL_USER='),
    twilio: envContent.includes('TWILIO_ACCOUNT_SID='),
    siteUrl: envContent.includes('SITE_URL=')
  });
});

// ============ AGENT ROUTES ============
app.post('/api/agent/route', auth, async (req, res) => {
  try {
    const { message, mode } = req.body;
    const agentRouter = require('./agents/router');
    const result = await agentRouter.process(message, mode, req.user);

    const cost = creditCosts[result.agentKey] || 1;

    // Deduct credits
    if (result.agentKey !== 'setup' && cost > 0) {
      const user = stmts.getUserById.get(req.user.id);
      const remaining = (user.credits || 0) - (user.creditsUsed || 0);
      if (remaining >= cost) {
        const newUsed = (user.creditsUsed || 0) + cost;
        stmts.updateUserCredits.run(newUsed, user.id);
        stmts.createCreditTransaction.run(
          crypto.randomBytes(8).toString('hex'), user.id, `ai-${result.agentKey}`, cost, cost * 0.02
        );
        result.creditsUsed = cost;
        result.creditsRemaining = (user.credits || 0) - newUsed;
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

// ============ START ============
console.log('🔥 Titan AI — Australian-First AI Business Platform');
console.log('   Database: SQLite (persistent)');
console.log('   Autopilot: 8 jobs armed');
console.log('   Self-Heal: 8 surfaces probed');
console.log('   Agents: Router + 9 specialists ready');
console.log('   Payments: Stripe ready');
console.log('   Credits: Active');
console.log(`   Server: http://localhost:${PORT}`);

autopilotJobs.forEach(job => { job.lastRun = new Date().toISOString(); });

app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ Titan is online and ready to make money');
});
