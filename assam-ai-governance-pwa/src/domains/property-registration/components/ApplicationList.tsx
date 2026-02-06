import { Link } from 'react-router-dom';
import { mockApplications } from '../services/mockData';
import type { ApplicationStatus } from '../types';
import './PropertyRegistration.css';

const statusConfig: Record<ApplicationStatus, { label: string; badge: string }> = {
  draft: { label: 'Draft', badge: 'badge--gray' },
  submitted: { label: 'Submitted', badge: 'badge--blue' },
  documents_under_review: { label: 'Under Review', badge: 'badge--yellow' },
  verification_complete: { label: 'Verified', badge: 'badge--green' },
  awaiting_signature: { label: 'Awaiting Signature', badge: 'badge--blue' },
  registered: { label: 'Registered', badge: 'badge--green' },
  rejected: { label: 'Rejected', badge: 'badge--red' },
};

export function PropertyRegistrationList() {
  return (
    <div className="pr-list">
      <div className="pr-list__header">
        <div>
          <h2>Property Registration</h2>
          <p className="pr-list__subtitle">
            Digital property registration applications for Assam state
          </p>
        </div>
        <Link to="/property/new" className="btn btn--primary">
          + New Application
        </Link>
      </div>

      <div className="pr-list__summary">
        <div className="pr-list__summary-item">
          <span className="pr-list__summary-count">{mockApplications.length}</span>
          <span>Total</span>
        </div>
        <div className="pr-list__summary-item">
          <span className="pr-list__summary-count">
            {mockApplications.filter((a) => a.status === 'documents_under_review').length}
          </span>
          <span>Under Review</span>
        </div>
        <div className="pr-list__summary-item">
          <span className="pr-list__summary-count">
            {mockApplications.filter((a) => a.status === 'registered').length}
          </span>
          <span>Registered</span>
        </div>
      </div>

      <div className="table-wrap">
        <table aria-label="Property registration applications">
          <thead>
            <tr>
              <th scope="col">Application #</th>
              <th scope="col">Property</th>
              <th scope="col">District</th>
              <th scope="col">Buyer</th>
              <th scope="col">Status</th>
              <th scope="col">Submitted</th>
              <th scope="col">Action</th>
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
                      <strong>{app.property.type === 'flat' ? 'Flat' : 'Apartment'}</strong>
                      <span>{app.property.address}</span>
                    </div>
                  </td>
                  <td>{app.property.district}</td>
                  <td>{app.buyer.name}</td>
                  <td>
                    <span className={`badge ${status.badge}`}>{status.label}</span>
                  </td>
                  <td>{new Date(app.submittedAt).toLocaleDateString('en-IN')}</td>
                  <td>
                    <Link to={`/property/${app.id}`} className="btn btn--secondary" style={{ padding: '4px 12px', fontSize: '0.75rem' }}>
                      View
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
