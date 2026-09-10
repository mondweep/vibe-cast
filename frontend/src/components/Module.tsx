import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLearnerStore } from '../store/learner';
import VelocityFieldSimulator from './VelocityFieldSimulator';
import '../styles/Module.css';

interface ModuleProps {
  moduleId: number;
  onNext: () => void;
}

const MODULE_CONTENT: Record<number, { title: string; content: string }> = {
  0: {
    title: "Why Should You Care?",
    content: "The Navier-Stokes equations govern how fluids move in response to forces. From weather prediction to aircraft design, these equations are fundamental to modern science and engineering. This $1M Millennium Prize problem remains one of the most important unsolved challenges in mathematics."
  },
  1: {
    title: "Fluids as Continuous Mediums",
    content: "Instead of tracking individual molecules, we describe fluids as continuous fields where velocity and pressure vary smoothly through space. A velocity field u(x,y,t) tells us the fluid motion at every point."
  },
  2: {
    title: "Forces & Acceleration",
    content: "Three primary forces act on fluids: pressure gradients push from high to low pressure, viscosity provides internal friction, and body forces like gravity pull downward. Newton's second law tells us how these forces produce acceleration."
  },
  3: {
    title: "Pressure: The Dominant Force",
    content: "Pressure gradients (∇p) are one of the most important driving forces in fluid dynamics. In incompressible flows, mass is conserved at every point: ∇·u = 0. This constraint couples velocity and pressure together."
  },
  4: {
    title: "Viscosity & Friction",
    content: "Viscosity (μ) represents internal friction. Different fluids have different viscosities: honey is thick (high μ ≈ 1), water is moderate (μ ≈ 0.001), and air is thin (μ ≈ 1.8×10⁻⁵). Viscosity converts kinetic energy to heat."
  },
  5: {
    title: "The Complete Navier-Stokes Equation",
    content: "ρ(∂u/∂t + u·∇u) = -∇p + μ∇²u + ρg describes how fluids accelerate. The left side is inertia, the pressure term pushes flow, the viscosity term resists motion, and body forces like gravity act downward."
  },
};

export default function Module({ moduleId, onNext }: ModuleProps) {
  const { markModuleComplete } = useLearnerStore();
  const module = MODULE_CONTENT[moduleId] || MODULE_CONTENT[0];

  // Without this, the page can stay scrolled wherever the learner left the
  // previous module - which can land the new module's content (including
  // the interactive simulator) partly behind the sticky header, silently
  // eating clicks/drags meant for the canvas underneath it.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [moduleId]);

  const handleComplete = () => {
    markModuleComplete(moduleId);
    onNext();
  };

  return (
    <motion.div
      className="module-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="module-header">
        <h2>{module.title}</h2>
        <p className="module-number">Module {moduleId} of 5</p>
      </div>

      <div className="module-content">
        <p>{module.content}</p>
      </div>

      <div className="module-simulator">
        <VelocityFieldSimulator moduleId={moduleId} />
      </div>

      <div className="module-assessment">
        <h3>Quick Check</h3>
        <p>Test your understanding of this module's concepts.</p>
      </div>

      <div className="module-actions">
        <button className="btn btn-secondary" onClick={() => window.history.back()}>
          Previous
        </button>
        <button className="btn btn-primary" onClick={handleComplete}>
          Mark Complete & Continue
        </button>
      </div>
    </motion.div>
  );
}
