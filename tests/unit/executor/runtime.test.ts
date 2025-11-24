import { describe, test, expect } from 'vitest';
import { buildContext, ExecutionContext } from '../../../src/executor/runtime';

describe('buildContext', () => {
  test('includes helper functions', () => {
    const context = buildContext({ data: [1, 2, 3] });
    expect(typeof context.avg).toBe('function');
    expect(typeof context.sum).toBe('function');
    expect(typeof context.max).toBe('function');
    expect(typeof context.min).toBe('function');
    expect(typeof context.groupBy).toBe('function');
  });

  test('wraps data correctly', () => {
    const games = [{ name: 'Game 1', score: 85 }];
    const context = buildContext({ games });
    expect(context.games).toEqual(games);
  });

  test('avg helper function works', () => {
    const context = buildContext({ data: [1, 2, 3, 4, 5] });
    expect(context.avg(context.data)).toBe(3);
  });

  test('sum helper function works', () => {
    const context = buildContext({ data: [1, 2, 3, 4, 5] });
    expect(context.sum(context.data)).toBe(15);
  });

  test('max helper function works', () => {
    const context = buildContext({ data: [1, 5, 3, 9, 2] });
    expect(context.max(context.data)).toBe(9);
  });

  test('min helper function works', () => {
    const context = buildContext({ data: [5, 2, 8, 1, 9] });
    expect(context.min(context.data)).toBe(1);
  });

  test('groupBy helper function works', () => {
    const games = [
      { genre: 'Action', score: 85 },
      { genre: 'RPG', score: 90 },
      { genre: 'Action', score: 80 },
    ];
    const context = buildContext({ games });
    const grouped = context.groupBy(games, 'genre');
    expect(grouped.Action).toHaveLength(2);
    expect(grouped.RPG).toHaveLength(1);
  });

  test('handles empty arrays', () => {
    const context = buildContext({ data: [] });
    expect(context.avg(context.data)).toBeNaN();
    expect(context.sum(context.data)).toBe(0);
  });

  test('handles multiple data properties', () => {
    const context = buildContext({
      games: [{ score: 85 }],
      scores: [85, 90, 75],
    });
    expect(context.games).toBeDefined();
    expect(context.scores).toBeDefined();
    expect(context.sum(context.scores)).toBe(250);
  });

  test('groupBy handles nested properties', () => {
    const games = [
      { platform: { name: 'PC' }, score: 85 },
      { platform: { name: 'PS5' }, score: 90 },
      { platform: { name: 'PC' }, score: 80 },
    ];
    const context = buildContext({ games });
    const grouped = context.groupBy(games, 'platform.name');
    expect(grouped.PC).toHaveLength(2);
    expect(grouped.PS5).toHaveLength(1);
  });
});

