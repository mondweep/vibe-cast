import { Observer } from '../../shared/observer';
import { Propagator } from '../ports/propagator.port';
import { SunModel } from '../ports/sun-model.port';
import { isSatelliteSunlit } from './sun';
import { SatellitePass } from './pass';
import { Satellite } from './satellite';

export interface VisibilityOptions {
  /**
   * The observer counts as "dark enough" to see a satellite when the Sun is
   * below this elevation. Default -6° (civil twilight) — a practical threshold
   * for naked-eye satellite spotting.
   */
  readonly twilightSunElevationDeg?: number;
}

/**
 * Domain service: decides whether a satellite is *optically visible* — it must
 * be sunlit while the observer is in darkness. Collaborates with the
 * {@link Propagator} (satellite ECI position) and {@link SunModel} ports, so
 * the decision logic is unit-tested with deterministic fakes (ADR-0006).
 */
export class VisibilityService {
  private readonly twilight: number;

  constructor(
    private readonly propagator: Propagator,
    private readonly sunModel: SunModel,
    options: VisibilityOptions = {},
  ) {
    this.twilight = options.twilightSunElevationDeg ?? -6;
  }

  isObserverDark(observer: Observer, at: Date): boolean {
    return this.sunModel.solarElevationDeg(observer, at) < this.twilight;
  }

  isSatelliteSunlit(satellite: Satellite, at: Date): boolean {
    const eci = this.propagator.eciPositionKm(satellite, at);
    if (!eci) return false;
    return isSatelliteSunlit(eci, this.sunModel.sunEciKm(at));
  }

  isVisibleAt(satellite: Satellite, observer: Observer, at: Date): boolean {
    return (
      this.isObserverDark(observer, at) &&
      this.isSatelliteSunlit(satellite, at)
    );
  }

  /** Return a copy of the pass with `visible` evaluated at its closest approach. */
  annotatePass(
    satellite: Satellite,
    observer: Observer,
    pass: SatellitePass,
  ): SatellitePass {
    return { ...pass, visible: this.isVisibleAt(satellite, observer, pass.tcaTime) };
  }
}
