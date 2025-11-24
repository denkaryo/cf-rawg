import { describe, test, expect } from 'vitest';
import { validateCode, ValidationResult } from '../../../src/executor/validator';

describe('validateCode', () => {
  test('accepts safe calculation code', () => {
    const code = 'return data.reduce((a, b) => a + b, 0) / data.length';
    const result = validateCode(code);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('accepts code with Math operations', () => {
    const code = 'return Math.sqrt(sum)';
    const result = validateCode(code);
    expect(result.valid).toBe(true);
  });

  test('accepts code with array operations', () => {
    const code = 'return data.filter(x => x > 0).map(x => x * 2)';
    const result = validateCode(code);
    expect(result.valid).toBe(true);
  });

  test('rejects dangerous eval', () => {
    const code = 'eval("malicious code")';
    const result = validateCode(code);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('eval'))).toBe(true);
  });

  test('rejects Function constructor misuse', () => {
    const code = 'new Function("return process")()';
    const result = validateCode(code);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Function') || e.includes('new Function'))).toBe(true);
  });

  test('rejects syntax errors', () => {
    const code = 'return data.reduce((a, b) => a + b / data.length';
    const result = validateCode(code);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('rejects code accessing process', () => {
    const code = 'return process.env.SECRET';
    const result = validateCode(code);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('process'))).toBe(true);
  });

  test('rejects code accessing require', () => {
    const code = 'require("fs")';
    const result = validateCode(code);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('require'))).toBe(true);
  });

  test('rejects code accessing global', () => {
    const code = 'global.something = "bad"';
    const result = validateCode(code);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('global'))).toBe(true);
  });

  test('rejects code accessing window', () => {
    const code = 'window.location = "bad"';
    const result = validateCode(code);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('window'))).toBe(true);
  });

  test('accepts complex but safe calculations', () => {
    const code = `
      const filtered = data.filter(g => g.metacritic !== null);
      const scores = filtered.map(g => g.metacritic);
      return scores.reduce((a, b) => a + b, 0) / scores.length;
    `;
    const result = validateCode(code);
    expect(result.valid).toBe(true);
  });

  test('rejects empty code', () => {
    const result = validateCode('');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('rejects code with import statements', () => {
    const code = 'import fs from "fs"';
    const result = validateCode(code);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('import'))).toBe(true);
  });
});

