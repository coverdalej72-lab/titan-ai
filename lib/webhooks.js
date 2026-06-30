// Webhook Manager - Handles external integrations and automation
class WebhookManager {
  constructor() {
    this.webhooks = new Map();
  }

  registerWebhook(event, url, secret) {
    const id = require('crypto').randomBytes(8).toString('hex');
    this.webhooks.set(id, { event, url, secret, createdAt: new Date().toISOString() });
    return id;
  }

  async triggerWebhook(event, payload) {
    const hooks = Array.from(this.webhooks.entries())
      .filter(([id, hook]) => hook.event === event);
    
    const results = [];
    for (const [id, hook] of hooks) {
      try {
        const response = await fetch(hook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': hook.secret
          },
          body: JSON.stringify(payload)
        });
        results.push({ id, success: response.ok, status: response.status });
      } catch (err) {
        results.push({ id, success: false, error: err.message });
      }
    }
    return results;
  }

  getWebhooks() {
    return Array.from(this.webhooks.entries()).map(([id, hook]) => ({ id, ...hook }));
  }

  removeWebhook(id) {
    return this.webhooks.delete(id);
  }
}

module.exports = new WebhookManager();
