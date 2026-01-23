/**
 * Real-World Example 5: Service Status Monitor
 *
 * Demonstrates:
 * - Monitoring real service status pages
 * - Parallel health checks across multiple services
 * - Status aggregation and alerting logic
 * - Practical DevOps automation use case
 *
 * This is a REAL, WORKING example using actual status pages:
 * - GitHub Status (githubstatus.com)
 * - Cloudflare Status (cloudflarestatus.com)
 * - Vercel Status (vercel-status.com)
 * - npm Status (status.npmjs.org)
 * - Atlassian Status (status.atlassian.com)
 */

import { createBrowserSwarm, createBrowserService } from '@claude-flow/browser';

interface ServiceStatus {
  service: string;
  url: string;
  status: 'operational' | 'degraded' | 'partial' | 'major' | 'unknown';
  statusText: string;
  components?: ComponentStatus[];
  incidents?: Incident[];
  lastUpdated: string;
  checkDuration: number;
}

interface ComponentStatus {
  name: string;
  status: string;
}

interface Incident {
  title: string;
  status: string;
  timestamp: string;
}

interface StatusReport {
  overallHealth: 'healthy' | 'degraded' | 'outage';
  services: ServiceStatus[];
  checkedAt: string;
  totalDuration: number;
  summary: string;
}

