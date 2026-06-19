/** A tracked satellite identified by its Two-Line Element set (TLE). */
export interface Satellite {
  readonly name: string;
  /** NORAD catalog number, parsed from the TLE. */
  readonly noradId: number;
  readonly tleLine1: string;
  readonly tleLine2: string;
}

/** Where the satellite appears in the observer's sky at an instant. */
export interface LookAngle {
  /** Compass azimuth, degrees 0..360 (0 = north, 90 = east). */
  readonly azimuthDeg: number;
  /** Elevation above the horizon, degrees (-90..90). Negative = below. */
  readonly elevationDeg: number;
  /** Slant range from observer to satellite, kilometres. */
  readonly rangeKm: number;
}
