// Minimal ambient declarations for satellite.js so the gateway compiles without
// relying on the availability of @types/satellite.js. Only the surface we use
// in the SGP4 adapter is declared here (ADR-0004).
declare module 'satellite.js' {
  export interface SatRec {
    error: number;
  }
  export interface EciVec3<T> {
    x: T;
    y: T;
    z: T;
  }
  export interface PositionAndVelocity {
    position: EciVec3<number> | boolean;
    velocity: EciVec3<number> | boolean;
  }
  export interface GeodeticLocation {
    longitude: number; // radians
    latitude: number; // radians
    height: number; // km
  }
  export interface LookAngles {
    azimuth: number; // radians
    elevation: number; // radians
    rangeSat: number; // km
  }

  export function twoline2satrec(line1: string, line2: string): SatRec;
  export function propagate(satrec: SatRec, date: Date): PositionAndVelocity;
  export function gstime(date: Date): number;
  export function eciToEcf<T>(eci: EciVec3<T>, gmst: number): EciVec3<T>;
  export function ecfToLookAngles(
    observer: GeodeticLocation,
    ecf: EciVec3<number>,
  ): LookAngles;
  export function degreesToRadians(degrees: number): number;
  export function radiansToDegrees(radians: number): number;
}
