# Titan AI API Documentation

## Base URL
```
http://localhost:3000
```

## Authentication
All API routes (except auth and landing) require Bearer token authentication:
```
Authorization: Bearer <token>
```

## Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/register` - Register new user
- `POST /api/auth/logout` - Logout user

### Projects
- `GET /api/projects` - Get user's projects
- `POST /api/projects` - Create new project
- `PATCH /api/projects/:id` - Update project

### Ideas Vault
- `GET /api/ideas` - Get all ideas
- `POST /api/ideas` - Create new idea

### Products (Launch Pad)
- `GET /api/products` - Get all products
- `POST /api/products` - Create new product
- `PATCH /api/products/:id` - Update product

### Leads
- `GET /api/leads` - Get all leads
- `POST /api/leads` - Create new lead

### Invoices
- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Create new invoice

### Credits
- `GET /api/credits/balance` - Get user's credit balance
- `GET /api/credits/transactions` - Get credit transaction history
- `GET /api/credits/pricing` - Get credit pricing for all actions
- `POST /api/credits/use` - Use credits for an action
- `GET /api/credits/cost/:action` - Get cost for specific action

### Deployment
- `GET /api/deploy/platforms` - Get supported deployment platforms
- `POST /api/deploy/:projectId` - Deploy a project
- `GET /api/deployments/:projectId` - Get deployment history

### Analytics
- `GET /api/analytics/overview` - Get platform overview stats
- `GET /api/analytics/usage` - Get credit usage analytics
- `GET /api/admin/revenue` - Get revenue metrics (admin only)

### Webhooks
- `GET /api/webhooks` - Get all webhooks (admin only)
- `POST /api/webhooks` - Register new webhook (admin only)
- `DELETE /api/webhooks/:id` - Delete webhook (admin only)

### Setup (Admin Only)
- `POST /api/setup/:service` - Configure service (stripe, openai, anthropic, email, twilio)
- `GET /api/setup/status` - Get configuration status

### AI Agent
- `POST /api/agent/route` - Route message to appropriate AI agent

### Payments
- `POST /api/payments/checkout` - Create Stripe checkout session
- `POST /api/payments/webhook` - Stripe webhook handler
- `GET /api/payments/plans` - Get available subscription plans

### Views (HTML Pages)
- `GET /` - Landing page
- `GET /login` - Login page
- `GET /register` - Registration page
- `GET /dashboard` - User dashboard
- `GET /studio` - AI Studio interface
- `GET /admin` - Admin control panel
- `GET /pipeline` - Project pipeline
- `GET /avatar` - Avatar generator

## Credit Costs

| Action | Credits | Cost (AUD) | Price (AUD) |
|--------|---------|------------|-------------|
| AI Chat | 1 | $0.02 | $0.39 |
| Code Generation | 5 | $0.10 | $1.95 |
| Design/Avatar | 10 | $0.20 | $3.90 |
| Copywriting | 3 | $0.06 | $1.17 |
| Data Analysis | 5 | $0.10 | $1.95 |
| Website Build | 50 | $1.00 | $19.50 |
| App Build | 100 | $2.00 | $39.00 |
| Deployment | 20 | $0.40 | $7.80 |

## Subscription Plans

| Plan | Price (AUD/mo) | Credits | Features |
|------|----------------|---------|----------|
| Free | $0 | 100 | Basic access |
| Starter | $29 | 100 | Basic AI features |
| Pro | $79 | 500 | All AI features, custom domains |
| Enterprise | $199 | 2000 | Everything + API, white-label |

## Example Usage

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@titan.ai","password":"titan2024"}'
```

### Create Project
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Website","description":"Business website","type":"website"}'
```

### Use AI Agent
```bash
curl -X POST http://localhost:3000/api/agent/route \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"build a landing page for my business","mode":"web"}'
```

### Check Credit Balance
```bash
curl http://localhost:3000/api/credits/balance \
  -H "Authorization: Bearer YOUR_TOKEN"
```
