import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StatCard } from '../domains/shared/components/StatCard';
import { mockDashboardStats, monthlyTrends } from '../domains/shared/services/mockDashboard';
import './Dashboard.css';

export function Dashboard() {
  const { t } = useTranslation();
  const { propertyRegistration: pr, costAuditing: ca } = mockDashboardStats;

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h2>{t('dashboard.heading')}</h2>
        <p className="dashboard__desc">
          {t('dashboard.desc')}
        </p>
      </div>

      {/* Property Registration Section */}
      <section aria-labelledby="pr-heading" className="dashboard__section">
        <div className="dashboard__section-header">
          <h3 id="pr-heading">{t('nav.propertyRegistration')}</h3>
          <Link to="/property" className="btn btn--secondary">
            {t('dashboard.viewAllApplications')}
          </Link>
        </div>
        <div className="dashboard__stats-grid">
          <StatCard
            label={t('dashboard.totalApplications')}
            value={pr.totalApplications.toLocaleString()}
            subtitle={t('dashboard.sinceLaunch')}
            trend="up"
            trendLabel={t('dashboard.plus23Today')}
            variant="default"
          />
          <StatCard
            label={t('dashboard.remoteAdoption')}
            value={`${pr.remoteAdoptionPercent}%`}
            subtitle={t('dashboard.target80')}
            trend="up"
            trendLabel={t('dashboard.onTrack')}
            variant="success"
          />
          <StatCard
            label={t('dashboard.avgProcessing')}
            value={t('dashboard.days', { count: pr.avgProcessingDays })}
            subtitle={t('dashboard.downFrom22')}
            trend="down"
            trendLabel={t('dashboard.pctFaster')}
            variant="success"
          />
          <StatCard
            label={t('dashboard.aiVerificationAccuracy')}
            value={`${pr.verificationAccuracy}%`}
            subtitle={t('dashboard.target95')}
            trend="up"
            trendLabel={t('dashboard.exceedingTarget')}
            variant="success"
          />
        </div>
      </section>

      {/* Cost Auditing Section */}
      <section aria-labelledby="ca-heading" className="dashboard__section">
        <div className="dashboard__section-header">
          <h3 id="ca-heading">{t('auditing.heading')}</h3>
          <Link to="/auditing" className="btn btn--secondary">
            {t('dashboard.viewAllEstimates')}
          </Link>
        </div>
        <div className="dashboard__stats-grid">
          <StatCard
            label={t('dashboard.totalEstimates')}
            value={ca.totalEstimates}
            subtitle={t('dashboard.thisFiscalYear')}
            variant="default"
          />
          <StatCard
            label={t('dashboard.flaggedEstimates')}
            value={ca.flaggedEstimates}
            subtitle={t('dashboard.pctOfTotal', { pct: ((ca.flaggedEstimates / ca.totalEstimates) * 100).toFixed(1) })}
            variant="warning"
          />
          <StatCard
            label={t('dashboard.savingsThisMonth')}
            value={`₹${ca.savingsThisMonth_crore} Cr`}
            subtitle={t('dashboard.fromFraudPrevention')}
            trend="up"
            trendLabel={t('dashboard.crSaved', { amount: ca.savingsThisMonth_crore })}
            variant="success"
          />
          <StatCard
            label={t('dashboard.fraudDetectionRate')}
            value={`${ca.fraudDetectionRate}%`}
            subtitle={t('dashboard.target80')}
            trend="up"
            trendLabel={t('dashboard.exceedingTarget')}
            variant="success"
          />
        </div>
      </section>

      {/* Trends Summary */}
      <section aria-labelledby="trends-heading" className="dashboard__section">
        <h3 id="trends-heading">{t('dashboard.sixMonthTrends')}</h3>
        <div className="dashboard__trends-grid">
          <div className="card">
            <h4>{t('dashboard.digitalRegistrationsGrowth')}</h4>
            <div className="trends-chart" role="img" aria-label="Registration trend showing growth from 142 to 423 over 6 months">
              <div className="trends-bars">
                {monthlyTrends.labels.map((month, i) => (
                  <div key={month} className="trends-bar-group">
                    <div
                      className="trends-bar trends-bar--primary"
                      style={{ height: `${(monthlyTrends.registrations[i] / 450) * 100}%` }}
                      title={`${month}: ${monthlyTrends.registrations[i]} ${t('dashboard.registrations')}`}
                    />
                    <span className="trends-bar-label">{month}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="card">
            <h4>{t('dashboard.cumulativeSavings')}</h4>
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
            <h4>{t('dashboard.avgProcessingDays')}</h4>
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
        <h3 id="actions-heading">{t('dashboard.quickActions')}</h3>
        <div className="dashboard__actions">
          <Link to="/property/new" className="action-card">
            <span className="action-card__icon" aria-hidden="true">📝</span>
            <span className="action-card__label">{t('dashboard.newPropertyRegistration')}</span>
            <span className="action-card__desc">{t('dashboard.newPropertyDesc')}</span>
          </Link>
          <Link to="/auditing/new" className="action-card">
            <span className="action-card__icon" aria-hidden="true">📊</span>
            <span className="action-card__label">{t('dashboard.submitCostEstimate')}</span>
            <span className="action-card__desc">{t('dashboard.submitCostDesc')}</span>
          </Link>
          <Link to="/auditing" className="action-card">
            <span className="action-card__icon" aria-hidden="true">🔍</span>
            <span className="action-card__label">{t('dashboard.reviewFlaggedEstimates')}</span>
            <span className="action-card__desc">{t('dashboard.reviewFlaggedDesc')}</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
