import { useParams, Link } from 'react-router-dom';
import { mockEstimates } from '../services/mockData';
import type { RiskLevel } from '../types';
import './CostAuditing.css';

const riskLabels: Record<RiskLevel, { label: string; badge: string; action: string }> = {
  green: { label: 'Green', badge: 'badge--green', action: 'Auto-approved. No further action required.' },
  yellow: { label: 'Yellow', badge: 'badge--yellow', action: 'Supervisor review required. Engineer must provide justification.' },
  red: { label: 'Red', badge: 'badge--red', action: 'Executive investigation required. Detailed quotation review mandatory.' },
};

export function EstimateDetail() {
  const { id } = useParams<{ id: string }>();
  const estimate = mockEstimates.find((e) => e.id === id);

  if (!estimate) {
    return (
      <div className="ca-detail">
        <h2>Estimate Not Found</h2>
        <Link to="/auditing" className="btn btn--primary">Back to Dashboard</Link>
      </div>
    );
  }

  const risk = riskLabels[estimate.riskLevel];

  return (
    <div className="ca-detail">
      <div className="ca-detail__breadcrumb">
        <Link to="/auditing">Cost Auditing</Link>
        <span aria-hidden="true"> / </span>
        <span>{estimate.projectName}</span>
      </div>

      <div className="ca-detail__header">
        <div>
          <h2>{estimate.projectName}</h2>
          <p className="ca-detail__location">{estimate.location} &middot; {estimate.district}</p>
        </div>
        <span className={`badge ${risk.badge}`} style={{ fontSize: '1rem', padding: '8px 20px' }}>
          {risk.label} Risk
        </span>
      </div>

      {/* AI Analysis Alert */}
      <div className={`ca-alert ca-alert--${estimate.riskLevel}`} role="alert">
        <div className="ca-alert__header">
          <strong>AI Analysis Result</strong>
          <span>Score: {(estimate.aiAnalysis.overallScore * 100).toFixed(0)}/100</span>
        </div>
        <p>{estimate.aiAnalysis.explanation}</p>
        <p className="ca-alert__action"><strong>Required Action:</strong> {risk.action}</p>
      </div>

      <div className="ca-detail__grid">
        {/* Project Overview */}
        <section className="card" aria-labelledby="overview-heading">
          <h3 id="overview-heading">Project Overview</h3>
          <dl className="ca-detail__dl">
            <dt>Project Type</dt>
            <dd style={{ textTransform: 'capitalize' }}>{estimate.projectType.replace(/-/g, ' ')}</dd>
            <dt>Length</dt>
            <dd>{estimate.lengthKm} km</dd>
            <dt>Width</dt>
            <dd>{estimate.widthM} m</dd>
            <dt>Submitted By</dt>
            <dd>{estimate.submittedBy}</dd>
            <dt>Submitted On</dt>
            <dd>{new Date(estimate.submittedAt).toLocaleDateString('en-IN')}</dd>
          </dl>
        </section>

        {/* Cost Comparison */}
        <section className="card" aria-labelledby="cost-heading">
          <h3 id="cost-heading">Cost Comparison</h3>
          <div className="ca-cost-comparison">
            <div className="ca-cost-item">
              <span className="ca-cost-item__label">Estimated Cost</span>
              <span className="ca-cost-item__value ca-cost-item__value--estimated">
                ₹{(estimate.estimatedCost_inr / 10000000).toFixed(2)} Cr
              </span>
            </div>
            <div className="ca-cost-item">
              <span className="ca-cost-item__label">AI Baseline</span>
              <span className="ca-cost-item__value ca-cost-item__value--baseline">
                ₹{(estimate.baselineCost_inr / 10000000).toFixed(2)} Cr
              </span>
            </div>
            <div className="ca-cost-item">
              <span className="ca-cost-item__label">Variance</span>
              <span className={`ca-cost-item__value ca-cost-item__value--${estimate.riskLevel}`}>
                {estimate.costRatio.toFixed(2)}x ({((estimate.costRatio - 1) * 100).toFixed(0)}% above baseline)
              </span>
            </div>
            <div className="ca-cost-item">
              <span className="ca-cost-item__label">Baseline Cost/km</span>
              <span className="ca-cost-item__value">
                ₹{(estimate.aiAnalysis.baselineCostPerKm / 100000).toFixed(1)} Lakh/km
              </span>
            </div>
          </div>

          {/* Visual cost bar */}
          <div className="ca-cost-visual" aria-label={`Estimated cost is ${estimate.costRatio.toFixed(2)}x the baseline`}>
            <div className="ca-cost-bar">
              <div className="ca-cost-bar__baseline" style={{ width: `${(1 / Math.max(estimate.costRatio, 1)) * 100}%` }}>
                <span>Baseline</span>
              </div>
              <div className={`ca-cost-bar__estimate ca-cost-bar__estimate--${estimate.riskLevel}`}>
                <span>Estimate</span>
              </div>
            </div>
          </div>
        </section>

        {/* Material Breakdown */}
        <section className="card ca-detail__full-width" aria-labelledby="materials-heading">
          <h3 id="materials-heading">Material Cost Breakdown</h3>
          <div className="table-wrap">
            <table aria-label="Material cost breakdown with market rate comparison">
              <thead>
                <tr>
                  <th scope="col">Material</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Unit Price (₹)</th>
                  <th scope="col">Market Rate (₹)</th>
                  <th scope="col">Variance</th>
                  <th scope="col">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {estimate.materialBreakdown.map((mat, i) => (
                  <tr key={i}>
                    <td><strong>{mat.material}</strong></td>
                    <td>{mat.quantity.toLocaleString()} {mat.unit}</td>
                    <td>₹{mat.unitPrice_inr.toLocaleString()}</td>
                    <td>₹{mat.marketRate_inr.toLocaleString()}</td>
                    <td>
                      <span
                        style={{
                          color: mat.variance_percent > 15
                            ? 'var(--color-risk-red)'
                            : mat.variance_percent > 5
                            ? 'var(--color-risk-yellow)'
                            : 'var(--color-risk-green)',
                          fontWeight: 600,
                        }}
                      >
                        {mat.variance_percent > 0 ? '+' : ''}{mat.variance_percent.toFixed(1)}%
                      </span>
                    </td>
                    <td>₹{(mat.totalCost_inr / 100000).toFixed(1)} L</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Suspicious Items */}
        {estimate.aiAnalysis.suspiciousLineItems.length > 0 && (
          <section className="card" aria-labelledby="suspicious-heading">
            <h3 id="suspicious-heading">Suspicious Line Items</h3>
            <ul className="ca-suspicious-list">
              {estimate.aiAnalysis.suspiciousLineItems.map((item, i) => (
                <li key={i} className="ca-suspicious-item">{item}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Similar Projects */}
        <section className="card" aria-labelledby="similar-heading">
          <h3 id="similar-heading">Similar Historical Projects</h3>
          <div className="table-wrap">
            <table aria-label="Similar historical projects used for baseline">
              <thead>
                <tr>
                  <th scope="col">Project</th>
                  <th scope="col">District</th>
                  <th scope="col">Length</th>
                  <th scope="col">Cost/km</th>
                  <th scope="col">Year</th>
                </tr>
              </thead>
              <tbody>
                {estimate.aiAnalysis.similarProjects.map((proj, i) => (
                  <tr key={i}>
                    <td>{proj.name}</td>
                    <td>{proj.district}</td>
                    <td>{proj.lengthKm} km</td>
                    <td>₹{(proj.costPerKm / 100000).toFixed(1)} L/km</td>
                    <td>{proj.year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Justification */}
        {estimate.justification && (
          <section className="card" aria-labelledby="justification-heading">
            <h3 id="justification-heading">Engineer's Justification</h3>
            <blockquote className="ca-justification">
              "{estimate.justification}"
              <footer>— {estimate.submittedBy}</footer>
            </blockquote>
          </section>
        )}

        {/* Audit Trail */}
        <section className="card ca-detail__full-width" aria-labelledby="audit-heading">
          <h3 id="audit-heading">Audit Trail</h3>
          <ol className="ca-audit-trail">
            {estimate.auditTrail.map((entry, i) => (
              <li key={i} className="ca-audit-entry">
                <div className="ca-audit-entry__dot" />
                <div className="ca-audit-entry__content">
                  <strong>{entry.action}</strong>
                  <span className="ca-audit-entry__actor">{entry.actor}</span>
                  <time dateTime={entry.timestamp}>
                    {new Date(entry.timestamp).toLocaleString('en-IN')}
                  </time>
                  {entry.notes && <p className="ca-audit-entry__note">{entry.notes}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Approval Actions */}
        {estimate.approvalStatus === 'under_review' && (
          <section className="card ca-detail__full-width" aria-labelledby="actions-heading">
            <h3 id="actions-heading">Approval Actions</h3>
            <div className="ca-approval-actions">
              <button className="btn btn--primary">Approve Estimate</button>
              <button className="btn btn--secondary">Request More Information</button>
              <button className="btn btn--danger">Reject & Flag for Investigation</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
