import { useParams, Link } from 'react-router-dom';
import { mockApplications } from '../services/mockData';
import type { ApplicationStatus, VerificationStatus } from '../types';
import './PropertyRegistration.css';

const statusLabels: Record<ApplicationStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  documents_under_review: 'Documents Under Review',
  verification_complete: 'Verification Complete',
  awaiting_signature: 'Awaiting Digital Signature',
  registered: 'Registered',
  rejected: 'Rejected',
};

const verificationLabels: Record<VerificationStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'badge--gray' },
  in_progress: { label: 'In Progress', className: 'badge--yellow' },
  verified: { label: 'Verified', className: 'badge--green' },
  rejected: { label: 'Rejected', className: 'badge--red' },
  needs_review: { label: 'Needs Review', className: 'badge--yellow' },
};

export function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const app = mockApplications.find((a) => a.id === id);

  if (!app) {
    return (
      <div className="pr-detail">
        <h2>Application Not Found</h2>
        <p>The requested application could not be found.</p>
        <Link to="/property" className="btn btn--primary">Back to List</Link>
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
        <Link to="/property">Property Registration</Link>
        <span aria-hidden="true"> / </span>
        <span>{app.applicationNumber}</span>
      </div>

      <div className="pr-detail__header">
        <div>
          <h2>{app.applicationNumber}</h2>
          <p className="pr-detail__address">{app.property.address}</p>
        </div>
        <span className={`badge ${app.status === 'registered' ? 'badge--green' : app.status === 'rejected' ? 'badge--red' : 'badge--blue'}`} style={{ fontSize: '0.875rem', padding: '6px 16px' }}>
          {statusLabels[app.status]}
        </span>
      </div>

      {/* Progress Tracker */}
      <div className="pr-detail__progress" role="progressbar" aria-valuenow={currentStepIndex + 1} aria-valuemin={1} aria-valuemax={progressSteps.length} aria-label="Registration progress">
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
          <h3 id="property-heading">Property Details</h3>
          <dl className="pr-detail__dl">
            <dt>Type</dt>
            <dd>{app.property.type === 'flat' ? 'Flat' : 'Apartment'}</dd>
            <dt>Address</dt>
            <dd>{app.property.address}</dd>
            <dt>District</dt>
            <dd>{app.property.district}</dd>
            <dt>Area</dt>
            <dd>{app.property.area_sqft.toLocaleString()} sq ft</dd>
            <dt>Value</dt>
            <dd>₹{app.property.price_inr.toLocaleString()}</dd>
          </dl>
        </section>

        {/* Parties */}
        <section className="card" aria-labelledby="parties-heading">
          <h3 id="parties-heading">Buyer & Seller</h3>
          <div className="pr-detail__parties">
            <div>
              <h4>Buyer</h4>
              <p><strong>{app.buyer.name}</strong></p>
              <p>{app.buyer.email}</p>
              <p>{app.buyer.phone}</p>
              <p>Aadhaar: ****{app.buyer.aadhaarLast4}</p>
            </div>
            <div>
              <h4>Seller</h4>
              <p><strong>{app.seller.name}</strong></p>
              <p>{app.seller.email}</p>
              <p>{app.seller.phone}</p>
              <p>Aadhaar: ****{app.seller.aadhaarLast4}</p>
            </div>
          </div>
        </section>

        {/* Fees */}
        <section className="card" aria-labelledby="fees-heading">
          <h3 id="fees-heading">Government Fees</h3>
          <dl className="pr-detail__dl">
            <dt>Registration Fee</dt>
            <dd>₹{app.governmentFee_inr.toLocaleString()}</dd>
            <dt>Stamp Duty</dt>
            <dd>₹{app.stampDuty_inr.toLocaleString()}</dd>
            <dt>Total Payable</dt>
            <dd><strong>₹{(app.governmentFee_inr + app.stampDuty_inr).toLocaleString()}</strong></dd>
          </dl>
        </section>

        {/* Documents */}
        <section className="card pr-detail__docs" aria-labelledby="docs-heading">
          <h3 id="docs-heading">AI Document Verification</h3>
          <div className="table-wrap">
            <table aria-label="Document verification status">
              <thead>
                <tr>
                  <th scope="col">Document</th>
                  <th scope="col">Type</th>
                  <th scope="col">Status</th>
                  <th scope="col">AI Confidence</th>
                  <th scope="col">Flags</th>
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
                        <div className="confidence-bar" title={`${(doc.confidenceScore * 100).toFixed(0)}% confidence`}>
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
                          <span className="no-flags">No issues</span>
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
              <h4>OCR Extracted Data</h4>
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
          <h3 id="history-heading">Status History</h3>
          <ol className="pr-detail__timeline">
            {app.statusHistory.map((entry, i) => (
              <li key={i} className="timeline-entry">
                <div className="timeline-entry__dot" />
                <div className="timeline-entry__content">
                  <strong>{statusLabels[entry.status]}</strong>
                  <time dateTime={entry.timestamp}>
                    {new Date(entry.timestamp).toLocaleString('en-IN')}
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
