import { Observer } from '../../shared/observer';
import { Propagator } from '../ports/propagator.port';
import { SatellitePass, passFromSamples } from './pass';
import { Satellite } from './satellite';

export interface PredictWindow {
  /** Start of the search window. */
  readonly from: Date;
  /** Length of the search window, hours. */
  readonly hours: number;
  /** Sampling step, seconds. Smaller = more accurate AOS/LOS, more compute. */
  readonly stepSeconds?: number;
}

/**
 * Domain service: predicts the upcoming passes of a satellite over an observer
 * by sampling elevation through time via the {@link Propagator} port and
 * detecting the intervals where elevation stays above the observer's minimum.
 */
export class PassPredictor {
  constructor(private readonly propagator: Propagator) {}

  predictPasses(
    satellite: Satellite,
    observer: Observer,
    window: PredictWindow,
  ): SatellitePass[] {
    const step = (window.stepSeconds ?? 30) * 1000;
    const end = window.from.getTime() + window.hours * 3600 * 1000;
    const threshold = observer.minElevationDeg;

    const passes: SatellitePass[] = [];
    let inPass = false;
    let aos: Date | null = null;
    let last: Date | null = null;
    let peakEl = -Infinity;
    let peakTime: Date | null = null;

    for (let t = window.from.getTime(); t <= end; t += step) {
      const at = new Date(t);
      const { elevationDeg } = this.propagator.lookAngle(satellite, observer, at);

      if (elevationDeg >= threshold) {
        if (!inPass) {
          inPass = true;
          aos = at;
          peakEl = -Infinity;
          peakTime = at;
        }
        if (elevationDeg > peakEl) {
          peakEl = elevationDeg;
          peakTime = at;
        }
        last = at;
      } else if (inPass) {
        passes.push(
          passFromSamples(satellite, aos!, peakTime!, last!, peakEl),
        );
        inPass = false;
      }
    }

    // Close a pass still open at the end of the window.
    if (inPass) {
      passes.push(passFromSamples(satellite, aos!, peakTime!, last!, peakEl));
    }

    return passes;
  }
}
