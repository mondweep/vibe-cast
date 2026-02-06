import { Link } from 'react-router-dom';
import { StatCard } from '../domains/shared/components/StatCard';
import { mockDashboardStats, monthlyTrends } from '../domains/shared/services/mockDashboard';
import './Dashboard.css';

export function Dashboard() {
  const { propertyRegistration: pr, costAuditing: ca } = mockDashboardStats;

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h2>Governance Dashboard</h2>
        <p className="dashboard__desc">
          Real-time overview of Assam's AI-powered governance initiatives
        </p>
      </div>

      {/* Property Registration Section */}
      <section aria-labelledby="pr-heading" className="dashboard__section">
        <div className="dashboard__section-header">
          <h3 id="pr-heading">Property Registration</h3>
          <Link to="/property" className="btn btn--secondary">
            View All Applications
          </Link>
        </div>
        <div className="dashboard__stats-grid">
          <StatCard
            label="Total Applications"
            value={pr.totalApplications.toLocaleString()}
            subtitle="Since launch"
            trend="up"
            trendLabel="+23 today"
            variant="default"
          />
          <StatCard
            label="Remote Adoption"
            value={`${pr.remoteAdoptionPercent}%`}
            subtitle="Target: 80%"
            trend="up"
            trendLabel="On track"
            variant="success"
          />
          <StatCard
            label="Avg Processing"
            value={`${pr.avgProcessingDays} days`}
            subtitle="Down from 22 days"
            trend="down"
            trendLabel="72% faster"
            variant="success"
          />
          <StatCard
            label="AI Verification Accuracy"
            value={`${pr.verificationAccuracy}%`}
            subtitle="Target: 95%"
            trend="up"
            trendLabel="Exceeding target"
            variant="success"
          />
        </div>
      </section>

      {/* Cost Auditing Section */}
      <section aria-labelledby="ca-heading" className="dashboard__section">
        <div className="dashboard__section-header">
          <h3 id="ca-heading">Infrastructure Cost Auditing</h3>
          <Link to="/auditing" className="btn btn--secondary">
            View All Estimates
          </Link>
        </div>
        <div className="dashboard__stats-grid">
          <StatCard
            label="Total Estimates"
            value={ca.totalEstimates}
            subtitle="This fiscal year"
            variant="default"
          />
          <StatCard
            label="Flagged Estimates"
            value={ca.flaggedEstimates}
            subtitle={`${((ca.flaggedEstimates / ca.totalEstimates) * 100).toFixed(1)}% of total`}
            variant="warning"
          />
          <StatCard
            label="Savings This Month"
            value={`₹${ca.savingsThisMonth_crore} Cr`}
            subtitle="From fraud prevention"
            trend="up"
            trendLabel="₹8.4 Cr saved"
            variant="success"
          />
          <StatCard
            label="Fraud Detection Rate"
            value={`${ca.fraudDetectionRate}%`}
            subtitle="Target: 80%"
            trend="up"
            trendLabel="Exceeding target"
            variant="success"
          />
        </div>
      </section>

      {/* Trends Summary */}
      <section aria-labelledby="trends-heading" className="dashboard__section">
        <h3 id="trends-heading">6-Month Trends</h3>
        <div className="dashboard__trends-grid">
          <div className="card">
            <h4>Digital Registrations Growth</h4>
            <div className="trends-chart" role="img" aria-label="Registration trend showing growth from 142 to 423 over 6 months">
              <div className="trends-bars">
                {monthlyTrends.labels.map((month, i) => (
                  <div key={month} className="trends-bar-group">
                    <div
                      className="trends-bar trends-bar--primary"
                      style={{ height: `${(monthlyTrends.registrations[i] / 450) * 100}%` }}
                      title={`${month}: ${monthlyTrends.registrations[i]} registrations`}
                    />
                    <span className="trends-bar-label">{month}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="card">
            <h4>Cumulative Savings (₹ Crore)</h4>
            <div className="trends-chart" role="img" aria-label="Savings trend showing growth from ₹2.1 Cr to ₹8.4 Cr over 6 months">
              <div className="trends-bars">
                {monthlyTrends.labels.map((month, i) => (
                  <div key={month} className="trends-bar-group">
                    <div
                      className="trends-bar trends-bar--success"
                      style={{ height: `${(monthlyTrends.savings_crore[i] / 10) * 100}%` }}
                      title={`${month}: ₹${monthlyTrends.savings_crore[i]} Cr`}
                    />
                    <span className="trends-bar-label">{month}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="card">
            <h4>Avg Processing Days</h4>
            <div className="trends-chart" role="img" aria-label="Processing time trend showing reduction from 22 to 6.2 days">
              <div className="trends-bars">
                {monthlyTrends.labels.map((month, i) => (
                  <div key={month} className="trends-bar-group">
                    <div
                      className="trends-bar trends-bar--warning"
                      style={{ height: `${(monthlyTrends.processingDays[i] / 25) * 100}%` }}
                      title={`${month}: ${monthlyTrends.processingDays[i]} days`}
                    />
                    <span className="trends-bar-label">{month}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section aria-labelledby="actions-heading" className="dashboard__section">
        <h3 id="actions-heading">Quick Actions</h3>
        <div className="dashboard__actions">
          <Link to="/property/new" className="action-card">
            <span className="action-card__icon" aria-hidden="true">📝</span>
            <span className="action-card__label">New Property Registration</span>
            <span className="action-card__desc">Submit a digital property registration application</span>
          </Link>
          <Link to="/auditing/new" className="action-card">
            <span className="action-card__icon" aria-hidden="true">📊</span>
            <span className="action-card__label">Submit Cost Estimate</span>
            <span className="action-card__desc">Submit an infrastructure project cost estimate for AI review</span>
          </Link>
          <Link to="/auditing" className="action-card">
            <span className="action-card__icon" aria-hidden="true">🔍</span>
            <span className="action-card__label">Review Flagged Estimates</span>
            <span className="action-card__desc">View estimates requiring supervisor or executive review</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
