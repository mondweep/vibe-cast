/**
 * Dashboard Component
 *
 * Real-time activity feed and network statistics.
 * - Live stats (total memories, domains, active users)
 * - Activity feed with recent contributions and votes
 * - PubNub real-time updates
 *
 * Reference: SPEC-001
 */

import { useState, useMemo } from 'react';
import type { ActivityItem, DashboardStats } from '../types';
import './Dashboard.css';

interface DashboardProps {
  sessionId: string;
}

export function Dashboard({ sessionId }: DashboardProps) {
  // Mock data for demo purposes
  // In production, these would come from PubNub channels
  const [stats] = useState<DashboardStats>({
    totalMemories: Math.floor(Math.random() * 10000) + 5000,
    totalDomains: 42,
    activeUsers: Math.floor(Math.random() * 500) + 100,
    recentActivity: [
      {
        id: '1',
        type: 'contribution',
        user: 'anon_a1b2c3d4',
        timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
        title: 'Neural networks in biological systems',
      },
      {
        id: '2',
        type: 'vote',
        user: 'anon_e5f6g7h8',
        timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
        title: 'Quantum entanglement experiments',
      },
      {
        id: '3',
        type: 'contribution',
        user: 'anon_i9j0k1l2',
        timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
        title: 'Climate change mitigation strategies',
      },
      {
        id: '4',
        type: 'vote',
        user: 'anon_m3n4o5p6',
        timestamp: new Date(Date.now() - 20 * 60000).toISOString(),
        title: 'Synthetic biology applications',
      },
      {
        id: '5',
        type: 'contribution',
        user: 'anon_q7r8s9t0',
        timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
        title: 'Machine learning ethics',
      },
    ],
  });

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 60) return 'now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getActivityIcon = (type: string): string => {
    switch (type) {
      case 'contribution':
        return '✍️';
      case 'vote':
        return '🗳️';
      case 'query':
        return '🔍';
      default:
        return '📌';
    }
  };

  return (
    <div className="dashboard">
      <section className="stats-section">
        <h2>📊 Network Statistics</h2>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalMemories.toLocaleString()}</div>
            <div className="stat-label">Total Memories</div>
            <div className="stat-trend">📈 Growing network</div>
          </div>

          <div className="stat-card">
            <div className="stat-value">{stats.totalDomains}</div>
            <div className="stat-label">Knowledge Domains</div>
            <div className="stat-trend">🌍 Diverse topics</div>
          </div>

          <div className="stat-card">
            <div className="stat-value">{stats.activeUsers}</div>
            <div className="stat-label">Active Contributors</div>
            <div className="stat-trend">👥 Community</div>
          </div>

          <div className="stat-card">
            <div className="stat-value">
              {sessionId.substring(0, 8).toUpperCase()}...
            </div>
            <div className="stat-label">Your Session ID</div>
            <div className="stat-trend">🔐 Secure</div>
          </div>
        </div>
      </section>

      <section className="activity-section">
        <h2>🔄 Recent Activity</h2>
        <p className="activity-subtitle">
          Live feed of contributions and votes from the network
        </p>

        <div className="activity-feed">
          {stats.recentActivity.length === 0 ? (
            <div className="empty-activity">
              <p>No activity yet. Be the first to contribute!</p>
            </div>
          ) : (
            stats.recentActivity.map((item) => (
              <div key={item.id} className="activity-item">
                <div className="activity-icon">{getActivityIcon(item.type)}</div>

                <div className="activity-content">
                  <div className="activity-action">
                    <span className="user-id">{item.user}</span>
                    <span className="action-type">
                      {item.type === 'contribution'
                        ? 'contributed'
                        : item.type === 'vote'
                          ? 'voted on'
                          : 'queried'}
                    </span>
                  </div>

                  {item.title && <div className="activity-title">{item.title}</div>}

                  <div className="activity-meta">{formatTimeAgo(item.timestamp)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="network-section">
        <h2>🌐 About the Pi Network</h2>

        <div className="network-info">
          <div className="info-card">
            <h3>Decentralized Intelligence</h3>
            <p>
              The Pi Network is a collective intelligence platform where AI agents and humans
              collaborate to build distributed knowledge. Every contribution strengthens the network.
            </p>
          </div>

          <div className="info-card">
            <h3>Contribution-Based</h3>
            <p>
              Share insights, memories, and patterns. Vote on quality. The network learns and improves
              from every interaction through its Graph Neural Network (GNN) layer.
            </p>
          </div>

          <div className="info-card">
            <h3>Byzantine-Tolerant</h3>
            <p>
              Advanced cryptographic validation prevents data poisoning. Your contributions are
              verified and integrated into the collective knowledge safely.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
