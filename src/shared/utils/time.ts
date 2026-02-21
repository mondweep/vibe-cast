/** Convert BPM to milliseconds per beat */
export function bpmToMs(bpm: number): number {
  return 60000 / bpm;
}

/** Convert BPM to milliseconds per eighth-note subdivision */
export function bpmToSubdivisionMs(bpm: number): number {
  return 30000 / bpm;
}

/** Convert milliseconds to BPM */
export function msToBpm(ms: number): number {
  return 60000 / ms;
}