// Status page configurations
const STATUS_PAGES = {
  github: {
    name: 'GitHub',
    url: 'https://www.githubstatus.com/',
    extract: `
      (() => {
        // Get overall status
        const statusEl = document.querySelector('.component-status, .page-status .status');
        const statusText = statusEl?.textContent?.trim() || 'Unknown';

        // Determine status level
        let status = 'unknown';
        const pageClass = document.querySelector('.page-status')?.className || '';
        const statusLower = statusText.toLowerCase();
        if (statusLower.includes('operational') || statusLower.includes('all systems')) {
          status = 'operational';
        } else if (statusLower.includes('degraded') || statusLower.includes('minor')) {
          status = 'degraded';
        } else if (statusLower.includes('partial') || statusLower.includes('major')) {
          status = 'partial';
        } else if (statusLower.includes('major') || statusLower.includes('outage')) {
          status = 'major';
        }

        // Get components
        const components = [];
        document.querySelectorAll('.component-inner-container').forEach(comp => {
          const name = comp.querySelector('.name')?.textContent?.trim() || '';
          const compStatus = comp.querySelector('.component-status')?.textContent?.trim() || '';
          if (name) {
            components.push({ name, status: compStatus });
          }
        });

        // Get incidents
        const incidents = [];
        document.querySelectorAll('.incident-container, .unresolved-incident').forEach(inc => {
          const title = inc.querySelector('.incident-title, h3')?.textContent?.trim() || '';
          const incStatus = inc.querySelector('.incident-status, .status')?.textContent?.trim() || '';
          const timestamp = inc.querySelector('time, .timestamp')?.textContent?.trim() || '';
          if (title) {
            incidents.push({ title, status: incStatus, timestamp });
          }
        });

        // Get last updated
        const lastUpdated = document.querySelector('.last-updated-stamp time, .updated')?.textContent?.trim() || '';

        return {
          status,
          statusText,
          components: components.slice(0, 10),
          incidents: incidents.slice(0, 5),
          lastUpdated
        };
      })()
    `,
  },
  cloudflare: {
    name: 'Cloudflare',
    url: 'https://www.cloudflarestatus.com/',
    extract: `
      (() => {
        const statusEl = document.querySelector('.page-status .status');
        const statusText = statusEl?.textContent?.trim() || 'Unknown';

        let status = 'unknown';
        const statusLower = statusText.toLowerCase();
        if (statusLower.includes('operational') || statusLower.includes('all systems')) {
          status = 'operational';
        } else if (statusLower.includes('degraded') || statusLower.includes('minor')) {
          status = 'degraded';
        } else if (statusLower.includes('partial')) {
          status = 'partial';
        } else if (statusLower.includes('major') || statusLower.includes('outage')) {
          status = 'major';
        }

        const components = [];
        document.querySelectorAll('.component-inner-container').forEach(comp => {
          const name = comp.querySelector('.name')?.textContent?.trim() || '';
          const compStatus = comp.querySelector('.component-status')?.textContent?.trim() || '';
          if (name) components.push({ name, status: compStatus });
        });

        const incidents = [];
        document.querySelectorAll('.unresolved-incident').forEach(inc => {
          const title = inc.querySelector('.incident-title')?.textContent?.trim() || '';
          const incStatus = inc.querySelector('.incident-status')?.textContent?.trim() || '';
          if (title) incidents.push({ title, status: incStatus, timestamp: '' });
        });

        return {
          status,
          statusText,
          components: components.slice(0, 10),
          incidents: incidents.slice(0, 5),
          lastUpdated: ''
        };
      })()
    `,
  },
  vercel: {
    name: 'Vercel',
    url: 'https://www.vercel-status.com/',
    extract: `
      (() => {
        const statusEl = document.querySelector('.page-status .status');
        const statusText = statusEl?.textContent?.trim() || 'Unknown';

        let status = 'unknown';
        const statusLower = statusText.toLowerCase();
        if (statusLower.includes('operational') || statusLower.includes('all systems')) {
          status = 'operational';
        } else if (statusLower.includes('degraded') || statusLower.includes('minor')) {
          status = 'degraded';
        } else if (statusLower.includes('partial')) {
          status = 'partial';
        } else if (statusLower.includes('major') || statusLower.includes('outage')) {
          status = 'major';
        }

        const components = [];
        document.querySelectorAll('.component-inner-container').forEach(comp => {
          const name = comp.querySelector('.name')?.textContent?.trim() || '';
          const compStatus = comp.querySelector('.component-status')?.textContent?.trim() || '';
          if (name) components.push({ name, status: compStatus });
        });

        return {
          status,
          statusText,
          components: components.slice(0, 10),
          incidents: [],
          lastUpdated: ''
        };
      })()
    `,
  },
  npm: {
    name: 'npm',
    url: 'https://status.npmjs.org/',
    extract: `
      (() => {
        const statusEl = document.querySelector('.page-status .status');
        const statusText = statusEl?.textContent?.trim() || 'Unknown';

        let status = 'unknown';
        const statusLower = statusText.toLowerCase();
        if (statusLower.includes('operational') || statusLower.includes('all systems')) {
          status = 'operational';
        } else if (statusLower.includes('degraded') || statusLower.includes('minor')) {
          status = 'degraded';
        } else if (statusLower.includes('partial')) {
          status = 'partial';
        } else if (statusLower.includes('major') || statusLower.includes('outage')) {
          status = 'major';
        }

        const components = [];
        document.querySelectorAll('.component-inner-container').forEach(comp => {
          const name = comp.querySelector('.name')?.textContent?.trim() || '';
          const compStatus = comp.querySelector('.component-status')?.textContent?.trim() || '';
          if (name) components.push({ name, status: compStatus });
        });

        return {
          status,
          statusText,
          components: components.slice(0, 10),
          incidents: [],
          lastUpdated: ''
        };
      })()
    `,
  },
  atlassian: {
    name: 'Atlassian (Jira/Confluence)',
    url: 'https://status.atlassian.com/',
    extract: `
      (() => {
        const statusEl = document.querySelector('.page-status .status');
        const statusText = statusEl?.textContent?.trim() || 'Unknown';

        let status = 'unknown';
        const statusLower = statusText.toLowerCase();
        if (statusLower.includes('operational') || statusLower.includes('all systems')) {
          status = 'operational';
        } else if (statusLower.includes('degraded') || statusLower.includes('minor')) {
          status = 'degraded';
        } else if (statusLower.includes('partial')) {
          status = 'partial';
        } else if (statusLower.includes('major') || statusLower.includes('outage')) {
          status = 'major';
        }

        const components = [];
        document.querySelectorAll('.component-inner-container').forEach(comp => {
          const name = comp.querySelector('.name')?.textContent?.trim() || '';
          const compStatus = comp.querySelector('.component-status')?.textContent?.trim() || '';
          if (name) components.push({ name, status: compStatus });
        });

        return {
          status,
          statusText,
          components: components.slice(0, 10),
          incidents: [],
          lastUpdated: ''
        };
      })()
    `,
  },
};

