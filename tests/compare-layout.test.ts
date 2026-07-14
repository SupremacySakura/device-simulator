import { describe, expect, it } from 'vitest';
import { calculateAutoLayout } from '../utils/compare-layout';
import { createCompareInstance, createCompareProfile } from './compare-fixtures';

const PROFILES = {
  a: createCompareProfile('a', 100, 200),
  b: createCompareProfile('b', 200, 100),
  c: createCompareProfile('c', 50, 300),
  d: createCompareProfile('d', 150, 150),
};

const INSTANCES = [
  createCompareInstance('a-node', 'a'),
  createCompareInstance('b-node', 'b'),
  createCompareInstance('c-node', 'c'),
  createCompareInstance('d-node', 'd'),
];

describe('compare automatic layout', () => {
  it('lays devices out horizontally using scaled visual widths', () => {
    const instances = [
      createCompareInstance('a-node', 'a', { scale: 2 }),
      createCompareInstance('b-node', 'b'),
      createCompareInstance('c-node', 'c'),
    ];
    expect(
      calculateAutoLayout(instances, PROFILES, 'horizontal', {
        gap: 30,
        origin: { x: 10, y: 20 },
      }),
    ).toEqual({
      'a-node': { x: 10, y: 20 },
      'b-node': { x: 240, y: 20 },
      'c-node': { x: 470, y: 20 },
    });
  });

  it('lays devices out vertically using visual heights', () => {
    expect(
      calculateAutoLayout(INSTANCES.slice(0, 3), PROFILES, 'vertical', {
        gap: 30,
        origin: { x: 10, y: 20 },
      }),
    ).toEqual({
      'a-node': { x: 10, y: 20 },
      'b-node': { x: 10, y: 250 },
      'c-node': { x: 10, y: 380 },
    });
  });

  it('creates a non-overlapping grid from maximum row and column sizes', () => {
    expect(calculateAutoLayout(INSTANCES, PROFILES, 'grid', { gap: 20, columns: 2 })).toEqual({
      'a-node': { x: 0, y: 0 },
      'b-node': { x: 120, y: 0 },
      'c-node': { x: 0, y: 220 },
      'd-node': { x: 120, y: 220 },
    });
  });

  it('chooses the default grid column count from the square root of instance count', () => {
    const instances = Array.from({ length: 5 }, (_, index) =>
      createCompareInstance(`node-${index}`, 'a'),
    );
    expect(calculateAutoLayout(instances, PROFILES, 'grid', { gap: 10 })).toEqual({
      'node-0': { x: 0, y: 0 },
      'node-1': { x: 110, y: 0 },
      'node-2': { x: 220, y: 0 },
      'node-3': { x: 0, y: 210 },
      'node-4': { x: 110, y: 210 },
    });
  });

  it('lays out an invalid-profile instance using its recovery-card size', () => {
    const missing = createCompareInstance('missing', 'deleted', { position: { x: 77, y: 88 } });
    const positions = calculateAutoLayout([INSTANCES[0]!, missing], PROFILES, 'horizontal');
    expect(positions.missing).toEqual({ x: 148, y: 0 });
    expect(positions['a-node']).toEqual({ x: 0, y: 0 });
  });

  it('rejects negative gaps and invalid grid columns', () => {
    expect(() => calculateAutoLayout(INSTANCES, PROFILES, 'horizontal', { gap: -1 })).toThrow(
      RangeError,
    );
    expect(() => calculateAutoLayout(INSTANCES, PROFILES, 'grid', { columns: 0 })).toThrow(
      RangeError,
    );
  });
});
