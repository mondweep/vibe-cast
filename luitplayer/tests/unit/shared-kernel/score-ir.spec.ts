import { describe, it, expect } from 'vitest';
import {
  dynamicToVelocity,
  createEmptyScoreIR,
  type Dynamic,
  type ScoreIR,
} from '@domains/shared-kernel/types';

describe('Score IR', () => {
  describe('dynamicToVelocity', () => {
    it('should convert pppp to lowest velocity', () => {
      expect(dynamicToVelocity('pppp')).toBe(16);
    });

    it('should convert p to appropriate velocity', () => {
      expect(dynamicToVelocity('p')).toBe(49);
    });

    it('should convert mp to medium-soft velocity', () => {
      expect(dynamicToVelocity('mp')).toBe(64);
    });

    it('should convert mf to medium-loud velocity', () => {
      expect(dynamicToVelocity('mf')).toBe(80);
    });

    it('should convert f to loud velocity', () => {
      expect(dynamicToVelocity('f')).toBe(96);
    });

    it('should convert ffff to maximum velocity', () => {
      expect(dynamicToVelocity('ffff')).toBe(127);
    });

    it('should return increasing velocities for louder dynamics', () => {
      const dynamics: Dynamic[] = ['pppp', 'ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'ffff'];
      const velocities = dynamics.map(dynamicToVelocity);

      for (let i = 1; i < velocities.length; i++) {
        expect(velocities[i]).toBeGreaterThan(velocities[i - 1]);
      }
    });
  });

  describe('createEmptyScoreIR', () => {
    it('should create a valid empty score', () => {
      const score = createEmptyScoreIR();

      expect(score.irVersion).toBe('1.0.0');
      expect(score.metadata.title).toBe('Untitled');
      expect(score.metadata.tempo).toBe(120);
      expect(score.staves).toEqual([]);
      expect(score.rehearsalMarks).toEqual([]);
    });

    it('should have default time signature of 4/4', () => {
      const score = createEmptyScoreIR();

      expect(score.metadata.timeSignature).toEqual([4, 4]);
    });

    it('should have default key of C', () => {
      const score = createEmptyScoreIR();

      expect(score.metadata.keySignature).toBe('C');
    });

    it('should return a new object each time', () => {
      const score1 = createEmptyScoreIR();
      const score2 = createEmptyScoreIR();

      expect(score1).not.toBe(score2);
      expect(score1.staves).not.toBe(score2.staves);
    });
  });

  describe('ScoreIR structure', () => {
    it('should accept valid score with multiple staves', () => {
      const score: ScoreIR = {
        irVersion: '1.0.0',
        metadata: {
          title: 'Māyābini Rātir Bùkùt',
          tempo: 113,
          timeSignature: [4, 4],
          keySignature: 'Bm',
        },
        staves: [
          {
            id: 'soprano-1',
            instrument: 'soprano',
            measures: [
              {
                number: 1,
                startTime: 0,
                events: [
                  {
                    type: 'note-on',
                    pitch: 60,
                    time: 0,
                    duration: 1,
                    velocity: 80,
                  },
                ],
                dynamics: 'mf',
              },
            ],
          },
          {
            id: 'bass-1',
            instrument: 'bass-guitar',
            measures: [],
          },
        ],
        rehearsalMarks: [
          { label: 'A1', measureNumber: 1 },
          { label: 'S1', measureNumber: 17 },
        ],
      };

      expect(score.staves).toHaveLength(2);
      expect(score.rehearsalMarks).toHaveLength(2);
    });

    it('should support all instrument types', () => {
      const instruments = [
        'soprano',
        'lead-vocal',
        'space-synth',
        'piano',
        'acoustic-guitar-strum',
        'acoustic-guitar-lead',
        'bass-guitar',
        'drums',
        'strings',
        'brass',
        'choir',
      ] as const;

      instruments.forEach((instrument) => {
        const score = createEmptyScoreIR();
        score.staves.push({
          id: `${instrument}-1`,
          instrument,
          measures: [],
        });

        expect(score.staves[0].instrument).toBe(instrument);
      });
    });
  });
});
