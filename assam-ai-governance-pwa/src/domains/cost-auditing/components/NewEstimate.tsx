import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ProjectType } from '../types';
import './CostAuditing.css';

interface MaterialEntry {
  material: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export function NewEstimate() {
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
    { value: '2-lane-asphalt', label: '2-Lane Asphalt' },
    { value: '4-lane-asphalt', label: '4-Lane Asphalt' },
    { value: '2-lane-concrete', label: '2-Lane Concrete' },
    { value: '4-lane-concrete', label: '4-Lane Concrete' },
    { value: 'bridge', label: 'Bridge' },
    { value: 'culvert', label: 'Culvert' },
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
          <h2>Estimate Submitted for AI Analysis</h2>
          <p>Your estimate for <strong>{projectName}</strong> is being analyzed by the AI scoring engine.</p>
          <div className="ca-new__analysis-preview">
            <div className="ca-new__analysis-item">
              <span>Total Estimated Cost</span>
              <strong>₹{(totalCost / 10000000).toFixed(2)} Cr</strong>
            </div>
            <div className="ca-new__analysis-item">
              <span>AI Analysis Status</span>
              <span className="badge badge--yellow">Processing...</span>
            </div>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            You will be notified once the AI scoring is complete and a risk level is assigned.
          </p>
          <div className="ca-new__success-actions">
            <Link to="/auditing" className="btn btn--primary">View All Estimates</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ca-new">
      <div className="ca-detail__breadcrumb">
        <Link to="/auditing">Cost Auditing</Link>
        <span aria-hidden="true"> / </span>
        <span>New Estimate</span>
      </div>

      <h2>Submit Cost Estimate</h2>
      <p className="ca-new__subtitle">
        Submit a road project cost estimate for AI-powered validation against historical baselines
      </p>

      <div className="card ca-new__form">
        <fieldset>
          <legend>Project Details</legend>
          <div className="form-grid">
            <div className="form-field form-field--full">
              <label htmlFor="est-name">Project Name *</label>
              <input
                id="est-name"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g., NH-37 Jorhat-Golaghat Road Widening"
              />
            </div>
            <div className="form-field">
              <label htmlFor="est-type">Project Type *</label>
              <select id="est-type" value={projectType} onChange={(e) => setProjectType(e.target.value as ProjectType)}>
                {projectTypes.map((pt) => (
                  <option key={pt.value} value={pt.value}>{pt.label}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="est-district">District *</label>
              <select id="est-district" value={district} onChange={(e) => setDistrict(e.target.value)}>
                <option value="">Select district</option>
                {districts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="est-location">Location Details *</label>
              <input
                id="est-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., NH-37, Km 12 to Km 28"
              />
            </div>
            <div className="form-field">
              <label htmlFor="est-length">Length (km) *</label>
              <input
                id="est-length"
                type="number"
                value={lengthKm || ''}
                onChange={(e) => setLengthKm(Number(e.target.value))}
              />
            </div>
            <div className="form-field">
              <label htmlFor="est-width">Width (m) *</label>
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
          <legend>Material Breakdown</legend>
          <div className="ca-new__materials">
            {materials.map((mat, i) => (
              <div key={i} className="ca-new__material-row">
                <div className="form-field">
                  <label htmlFor={`mat-name-${i}`}>Material</label>
                  <input
                    id={`mat-name-${i}`}
                    type="text"
                    value={mat.material}
                    onChange={(e) => updateMaterial(i, 'material', e.target.value)}
                    placeholder="e.g., Asphalt Grade A"
                  />
                </div>
                <div className="form-field">
                  <label htmlFor={`mat-qty-${i}`}>Quantity</label>
                  <input
                    id={`mat-qty-${i}`}
                    type="number"
                    value={mat.quantity || ''}
                    onChange={(e) => updateMaterial(i, 'quantity', Number(e.target.value))}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor={`mat-unit-${i}`}>Unit</label>
                  <select
                    id={`mat-unit-${i}`}
                    value={mat.unit}
                    onChange={(e) => updateMaterial(i, 'unit', e.target.value)}
                  >
                    <option value="tonnes">Tonnes</option>
                    <option value="cubic metres">Cubic Metres</option>
                    <option value="units">Units</option>
                    <option value="sqm">Sq Metres</option>
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor={`mat-price-${i}`}>Unit Price (₹)</label>
                  <input
                    id={`mat-price-${i}`}
                    type="number"
                    value={mat.unitPrice || ''}
                    onChange={(e) => updateMaterial(i, 'unitPrice', Number(e.target.value))}
                  />
                </div>
                <div className="form-field">
                  <label>Line Total</label>
                  <span className="ca-new__line-total">
                    ₹{(mat.quantity * mat.unitPrice).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
            <button className="btn btn--secondary" onClick={addMaterial} style={{ marginTop: 'var(--space-sm)' }}>
              + Add Material
            </button>
          </div>
          <div className="ca-new__total">
            <span>Total Estimated Cost:</span>
            <strong>₹{totalCost.toLocaleString()} ({(totalCost / 10000000).toFixed(2)} Cr)</strong>
          </div>
        </fieldset>

        <fieldset>
          <legend>Justification (if above baseline)</legend>
          <div className="form-field">
            <label htmlFor="est-justification">
              Explain any factors that may justify costs above historical baseline
            </label>
            <textarea
              id="est-justification"
              rows={4}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="e.g., Difficult terrain, environmental protection measures, remote location transport costs..."
            />
          </div>
        </fieldset>

        <div className="form-actions">
          <Link to="/auditing" className="btn btn--secondary">Cancel</Link>
          <button className="btn btn--primary" onClick={() => setSubmitted(true)}>
            Submit for AI Analysis
          </button>
        </div>
      </div>
    </div>
  );
}
