import '../styles/ModuleSelector.css';

interface ModuleSelectorProps {
  onSelectModule: (moduleId: number) => void;
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
  return (
    <div className="module-selector">
      <h2>Select a Module</h2>
      <div className="module-grid">
        {MODULES.map((module) => (
          <div key={module.id} className="module-card">
            <h3>{module.title}</h3>
            <p className="duration">{module.duration} minutes</p>
            <button
              onClick={() => onSelectModule(module.id)}
              className="btn btn-primary"
            >
              Start Module
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
