import React from 'react';

export default function Home() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb', 
      fontFamily: 'system-ui, -apple-system, sans-serif', 
      color: '#111827',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Hero Section */}
      <header style={{ 
        padding: '80px 40px', 
        textAlign: 'center', 
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', 
        color: 'white' 
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ 
            display: 'inline-block', 
            padding: '6px 12px', 
            backgroundColor: 'rgba(255,255,255,0.1)', 
            borderRadius: '20px', 
            fontSize: '12px', 
            fontWeight: 'bold', 
            marginBottom: '20px',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            🎯 AGENTIC FOUNDATION CASE STUDY
          </div>
          <h1 style={{ fontSize: '48px', fontWeight: '800', margin: '0 0 20px', letterSpacing: '-0.025em' }}>
            Autonomous Customer Support Triage
          </h1>
          <p style={{ fontSize: '20px', color: '#c7d2fe', lineHeight: '1.6', marginBottom: '40px' }}>
            A deep-dive into multi-agent orchestration. Transforming raw customer support data into 
            resolved tickets using Gemini 1.5/2.5 Flash.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <a href="/dashboard" style={{ 
              padding: '16px 32px', 
              backgroundColor: '#10b981', 
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '8px', 
              fontWeight: 'bold',
              boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)'
            }}>
              Launch Live Dashboard
            </a>
            <a href="https://github.com/mondweep/vibe-cast" target="_blank" rel="noopener noreferrer" style={{ 
              padding: '16px 32px', 
              backgroundColor: 'white', 
              color: '#1e1b4b', 
              textDecoration: 'none', 
              borderRadius: '8px', 
              fontWeight: 'bold'
            }}>
              View Source on GitHub
            </a>
          </div>
        </div>
      </header>

      {/* Feature Grid */}
      <main style={{ padding: '80px 40px', maxWidth: '1200px', margin: '0 auto', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '80px' }}>
          <Card 
            icon="🤖" 
            title="Smarter Ingestion" 
            desc="Every ticket is instantly analyzed by our Intake Agent for priority, sentiment, and technical scope." 
          />
          <Card 
            icon="⚖️" 
            title="Specialist Routing" 
            desc="Direct routing to Billing, Technical, or Account specialists ensuring higher resolution accuracy." 
          />
          <Card 
            icon="📊" 
            title="Inference Cost Tracking" 
            desc="Real-time monitoring of token consumption and estimated costs for every agentic decision." 
          />
        </div>

        {/* How it Works / Brief Diagram */}
        <div style={{ backgroundColor: 'white', padding: '60px', borderRadius: '24px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '40px' }}>How the Autonomous Loop Works</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <Step num="1" title="Submission" desc="RAW TICKET DATA" />
            <Arrow />
            <Step num="2" title="Classification" desc="INTAKE AGENT (LLM)" />
            <Arrow />
            <Step num="3" title="Resolution" desc="SPECIALIST AGENTS" />
            <Arrow />
            <Step num="4" title="Completion" desc="DASHBOARD SYNC" />
          </div>
        </div>
      </main>

      {/* Footer / Credits */}
      <footer style={{ 
        padding: '60px 40px', 
        backgroundColor: 'white', 
        borderTop: '1px solid #e5e7eb', 
        textAlign: 'center',
        color: '#6b7280',
        fontSize: '14px'
      }}>
        <p style={{ margin: 0 }}>
          Created by <strong>Mondweep Chakravorty</strong> • 
          <a href="https://www.linkedin.com/in/mondweepchakravorty/" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'none', marginLeft: '5px' }}>Connect on LinkedIn</a>
        </p>
        <p style={{ marginTop: '10px', fontStyle: 'italic' }}>
          Inspired by a discussion at the London Chapter's Agentics Foundation meetup (April 8, 2026).
        </p>
      </footer>
    </div>
  );
}

function Card({ icon, title, desc }: any) {
  return (
    <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ fontSize: '32px', marginBottom: '16px' }}>{icon}</div>
      <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>{title}</h3>
      <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6' }}>{desc}</p>
    </div>
  );
}

function Step({ num, title, desc }: any) {
  return (
    <div style={{ flex: 1, minWidth: '150px' }}>
      <div style={{ 
        width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#1e1b4b', color: 'white', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', fontWeight: 'bold' 
      }}>
        {num}
      </div>
      <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '5px' }}>{title}</div>
      <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{desc}</div>
    </div>
  );
}

function Arrow() {
  return <div style={{ color: '#e5e7eb', fontSize: '24px', display: 'none' }} className="md:block">➔</div>;
}
