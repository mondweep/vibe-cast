import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PropertyDetails, Party } from '../types';
import './PropertyRegistration.css';

export function NewApplication() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  const [property, setProperty] = useState<PropertyDetails>({
    type: 'flat',
    address: '',
    district: '',
    area_sqft: 0,
    price_inr: 0,
    registrationDistrict: '',
  });

  const [buyer, setBuyer] = useState<Party>({
    name: '',
    aadhaarLast4: '',
    phone: '',
    email: '',
    role: 'buyer',
  });

  const [seller, setSeller] = useState<Party>({
    name: '',
    aadhaarLast4: '',
    phone: '',
    email: '',
    role: 'seller',
  });

  const districts = [
    'Kamrup Metropolitan', 'Kamrup', 'Nagaon', 'Sonitpur', 'Dibrugarh',
    'Jorhat', 'Cachar', 'Tinsukia', 'Sivasagar', 'Golaghat',
  ];

  const handleSubmit = () => {
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="pr-new">
        <div className="pr-new__success card">
          <span className="pr-new__success-icon" aria-hidden="true">✓</span>
          <h2>Application Submitted Successfully!</h2>
          <p>Your application number is <code>ASM-PR-2026-00145</code></p>
          <p>You will receive updates via email and SMS. Expected processing time: 5-7 business days.</p>
          <div className="pr-new__success-actions">
            <Link to="/property/reg-001" className="btn btn--primary">View Application</Link>
            <Link to="/property" className="btn btn--secondary">Back to List</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pr-new">
      <div className="pr-new__breadcrumb">
        <Link to="/property">Property Registration</Link>
        <span aria-hidden="true"> / </span>
        <span>New Application</span>
      </div>

      <h2>New Property Registration</h2>
      <p className="pr-new__subtitle">Submit a digital property registration application</p>

      {/* Step Indicator */}
      <div className="pr-new__steps" role="group" aria-label="Form steps">
        {['Property Details', 'Buyer & Seller', 'Documents & Review'].map((label, i) => (
          <button
            key={i}
            className={`pr-new__step ${step === i + 1 ? 'pr-new__step--active' : ''} ${step > i + 1 ? 'pr-new__step--done' : ''}`}
            onClick={() => setStep(i + 1)}
            aria-current={step === i + 1 ? 'step' : undefined}
          >
            <span className="pr-new__step-num">{step > i + 1 ? '✓' : i + 1}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="card pr-new__form">
        {step === 1 && (
          <fieldset>
            <legend>Property Details</legend>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="prop-type">Property Type *</label>
                <select id="prop-type" value={property.type} onChange={(e) => setProperty({ ...property, type: e.target.value as 'flat' | 'apartment' })}>
                  <option value="flat">Flat</option>
                  <option value="apartment">Apartment</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="prop-district">District *</label>
                <select id="prop-district" value={property.district} onChange={(e) => setProperty({ ...property, district: e.target.value, registrationDistrict: e.target.value })}>
                  <option value="">Select district</option>
                  {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-field form-field--full">
                <label htmlFor="prop-address">Full Address *</label>
                <input id="prop-address" type="text" value={property.address} onChange={(e) => setProperty({ ...property, address: e.target.value })} placeholder="e.g., 302, Lakshmi Apartments, GS Road" />
              </div>
              <div className="form-field">
                <label htmlFor="prop-area">Area (sq ft) *</label>
                <input id="prop-area" type="number" value={property.area_sqft || ''} onChange={(e) => setProperty({ ...property, area_sqft: Number(e.target.value) })} placeholder="e.g., 1200" />
              </div>
              <div className="form-field">
                <label htmlFor="prop-price">Property Value (₹) *</label>
                <input id="prop-price" type="number" value={property.price_inr || ''} onChange={(e) => setProperty({ ...property, price_inr: Number(e.target.value) })} placeholder="e.g., 4500000" />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn--primary" onClick={() => setStep(2)}>Next: Buyer & Seller</button>
            </div>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset>
            <legend>Buyer & Seller Information</legend>
            <div className="pr-new__parties">
              <div>
                <h4>Buyer Details</h4>
                <div className="form-grid">
                  <div className="form-field form-field--full">
                    <label htmlFor="buyer-name">Full Name *</label>
                    <input id="buyer-name" type="text" value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="buyer-aadhaar">Aadhaar (last 4 digits) *</label>
                    <input id="buyer-aadhaar" type="text" maxLength={4} value={buyer.aadhaarLast4} onChange={(e) => setBuyer({ ...buyer, aadhaarLast4: e.target.value })} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="buyer-phone">Phone *</label>
                    <input id="buyer-phone" type="tel" value={buyer.phone} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} />
                  </div>
                  <div className="form-field form-field--full">
                    <label htmlFor="buyer-email">Email *</label>
                    <input id="buyer-email" type="email" value={buyer.email} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} />
                  </div>
                </div>
              </div>
              <div>
                <h4>Seller Details</h4>
                <div className="form-grid">
                  <div className="form-field form-field--full">
                    <label htmlFor="seller-name">Full Name *</label>
                    <input id="seller-name" type="text" value={seller.name} onChange={(e) => setSeller({ ...seller, name: e.target.value })} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="seller-aadhaar">Aadhaar (last 4 digits) *</label>
                    <input id="seller-aadhaar" type="text" maxLength={4} value={seller.aadhaarLast4} onChange={(e) => setSeller({ ...seller, aadhaarLast4: e.target.value })} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="seller-phone">Phone *</label>
                    <input id="seller-phone" type="tel" value={seller.phone} onChange={(e) => setSeller({ ...seller, phone: e.target.value })} />
                  </div>
                  <div className="form-field form-field--full">
                    <label htmlFor="seller-email">Email *</label>
                    <input id="seller-email" type="email" value={seller.email} onChange={(e) => setSeller({ ...seller, email: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn--secondary" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn--primary" onClick={() => setStep(3)}>Next: Documents & Review</button>
            </div>
          </fieldset>
        )}

        {step === 3 && (
          <fieldset>
            <legend>Documents & Review</legend>
            <div className="pr-new__upload-section">
              <h4>Required Documents</h4>
              <div className="pr-new__upload-grid">
                <div className="upload-card">
                  <span className="upload-card__icon" aria-hidden="true">📄</span>
                  <span className="upload-card__label">Sale Deed</span>
                  <span className="upload-card__status">Required</span>
                  <button className="btn btn--secondary" style={{ fontSize: '0.75rem', padding: '4px 12px' }}>
                    Upload PDF
                  </button>
                </div>
                <div className="upload-card">
                  <span className="upload-card__icon" aria-hidden="true">🧾</span>
                  <span className="upload-card__label">Tax Receipt</span>
                  <span className="upload-card__status">Required</span>
                  <button className="btn btn--secondary" style={{ fontSize: '0.75rem', padding: '4px 12px' }}>
                    Upload PDF
                  </button>
                </div>
                <div className="upload-card">
                  <span className="upload-card__icon" aria-hidden="true">🪪</span>
                  <span className="upload-card__label">ID Proof (Aadhaar/Voter ID)</span>
                  <span className="upload-card__status">Required</span>
                  <button className="btn btn--secondary" style={{ fontSize: '0.75rem', padding: '4px 12px' }}>
                    Upload PDF
                  </button>
                </div>
              </div>
              <p className="pr-new__upload-note">
                Documents will be verified using AI-powered OCR. Supported formats: PDF, JPG, PNG (max 10MB each).
              </p>
            </div>

            <div className="pr-new__review">
              <h4>Application Summary</h4>
              <dl className="pr-detail__dl">
                <dt>Property</dt>
                <dd>{property.type === 'flat' ? 'Flat' : 'Apartment'} at {property.address || '—'}</dd>
                <dt>District</dt>
                <dd>{property.district || '—'}</dd>
                <dt>Area</dt>
                <dd>{property.area_sqft ? `${property.area_sqft.toLocaleString()} sq ft` : '—'}</dd>
                <dt>Value</dt>
                <dd>{property.price_inr ? `₹${property.price_inr.toLocaleString()}` : '—'}</dd>
                <dt>Buyer</dt>
                <dd>{buyer.name || '—'}</dd>
                <dt>Seller</dt>
                <dd>{seller.name || '—'}</dd>
                <dt>Est. Stamp Duty (6%)</dt>
                <dd>₹{Math.round(property.price_inr * 0.06).toLocaleString()}</dd>
                <dt>Est. Registration Fee (1%)</dt>
                <dd>₹{Math.round(property.price_inr * 0.01).toLocaleString()}</dd>
              </dl>
            </div>

            <div className="form-actions">
              <button className="btn btn--secondary" onClick={() => setStep(2)}>Back</button>
              <button className="btn btn--primary" onClick={handleSubmit}>
                Submit Application
              </button>
            </div>
          </fieldset>
        )}
      </div>
    </div>
  );
}
