import React, { useEffect, useState } from 'react';
import { ListTicketsResponse, AgentsStatusResponse, Ticket } from '@/lib/types';

export default function Dashboard() {
  const [tickets, setTickets] = useState<ListTicketsResponse | null>(null);
  const [agents, setAgents] = useState<AgentsStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'activity' | 'about'>('dashboard');
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ticketsRes, agentsRes, logsRes] = await Promise.all([
          fetch('/api/tickets'),
          fetch('/api/agents/status'),
          fetch('/api/tickets/logs?limit=50')
        ]);

        const ticketsData = await ticketsRes.json();
        const agentsData = await agentsRes.json();
        const logsData = await logsRes.json();

        setTickets(ticketsData);
        setAgents(agentsData);
        setLogs(logsData.logs || []);
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
      if (response.ok) {
        const data = await response.json();
        console.log('Batch processed:', data);
      }
    } catch (error) {
      console.warn('Batch processing note:', error);
      // Silent catch: the 2s dashboard poll will reveal successful updates 
      // even if the trigger request timed out or returned HTML.
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
    <div style={{ padding: '40px', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '1400px', margin: '0 auto', color: '#1f2937' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#111827' }}>🎯 Support Triage Demo</h1>
          <p style={{ margin: '5px 0 0', color: '#6b7280' }}>Autonomous Multi-Agent Orchestration</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} label="Dashboard" />
          <TabButton active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} label="Live Activity" />
          <TabButton active={activeTab === 'about'} onClick={() => setActiveTab('about')} label="How it Works" />
          <button
            onClick={handleProcessAll}
            disabled={isProcessing}
            style={{
              padding: '10px 24px',
              backgroundColor: isProcessing ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              marginLeft: '20px'
            }}
          >
            {isProcessing ? '⏳ Processing Batch...' : '▶️ Run Autonomous Cycle'}
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <>
          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
            <MetricCard title="Total Tickets" value={tickets?.total || 0} color="#3b82f6" icon="🎫" />
            <MetricCard title="Pending AI" value={tickets?.pending || 0} color="#f59e0b" icon="⏳" />
            <MetricCard title="Resolved" value={tickets?.resolved || 0} color="#10b981" icon="✅" />
            <MetricCard title="Escalated" value={tickets?.escalated || 0} color="#ef4444" icon="🚨" />
          </div>

          {/* Pipeline & Agents */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '40px' }}>
            <WorkforcePipeline 
              newCount={tickets?.total ? (tickets.total - (tickets.pending + tickets.resolved + tickets.escalated)) : 0}
              intakeCount={tickets?.pending || 0}
              resolutionCount={tickets?.resolved || 0}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '40px' }}>
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '16px' }}>Specialist Workforce Status</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {agents?.agents.map(agent => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            </div>

            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
               <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '5px' }}>Total Inference Cost</div>
                  <div style={{ fontSize: '42px', fontWeight: '800', color: '#6366f1' }}>${totalCost.toFixed(4)}</div>
                  <div style={{ marginTop: '15px', padding: '4px 12px', backgroundColor: '#eef2ff', color: '#6366f1', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                    Resolution Rate: {resolvedRate}%
                  </div>
               </div>
            </div>
          </div>

          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Live Ticket Queue (Full Batch)</h2>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxHeight: '600px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontSize: '13px' }}>
                  <th style={{ padding: '16px' }}>ID</th>
                  <th style={{ padding: '16px' }}>Customer</th>
                  <th style={{ padding: '16px' }}>Subject</th>
                  <th style={{ padding: '16px' }}>Category</th>
                  <th style={{ padding: '16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {tickets?.tickets.map(ticket => (
                  <tr
                    key={ticket.id}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      backgroundColor: selectedTicket?.id === ticket.id ? '#f3f4f6' : 'transparent',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <td style={{ padding: '16px', fontSize: '12px', color: '#9ca3af' }}>{ticket.id.split('-').pop()}</td>
                    <td style={{ padding: '16px', fontWeight: '500' }}>{ticket.customer_name}</td>
                    <td style={{ padding: '16px' }}>{ticket.subject.substring(0, 60)}...</td>
                    <td style={{ padding: '16px' }}>
                      <Tag color={getCategoryColor(ticket.category)} label={ticket.category || 'unclassified'} />
                    </td>
                    <td style={{ padding: '16px' }}>
                      <StatusBadge status={ticket.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedTicket && (
            <div style={{
              position: 'fixed', bottom: '20px', right: '20px', width: '450px',
              backgroundColor: 'white', padding: '30px', borderRadius: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e5e7eb', zIndex: 100
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>{selectedTicket.subject}</h3>
                <button onClick={() => setSelectedTicket(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px' }}>×</button>
              </div>
              <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6' }}>
                <p><strong>Customer:</strong> {selectedTicket.customer_name} ({selectedTicket.email})</p>
                <div style={{ padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '15px' }}>
                  {selectedTicket.description}
                </div>
                {selectedTicket.resolution && (
                  <div style={{ padding: '15px', backgroundColor: '#ecfdf5', border: '1px solid #10b981', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 5px', color: '#065f46', fontWeight: 'bold' }}>🤖 Agent Response:</p>
                    {selectedTicket.resolution}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : activeTab === 'activity' ? (
        <ActivityView agents={agents?.agents || []} logs={logs} />
      ) : (
        <AboutView />
      )}

      <footer style={{ marginTop: '60px', padding: '40px 0', borderTop: '1px solid #e5e7eb', textAlign: 'center', color: '#6b7280', fontSize: '13px', lineHeight: '2' }}>
        <p style={{ margin: 0 }}>
          Created by <strong>Mondweep Chakravorty</strong> • 
          <a href="https://www.linkedin.com/in/mondweepchakravorty/" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'none', marginLeft: '5px' }}>Connect on LinkedIn</a> • 
          <a href="https://github.com/mondweep/vibe-cast" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'none', marginLeft: '5px' }}>GitHub Repository</a>
        </p>
        <p style={{ margin: '5px 0 0', fontStyle: 'italic' }}>
          Inspired by a discussion at the London Chapter's Agentics Foundation meetup (8th April 2026).
        </p>
        <div style={{ marginTop: '15px' }}>
          Last sync: {new Date().toLocaleTimeString()} • Autonomous Cycle polls every 2s • Built with Gemini Flash
        </div>
      </footer>
    </div>
  );
}

function AboutView() {
  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', color: '#111827' }}>What is the Support Triage Demo?</h2>
          <p style={{ fontSize: '16px', lineHeight: '1.7', color: '#4b5563', maxWidth: '800px' }}>
            This demo showcases an <strong>autonomous multi-agent system</strong> designed to handle customer support tickets 
            at scale without human intervention. The system doesn't just categorize tickets; it analyzes intent, 
            applies specialist knowledge, and generates technical or account-based resolutions in real-time.
          </p>
        </section>

        <section style={{ marginBottom: '60px' }}>
          <h3 style={{ fontSize: '18px', color: '#374151', marginBottom: '30px' }}>The Agentic Lifecycle</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <FlowStep icon="📩" title="Ingestion" desc="Tickets arrive as raw data (mocked from 30 scenarios)." />
            <Arrow />
            <FlowStep icon="🧠" title="Intake Agent" desc="Gemini classifies category, priority, and sentiment." bg="#dbeafe" color="#1e40af" />
            <Arrow />
            <FlowStep icon="👮" title="Specialists" desc="Specific LLMs handle Billing, Technical, or Account logic." bg="#dcfce7" color="#166534" />
            <Arrow />
            <FlowStep icon="📝" title="Resolution" desc="Status updated and resolution reasoning is saved to DB." bg="#fef3c7" color="#92400e" />
          </div>
        </section>

        <section style={{ marginBottom: '60px' }}>
          <h3 style={{ fontSize: '18px', color: '#111827' }}>Technical Stack & Frameworks</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
            <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#0f172a' }}>📐 BHIL Methodology</div>
              <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#64748b', margin: 0 }}>
                This project implements the <a href="https://github.com/mondweep/vibe-cast/blob/BHIL-tinkerinh/.claude/commands/bhil.md" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', fontWeight: '600' }}>BHIL Framework</a>—a systematic AI-first development approach where specifications are the source of truth.
              </p>
            </div>
            <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#0f172a' }}>🖇️ PaperClipAI</div>
              <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#64748b', margin: 0 }}>
                Context orchestration is enhanced via <a href="https://github.com/paperclipai/paperclip" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', fontWeight: '600' }}>PaperClipAI</a>, ensuring specialists maintain high-fidelity memory across the agentic lifecycle.
              </p>
            </div>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
          <section>
            <h3 style={{ fontSize: '18px', color: '#111827' }}>Multi-Agent Strategy</h3>
            <ul style={{ paddingLeft: '20px', color: '#4b5563', lineHeight: '2' }}>
              <li><strong>Intake Agent</strong>: The "Front Desk". Standardizes all incoming chaos.</li>
              <li><strong>Technical Specialist</strong>: Deep-dives into bug reports and system errors.</li>
              <li><strong>Billing Specialist</strong>: Understands trial logic, payments, and refunds.</li>
              <li><strong>Escalation Manager</strong>: The safety net. Identifies issues requiring a human.</li>
            </ul>
          </section>
          
          <section>
            <h3 style={{ fontSize: '18px', color: '#111827' }}>Real-time Visualization</h3>
            <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#6b7280' }}>
              The Dashboard uses a <strong>polling mechanism</strong> (2s intervals) to track the "Autonomous Cycle". 
              As tickets are processed by the backend Gemini agents, the database state updates immediately. 
              The Metrics cards and Agent Status bars reflect token consumption and resolution progress live, 
              simulating a production environment at scale.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function FlowStep({ icon, title, desc, bg = '#f3f4f6', color = '#1f2937' }: any) {
  return (
    <div style={{ flex: 1, minWidth: '180px', padding: '20px', backgroundColor: bg, borderRadius: '12px', border: `1px solid ${bg === '#f3f4f6' ? '#e5e7eb' : 'transparent'}`, textAlign: 'center' }}>
      <div style={{ fontSize: '32px', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontWeight: 'bold', fontSize: '15px', color, marginBottom: '5px' }}>{title}</div>
      <div style={{ fontSize: '12px', color: '#4b5563' }}>{desc}</div>
    </div>
  );
}

function Arrow() {
  return <div style={{ fontSize: '24px', color: '#9ca3af' }}>➔</div>;
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 16px',
        backgroundColor: active ? '#f3f4f6' : 'transparent',
        color: active ? '#111827' : '#6b7280',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: active ? '600' : '400',
        transition: 'all 0.2s'
      }}
    >
      {label}
    </button>
  );
}

function MetricCard({ title, value, color, icon }: any) {
  return (
    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>{title}</span>
        <span style={{ fontSize: '18px' }}>{icon}</span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: '800', color }}>{value}</div>
    </div>
  );
}

function Tag({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ padding: '4px 10px', backgroundColor: color + '15', color, borderRadius: '20px', fontSize: '12px', fontWeight: '600', border: `1px solid ${color}40`, textTransform: 'uppercase' }}>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = getStatusColor(status);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
      <span style={{ fontSize: '13px', color: '#374151', textTransform: 'capitalize' }}>{status}</span>
    </div>
  );
}

function WorkforcePipeline({ newCount, intakeCount, resolutionCount }: any) {
  return (
    <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '16px', color: 'white' }}>
      <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <PipelineStage icon="📩" label="Incoming" count="Live" sub="New Tickets" />
        <PipelineArrow />
        <PipelineStage icon="🤖" label="Classification" count={intakeCount} sub="Intake Fleet" active={intakeCount > 0} />
        <PipelineArrow />
        <PipelineStage icon="⚡" label="Processing" count="..." sub="Specialists" active={intakeCount > 0} />
        <PipelineArrow />
        <PipelineStage icon="✅" label="Resolution" count={resolutionCount} sub="Resolved" />
      </div>
    </div>
  );
}

