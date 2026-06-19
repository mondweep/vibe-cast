/**
 * Derive orbital elements from a TLE (Two-Line Element set) — cloud-proof
 * satellite info we can show even when CelesTrak's SATCAT endpoint is blocked
 * from the deployment IP (issue #13; extends ADR-0011 resilience). Pure, so it
 * is unit-tested directly. Uses standard fixed-column TLE field positions.
 */
const MU = 398600.4418; // Earth's gravitational parameter, km^3/s^2
const EARTH_RADIUS_KM = 6378.137;

export interface OrbitalElements {
  /** International designator, e.g. "1998-067A". */
  intlDesignator: string | null;
  inclinationDeg: number | null;
  periodMin: number | null;
  apogeeKm: number | null;
  perigeeKm: number | null;
}

const EMPTY: OrbitalElements = {
  intlDesignator: null,
  inclinationDeg: null,
  periodMin: null,
  apogeeKm: null,
  perigeeKm: null,
};

const num = (s: string): number | null => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};

function parseIntlDesignator(line1: string): string | null {
  const raw = line1.substring(9, 17).trim(); // e.g. "98067A"
  if (raw.length < 5) return null;
  const yy = parseInt(raw.substring(0, 2), 10);
  if (!Number.isFinite(yy)) return null;
  const year = yy < 57 ? 2000 + yy : 1900 + yy;
  return `${year}-${raw.substring(2, 5)}${raw.substring(5).trim()}`;
}

export function orbitalElements(line1: string, line2: string): OrbitalElements {
  if (!line1 || !line2 || line2[0] !== '2') return EMPTY;

  const inclinationDeg = num(line2.substring(8, 16));
  const ecc = num('0.' + line2.substring(26, 33).trim());
  const meanMotion = num(line2.substring(52, 63)); // revolutions per day

  let periodMin: number | null = null;
  let apogeeKm: number | null = null;
  let perigeeKm: number | null = null;

  if (meanMotion && meanMotion > 0) {
    periodMin = 1440 / meanMotion;
    const n = (meanMotion * 2 * Math.PI) / 86400; // mean motion, rad/s
    const a = Math.cbrt(MU / (n * n)); // semi-major axis, km
    if (ecc != null && Number.isFinite(a)) {
      apogeeKm = a * (1 + ecc) - EARTH_RADIUS_KM;
      perigeeKm = a * (1 - ecc) - EARTH_RADIUS_KM;
    }
  }

  return {
    intlDesignator: parseIntlDesignator(line1),
    inclinationDeg,
    periodMin,
    apogeeKm,
    perigeeKm,
  };
}
