// Titan AI Brain - Core intelligence module
const Anthropic = require('@anthropic-ai/sdk');
const { OpenAI } = require('openai');

class TitanBrain {
  constructor() {
    this.providers = {};
    
    // Initialize available providers
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
    }
    
    if (process.env.OPENAI_API_KEY) {
      this.providers.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    
    // Default to anthropic if available, else openai
    this.defaultProvider = this.providers.anthropic ? 'anthropic' : 
                          this.providers.openai ? 'openai' : null;
  }
  
  // Check if brain is connected
  isReady() {
    return this.defaultProvider !== null;
  }
  
  // Get available models
  getAvailableModels() {
    const models = [];
    if (this.providers.anthropic) {
      models.push({ provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' });
    }
    if (this.providers.openai) {
      models.push({ provider: 'openai', model: 'gpt-4o' });
    }
    return models;
  }
  
  // Main completion method
  async complete({ system, messages, provider, model, maxTokens = 1024 }) {
    if (!this.isReady()) {
      throw new Error('No AI provider configured. Add ANTHROPIC_API_KEY or OPENAI_API_KEY to .env');
    }
    
    const useProvider = provider || this.defaultProvider;
    
    if (useProvider === 'anthropic') {
      return await this._completeAnthropic({ system, messages, model, maxTokens });
    } else if (useProvider === 'openai') {
      return await this._completeOpenAI({ system, messages, model, maxTokens });
    }
    
    throw new Error(`Unknown provider: ${useProvider}`);
  }
  
  // Anthropic Claude completion
  async _completeAnthropic({ system, messages, model = 'claude-3-5-sonnet-20241022', maxTokens }) {
    const response = await this.providers.anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages
    });
    
    return response.content[0].text;
  }
  
  // OpenAI GPT completion
  async _completeOpenAI({ system, messages, model = 'gpt-4o', maxTokens }) {
    const response = await this.providers.openai.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        ...messages
      ]
    });
    
    return response.choices[0].message.content;
  }
  
  // Specialized methods for different tasks
  
  // Generate website/app code
  async generateCode(requirements) {
    return await this.complete({
      system: `You are Titan, an expert full-stack developer building websites and apps for Australian businesses.
- Write clean, production-ready code
- Use modern frameworks (React, Node.js, etc.)
- Ensure responsive design
- Use Australian English spelling
- Follow best practices for security and performance
- Return complete, working code with comments`,
      messages: [{ role: 'user', content: requirements }],
      maxTokens: 4096
    });
  }
  
  // Generate copy/content
  async generateCopy(type, context) {
    const prompts = {
      website: 'Write website copy that converts Australian visitors. Professional, direct, no fluff.',
      marketing: 'Write marketing copy for Australian audience. Clear value props, local tone.',
      email: 'Write professional email in Australian English. Friendly but not overly casual.',
      social: 'Write social media content for Australian businesses. Engaging, shareable, local.',
      product: 'Write product descriptions that sell to Australian customers. Benefits-focused.',
      blog: 'Write blog content for Australian audience. Informative, SEO-friendly, local context.'
    };
    
    return await this.complete({
      system: prompts[type] || prompts.website,
      messages: [{ role: 'user', content: context }],
      maxTokens: 2048
    });
  }
  
  // Analyze data
  async analyzeData(data, question) {
    return await this.complete({
      system: `You are Titan, a data analyst. Analyze the data and provide insights.
- Be clear and actionable
- Use Australian English
- Highlight key findings
- Suggest next steps
- Use markdown tables for structured data`,
      messages: [{ role: 'user', content: `Data:\n${data}\n\nQuestion: ${question}` }],
      maxTokens: 2048
    });
  }
  
  // Generate design concepts
  async generateDesign(brief) {
    return await this.complete({
      system: `You are Titan, a design consultant. Provide detailed design concepts.
- Describe visual elements precisely
- Suggest color palettes (with hex codes)
- Recommend typography
- Explain design rationale
- Focus on Australian market appeal
- Be specific enough to implement`,
      messages: [{ role: 'user', content: brief }],
      maxTokens: 2048
    });
  }
  
  // Sales and lead generation
  async generateOutreach(context) {
    return await this.complete({
      system: `You are Titan, a sales strategist for Australian businesses.
- Write personalized outreach
- Focus on value, not features
- Use Australian business culture tone
- Be direct and professional
- Include clear call-to-action
- Avoid American sales tactics`,
      messages: [{ role: 'user', content: context }],
      maxTokens: 1024
    });
  }
  
  // Chat/general conversation
  async chat(messages, context = null) {
    const system = context 
      ? `You are Titan, an AI assistant for Australian businesses. You help with building websites, apps, logos, content, and business operations. Be helpful, direct, and use Australian English.${context}`
      : `You are Titan, an AI assistant for Australian businesses. Be helpful, direct, and use Australian English.`;
    
    return await this.complete({
      system,
      messages,
      maxTokens: 1024
    });
  }
}

// Singleton instance
const brain = new TitanBrain();

module.exports = brain;
