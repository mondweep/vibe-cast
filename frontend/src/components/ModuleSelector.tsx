import { useState } from 'react';
import '../styles/ModuleSelector.css';

interface ModuleSelectorProps {
  onSelectModule: (moduleId: number) => Promise<void> | void;
}

const MODULES = [
  { id: 0, title: "Why Should You Care?", duration: 5 },
  { id: 1, title: "Fluids as Continuous Mediums", duration: 10 },
  { id: 2, title: "Forces & Acceleration", duration: 15 },
  { id: 3, title: "Pressure: The Dominant Force", duration: 12 },
  { id: 4, title: "Viscosity & Friction", duration: 12 },
  { id: 5, title: "The Complete Equation", duration: 15 },
];

export default function ModuleSelector({ onSelectModule }: ModuleSelectorProps) {
  const [loadingModuleId, setLoadingModuleId] = useState<number | null>(null);

  const handleSelectModule = async (moduleId: number) => {
    setLoadingModuleId(moduleId);
    try {
      await onSelectModule(moduleId);
    } catch (error) {
      console.error('Failed to select module:', error);
    } finally {
      setLoadingModuleId(null);
    }
  };

  return (
    <div className="module-selector">
      <h2>Select a Module</h2>
      <div className="module-grid">
        {MODULES.map((module) => (
          <div key={module.id} className="module-card">
            <h3>{module.title}</h3>
            <p className="duration">{module.duration} minutes</p>
            <button
              onClick={() => handleSelectModule(module.id)}
              className="btn btn-primary"
              disabled={loadingModuleId !== null}
            >
              {loadingModuleId === module.id ? 'Loading...' : 'Start Module'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
