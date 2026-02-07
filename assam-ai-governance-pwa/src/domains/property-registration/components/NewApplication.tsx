import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { PropertyDetails, Party } from '../types';
import './PropertyRegistration.css';

export function NewApplication() {
  const { t } = useTranslation();
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

  const stepLabels = [
    t('property.formSteps.propertyDetails'),
    t('property.formSteps.buyerSeller'),
    t('property.formSteps.documentsReview'),
  ];

  const handleSubmit = () => {
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="pr-new">
        <div className="pr-new__success card">
          <span className="pr-new__success-icon" aria-hidden="true">✓</span>
          <h2>{t('property.successHeading')}</h2>
          <p>{t('property.successAppNum')} <code>ASM-PR-2026-00145</code></p>
          <p>{t('property.successDesc')}</p>
          <div className="pr-new__success-actions">
            <Link to="/property/reg-001" className="btn btn--primary">{t('property.viewApplication')}</Link>
            <Link to="/property" className="btn btn--secondary">{t('property.backToList')}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pr-new">
      <div className="pr-new__breadcrumb">
        <Link to="/property">{t('property.heading')}</Link>
        <span aria-hidden="true"> / </span>
        <span>{t('property.newApplication')}</span>
      </div>

      <h2>{t('property.newHeading')}</h2>
      <p className="pr-new__subtitle">{t('property.newSubtitle')}</p>

      {/* Step Indicator */}
      <div className="pr-new__steps" role="group" aria-label="Form steps">
        {stepLabels.map((label, i) => (
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
            <legend>{t('property.formSteps.propertyDetails')}</legend>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="prop-type">{t('property.formLabels.propertyType')}</label>
                <select id="prop-type" value={property.type} onChange={(e) => setProperty({ ...property, type: e.target.value as 'flat' | 'apartment' })}>
                  <option value="flat">{t('property.flat')}</option>
                  <option value="apartment">{t('property.apartment')}</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="prop-district">{t('property.formLabels.district')}</label>
                <select id="prop-district" value={property.district} onChange={(e) => setProperty({ ...property, district: e.target.value, registrationDistrict: e.target.value })}>
                  <option value="">{t('property.formLabels.selectDistrict')}</option>
                  {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-field form-field--full">
                <label htmlFor="prop-address">{t('property.formLabels.fullAddress')}</label>
                <input id="prop-address" type="text" value={property.address} onChange={(e) => setProperty({ ...property, address: e.target.value })} placeholder={t('property.formLabels.addressPlaceholder')} />
              </div>
              <div className="form-field">
                <label htmlFor="prop-area">{t('property.formLabels.areaSqft')}</label>
                <input id="prop-area" type="number" value={property.area_sqft || ''} onChange={(e) => setProperty({ ...property, area_sqft: Number(e.target.value) })} placeholder={t('property.formLabels.areaPlaceholder')} />
              </div>
              <div className="form-field">
                <label htmlFor="prop-price">{t('property.formLabels.propertyValue')}</label>
                <input id="prop-price" type="number" value={property.price_inr || ''} onChange={(e) => setProperty({ ...property, price_inr: Number(e.target.value) })} placeholder={t('property.formLabels.valuePlaceholder')} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn--primary" onClick={() => setStep(2)}>{t('property.nextBuyerSeller')}</button>
            </div>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset>
            <legend>{t('property.formSteps.buyerSeller')}</legend>
            <div className="pr-new__parties">
              <div>
                <h4>{t('property.buyerDetails')}</h4>
                <div className="form-grid">
                  <div className="form-field form-field--full">
                    <label htmlFor="buyer-name">{t('property.formLabels.fullName')}</label>
                    <input id="buyer-name" type="text" value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="buyer-aadhaar">{t('property.formLabels.aadhaarLast4')}</label>
                    <input id="buyer-aadhaar" type="text" maxLength={4} value={buyer.aadhaarLast4} onChange={(e) => setBuyer({ ...buyer, aadhaarLast4: e.target.value })} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="buyer-phone">{t('property.formLabels.phone')}</label>
                    <input id="buyer-phone" type="tel" value={buyer.phone} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} />
                  </div>
                  <div className="form-field form-field--full">
                    <label htmlFor="buyer-email">{t('property.formLabels.email')}</label>
                    <input id="buyer-email" type="email" value={buyer.email} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} />
                  </div>
                </div>
              </div>
              <div>
                <h4>{t('property.sellerDetails')}</h4>
                <div className="form-grid">
                  <div className="form-field form-field--full">
                    <label htmlFor="seller-name">{t('property.formLabels.fullName')}</label>
                    <input id="seller-name" type="text" value={seller.name} onChange={(e) => setSeller({ ...seller, name: e.target.value })} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="seller-aadhaar">{t('property.formLabels.aadhaarLast4')}</label>
                    <input id="seller-aadhaar" type="text" maxLength={4} value={seller.aadhaarLast4} onChange={(e) => setSeller({ ...seller, aadhaarLast4: e.target.value })} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="seller-phone">{t('property.formLabels.phone')}</label>
                    <input id="seller-phone" type="tel" value={seller.phone} onChange={(e) => setSeller({ ...seller, phone: e.target.value })} />
                  </div>
                  <div className="form-field form-field--full">
                    <label htmlFor="seller-email">{t('property.formLabels.email')}</label>
                    <input id="seller-email" type="email" value={seller.email} onChange={(e) => setSeller({ ...seller, email: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn--secondary" onClick={() => setStep(1)}>{t('property.back')}</button>
              <button className="btn btn--primary" onClick={() => setStep(3)}>{t('property.nextDocuments')}</button>
            </div>
          </fieldset>
        )}

        {step === 3 && (
          <fieldset>
            <legend>{t('property.formSteps.documentsReview')}</legend>
            <div className="pr-new__upload-section">
              <h4>{t('property.requiredDocuments')}</h4>
              <div className="pr-new__upload-grid">
                <div className="upload-card">
                  <span className="upload-card__icon" aria-hidden="true">📄</span>
                  <span className="upload-card__label">{t('property.saleDeed')}</span>
                  <span className="upload-card__status">{t('property.required')}</span>
                  <button className="btn btn--secondary" style={{ fontSize: '0.75rem', padding: '4px 12px' }}>
                    {t('property.uploadPdf')}
                  </button>
                </div>
                <div className="upload-card">
                  <span className="upload-card__icon" aria-hidden="true">🧾</span>
                  <span className="upload-card__label">{t('property.taxReceipt')}</span>
                  <span className="upload-card__status">{t('property.required')}</span>
                  <button className="btn btn--secondary" style={{ fontSize: '0.75rem', padding: '4px 12px' }}>
                    {t('property.uploadPdf')}
                  </button>
                </div>
                <div className="upload-card">
                  <span className="upload-card__icon" aria-hidden="true">🪪</span>
                  <span className="upload-card__label">{t('property.idProof')}</span>
                  <span className="upload-card__status">{t('property.required')}</span>
                  <button className="btn btn--secondary" style={{ fontSize: '0.75rem', padding: '4px 12px' }}>
                    {t('property.uploadPdf')}
                  </button>
                </div>
              </div>
              <p className="pr-new__upload-note">
                {t('property.uploadNote')}
              </p>
            </div>

            <div className="pr-new__review">
              <h4>{t('property.applicationSummary')}</h4>
              <dl className="pr-detail__dl">
                <dt>{t('property.propertyCol')}</dt>
                <dd>{property.type === 'flat' ? t('property.flat') : t('property.apartment')} at {property.address || '—'}</dd>
                <dt>{t('property.district')}</dt>
                <dd>{property.district || '—'}</dd>
                <dt>{t('property.area')}</dt>
                <dd>{property.area_sqft ? `${property.area_sqft.toLocaleString()} ${t('property.sqft')}` : '—'}</dd>
                <dt>{t('property.value')}</dt>
                <dd>{property.price_inr ? `₹${property.price_inr.toLocaleString()}` : '—'}</dd>
                <dt>{t('property.buyer')}</dt>
                <dd>{buyer.name || '—'}</dd>
                <dt>{t('property.seller')}</dt>
                <dd>{seller.name || '—'}</dd>
                <dt>{t('property.estStampDuty')}</dt>
                <dd>₹{Math.round(property.price_inr * 0.06).toLocaleString()}</dd>
                <dt>{t('property.estRegistrationFee')}</dt>
                <dd>₹{Math.round(property.price_inr * 0.01).toLocaleString()}</dd>
              </dl>
            </div>

            <div className="form-actions">
              <button className="btn btn--secondary" onClick={() => setStep(2)}>{t('property.back')}</button>
              <button className="btn btn--primary" onClick={handleSubmit}>
                {t('property.submitApplication')}
              </button>
            </div>
          </fieldset>
        )}
      </div>
    </div>
  );
}
