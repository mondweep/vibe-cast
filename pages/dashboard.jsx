import React, { useEffect, useState } from 'react';
import { ListTicketsResponse, AgentsStatusResponse, Ticket } from '@/lib/types';

export default function Dashboard() {
  const [tickets, setTickets] = useState<ListTicketsResponse | null>(null);
  const [agents, setAgents] = useState<AgentsStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

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

    // Poll for updates every 2 seconds
    const interval = setInterval(fetchData, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleProcessAll = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/agents/process-all', { method: 'POST' });
      const data = await response.json();
      console.log('Processing complete:', data);

      // Refresh data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Processing failed:', error);
      alert('Processing failed. Check console for details.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px' }}>Loading dashboard...</div>;
  }

  const totalCost = agents?.agents.reduce((sum, a) => sum + (a.tokensUsed * 0.003 / 1000), 0) || 0;
  const resolvedRate = tickets?.total ? ((tickets.resolved / tickets.total) * 100).toFixed(1) : '0';

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0 }}>🎯 Support Triage Dashboard</h1>
        <button
          onClick={handleProcessAll}
          disabled={isProcessing}
          style={{
            padding: '10px 20px',
            backgroundColor: isProcessing ? '#ccc' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {isProcessing ? '⏳ Processing...' : '▶️ Process All'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px', marginBottom: '40px' }}>
        <MetricCard title="Total Tickets" value={tickets?.total || 0} color="#3b82f6" />
        <MetricCard title="Pending" value={tickets?.pending || 0} color="#f59e0b" />
        <MetricCard title="Resolved" value={tickets?.resolved || 0} color="#10b981" />
        <MetricCard title="Escalated" value={tickets?.escalated || 0} color="#ef4444" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '40px' }}>
        <MetricCard title="Resolution Rate" value={`${resolvedRate}%`} color="#8b5cf6" />
        <MetricCard title="Total Cost" value={`$${totalCost.toFixed(4)}`} color="#6366f1" />
      </div>

      <h2>Agent Status</h2>
      <div style={{ overflowX: 'auto', marginBottom: '40px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc', backgroundColor: '#f9fafb' }}>
              <th style={{ textAlign: 'left', padding: '12px', fontWeight: '600' }}>Agent</th>
              <th style={{ textAlign: 'right', padding: '12px', fontWeight: '600' }}>Tokens Used</th>
              <th style={{ textAlign: 'right', padding: '12px', fontWeight: '600' }}>Budget Remaining</th>
              <th style={{ textAlign: 'right', padding: '12px', fontWeight: '600' }}>% Used</th>
            </tr>
          </thead>
          <tbody>
            {agents?.agents.map(agent => (
              <tr key={agent.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>
                  <code style={{ fontSize: '12px', color: '#666' }}>{agent.id}</code>
                </td>
                <td style={{ textAlign: 'right', padding: '12px' }}>{agent.tokensUsed.toLocaleString()}</td>
                <td style={{ textAlign: 'right', padding: '12px' }}>
                  {(agent.monthlyBudget - agent.tokensUsed).toLocaleString()}
                </td>
                <td style={{ textAlign: 'right', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                    <div style={{ width: '60px', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(agent.percentBudgetUsed, 100)}%`,
                          backgroundColor: agent.percentBudgetUsed > 80 ? '#ef4444' : agent.percentBudgetUsed > 50 ? '#f59e0b' : '#10b981'
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '12px', minWidth: '40px' }}>{agent.percentBudgetUsed.toFixed(1)}%</span>
                  </div>
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
            <tr style={{ borderBottom: '2px solid #ccc', backgroundColor: '#f9fafb' }}>
              <th style={{ textAlign: 'left', padding: '12px', fontWeight: '600' }}>ID</th>
              <th style={{ textAlign: 'left', padding: '12px', fontWeight: '600' }}>Customer</th>
              <th style={{ textAlign: 'left', padding: '12px', fontWeight: '600' }}>Subject</th>
              <th style={{ textAlign: 'left', padding: '12px', fontWeight: '600' }}>Category</th>
              <th style={{ textAlign: 'left', padding: '12px', fontWeight: '600' }}>Priority</th>
              <th style={{ textAlign: 'left', padding: '12px', fontWeight: '600' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {tickets?.tickets.slice(0, 15).map(ticket => (
              <tr
                key={ticket.id}
                style={{
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer',
                  backgroundColor: selectedTicket?.id === ticket.id ? '#f0f9ff' : 'transparent',
                  transition: 'background-color 0.2s'
                }}
                onClick={() => setSelectedTicket(ticket)}
              >
                <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{ticket.id}</td>
                <td style={{ padding: '12px' }}>{ticket.customer_name}</td>
                <td style={{ padding: '12px' }}>{ticket.subject.substring(0, 50)}</td>
                <td style={{ padding: '12px' }}>
                  {ticket.category ? (
                    <span style={{
                      padding: '4px 8px',
                      backgroundColor: getCategoryColor(ticket.category),
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {ticket.category}
                    </span>
                  ) : '-'}
                </td>
                <td style={{ padding: '12px' }}>
                  {ticket.priority ? (
                    <span style={{
                      padding: '4px 8px',
                      backgroundColor: getPriorityColor(ticket.priority),
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {ticket.priority}
                    </span>
                  ) : '-'}
                </td>
                <td style={{ padding: '12px' }}>
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

      {selectedTicket && (
        <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f0f9ff', borderRadius: '4px', border: '1px solid #0284c7' }}>
          <h3 style={{ marginTop: 0 }}>📌 {selectedTicket.subject}</h3>
          <p><strong>Customer:</strong> {selectedTicket.customer_name} ({selectedTicket.email})</p>
          <p><strong>Description:</strong> {selectedTicket.description}</p>
          {selectedTicket.resolution && (
            <p><strong>Resolution:</strong> {selectedTicket.resolution}</p>
          )}
          <button
            onClick={() => setSelectedTicket(null)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#0284c7',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
        <small>Last updated: {agents?.timestamp} • Auto-refresh: every 2 seconds • Demo Mode: All data is simulated</small>
      </div>
    </div>
  );
}

function MetricCard({ title, value, color = '#3b82f6' }: { title: string; value: number | string; color?: string }) {
  return (
    <div style={{
      padding: '20px',
      backgroundColor: 'white',
      borderRadius: '4px',
      border: `3px solid ${color}`,
      textAlign: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ fontSize: '13px', color: '#666', marginBottom: '10px', fontWeight: '500' }}>{title}</div>
      <div style={{ fontSize: '36px', fontWeight: 'bold', color }}>{value}</div>
    </div>
  );
}

function getCategoryColor(category: string): string {
  const colors: { [key: string]: string } = {
    'billing': '#f59e0b',
    'technical': '#3b82f6',
    'account': '#8b5cf6',
    'feature-request': '#10b981'
  };
  return colors[category] || '#6b7280';
}

function getPriorityColor(priority: string): string {
  const colors: { [key: string]: string } = {
    'critical': '#dc2626',
    'high': '#ea580c',
    'medium': '#f59e0b',
    'low': '#10b981'
  };
  return colors[priority] || '#6b7280';
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
