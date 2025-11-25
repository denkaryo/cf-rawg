import { describe, test, expect } from 'vitest';
import { executeSafely, ExecutionResult } from '../../../src/executor/sandbox';

describe('executeSafely', () => {
  test('executes array averaging', async () => {
    const code = 'return data.reduce((a, b) => a + b, 0) / data.length';
    const result = await executeSafely(code, { data: [1, 2, 3, 4, 5] });
    expect(result.success).toBe(true);
    expect(result.value).toBe(3);
    expect(result.error).toBeUndefined();
  });

  test('executes complex calculations', async () => {
    const code = `
      const filtered = data.filter(x => x > 0);
      const sum = filtered.reduce((a, b) => a + b, 0);
      return sum / filtered.length;
    `;
    const result = await executeSafely(code, { data: [1, -2, 3, 4, -5, 6] });
    expect(result.success).toBe(true);
    expect(result.value).toBeCloseTo(3.5, 5);
  });

  test('executes Math operations', async () => {
    const code = 'return Math.sqrt(sum)';
    const result = await executeSafely(code, { sum: 16 });
    expect(result.success).toBe(true);
    expect(result.value).toBe(4);
  });

  test('executes array operations', async () => {
    const code = 'return data.map(x => x * 2).filter(x => x > 5)';
    const result = await executeSafely(code, { data: [1, 2, 3, 4, 5] });
    expect(result.success).toBe(true);
    expect(Array.isArray(result.value)).toBe(true);
    expect(result.value).toEqual([6, 8, 10]);
  });

  test('handles errors gracefully', async () => {
    const code = 'return data.nonExistentProperty.length';
    const result = await executeSafely(code, { data: {} });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.value).toBeUndefined();
  });

  test('handles division by zero (returns Infinity)', async () => {
    const code = 'return numerator / denominator';
    const result = await executeSafely(code, { numerator: 10, denominator: 0 });
    expect(result.success).toBe(true);
    expect(result.value).toBe(Infinity);
  });

  test('handles syntax errors in execution', async () => {
    const code = 'return data.reduce((a, b) => a + b / data.length';
    const result = await executeSafely(code, { data: [1, 2, 3] });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('executes with multiple context variables', async () => {
    const code = 'return (a + b) * c';
    const result = await executeSafely(code, { a: 2, b: 3, c: 4 });
    expect(result.success).toBe(true);
    expect(result.value).toBe(20);
  });

  test('executes game data calculations', async () => {
    const code = `
      const gamesWithScore = games.filter(g => g.metacritic !== null && g.metacritic !== undefined);
      const scores = gamesWithScore.map(g => g.metacritic);
      return scores.reduce((a, b) => a + b, 0) / scores.length;
    `;
    const games = [
      { metacritic: 85 },
      { metacritic: 90 },
      { metacritic: null },
      { metacritic: 75 },
    ];
    const result = await executeSafely(code, { games });
    expect(result.success).toBe(true);
    expect(result.value).toBeCloseTo(83.33, 2);
  });

  test('handles empty arrays', async () => {
    const code = 'return data.length === 0 ? 0 : data.reduce((a, b) => a + b, 0) / data.length';
    const result = await executeSafely(code, { data: [] });
    expect(result.success).toBe(true);
    expect(result.value).toBe(0);
  });

  test('executes groupBy-like operations', async () => {
    const code = `
      const grouped = {};
      data.forEach(item => {
        const key = item.category;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item.value);
      });
      return grouped;
    `;
    const data = [
      { category: 'A', value: 1 },
      { category: 'B', value: 2 },
      { category: 'A', value: 3 },
    ];
    const result = await executeSafely(code, { data });
    expect(result.success).toBe(true);
    expect(result.value).toEqual({ A: [1, 3], B: [2] });
  });

  test('returns correct result type information', async () => {
    const code = 'return data.length';
    const result = await executeSafely(code, { data: [1, 2, 3] });
    expect(result.success).toBe(true);
    expect(typeof result.value).toBe('number');
  });
});

