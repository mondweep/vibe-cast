import { useState } from 'react';
import { Link } from 'react-router-dom';
import { mockEstimates, mockHistoricalProjects } from '../services/mockData';
import type { RiskLevel } from '../types';
import './CostAuditing.css';

const riskConfig: Record<RiskLevel, { label: string; badge: string; desc: string }> = {
  green: { label: 'Green', badge: 'badge--green', desc: '< 1.2x baseline' },
  yellow: { label: 'Yellow', badge: 'badge--yellow', desc: '1.2x - 1.5x baseline' },
  red: { label: 'Red', badge: 'badge--red', desc: '> 1.5x baseline' },
};

export function CostAuditingDashboard() {
  const [filterRisk, setFilterRisk] = useState<RiskLevel | 'all'>('all');

  const filtered = filterRisk === 'all'
    ? mockEstimates
    : mockEstimates.filter((e) => e.riskLevel === filterRisk);

  const totalBaseline = mockEstimates.reduce((sum, e) => sum + e.baselineCost_inr, 0);
  const totalEstimated = mockEstimates.reduce((sum, e) => sum + e.estimatedCost_inr, 0);
  const potentialSavings = totalEstimated - totalBaseline;

  return (
    <div className="ca-dashboard">
      <div className="ca-dashboard__header">
        <div>
          <h2>Infrastructure Cost Auditing</h2>
          <p className="ca-dashboard__subtitle">
            AI-powered estimate validation for Assam PWD road projects
          </p>
        </div>
        <Link to="/auditing/new" className="btn btn--primary">
          + Submit Estimate
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="ca-dashboard__summary">
        <div className="ca-summary-card">
          <span className="ca-summary-card__label">Total Estimates</span>
          <span className="ca-summary-card__value">{mockEstimates.length}</span>
        </div>
        <div className="ca-summary-card ca-summary-card--green">
          <span className="ca-summary-card__label">Green (Auto-Approved)</span>
          <span className="ca-summary-card__value">
            {mockEstimates.filter((e) => e.riskLevel === 'green').length}
          </span>
        </div>
        <div className="ca-summary-card ca-summary-card--yellow">
          <span className="ca-summary-card__label">Yellow (Review)</span>
          <span className="ca-summary-card__value">
            {mockEstimates.filter((e) => e.riskLevel === 'yellow').length}
          </span>
        </div>
        <div className="ca-summary-card ca-summary-card--red">
          <span className="ca-summary-card__label">Red (Investigation)</span>
          <span className="ca-summary-card__value">
            {mockEstimates.filter((e) => e.riskLevel === 'red').length}
          </span>
        </div>
        <div className="ca-summary-card ca-summary-card--savings">
          <span className="ca-summary-card__label">Potential Savings</span>
          <span className="ca-summary-card__value">
            ₹{(potentialSavings / 10000000).toFixed(1)} Cr
          </span>
        </div>
      </div>

      {/* Risk Legend */}
      <div className="ca-risk-legend" role="note" aria-label="Risk level explanation">
        <h4>Risk Level Thresholds</h4>
        <div className="ca-risk-legend__items">
          {Object.entries(riskConfig).map(([key, config]) => (
            <div key={key} className="ca-risk-legend__item">
              <span className={`badge ${config.badge}`}>{config.label}</span>
              <span>{config.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="ca-dashboard__filter">
        <label htmlFor="risk-filter">Filter by risk:</label>
        <select
          id="risk-filter"
          value={filterRisk}
          onChange={(e) => setFilterRisk(e.target.value as RiskLevel | 'all')}
        >
          <option value="all">All Estimates</option>
          <option value="green">Green Only</option>
          <option value="yellow">Yellow Only</option>
          <option value="red">Red Only</option>
        </select>
      </div>

      {/* Estimates Table */}
      <div className="table-wrap">
        <table aria-label="Cost estimates for review">
          <thead>
            <tr>
              <th scope="col">Project</th>
              <th scope="col">District</th>
              <th scope="col">Type</th>
              <th scope="col">Length</th>
              <th scope="col">Estimated Cost</th>
              <th scope="col">Baseline</th>
              <th scope="col">Ratio</th>
              <th scope="col">Risk</th>
              <th scope="col">Status</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((est) => {
              const risk = riskConfig[est.riskLevel];
              return (
                <tr key={est.id}>
                  <td>
                    <strong>{est.projectName}</strong>
                    <br />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      by {est.submittedBy}
                    </span>
                  </td>
                  <td>{est.district}</td>
                  <td style={{ fontSize: '0.8125rem' }}>{est.projectType}</td>
                  <td>{est.lengthKm} km</td>
                  <td>₹{(est.estimatedCost_inr / 10000000).toFixed(1)} Cr</td>
                  <td>₹{(est.baselineCost_inr / 10000000).toFixed(1)} Cr</td>
                  <td>
                    <strong
                      style={{
                        color: est.riskLevel === 'red'
                          ? 'var(--color-risk-red)'
                          : est.riskLevel === 'yellow'
                          ? 'var(--color-risk-yellow)'
                          : 'var(--color-risk-green)',
                      }}
                    >
                      {est.costRatio.toFixed(2)}x
                    </strong>
                  </td>
                  <td><span className={`badge ${risk.badge}`}>{risk.label}</span></td>
                  <td style={{ textTransform: 'capitalize', fontSize: '0.8125rem' }}>
                    {est.approvalStatus.replace('_', ' ')}
                  </td>
                  <td>
                    <Link
                      to={`/auditing/${est.id}`}
                      className="btn btn--secondary"
                      style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                    >
                      Details
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Historical Projects Reference */}
      <section className="ca-dashboard__historical" aria-labelledby="historical-heading">
        <h3 id="historical-heading">Historical Cost Reference (Baseline Data)</h3>
        <p className="ca-dashboard__historical-desc">
          Historical road project costs used by the AI model for baseline calculations
        </p>
        <div className="table-wrap">
          <table aria-label="Historical road project costs">
            <thead>
              <tr>
                <th scope="col">Project</th>
                <th scope="col">Type</th>
                <th scope="col">District</th>
                <th scope="col">Length</th>
                <th scope="col">Estimated</th>
                <th scope="col">Actual</th>
                <th scope="col">Cost/km</th>
                <th scope="col">Year</th>
              </tr>
            </thead>
            <tbody>
              {mockHistoricalProjects.map((hp) => (
                <tr key={hp.id}>
                  <td>{hp.name}</td>
                  <td style={{ fontSize: '0.8125rem' }}>{hp.type}</td>
                  <td>{hp.district}</td>
                  <td>{hp.lengthKm} km</td>
                  <td>₹{(hp.estimatedCost_inr / 10000000).toFixed(1)} Cr</td>
                  <td>₹{(hp.actualCost_inr / 10000000).toFixed(1)} Cr</td>
                  <td>₹{(hp.costPerKm / 100000).toFixed(1)} L/km</td>
                  <td>{hp.completionYear}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