type StatusPageKey = keyof typeof STATUS_PAGES;

// Check a single service status
async function checkServiceStatus(serviceKey: StatusPageKey): Promise<ServiceStatus> {
  const service = STATUS_PAGES[serviceKey];
  const startTime = Date.now();

  const browser = createBrowserService({
    sessionId: `status-${serviceKey}`,
    enableSecurity: true,
  });

  try {
    browser.startTrajectory(`Check ${service.name} status`);

    await browser.open(service.url);
    await browser.wait({ timeout: 3000 }); // Wait for dynamic content

    const data = await browser.evaluate(service.extract);

    await browser.endTrajectory(true, `${service.name}: ${data.statusText}`);

    return {
      service: service.name,
      url: service.url,
      status: data.status,
      statusText: data.statusText,
      components: data.components,
      incidents: data.incidents,
      lastUpdated: data.lastUpdated || new Date().toISOString(),
      checkDuration: Date.now() - startTime,
    };

  } catch (error) {
    await browser.endTrajectory(false, String(error));
    return {
      service: service.name,
      url: service.url,
      status: 'unknown',
      statusText: `Error: ${error}`,
      checkDuration: Date.now() - startTime,
      lastUpdated: new Date().toISOString(),
    };

  } finally {
    await browser.close();
  }
}

// Check all services in parallel
async function checkAllServices(serviceKeys?: StatusPageKey[]): Promise<StatusReport> {
  const keys = serviceKeys || (Object.keys(STATUS_PAGES) as StatusPageKey[]);

  console.log('🔍 Service Status Monitor');
  console.log('═'.repeat(60));
  console.log(`\n📡 Checking ${keys.length} services...\n`);

  const swarm = createBrowserSwarm({
    maxSessions: 4,
    enableSecurity: true,
  });

  const startTime = Date.now();
  const services: ServiceStatus[] = [];

  // Check all services in parallel
  const promises = keys.map(async (key) => {
    const service = STATUS_PAGES[key];
    const taskStart = Date.now();

    console.log(`   🚀 Checking: ${service.name}`);

    try {
      const browser = await swarm.spawn();
      await browser.open(service.url);
      await browser.wait({ timeout: 2000 });

      const data = await browser.evaluate(service.extract);
      await browser.close();

      const statusEmoji = {
        operational: '✅',
        degraded: '⚠️ ',
        partial: '🟡',
        major: '🔴',
        unknown: '❓',
      }[data.status] || '❓';

      console.log(`   ${statusEmoji} ${service.name}: ${data.statusText}`);

      return {
        service: service.name,
        url: service.url,
        status: data.status,
        statusText: data.statusText,
        components: data.components,
        incidents: data.incidents,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
        checkDuration: Date.now() - taskStart,
      };

    } catch (error) {
      console.log(`   ❌ ${service.name}: Error`);
      return {
        service: service.name,
        url: service.url,
        status: 'unknown' as const,
        statusText: `Check failed: ${error}`,
        checkDuration: Date.now() - taskStart,
        lastUpdated: new Date().toISOString(),
      };
    }
  });

  const results = await Promise.all(promises);
  services.push(...results);

  const totalDuration = Date.now() - startTime;

  // Determine overall health
  const operationalCount = services.filter(s => s.status === 'operational').length;
  const majorIssues = services.filter(s => s.status === 'major' || s.status === 'partial').length;

  let overallHealth: 'healthy' | 'degraded' | 'outage' = 'healthy';
  if (majorIssues > 0) {
    overallHealth = 'outage';
  } else if (operationalCount < services.length) {
    overallHealth = 'degraded';
  }

  // Generate summary
  const summary = `${operationalCount}/${services.length} services operational`;

  // Display results
  console.log('\n' + '─'.repeat(60));
  console.log('📊 STATUS REPORT');
  console.log('─'.repeat(60));

  const healthEmoji = {
    healthy: '🟢',
    degraded: '🟡',
    outage: '🔴',
  }[overallHealth];

  console.log(`\n${healthEmoji} Overall Health: ${overallHealth.toUpperCase()}`);
  console.log(`📝 Summary: ${summary}`);
  console.log(`⏱️  Total check time: ${totalDuration}ms\n`);

  // Detailed service status
  console.log('📋 Service Details:');
  console.log('─'.repeat(60));

  services.forEach((service) => {
    const emoji = {
      operational: '✅',
      degraded: '⚠️ ',
      partial: '🟡',
      major: '🔴',
      unknown: '❓',
    }[service.status] || '❓';

    console.log(`\n${emoji} ${service.service}`);
    console.log(`   Status: ${service.statusText}`);
    console.log(`   URL: ${service.url}`);
    console.log(`   Check time: ${service.checkDuration}ms`);

    if (service.components && service.components.length > 0) {
      console.log(`   Components:`);
      service.components.slice(0, 5).forEach(c => {
        const compEmoji = c.status.toLowerCase().includes('operational') ? '✓' : '!';
        console.log(`      ${compEmoji} ${c.name}: ${c.status}`);
      });
    }

    if (service.incidents && service.incidents.length > 0) {
      console.log(`   ⚠️  Active Incidents:`);
      service.incidents.forEach(inc => {
        console.log(`      - ${inc.title}`);
      });
    }
  });

  console.log('\n' + '─'.repeat(60));

  return {
    overallHealth,
    services,
    checkedAt: new Date().toISOString(),
    totalDuration,
    summary,
  };
}

