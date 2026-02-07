import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { mockApplications } from '../services/mockData';
import type { ApplicationStatus, VerificationStatus } from '../types';
import './PropertyRegistration.css';

export function ApplicationDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const app = mockApplications.find((a) => a.id === id);

  const statusLabels: Record<ApplicationStatus, string> = {
    draft: t('property.statusLabelsFull.draft'),
    submitted: t('property.statusLabelsFull.submitted'),
    documents_under_review: t('property.statusLabelsFull.documents_under_review'),
    verification_complete: t('property.statusLabelsFull.verification_complete'),
    awaiting_signature: t('property.statusLabelsFull.awaiting_signature'),
    registered: t('property.statusLabelsFull.registered'),
    rejected: t('property.statusLabelsFull.rejected'),
  };

  const statusShortLabels: Record<ApplicationStatus, string> = {
    draft: t('property.statusLabels.draft'),
    submitted: t('property.statusLabels.submitted'),
    documents_under_review: t('property.statusLabels.documents_under_review'),
    verification_complete: t('property.statusLabels.verification_complete'),
    awaiting_signature: t('property.statusLabels.awaiting_signature'),
    registered: t('property.statusLabels.registered'),
    rejected: t('property.statusLabels.rejected'),
  };

  const verificationLabels: Record<VerificationStatus, { label: string; className: string }> = {
    pending: { label: t('property.verificationLabels.pending'), className: 'badge--gray' },
    in_progress: { label: t('property.verificationLabels.in_progress'), className: 'badge--yellow' },
    verified: { label: t('property.verificationLabels.verified'), className: 'badge--green' },
    rejected: { label: t('property.verificationLabels.rejected'), className: 'badge--red' },
    needs_review: { label: t('property.verificationLabels.needs_review'), className: 'badge--yellow' },
  };

  const dateLocale = i18n.language === 'as' ? 'as-IN' : i18n.language === 'hi' ? 'hi-IN' : 'en-IN';

  if (!app) {
    return (
      <div className="pr-detail">
        <h2>{t('property.notFound')}</h2>
        <p>{t('property.notFoundDesc')}</p>
        <Link to="/property" className="btn btn--primary">{t('property.backToList')}</Link>
      </div>
    );
  }

  const progressSteps: ApplicationStatus[] = [
    'submitted',
    'documents_under_review',
    'verification_complete',
    'awaiting_signature',
    'registered',
  ];
  const currentStepIndex = progressSteps.indexOf(app.status);

  return (
    <div className="pr-detail">
      <div className="pr-detail__breadcrumb">
        <Link to="/property">{t('property.heading')}</Link>
        <span aria-hidden="true"> / </span>
        <span>{app.applicationNumber}</span>
      </div>

      <div className="pr-detail__header">
        <div>
          <h2>{app.applicationNumber}</h2>
          <p className="pr-detail__address">{app.property.address}</p>
        </div>
        <span className={`badge ${app.status === 'registered' ? 'badge--green' : app.status === 'rejected' ? 'badge--red' : 'badge--blue'}`} style={{ fontSize: '0.875rem', padding: '6px 16px' }}>
          {statusShortLabels[app.status]}
        </span>
      </div>

      {/* Progress Tracker */}
      <div className="pr-detail__progress" role="progressbar" aria-valuenow={currentStepIndex + 1} aria-valuemin={1} aria-valuemax={progressSteps.length} aria-label={t('property.progressLabel')}>
        <div className="progress-track">
          {progressSteps.map((step, i) => {
            const isComplete = i <= currentStepIndex;
            const isCurrent = i === currentStepIndex;
            return (
              <div key={step} className={`progress-step ${isComplete ? 'progress-step--complete' : ''} ${isCurrent ? 'progress-step--current' : ''}`}>
                <div className="progress-step__dot">
                  {isComplete ? '✓' : i + 1}
                </div>
                <span className="progress-step__label">{statusLabels[step]}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pr-detail__grid">
        {/* Property Details */}
        <section className="card" aria-labelledby="property-heading">
          <h3 id="property-heading">{t('property.propertyDetails')}</h3>
          <dl className="pr-detail__dl">
            <dt>{t('property.type')}</dt>
            <dd>{app.property.type === 'flat' ? t('property.flat') : t('property.apartment')}</dd>
            <dt>{t('property.address')}</dt>
            <dd>{app.property.address}</dd>
            <dt>{t('property.district')}</dt>
            <dd>{app.property.district}</dd>
            <dt>{t('property.area')}</dt>
            <dd>{app.property.area_sqft.toLocaleString()} {t('property.sqft')}</dd>
            <dt>{t('property.value')}</dt>
            <dd>₹{app.property.price_inr.toLocaleString()}</dd>
          </dl>
        </section>

        {/* Parties */}
        <section className="card" aria-labelledby="parties-heading">
          <h3 id="parties-heading">{t('property.buyerAndSeller')}</h3>
          <div className="pr-detail__parties">
            <div>
              <h4>{t('property.buyer')}</h4>
              <p><strong>{app.buyer.name}</strong></p>
              <p>{app.buyer.email}</p>
              <p>{app.buyer.phone}</p>
              <p>{t('property.aadhaar')}: ****{app.buyer.aadhaarLast4}</p>
            </div>
            <div>
              <h4>{t('property.seller')}</h4>
              <p><strong>{app.seller.name}</strong></p>
              <p>{app.seller.email}</p>
              <p>{app.seller.phone}</p>
              <p>{t('property.aadhaar')}: ****{app.seller.aadhaarLast4}</p>
            </div>
          </div>
        </section>

        {/* Fees */}
        <section className="card" aria-labelledby="fees-heading">
          <h3 id="fees-heading">{t('property.govFees')}</h3>
          <dl className="pr-detail__dl">
            <dt>{t('property.registrationFee')}</dt>
            <dd>₹{app.governmentFee_inr.toLocaleString()}</dd>
            <dt>{t('property.stampDuty')}</dt>
            <dd>₹{app.stampDuty_inr.toLocaleString()}</dd>
            <dt>{t('property.totalPayable')}</dt>
            <dd><strong>₹{(app.governmentFee_inr + app.stampDuty_inr).toLocaleString()}</strong></dd>
          </dl>
        </section>

        {/* Documents */}
        <section className="card pr-detail__docs" aria-labelledby="docs-heading">
          <h3 id="docs-heading">{t('property.aiDocVerification')}</h3>
          <div className="table-wrap">
            <table aria-label={t('property.aiDocVerification')}>
              <thead>
                <tr>
                  <th scope="col">{t('property.document')}</th>
                  <th scope="col">{t('property.docType')}</th>
                  <th scope="col">{t('property.verificationStatus')}</th>
                  <th scope="col">{t('property.aiConfidence')}</th>
                  <th scope="col">{t('property.flags')}</th>
                </tr>
              </thead>
              <tbody>
                {app.documents.map((doc) => {
                  const vStatus = verificationLabels[doc.verificationStatus];
                  return (
                    <tr key={doc.id}>
                      <td>{doc.fileName}</td>
                      <td style={{ textTransform: 'capitalize' }}>{doc.type.replace('_', ' ')}</td>
                      <td>
                        <span className={`badge ${vStatus.className}`}>{vStatus.label}</span>
                      </td>
                      <td>
                        <div className="confidence-bar" title={t('property.confidence', { pct: (doc.confidenceScore * 100).toFixed(0) })}>
                          <div
                            className="confidence-bar__fill"
                            style={{
                              width: `${doc.confidenceScore * 100}%`,
                              background: doc.confidenceScore >= 0.9 ? 'var(--color-success)' : doc.confidenceScore >= 0.8 ? 'var(--color-warning)' : 'var(--color-danger)',
                            }}
                          />
                          <span className="confidence-bar__label">{(doc.confidenceScore * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td>
                        {doc.anomalyFlags?.length ? (
                          doc.anomalyFlags.map((flag, i) => (
                            <span key={i} className="anomaly-flag">{flag}</span>
                          ))
                        ) : (
                          <span className="no-flags">{t('property.noIssues')}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {app.documents.some((d) => d.ocrExtracted) && (
            <div className="pr-detail__ocr">
              <h4>{t('property.ocrExtracted')}</h4>
              {app.documents
                .filter((d) => d.ocrExtracted)
                .map((doc) => (
                  <div key={doc.id} className="ocr-data">
                    <span className="ocr-data__source">{doc.fileName}</span>
                    <dl>
                      {Object.entries(doc.ocrExtracted!).map(([key, val]) => (
                        <div key={key} className="ocr-data__row">
                          <dt>{key}</dt>
                          <dd>{val}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
            </div>
          )}
        </section>

        {/* Status History */}
        <section className="card" aria-labelledby="history-heading">
          <h3 id="history-heading">{t('property.statusHistory')}</h3>
          <ol className="pr-detail__timeline">
            {app.statusHistory.map((entry, i) => (
              <li key={i} className="timeline-entry">
                <div className="timeline-entry__dot" />
                <div className="timeline-entry__content">
                  <strong>{statusLabels[entry.status]}</strong>
                  <time dateTime={entry.timestamp}>
                    {new Date(entry.timestamp).toLocaleString(dateLocale)}
                  </time>
                  {entry.note && <p className="timeline-entry__note">{entry.note}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
