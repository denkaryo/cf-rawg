import { describe, test, expect } from 'vitest';
import { handleExecuteCalculation } from '../../../src/mcp-server/tools/execute-calculation';

describe('execute_calculation tool', () => {
  test('executes calculation code', async () => {
    const result = await handleExecuteCalculation({
      code: 'return data.reduce((a, b) => a + b, 0) / data.length',
      data: { data: [1, 2, 3, 4, 5] },
    });

    expect(result.success).toBe(true);
    expect(result.result).toBe(3);
    expect(result.error).toBeUndefined();
  });

  test('rejects invalid code', async () => {
    const result = await handleExecuteCalculation({
      code: 'eval("malicious")',
      data: { data: [1, 2, 3] },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.result).toBeNull();
  });

  test('returns error on execution failure', async () => {
    const result = await handleExecuteCalculation({
      code: 'return undefined.nonExistent',
      data: { data: [1, 2, 3] },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('provides helper functions in context', async () => {
    const result = await handleExecuteCalculation({
      code: 'return avg(data)',
      data: { data: [10, 20, 30] },
    });

    expect(result.success).toBe(true);
    expect(result.result).toBe(20);
  });

  test('handles complex calculations', async () => {
    const games = [
      { metacritic: 85 },
      { metacritic: 90 },
      { metacritic: 75 },
    ];

    const result = await handleExecuteCalculation({
      code: `
        const scores = games.filter(g => g.metacritic).map(g => g.metacritic);
        return avg(scores);
      `,
      data: { games },
    });

    expect(result.success).toBe(true);
    expect(result.result).toBeCloseTo(83.33, 2);
  });
});