function PipelineStage({ icon, label, count, sub, active }: any) {
  return (
    <div style={{ textAlign: 'center', zIndex: 1, flex: 1 }}>
      <div style={{ 
        width: '60px', height: '60px', backgroundColor: active ? '#3b82f6' : '#334155', 
        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
        fontSize: '24px', margin: '0 auto 12px', transition: 'all 0.3s',
        boxShadow: active ? '0 0 20px rgba(59, 130, 246, 0.5)' : 'none',
        animation: active ? 'pulse 2s infinite' : 'none'
      }}>
        {icon}
      </div>
      <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: '800', color: active ? '#60a5fa' : '#94a3b8' }}>{count}</div>
      <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{sub}</div>
    </div>
  );
}

function PipelineArrow() {
  return <div style={{ alignSelf: 'center', fontSize: '20px', color: '#334155', marginTop: '-20px' }}>→</div>;
}

function AgentCard({ agent }: { agent: any }) {
  const isThinking = agent.status === 'processing';
  return (
    <div style={{ 
      padding: '16px', borderRadius: '12px', border: '1px solid #e5e7eb', 
      backgroundColor: isThinking ? '#f0f9ff' : 'white',
      boxShadow: isThinking ? '0 0 15px rgba(59, 130, 246, 0.1)' : 'none',
      transition: 'all 0.3s'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b7280' }}>{agent.id.replace('-agent', '').replace('-specialist', '').replace('-', ' ').toUpperCase()}</div>
        {isThinking && <span style={{ width: '8px', height: '8px', backgroundColor: '#3b82f6', borderRadius: '50%', animation: 'pulse 1s infinite' }} />}
      </div>
      
      <div style={{ height: '40px', marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
        {isThinking ? (
          <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: '500', fontStyle: 'italic', lineHeight: '1.4' }}>
            Thinking: {agent.currentActivity}
          </div>
        ) : (
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>Standby...</div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6b7280' }}>
        <span>Utilization: {agent.percentBudgetUsed.toFixed(1)}%</span>
        <span>{agent.tokensUsed.toLocaleString()} tokens</span>
      </div>
      <div style={{ width: '100%', height: '4px', backgroundColor: '#f3f4f6', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${agent.percentBudgetUsed}%`, backgroundColor: '#3b82f6' }} />
      </div>
    </div>
  );
}

function ActivityView({ agents, logs }: { agents: any[], logs: any[] }) {
  const activeAgents = agents.filter(a => a.status === 'processing');

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        {/* Active Heartbeats */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e5e7eb', height: 'fit-content' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#ef4444' }}>●</span> Live Heartbeats
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {activeAgents.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', border: '2px dashed #f3f4f6', borderRadius: '12px' }}>
                System Idle. No active heartbeats.
              </div>
            ) : (
              activeAgents.map(agent => (
                <div key={agent.id} style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '5px' }}>{agent.id}</div>
                  <div style={{ fontSize: '12px', color: '#1e40af', fontStyle: 'italic' }}>Thinking: {agent.currentActivity}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Historic Detail */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '16px' }}>Agent Reasoning History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '800px', overflowY: 'auto', paddingRight: '10px' }}>
            {logs.map(log => (
              <div key={log.id} style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <code style={{ fontSize: '11px', color: '#6366f1', fontWeight: 'bold', backgroundColor: '#eef2ff', padding: '2px 6px', borderRadius: '4px' }}>{log.agent_id}</code>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>{log.action}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6', whiteSpace: 'pre-wrap', backgroundColor: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                  {log.reasoning}
                </div>
                {log.tokens_used && (
                  <div style={{ marginTop: '10px', fontSize: '10px', color: '#9ca3af', textAlign: 'right' }}>
                    Inference Cost: {log.tokens_used} tokens
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function getCategoryColor(category: string | null): string {
  const colors: { [key: string]: string } = {
    'billing': '#f59e0b',
    'technical': '#3b82f6',
    'account': '#8b5cf6',
    'feature-request': '#10b981'
  };
  return (category && colors[category]) || '#6b7280';
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
