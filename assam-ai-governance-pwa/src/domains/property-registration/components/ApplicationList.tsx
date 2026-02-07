import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { mockApplications } from '../services/mockData';
import type { ApplicationStatus } from '../types';
import './PropertyRegistration.css';

export function PropertyRegistrationList() {
  const { t, i18n } = useTranslation();

  const statusConfig: Record<ApplicationStatus, { label: string; badge: string }> = {
    draft: { label: t('property.statusLabels.draft'), badge: 'badge--gray' },
    submitted: { label: t('property.statusLabels.submitted'), badge: 'badge--blue' },
    documents_under_review: { label: t('property.statusLabels.documents_under_review'), badge: 'badge--yellow' },
    verification_complete: { label: t('property.statusLabels.verification_complete'), badge: 'badge--green' },
    awaiting_signature: { label: t('property.statusLabels.awaiting_signature'), badge: 'badge--blue' },
    registered: { label: t('property.statusLabels.registered'), badge: 'badge--green' },
    rejected: { label: t('property.statusLabels.rejected'), badge: 'badge--red' },
  };

  const dateLocale = i18n.language === 'as' ? 'as-IN' : i18n.language === 'hi' ? 'hi-IN' : 'en-IN';

  return (
    <div className="pr-list">
      <div className="pr-list__header">
        <div>
          <h2>{t('property.heading')}</h2>
          <p className="pr-list__subtitle">
            {t('property.subtitle')}
          </p>
        </div>
        <Link to="/property/new" className="btn btn--primary">
          {t('property.newApplication')}
        </Link>
      </div>

      <div className="pr-list__summary">
        <div className="pr-list__summary-item">
          <span className="pr-list__summary-count">{mockApplications.length}</span>
          <span>{t('property.total')}</span>
        </div>
        <div className="pr-list__summary-item">
          <span className="pr-list__summary-count">
            {mockApplications.filter((a) => a.status === 'documents_under_review').length}
          </span>
          <span>{t('property.underReview')}</span>
        </div>
        <div className="pr-list__summary-item">
          <span className="pr-list__summary-count">
            {mockApplications.filter((a) => a.status === 'registered').length}
          </span>
          <span>{t('property.registered')}</span>
        </div>
      </div>

      <div className="table-wrap">
        <table aria-label="Property registration applications">
          <thead>
            <tr>
              <th scope="col">{t('property.applicationNum')}</th>
              <th scope="col">{t('property.propertyCol')}</th>
              <th scope="col">{t('property.district')}</th>
              <th scope="col">{t('property.buyer')}</th>
              <th scope="col">{t('property.status')}</th>
              <th scope="col">{t('property.submitted')}</th>
              <th scope="col">{t('property.action')}</th>
            </tr>
          </thead>
          <tbody>
            {mockApplications.map((app) => {
              const status = statusConfig[app.status];
              return (
                <tr key={app.id}>
                  <td>
                    <code>{app.applicationNumber}</code>
                  </td>
                  <td>
                    <div className="pr-list__property">
                      <strong>{app.property.type === 'flat' ? t('property.flat') : t('property.apartment')}</strong>
                      <span>{app.property.address}</span>
                    </div>
                  </td>
                  <td>{app.property.district}</td>
                  <td>{app.buyer.name}</td>
                  <td>
                    <span className={`badge ${status.badge}`}>{status.label}</span>
                  </td>
                  <td>{new Date(app.submittedAt).toLocaleDateString(dateLocale)}</td>
                  <td>
                    <Link to={`/property/${app.id}`} className="btn btn--secondary" style={{ padding: '4px 12px', fontSize: '0.75rem' }}>
                      {t('property.view')}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
