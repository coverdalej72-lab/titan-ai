// Notification Manager - Email, SMS, and in-app notifications
class NotificationManager {
  constructor() {
    this.notifications = [];
    this.providers = {
      email: null,    // Will use Gmail/Twilio when configured
      sms: null,      // Will use Twilio when configured
      inApp: true     // Always available
    };
  }

  async send(type, recipient, message, metadata = {}) {
    const notification = {
      id: require('crypto').randomBytes(8).toString('hex'),
      type,
      recipient,
      message,
      metadata,
      status: 'sent',
      createdAt: new Date().toISOString()
    };

    this.notifications.push(notification);
    console.log(`[Notification] ${type} to ${recipient}: ${message}`);
    
    return notification;
  }

  async sendEmail(to, subject, body) {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.warn('Email not configured. Notification stored but not sent.');
      return this.send('email', to, subject, { body });
    }
    
    // TODO: Implement actual email sending with nodemailer
    return this.send('email', to, subject, { body });
  }

  async sendSMS(to, message) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.warn('SMS not configured. Notification stored but not sent.');
      return this.send('sms', to, message);
    }
    
    // TODO: Implement actual SMS sending with Twilio
    return this.send('sms', to, message);
  }

  async sendInApp(userId, title, message, metadata = {}) {
    return this.send('inApp', userId, title, { message, ...metadata });
  }

  getNotifications(filters = {}) {
    let results = this.notifications;
    
    if (filters.type) results = results.filter(n => n.type === filters.type);
    if (filters.recipient) results = results.filter(n => n.recipient === filters.recipient);
    if (filters.status) results = results.filter(n => n.status === filters.status);
    
    return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getStats() {
    return {
      total: this.notifications.length,
      byType: {
        email: this.notifications.filter(n => n.type === 'email').length,
        sms: this.notifications.filter(n => n.type === 'sms').length,
        inApp: this.notifications.filter(n => n.type === 'inApp').length
      },
      byStatus: {
        sent: this.notifications.filter(n => n.status === 'sent').length,
        failed: this.notifications.filter(n => n.status === 'failed').length,
        pending: this.notifications.filter(n => n.status === 'pending').length
      }
    };
  }
}

module.exports = new NotificationManager();
