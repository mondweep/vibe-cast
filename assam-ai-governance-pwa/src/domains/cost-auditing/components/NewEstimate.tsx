import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ProjectType } from '../types';
import './CostAuditing.css';

interface MaterialEntry {
  material: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export function NewEstimate() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);

  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('2-lane-asphalt');
  const [district, setDistrict] = useState('');
  const [location, setLocation] = useState('');
  const [lengthKm, setLengthKm] = useState(0);
  const [widthM, setWidthM] = useState(7);
  const [justification, setJustification] = useState('');

  const [materials, setMaterials] = useState<MaterialEntry[]>([
    { material: '', quantity: 0, unit: 'tonnes', unitPrice: 0 },
  ]);

  const districts = [
    'Kamrup Metropolitan', 'Kamrup', 'Nagaon', 'Sonitpur', 'Dibrugarh',
    'Jorhat', 'Cachar', 'Tinsukia', 'Sivasagar', 'Golaghat',
  ];

  const projectTypes: { value: ProjectType; label: string }[] = [
    { value: '2-lane-asphalt', label: t('auditing.projectTypes.2-lane-asphalt') },
    { value: '4-lane-asphalt', label: t('auditing.projectTypes.4-lane-asphalt') },
    { value: '2-lane-concrete', label: t('auditing.projectTypes.2-lane-concrete') },
    { value: '4-lane-concrete', label: t('auditing.projectTypes.4-lane-concrete') },
    { value: 'bridge', label: t('auditing.projectTypes.bridge') },
    { value: 'culvert', label: t('auditing.projectTypes.culvert') },
  ];

  const addMaterial = () => {
    setMaterials([...materials, { material: '', quantity: 0, unit: 'tonnes', unitPrice: 0 }]);
  };

  const updateMaterial = (index: number, field: keyof MaterialEntry, value: string | number) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], [field]: value };
    setMaterials(updated);
  };

  const totalCost = materials.reduce((sum, m) => sum + m.quantity * m.unitPrice, 0);

  if (submitted) {
    return (
      <div className="ca-new">
        <div className="ca-new__success card">
          <span className="ca-new__success-icon" aria-hidden="true">📊</span>
          <h2>{t('auditing.successHeading')}</h2>
          <p dangerouslySetInnerHTML={{ __html: t('auditing.successDesc', { name: projectName }) }} />
          <div className="ca-new__analysis-preview">
            <div className="ca-new__analysis-item">
              <span>{t('auditing.totalEstimatedCostLabel')}</span>
              <strong>₹{totalCost.toLocaleString()} ({(totalCost / 10000000).toFixed(2)} {t('auditing.cr')})</strong>
            </div>
            <div className="ca-new__analysis-item">
              <span>{t('auditing.aiAnalysisStatus')}</span>
              <span className="badge badge--yellow">{t('auditing.processing')}</span>
            </div>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            {t('auditing.successNote')}
          </p>
          <div className="ca-new__success-actions">
            <Link to="/auditing" className="btn btn--primary">{t('auditing.viewAllEstimates')}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ca-new">
      <div className="ca-detail__breadcrumb">
        <Link to="/auditing">{t('nav.costAuditing')}</Link>
        <span aria-hidden="true"> / </span>
        <span>{t('auditing.newEstimate')}</span>
      </div>

      <h2>{t('auditing.submitHeading')}</h2>
      <p className="ca-new__subtitle">
        {t('auditing.submitSubtitle')}
      </p>

      <div className="card ca-new__form">
        <fieldset>
          <legend>{t('auditing.projectDetails')}</legend>
          <div className="form-grid">
            <div className="form-field form-field--full">
              <label htmlFor="est-name">{t('auditing.projectName')}</label>
              <input
                id="est-name"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder={t('auditing.projectNamePlaceholder')}
              />
            </div>
            <div className="form-field">
              <label htmlFor="est-type">{t('auditing.projectTypeLabel')}</label>
              <select id="est-type" value={projectType} onChange={(e) => setProjectType(e.target.value as ProjectType)}>
                {projectTypes.map((pt) => (
                  <option key={pt.value} value={pt.value}>{pt.label}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="est-district">{t('auditing.districtLabel')}</label>
              <select id="est-district" value={district} onChange={(e) => setDistrict(e.target.value)}>
                <option value="">{t('auditing.selectDistrict')}</option>
                {districts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="est-location">{t('auditing.locationDetails')}</label>
              <input
                id="est-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t('auditing.locationPlaceholder')}
              />
            </div>
            <div className="form-field">
              <label htmlFor="est-length">{t('auditing.lengthKm')}</label>
              <input
                id="est-length"
                type="number"
                value={lengthKm || ''}
                onChange={(e) => setLengthKm(Number(e.target.value))}
              />
            </div>
            <div className="form-field">
              <label htmlFor="est-width">{t('auditing.widthM')}</label>
              <input
                id="est-width"
                type="number"
                value={widthM || ''}
                onChange={(e) => setWidthM(Number(e.target.value))}
              />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>{t('auditing.materialBreakdownLegend')}</legend>
          <div className="ca-new__materials">
            {materials.map((mat, i) => (
              <div key={i} className="ca-new__material-row">
                <div className="form-field">
                  <label htmlFor={`mat-name-${i}`}>{t('auditing.materialLabel')}</label>
                  <input
                    id={`mat-name-${i}`}
                    type="text"
                    value={mat.material}
                    onChange={(e) => updateMaterial(i, 'material', e.target.value)}
                    placeholder={t('auditing.materialPlaceholder')}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor={`mat-qty-${i}`}>{t('auditing.quantityLabel')}</label>
                  <input
                    id={`mat-qty-${i}`}
                    type="number"
                    value={mat.quantity || ''}
                    onChange={(e) => updateMaterial(i, 'quantity', Number(e.target.value))}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor={`mat-unit-${i}`}>{t('auditing.unitLabel')}</label>
                  <select
                    id={`mat-unit-${i}`}
                    value={mat.unit}
                    onChange={(e) => updateMaterial(i, 'unit', e.target.value)}
                  >
                    <option value="tonnes">{t('auditing.units.tonnes')}</option>
                    <option value="cubic metres">{t('auditing.units.cubicMetres')}</option>
                    <option value="units">{t('auditing.units.units')}</option>
                    <option value="sqm">{t('auditing.units.sqm')}</option>
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor={`mat-price-${i}`}>{t('auditing.unitPriceLabel')}</label>
                  <input
                    id={`mat-price-${i}`}
                    type="number"
                    value={mat.unitPrice || ''}
                    onChange={(e) => updateMaterial(i, 'unitPrice', Number(e.target.value))}
                  />
                </div>
                <div className="form-field">
                  <label>{t('auditing.lineTotal')}</label>
                  <span className="ca-new__line-total">
                    ₹{(mat.quantity * mat.unitPrice).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
            <button className="btn btn--secondary" onClick={addMaterial} style={{ marginTop: 'var(--space-sm)' }}>
              {t('auditing.addMaterial')}
            </button>
          </div>
          <div className="ca-new__total">
            <span>{t('auditing.totalEstimatedCost')}</span>
            <strong>₹{totalCost.toLocaleString()} ({(totalCost / 10000000).toFixed(2)} {t('auditing.cr')})</strong>
          </div>
        </fieldset>

        <fieldset>
          <legend>{t('auditing.justificationLegend')}</legend>
          <div className="form-field">
            <label htmlFor="est-justification">
              {t('auditing.justificationLabel')}
            </label>
            <textarea
              id="est-justification"
              rows={4}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder={t('auditing.justificationPlaceholder')}
            />
          </div>
        </fieldset>

        <div className="form-actions">
          <Link to="/auditing" className="btn btn--secondary">{t('auditing.cancel')}</Link>
          <button className="btn btn--primary" onClick={() => setSubmitted(true)}>
            {t('auditing.submitForAI')}
          </button>
        </div>
      </div>
    </div>
  );
}
