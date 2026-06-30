// Titan Core Router — classifies user intent and routes to specialist agents
const skills = {
  webBuilder: {
    name: 'Web Builder',
    triggers: ['website', 'landing page', 'web app', 'site', 'homepage', 'web design', 'responsive'],
    description: 'Builds websites, landing pages, and web applications',
    capabilities: ['HTML/CSS/JS generation', 'React components', 'Responsive design', 'SEO optimization', 'Deployment']
  },
  appBuilder: {
    name: 'App Builder',
    triggers: ['app', 'mobile', 'ios', 'android', 'react native', 'flutter', 'application', 'apk'],
    description: 'Builds mobile and desktop applications',
    capabilities: ['React Native', 'Progressive Web Apps', 'App store deployment', 'Push notifications']
  },
  design: {
    name: 'Design Studio',
    triggers: ['logo', 'brand', 'design', 'graphic', 'icon', 'image', 'poster', 'banner', 'visual', 'ui', 'ux'],
    description: 'Creates logos, brand kits, graphics, and visual assets',
    capabilities: ['Logo generation', 'Brand identity', 'Social media graphics', 'UI/UX design', 'Image editing']
  },
  copywriter: {
    name: 'Copywriter',
    triggers: ['write', 'copy', 'content', 'blog', 'article', 'email', 'ad copy', 'seo text', 'product description', 'social media post'],
    description: 'Writes marketing copy, content, and communications',
    capabilities: ['Blog posts', 'Ad copy', 'Email sequences', 'Product descriptions', 'Social media content', 'SEO content']
  },
  data: {
    name: 'Data Analyst',
    triggers: ['data', 'analyse', 'analyze', 'report', 'spreadsheet', 'excel', 'csv', 'chart', 'dashboard', 'metrics', 'kpi'],
    description: 'Analyzes data and generates reports',
    capabilities: ['Data analysis', 'Report generation', 'Spreadsheet creation', 'Chart building', 'KPI dashboards']
  },
  code: {
    name: 'Code Studio',
    triggers: ['code', 'program', 'script', 'api', 'backend', 'database', 'function', 'algorithm', 'debug', 'python', 'javascript', 'node'],
    description: 'Writes and debugs code',
    capabilities: ['Full-stack development', 'API creation', 'Database design', 'Script automation', 'Code review']
  },
  sales: {
    name: 'Sales Agent',
    triggers: ['lead', 'prospect', 'outreach', 'cold email', 'follow up', 'quote', 'pricing', 'proposal', 'pitch'],
    description: 'Handles sales, lead generation, and client communication',
    capabilities: ['Lead qualification', 'Quote generation', 'Proposal drafting', 'Follow-up sequences', 'Referral requests']
  },
  ops: {
    name: 'Operations',
    triggers: ['invoice', 'payment', 'schedule', 'calendar', 'task', 'project manage', 'team', 'workflow', 'automate'],
    description: 'Manages business operations',
    capabilities: ['Invoice generation', 'Payment processing', 'Scheduling', 'Task management', 'Workflow automation']
  }
};

function classify(message) {
  const lower = message.toLowerCase();
  const scores = {};
  
  for (const [key, skill] of Object.entries(skills)) {
    scores[key] = 0;
    for (const trigger of skill.triggers) {
      if (lower.includes(trigger)) {
        scores[key] += 2;
      }
      // Partial match
      const words = trigger.split(' ');
      for (const word of words) {
        if (word.length > 3 && lower.includes(word)) {
          scores[key] += 1;
        }
      }
    }
  }
  
  // Find best match
  let best = 'webBuilder'; // default
  let bestScore = 0;
  for (const [key, score] of Object.entries(scores)) {
    if (score > bestScore) {
      best = key;
      bestScore = score;
    }
  }
  
  return best;
}

function process(message, mode, user) {
  // If mode is explicitly set, use that
  const modeMap = {
    'chat': null,
    'web': 'webBuilder',
    'app': 'appBuilder',
    'design': 'design',
    'copy': 'copywriter',
    'data': 'data',
    'code': 'code',
    'sales': 'sales',
    'ops': 'ops'
  };
  
  let agentKey = modeMap[mode] || classify(message);
  const agent = skills[agentKey];
  
  // Generate response based on agent
  const response = generateResponse(agentKey, message, user);
  
  return {
    agent: agent.name,
    agentKey,
    response,
    capabilities: agent.capabilities,
    timestamp: new Date().toISOString()
  };
}

