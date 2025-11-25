import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Simulated AI Defense System (placeholder for aidefence integration)
class AIDefenseSystem {
  constructor() {
    this.threats = [];
    this.metrics = {
      totalRequests: 0,
      threatsDetected: 0,
      threatsBlocked: 0,
      averageResponseTime: 0
    };
  }

  async analyzeInput(input, options = {}) {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    // Simulate threat detection patterns
    const threats = this.detectThreats(input);
    const responseTime = Date.now() - startTime;
    
    // Update metrics
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / 
      this.metrics.totalRequests;

    if (threats.length > 0) {
      this.metrics.threatsDetected++;
      
      const threat = {
        id: `threat-${Date.now()}`,
        timestamp: new Date().toISOString(),
        input: input.substring(0, 100) + (input.length > 100 ? '...' : ''),
        threats,
        severity: this.calculateSeverity(threats),
        blocked: options.blockOnThreat !== false,
        responseTime
      };

      this.threats.unshift(threat);
      if (this.threats.length > 50) this.threats.pop();

      if (threat.blocked) {
        this.metrics.threatsBlocked++;
      }

      return {
        safe: false,
        threat,
        analysis: {
          detectionPath: threats.length > 2 ? 'deep' : 'fast',
          confidence: 0.85 + Math.random() * 0.14,
          responseTime
        }
      };
    }

    return {
      safe: true,
      analysis: {
        detectionPath: 'fast',
        confidence: 0.95,
        responseTime
      }
    };
  }

  detectThreats(input) {
    const threats = [];
    const lowerInput = input.toLowerCase();

    // Prompt injection patterns
    const injectionPatterns = [
      { pattern: /ignore (previous|all|above) (instructions|prompts|rules)/i, type: 'prompt_injection', severity: 'high' },
      { pattern: /you are now|act as|pretend (you are|to be)/i, type: 'role_manipulation', severity: 'high' },
      { pattern: /system:|admin:|root:/i, type: 'privilege_escalation', severity: 'critical' },
      { pattern: /\[SYSTEM\]|\[ADMIN\]|\[ROOT\]/i, type: 'system_impersonation', severity: 'critical' }
    ];

    // Jailbreak attempts
    const jailbreakPatterns = [
      { pattern: /DAN|do anything now/i, type: 'jailbreak_attempt', severity: 'critical' },
      { pattern: /developer mode|god mode/i, type: 'jailbreak_attempt', severity: 'high' }
    ];

    // Data exfiltration
    const exfiltrationPatterns = [
      { pattern: /show (me )?(all |your )?(system |internal )?(prompts?|instructions|rules|config)/i, type: 'data_exfiltration', severity: 'high' },
      { pattern: /reveal|expose|leak/i, type: 'information_disclosure', severity: 'medium' }
    ];

    // Adversarial patterns
    const adversarialPatterns = [
      { pattern: /(\w)\1{10,}/, type: 'adversarial_noise', severity: 'medium' },
      { pattern: /[^\x00-\x7F]{20,}/, type: 'unicode_attack', severity: 'medium' }
    ];

    const allPatterns = [
      ...injectionPatterns,
      ...jailbreakPatterns,
      ...exfiltrationPatterns,
      ...adversarialPatterns
    ];

    for (const { pattern, type, severity } of allPatterns) {
      if (pattern.test(input)) {
        threats.push({ type, severity, pattern: pattern.toString() });
      }
    }

    // Check for suspicious length
    if (input.length > 5000) {
      threats.push({ type: 'excessive_input', severity: 'medium', pattern: 'input_length' });
    }

    return threats;
  }

  calculateSeverity(threats) {
    const severityScores = { critical: 4, high: 3, medium: 2, low: 1 };
    const maxSeverity = Math.max(...threats.map(t => severityScores[t.severity] || 0));
    return Object.keys(severityScores).find(k => severityScores[k] === maxSeverity) || 'low';
  }

  getMetrics() {
    return this.metrics;
  }

  getRecentThreats(limit = 10) {
    return this.threats.slice(0, limit);
  }
}

const aiDefense = new AIDefenseSystem();

// API Routes
app.post('/api/analyze', async (req, res) => {
  try {
    const { input, options } = req.body;
    
    if (!input) {
      return res.status(400).json({ error: 'Input is required' });
    }

    const result = await aiDefense.analyzeInput(input, options);
    res.json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

app.get('/api/metrics', (req, res) => {
  res.json(aiDefense.getMetrics());
});

app.get('/api/threats', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  res.json(aiDefense.getRecentThreats(limit));
});

app.listen(PORT, () => {
  console.log(`🛡️  AIDMS Demo Server running at http://localhost:${PORT}`);
  console.log(`📊 Metrics available at http://localhost:${PORT}/api/metrics`);
  console.log(`🚨 Threats log at http://localhost:${PORT}/api/threats`);
});