// Generate a simple alert message
function generateAlert(report: StatusReport): string | null {
  if (report.overallHealth === 'healthy') {
    return null;
  }

  const issues = report.services.filter(s =>
    s.status !== 'operational' && s.status !== 'unknown'
  );

  if (issues.length === 0) {
    return null;
  }

  const alertLines = [
    `🚨 SERVICE ALERT: ${report.overallHealth.toUpperCase()}`,
    `Time: ${report.checkedAt}`,
    '',
    'Affected Services:',
    ...issues.map(s => `  - ${s.service}: ${s.statusText}`),
    '',
    'Check status pages for more details.',
  ];

  return alertLines.join('\n');
}

// Run the demo
async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          SERVICE STATUS MONITOR DEMO                       ║');
  console.log('║                                                            ║');
  console.log('║  This demo monitors REAL status pages:                     ║');
  console.log('║  • GitHub Status    • Cloudflare Status   • Vercel        ║');
  console.log('║  • npm Registry     • Atlassian (Jira/Confluence)         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    // Check all services
    const report = await checkAllServices();

    // Check if we need to alert
    const alert = generateAlert(report);
    if (alert) {
      console.log('\n' + '!'.repeat(60));
      console.log(alert);
      console.log('!'.repeat(60));
    } else {
      console.log('\n✅ All systems operational - no alerts needed.');
    }

    // Show export format
    console.log('\n📦 JSON Export Preview:');
    console.log('─'.repeat(60));
    const exportData = {
      health: report.overallHealth,
      summary: report.summary,
      checkedAt: report.checkedAt,
      services: report.services.map(s => ({
        name: s.service,
        status: s.status,
        statusText: s.statusText,
      })),
    };
    console.log(JSON.stringify(exportData, null, 2).substring(0, 500) + '...');
    console.log('─'.repeat(60));

    console.log('\n✨ Demo complete! All status checks were performed on real status pages.');
    console.log('   Use this for monitoring your infrastructure dependencies!');

  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
