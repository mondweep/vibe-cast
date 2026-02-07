import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { mockEstimates } from '../services/mockData';
import type { RiskLevel } from '../types';
import './CostAuditing.css';

export function EstimateDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const estimate = mockEstimates.find((e) => e.id === id);

  const riskLabels: Record<RiskLevel, { label: string; badge: string; action: string }> = {
    green: { label: t('auditing.green'), badge: 'badge--green', action: t('auditing.riskActions.green') },
    yellow: { label: t('auditing.yellow'), badge: 'badge--yellow', action: t('auditing.riskActions.yellow') },
    red: { label: t('auditing.red'), badge: 'badge--red', action: t('auditing.riskActions.red') },
  };

  if (!estimate) {
    return (
      <div className="ca-detail">
        <h2>{t('auditing.notFound')}</h2>
        <Link to="/auditing" className="btn btn--primary">{t('auditing.backToDashboard')}</Link>
      </div>
    );
  }

  const risk = riskLabels[estimate.riskLevel];

  return (
    <div className="ca-detail">
      <div className="ca-detail__breadcrumb">
        <Link to="/auditing">{t('nav.costAuditing')}</Link>
        <span aria-hidden="true"> / </span>
        <span>{estimate.projectName}</span>
      </div>

      <div className="ca-detail__header">
        <div>
          <h2>{estimate.projectName}</h2>
          <p className="ca-detail__location">{estimate.location} &middot; {estimate.district}</p>
        </div>
        <span className={`badge ${risk.badge}`} style={{ fontSize: '1rem', padding: '8px 20px' }}>
          {t('auditing.riskLabel', { level: risk.label })}
        </span>
      </div>

      {/* AI Analysis Alert */}
      <div className={`ca-alert ca-alert--${estimate.riskLevel}`} role="alert">
        <div className="ca-alert__header">
          <strong>{t('auditing.aiAnalysisResult')}</strong>
          <span>{t('auditing.score', { score: (estimate.aiAnalysis.overallScore * 100).toFixed(0) })}</span>
        </div>
        <p>{estimate.aiAnalysis.explanation}</p>
        <p className="ca-alert__action"><strong>{t('auditing.requiredAction')}</strong> {risk.action}</p>
      </div>

      <div className="ca-detail__grid">
        {/* Project Overview */}
        <section className="card" aria-labelledby="overview-heading">
          <h3 id="overview-heading">{t('auditing.projectOverview')}</h3>
          <dl className="ca-detail__dl">
            <dt>{t('auditing.projectType')}</dt>
            <dd style={{ textTransform: 'capitalize' }}>{estimate.projectType.replace(/-/g, ' ')}</dd>
            <dt>{t('auditing.lengthLabel')}</dt>
            <dd>{estimate.lengthKm} km</dd>
            <dt>{t('auditing.width')}</dt>
            <dd>{estimate.widthM} m</dd>
            <dt>{t('auditing.submittedBy')}</dt>
            <dd>{estimate.submittedBy}</dd>
            <dt>{t('auditing.submittedOn')}</dt>
            <dd>{new Date(estimate.submittedAt).toLocaleDateString(i18n.language)}</dd>
          </dl>
        </section>

        {/* Cost Comparison */}
        <section className="card" aria-labelledby="cost-heading">
          <h3 id="cost-heading">{t('auditing.costComparison')}</h3>
          <div className="ca-cost-comparison">
            <div className="ca-cost-item">
              <span className="ca-cost-item__label">{t('auditing.estimatedCostLabel')}</span>
              <span className="ca-cost-item__value ca-cost-item__value--estimated">
                ₹{(estimate.estimatedCost_inr / 10000000).toFixed(2)} {t('auditing.cr')}
              </span>
            </div>
            <div className="ca-cost-item">
              <span className="ca-cost-item__label">{t('auditing.aiBaseline')}</span>
              <span className="ca-cost-item__value ca-cost-item__value--baseline">
                ₹{(estimate.baselineCost_inr / 10000000).toFixed(2)} {t('auditing.cr')}
              </span>
            </div>
            <div className="ca-cost-item">
              <span className="ca-cost-item__label">{t('auditing.variance')}</span>
              <span className={`ca-cost-item__value ca-cost-item__value--${estimate.riskLevel}`}>
                {estimate.costRatio.toFixed(2)}x ({t('auditing.aboveBaseline', { pct: ((estimate.costRatio - 1) * 100).toFixed(0) })})
              </span>
            </div>
            <div className="ca-cost-item">
              <span className="ca-cost-item__label">{t('auditing.baselineCostPerKm')}</span>
              <span className="ca-cost-item__value">
                ₹{(estimate.aiAnalysis.baselineCostPerKm / 100000).toFixed(1)} {t('auditing.lakhPerKm')}
              </span>
            </div>
          </div>

          {/* Visual cost bar */}
          <div className="ca-cost-visual" aria-label={`${t('auditing.estimatedCostLabel')} ${estimate.costRatio.toFixed(2)}x ${t('auditing.baseline')}`}>
            <div className="ca-cost-bar">
              <div className="ca-cost-bar__baseline" style={{ width: `${(1 / Math.max(estimate.costRatio, 1)) * 100}%` }}>
                <span>{t('auditing.baselineBar')}</span>
              </div>
              <div className={`ca-cost-bar__estimate ca-cost-bar__estimate--${estimate.riskLevel}`}>
                <span>{t('auditing.estimateBar')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Material Breakdown */}
        <section className="card ca-detail__full-width" aria-labelledby="materials-heading">
          <h3 id="materials-heading">{t('auditing.materialBreakdown')}</h3>
          <div className="table-wrap">
            <table aria-label={t('auditing.materialBreakdown')}>
              <thead>
                <tr>
                  <th scope="col">{t('auditing.material')}</th>
                  <th scope="col">{t('auditing.quantity')}</th>
                  <th scope="col">{t('auditing.unitPrice')}</th>
                  <th scope="col">{t('auditing.marketRate')}</th>
                  <th scope="col">{t('auditing.varianceCol')}</th>
                  <th scope="col">{t('auditing.totalCol')}</th>
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
            <h3 id="suspicious-heading">{t('auditing.suspiciousItems')}</h3>
            <ul className="ca-suspicious-list">
              {estimate.aiAnalysis.suspiciousLineItems.map((item, i) => (
                <li key={i} className="ca-suspicious-item">{item}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Similar Projects */}
        <section className="card" aria-labelledby="similar-heading">
          <h3 id="similar-heading">{t('auditing.similarProjects')}</h3>
          <div className="table-wrap">
            <table aria-label={t('auditing.similarProjects')}>
              <thead>
                <tr>
                  <th scope="col">{t('auditing.project')}</th>
                  <th scope="col">{t('auditing.district')}</th>
                  <th scope="col">{t('auditing.length')}</th>
                  <th scope="col">{t('auditing.costPerKm')}</th>
                  <th scope="col">{t('auditing.year')}</th>
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
            <h3 id="justification-heading">{t('auditing.engineerJustification')}</h3>
            <blockquote className="ca-justification">
              "{estimate.justification}"
              <footer>— {estimate.submittedBy}</footer>
            </blockquote>
          </section>
        )}

        {/* Audit Trail */}
        <section className="card ca-detail__full-width" aria-labelledby="audit-heading">
          <h3 id="audit-heading">{t('auditing.auditTrail')}</h3>
          <ol className="ca-audit-trail">
            {estimate.auditTrail.map((entry, i) => (
              <li key={i} className="ca-audit-entry">
                <div className="ca-audit-entry__dot" />
                <div className="ca-audit-entry__content">
                  <strong>{entry.action}</strong>
                  <span className="ca-audit-entry__actor">{entry.actor}</span>
                  <time dateTime={entry.timestamp}>
                    {new Date(entry.timestamp).toLocaleString(i18n.language)}
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
            <h3 id="actions-heading">{t('auditing.approvalActions')}</h3>
            <div className="ca-approval-actions">
              <button className="btn btn--primary">{t('auditing.approveEstimate')}</button>
              <button className="btn btn--secondary">{t('auditing.requestMoreInfo')}</button>
              <button className="btn btn--danger">{t('auditing.rejectFlag')}</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
