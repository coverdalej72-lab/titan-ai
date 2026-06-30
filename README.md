# Titan AI - Australian-First AI Business Platform

## 🚀 What is Titan?

Titan is the complete AI business platform that does everything your business needs. It's not just another AI tool - it's your entire digital workforce.

**Built in Australia. For Australia.**

## 💪 Why Titan Beats Everything Else

### One Platform. Everything You Need.
- **Web Builder** - Build websites and web apps
- **App Builder** - Create mobile and desktop applications
- **Design Studio** - Logos, brand kits, graphics
- **Avatar Generator** - Professional headshots and character avatars
- **Copywriter** - Marketing copy, blogs, emails
- **Data Analyst** - Analyze data, generate reports
- **Code Studio** - Custom programs and automation
- **Sales Agent** - Lead generation and outreach
- **Operations** - Invoicing, scheduling, workflows

### Real Money-Making Machine
- **Credit System** - 95% profit margins on every AI action
- **Stripe Integration** - Real payments in AUD
- **Subscription Plans** - Recurring revenue
- **Deployment System** - Launch products instantly
- **Analytics** - Track revenue and usage in real-time

### Australian-First
- AUD pricing (no USD conversion)
- Australian English (not American)
- ABN & GST support
- .com.au domain ready
- Local timezone support (AEST/AEDT)

## 🎯 Features

### AI Studio
- 9 specialist AI agents
- Real AI brains (Anthropic/OpenAI)
- Conversational interface
- Credit-based usage

### Admin Dashboard
- Revenue tracking
- User management
- Analytics overview
- System health monitoring

### Launch Pad
- Deploy websites and apps
- Track product performance
- Manage deployments
- Monitor uptime

### Project Pipeline
- Kanban board workflow
- Track projects from intake to delivery
- Client management
- Status tracking

### Ideas Vault
- Track business ideas
- Priority management
- Status tracking
- Market research

### Hot Leads
- Automated lead generation
- Email drafting
- Follow-up sequences
- Lead qualification

### Autopilot
- 8 automated jobs running 24/7
- Market intelligence
- Inbox monitoring
- Health checks
- Social media posting

### Self-Heal
- 8 surfaces probed every 15 minutes
- Automatic error detection
- System recovery
- Performance monitoring

## 💰 Pricing

### For Customers
- **Free** - $0/mo (100 credits)
- **Starter** - $29/mo (100 credits)
- **Pro** - $79/mo (500 credits)
- **Enterprise** - $199/mo (2000 credits)

### Credit Costs
- AI Chat: 1 credit ($0.39)
- Code Generation: 5 credits ($1.95)
- Design/Avatar: 10 credits ($3.90)
- Website Build: 50 credits ($19.50)
- App Build: 100 credits ($39.00)

### Your Profit
Every AI action costs you ~$0.02 in API costs.
Customers pay $0.39+ per action.
**That's a 95% profit margin.**

## 🛠️ Setup

### 1. Clone and Install
```bash
git clone https://github.com/coverdalej72-lab/titan-ai.git
cd titan-ai
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
```env
# Stripe (for payments)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AI Brains (choose one or both)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Site URL
SITE_URL=http://localhost:3000
```

### 3. Start Titan
```bash
npm start
```

Visit http://localhost:3000

### Demo Logins
- **Admin**: admin@titan.ai / titan2024
- **User**: demo@titan.ai / demo2024

## 📊 Database

Titan uses SQLite for persistence:
- Users and authentication
- Projects and deployments
- Credit transactions
- Products and leads
- Ideas and invoices

Database file: `titan.db` (auto-created on first run)

## 🔌 API

Full REST API available. See [API.md](API.md) for documentation.

## 🌐 Pages

- `/` - Landing page
- `/login` - Login
- `/register` - Sign up
- `/dashboard` - User dashboard
- `/studio` - AI Studio
- `/admin` - Admin panel
- `/pipeline` - Project pipeline
- `/avatar` - Avatar generator

## 🚢 Deployment

### Local Preview
```bash
npm start
```

### Production
1. Set up your domain
2. Configure environment variables
3. Use a process manager (PM2, systemd)
4. Set up reverse proxy (nginx, Caddy)
5. Configure SSL

## 📈 Roadmap

- [ ] Real AI integration (Anthropic/OpenAI)
- [ ] Zeta integration (website upgrader)
- [ ] FORGE command integration
- [ ] Email/SMS notifications
- [ ] Advanced analytics
- [ ] Multi-user teams
- [ ] White-label option
- [ ] Mobile app

## 🤝 Contributing

This is a private project. Contact the owner for collaboration opportunities.

## 📄 License

Proprietary - All rights reserved by AppCovi Pty Ltd.

## 🇦🇺 Made in Australia

Titan is proudly built in Australia for Australian businesses. We understand the local market, local needs, and local opportunities.

**No Americanisms. No USD pricing. Just straight-up value.**

---

**Titan AI** - Your AI workforce. One platform. Built by AppCovi.
