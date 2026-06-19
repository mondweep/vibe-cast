import {
  boundingBoxAround,
  distanceKm,
  initialBearingDeg,
} from '../../src/shared/geo';

describe('geo great-circle math', () => {
  const london = { latitudeDeg: 51.5074, longitudeDeg: -0.1278 };
  const paris = { latitudeDeg: 48.8566, longitudeDeg: 2.3522 };

  it('measures the London–Paris distance to within 1 km of the known ~343 km', () => {
    expect(distanceKm(london, paris)).toBeCloseTo(343, -1);
  });

  it('reports a zero distance from a point to itself', () => {
    expect(distanceKm(london, london)).toBeCloseTo(0, 5);
  });

  it('bearing from London to Paris is roughly south-east (~148°)', () => {
    expect(initialBearingDeg(london, paris)).toBeCloseTo(148, -1);
  });

  describe('boundingBoxAround', () => {
    it('produces a box that contains the centre', () => {
      const box = boundingBoxAround(london, 50);
      expect(box.minLatDeg).toBeLessThan(london.latitudeDeg);
      expect(box.maxLatDeg).toBeGreaterThan(london.latitudeDeg);
      expect(box.minLonDeg).toBeLessThan(london.longitudeDeg);
      expect(box.maxLonDeg).toBeGreaterThan(london.longitudeDeg);
    });

    it('a corner of a 50 km box is at least 50 km from the centre', () => {
      const box = boundingBoxAround(london, 50);
      const corner = { latitudeDeg: box.maxLatDeg, longitudeDeg: box.maxLonDeg };
      expect(distanceKm(london, corner)).toBeGreaterThanOrEqual(50);
    });
  });
});
