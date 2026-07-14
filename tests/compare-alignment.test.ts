import { describe, expect, it } from 'vitest';
import type { AlignmentAction } from '../types/compare';
import { calculateAlignment } from '../utils/compare-alignment';
import { createCompareInstance, createCompareProfile } from './compare-fixtures';

const PROFILES = {
  narrow: createCompareProfile('narrow', 100, 200),
  wide: createCompareProfile('wide', 200, 100),
  short: createCompareProfile('short', 50, 50),
};

const PAIR = [
  createCompareInstance('a', 'narrow', { position: { x: 0, y: 0 } }),
  createCompareInstance('b', 'wide', { position: { x: 300, y: 100 } }),
];

describe('compare alignment', () => {
  it.each<{ action: AlignmentAction; expected: Record<string, { x: number; y: number }> }>([
    {
      action: 'align-left',
      expected: { a: { x: 0, y: 0 }, b: { x: 0, y: 100 } },
    },
    {
      action: 'align-right',
      expected: { a: { x: 400, y: 0 }, b: { x: 300, y: 100 } },
    },
    {
      action: 'align-top',
      expected: { a: { x: 0, y: 0 }, b: { x: 300, y: 0 } },
    },
    {
      action: 'align-bottom',
      expected: { a: { x: 0, y: 0 }, b: { x: 300, y: 100 } },
    },
    {
      action: 'align-horizontal-center',
      expected: { a: { x: 200, y: 0 }, b: { x: 150, y: 100 } },
    },
    {
      action: 'align-vertical-center',
      expected: { a: { x: 0, y: 0 }, b: { x: 300, y: 50 } },
    },
  ])('calculates $action from visual bounds', ({ action, expected }) => {
    expect(calculateAlignment(PAIR, PROFILES, action)).toEqual(expected);
  });

  it('distributes mixed-width devices with equal horizontal gaps', () => {
    const instances = [
      createCompareInstance('a', 'narrow', { position: { x: 0, y: 0 } }),
      createCompareInstance('b', 'wide', { position: { x: 150, y: 20 } }),
      createCompareInstance('c', 'short', { position: { x: 500, y: 40 } }),
    ];
    expect(calculateAlignment(instances, PROFILES, 'distribute-horizontal')).toEqual({
      a: { x: 0, y: 0 },
      b: { x: 200, y: 20 },
      c: { x: 500, y: 40 },
    });
  });

  it('distributes devices with equal vertical gaps', () => {
    const square = createCompareProfile('square', 100, 100);
    const instances = [
      createCompareInstance('a', 'square', { position: { x: 0, y: 0 } }),
      createCompareInstance('b', 'square', { position: { x: 20, y: 150 } }),
      createCompareInstance('c', 'square', { position: { x: 40, y: 500 } }),
    ];
    expect(calculateAlignment(instances, { square }, 'distribute-vertical')).toEqual({
      a: { x: 0, y: 0 },
      b: { x: 20, y: 250 },
      c: { x: 40, y: 500 },
    });
  });

  it('leaves two devices unchanged when distribution is unavailable', () => {
    expect(calculateAlignment(PAIR, PROFILES, 'distribute-horizontal')).toEqual({
      a: { x: 0, y: 0 },
      b: { x: 300, y: 100 },
    });
  });
});
