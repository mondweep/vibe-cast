import React from 'react';

export default function Home() {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>Customer Support Triage Demo</h1>
      <p>Multi-agent autonomous support system</p>

      <div style={{ marginTop: '20px' }}>
        <h2>Quick Links</h2>
        <ul>
          <li><a href="/dashboard">View Dashboard</a></li>
          <li><a href="/api/tickets">API: List Tickets</a></li>
          <li><a href="/api/agents/status">API: Agent Status</a></li>
        </ul>
      </div>

      <div style={{ marginTop: '30px', maxWidth: '600px' }}>
        <h2>How it works</h2>
        <ol>
          <li>Customers submit support tickets via the API</li>
          <li>Intake Agent classifies tickets into categories (billing, technical, account, feature-request)</li>
          <li>Specialist agents (Billing, Technical, Account) resolve issues in parallel</li>
          <li>Escalation Manager handles out-of-scope issues</li>
          <li>Dashboard shows real-time activity, cost tracking, and agent reasoning</li>
        </ol>
      </div>

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
        <h3>Status</h3>
        <p>✅ Backend infrastructure ready</p>
        <p>⏳ Intake Agent implementation in progress</p>
        <p>⏳ Specialist agents coming next</p>
        <p>⏳ Dashboard frontend coming soon</p>
      </div>
    </div>
  );
}
