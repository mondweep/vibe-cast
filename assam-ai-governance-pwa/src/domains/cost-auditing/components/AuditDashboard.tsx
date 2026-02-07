import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { mockEstimates, mockHistoricalProjects } from '../services/mockData';
import type { RiskLevel } from '../types';
import './CostAuditing.css';

export function CostAuditingDashboard() {
  const { t } = useTranslation();
  const [filterRisk, setFilterRisk] = useState<RiskLevel | 'all'>('all');

  const riskConfig: Record<RiskLevel, { label: string; badge: string; desc: string }> = {
    green: { label: t('auditing.green'), badge: 'badge--green', desc: t('auditing.greenDesc') },
    yellow: { label: t('auditing.yellow'), badge: 'badge--yellow', desc: t('auditing.yellowDesc') },
    red: { label: t('auditing.red'), badge: 'badge--red', desc: t('auditing.redDesc') },
  };

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
          <h2>{t('auditing.heading')}</h2>
          <p className="ca-dashboard__subtitle">
            {t('auditing.subtitle')}
          </p>
        </div>
        <Link to="/auditing/new" className="btn btn--primary">
          {t('auditing.submitEstimate')}
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="ca-dashboard__summary">
        <div className="ca-summary-card">
          <span className="ca-summary-card__label">{t('auditing.totalEstimates')}</span>
          <span className="ca-summary-card__value">{mockEstimates.length}</span>
        </div>
        <div className="ca-summary-card ca-summary-card--green">
          <span className="ca-summary-card__label">{t('auditing.greenAutoApproved')}</span>
          <span className="ca-summary-card__value">
            {mockEstimates.filter((e) => e.riskLevel === 'green').length}
          </span>
        </div>
        <div className="ca-summary-card ca-summary-card--yellow">
          <span className="ca-summary-card__label">{t('auditing.yellowReview')}</span>
          <span className="ca-summary-card__value">
            {mockEstimates.filter((e) => e.riskLevel === 'yellow').length}
          </span>
        </div>
        <div className="ca-summary-card ca-summary-card--red">
          <span className="ca-summary-card__label">{t('auditing.redInvestigation')}</span>
          <span className="ca-summary-card__value">
            {mockEstimates.filter((e) => e.riskLevel === 'red').length}
          </span>
        </div>
        <div className="ca-summary-card ca-summary-card--savings">
          <span className="ca-summary-card__label">{t('auditing.potentialSavings')}</span>
          <span className="ca-summary-card__value">
            ₹{(potentialSavings / 10000000).toFixed(1)} {t('auditing.cr')}
          </span>
        </div>
      </div>

      {/* Risk Legend */}
      <div className="ca-risk-legend" role="note" aria-label={t('auditing.riskLevelThresholds')}>
        <h4>{t('auditing.riskLevelThresholds')}</h4>
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
        <label htmlFor="risk-filter">{t('auditing.filterByRisk')}</label>
        <select
          id="risk-filter"
          value={filterRisk}
          onChange={(e) => setFilterRisk(e.target.value as RiskLevel | 'all')}
        >
          <option value="all">{t('auditing.allEstimates')}</option>
          <option value="green">{t('auditing.greenOnly')}</option>
          <option value="yellow">{t('auditing.yellowOnly')}</option>
          <option value="red">{t('auditing.redOnly')}</option>
        </select>
      </div>

      {/* Estimates Table */}
      <div className="table-wrap">
        <table aria-label="Cost estimates for review">
          <thead>
            <tr>
              <th scope="col">{t('auditing.project')}</th>
              <th scope="col">{t('auditing.district')}</th>
              <th scope="col">{t('auditing.type')}</th>
              <th scope="col">{t('auditing.length')}</th>
              <th scope="col">{t('auditing.estimatedCost')}</th>
              <th scope="col">{t('auditing.baseline')}</th>
              <th scope="col">{t('auditing.ratio')}</th>
              <th scope="col">{t('auditing.risk')}</th>
              <th scope="col">{t('auditing.status')}</th>
              <th scope="col">{t('auditing.action')}</th>
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
                      {t('auditing.by')} {est.submittedBy}
                    </span>
                  </td>
                  <td>{est.district}</td>
                  <td style={{ fontSize: '0.8125rem' }}>{est.projectType}</td>
                  <td>{est.lengthKm} km</td>
                  <td>₹{(est.estimatedCost_inr / 10000000).toFixed(1)} {t('auditing.cr')}</td>
                  <td>₹{(est.baselineCost_inr / 10000000).toFixed(1)} {t('auditing.cr')}</td>
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
                      {t('auditing.details')}
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
        <h3 id="historical-heading">{t('auditing.historicalHeading')}</h3>
        <p className="ca-dashboard__historical-desc">
          {t('auditing.historicalDesc')}
        </p>
        <div className="table-wrap">
          <table aria-label="Historical road project costs">
            <thead>
              <tr>
                <th scope="col">{t('auditing.project')}</th>
                <th scope="col">{t('auditing.type')}</th>
                <th scope="col">{t('auditing.district')}</th>
                <th scope="col">{t('auditing.length')}</th>
                <th scope="col">{t('auditing.estimated')}</th>
                <th scope="col">{t('auditing.actual')}</th>
                <th scope="col">{t('auditing.costPerKm')}</th>
                <th scope="col">{t('auditing.year')}</th>
              </tr>
            </thead>
            <tbody>
              {mockHistoricalProjects.map((hp) => (
                <tr key={hp.id}>
                  <td>{hp.name}</td>
                  <td style={{ fontSize: '0.8125rem' }}>{hp.type}</td>
                  <td>{hp.district}</td>
                  <td>{hp.lengthKm} km</td>
                  <td>₹{(hp.estimatedCost_inr / 10000000).toFixed(1)} {t('auditing.cr')}</td>
                  <td>₹{(hp.actualCost_inr / 10000000).toFixed(1)} {t('auditing.cr')}</td>
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