function generateResponse(agentKey, message, user) {
  const responses = {
    webBuilder: {
      text: `I'll build that for you. Let me break down what I'm seeing:\n\n**Project Type:** Website/Web App\n**Estimated Complexity:** ${message.length > 100 ? 'High' : 'Medium'}\n\nHere's my approach:\n1. Design a responsive layout optimised for Australian audiences\n2. Build with clean, semantic HTML/CSS and modern JavaScript\n3. Ensure mobile-first design (most Aussie users are on mobile)\n4. Add SEO metadata for .com.au search visibility\n5. Deploy-ready output\n\nShall I start building?`,
      actions: ['Design layout', 'Write code', 'Preview', 'Deploy']
    },
    appBuilder: {
      text: `Building an app — here's my plan:\n\n**Platform:** Cross-platform (works on iOS + Android)\n**Approach:** Progressive Web App or React Native\n\nSteps:\n1. Define core features and user flows\n2. Design the UI with Australian UX patterns\n3. Build the frontend + backend\n4. Test on multiple devices\n5. Prepare for app store submission\n\nWhat's the main problem this app solves?`,
      actions: ['Define features', 'Design UI', 'Build app', 'Test']
    },
    design: {
      text: `Let's create something memorable.\n\n**Design Brief:**\n- Style: Modern, professional, Australian\n- Deliverables: Logo + brand assets\n- Formats: SVG, PNG, PDF\n\nI'll generate concepts based on your business type and target market. Australian businesses respond well to clean, confident branding — not flashy, not generic.\n\nTell me about your business and I'll start designing.`,
      actions: ['Generate concepts', 'Refine', 'Export assets', 'Brand kit']
    },
    copywriter: {
      text: `I'll write that for you.\n\n**Content Strategy:**\n- Tone: Professional Australian English (not American)\n- SEO: Optimised for AU search terms\n- Format: Ready to publish\n\nAustralian audiences respond to direct, honest language. No hype, no Americanisms. Just clear value propositions.\n\nWhat's the content for?`,
      actions: ['Draft content', 'SEO optimise', 'Edit tone', 'Publish']
    },
    data: {
      text: `Let me analyse that data.\n\n**Analysis Plan:**\n1. Import and clean the data\n2. Identify key patterns and trends\n3. Generate visualisations\n4. Create an executive summary\n5. Export as report (PDF/Excel)\n\nUpload your data or describe what you need analysed.`,
      actions: ['Import data', 'Analyse', 'Visualise', 'Export report']
    },
    code: {
      text: `Let me write that code.\n\n**Stack Selection:**\n- Backend: Node.js (or Python if data-heavy)\n- Database: PostgreSQL or SQLite\n- Auth: JWT tokens\n- Deployment: Ready for Australian cloud providers\n\nI'll write clean, documented code with proper error handling.\n\nWhat does it need to do?`,
      actions: ['Write code', 'Test', 'Document', 'Deploy']
    },
    sales: {
      text: `Let's close this deal.\n\n**Sales Approach:**\n1. Qualify the lead (budget, timeline, fit)\n2. Generate a tailored quote in AUD\n3. Draft a professional proposal\n4. Set up follow-up sequence\n5. Request referral after delivery\n\nAustralian businesses want straight talk — clear pricing, no pressure, genuine value. That's how Titan sells.`,
      actions: ['Qualify lead', 'Generate quote', 'Draft proposal', 'Follow up']
    },
    ops: {
      text: `I'll handle the operations.\n\n**Tasks I can automate:**\n- Invoice generation (with ABN/GST)\n- Payment reminders\n- Scheduling and calendar management\n- Project status updates\n- Client communications\n\nEverything runs on autopilot once configured.`,
      actions: ['Create invoice', 'Set schedule', 'Automate workflow', 'Send update']
    }
  };
  
  return responses[agentKey] || responses.webBuilder;
}

module.exports = { process, classify, skills };
