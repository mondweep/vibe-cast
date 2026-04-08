import React, { useEffect, useState } from 'react';
import { ListTicketsResponse, AgentsStatusResponse } from '@/lib/types';

export default function Dashboard() {
  const [tickets, setTickets] = useState<ListTicketsResponse | null>(null);
  const [agents, setAgents] = useState<AgentsStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ticketsRes, agentsRes] = await Promise.all([
          fetch('/api/tickets'),
          fetch('/api/agents/status')
        ]);

        const ticketsData = await ticketsRes.json();
        const agentsData = await agentsRes.json();

        setTickets(ticketsData);
        setAgents(agentsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Poll for updates every 3 seconds
    const interval = setInterval(fetchData, 3000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div style={{ padding: '40px' }}>Loading dashboard...</div>;
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>Support Triage Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px', marginBottom: '40px' }}>
        <MetricCard title="Total Tickets" value={tickets?.total || 0} />
        <MetricCard title="Pending" value={tickets?.pending || 0} />
        <MetricCard title="Resolved" value={tickets?.resolved || 0} />
        <MetricCard title="Escalated" value={tickets?.escalated || 0} />
      </div>

      <h2>Agent Status</h2>
      <div style={{ overflowX: 'auto', marginBottom: '40px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc' }}>
              <th style={{ textAlign: 'left', padding: '10px' }}>Agent</th>
              <th style={{ textAlign: 'right', padding: '10px' }}>Tokens Used</th>
              <th style={{ textAlign: 'right', padding: '10px' }}>Budget Remaining</th>
              <th style={{ textAlign: 'right', padding: '10px' }}>% Used</th>
            </tr>
          </thead>
          <tbody>
            {agents?.agents.map(agent => (
              <tr key={agent.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>{agent.id}</td>
                <td style={{ textAlign: 'right', padding: '10px' }}>{agent.tokensUsed.toLocaleString()}</td>
                <td style={{ textAlign: 'right', padding: '10px' }}>
                  {(agent.monthlyBudget - agent.tokensUsed).toLocaleString()}
                </td>
                <td style={{ textAlign: 'right', padding: '10px' }}>
                  {agent.percentBudgetUsed.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Recent Tickets</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc' }}>
              <th style={{ textAlign: 'left', padding: '10px' }}>ID</th>
              <th style={{ textAlign: 'left', padding: '10px' }}>Customer</th>
              <th style={{ textAlign: 'left', padding: '10px' }}>Subject</th>
              <th style={{ textAlign: 'left', padding: '10px' }}>Category</th>
              <th style={{ textAlign: 'left', padding: '10px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {tickets?.tickets.slice(0, 10).map(ticket => (
              <tr key={ticket.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>{ticket.id}</td>
                <td style={{ padding: '10px' }}>{ticket.customer_name}</td>
                <td style={{ padding: '10px' }}>{ticket.subject}</td>
                <td style={{ padding: '10px' }}>{ticket.category || '-'}</td>
                <td style={{ padding: '10px' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: getStatusColor(ticket.status),
                    color: 'white',
                    fontSize: '12px'
                  }}>
                    {ticket.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '40px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
        <small>Last updated: {agents?.timestamp}</small>
      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#f5f5f5',
      borderRadius: '4px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>{title}</div>
      <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{value}</div>
    </div>
  );
}

function getStatusColor(status: string): string {
  const colors: { [key: string]: string } = {
    'new': '#9ca3af',
    'classified': '#3b82f6',
    'assigned': '#8b5cf6',
    'processing': '#f59e0b',
    'resolved': '#10b981',
    'escalated': '#ef4444',
    'pending-human': '#ef4444'
  };
  return colors[status] || '#9ca3af';
}
