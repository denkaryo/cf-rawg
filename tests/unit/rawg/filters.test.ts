import { describe, test, expect } from 'vitest';
import { buildQueryParams } from '../../../src/rawg/filters';
import type { FilterOptions } from '../../../src/rawg/types';

describe('buildQueryParams', () => {
  test('builds date range query', () => {
    const options: FilterOptions = {
      dates: '2024-01-01,2024-03-31',
    };
    const params = buildQueryParams(options);
    expect(params.get('dates')).toBe('2024-01-01,2024-03-31');
  });

  test('builds platform filter', () => {
    const options: FilterOptions = {
      platforms: '4',
    };
    const params = buildQueryParams(options);
    expect(params.get('platforms')).toBe('4');
  });

  test('builds genre filter', () => {
    const options: FilterOptions = {
      genres: 'action,indie',
    };
    const params = buildQueryParams(options);
    expect(params.get('genres')).toBe('action,indie');
  });

  test('builds metacritic filter', () => {
    const options: FilterOptions = {
      metacritic: '80,100',
    };
    const params = buildQueryParams(options);
    expect(params.get('metacritic')).toBe('80,100');
  });

  test('combines multiple filters', () => {
    const options: FilterOptions = {
      platforms: '4',
      genres: 'action',
      dates: '2024-01-01,2024-03-31',
      metacritic: '80,100',
      page_size: 40,
      page: 1,
    };
    const params = buildQueryParams(options);
    expect(params.get('platforms')).toBe('4');
    expect(params.get('genres')).toBe('action');
    expect(params.get('dates')).toBe('2024-01-01,2024-03-31');
    expect(params.get('metacritic')).toBe('80,100');
    expect(params.get('page_size')).toBe('40');
    expect(params.get('page')).toBe('1');
  });

  test('handles empty options', () => {
    const options: FilterOptions = {};
    const params = buildQueryParams(options);
    expect(params.toString()).toBe('');
  });

  test('handles ordering parameter', () => {
    const options: FilterOptions = {
      ordering: '-metacritic',
    };
    const params = buildQueryParams(options);
    expect(params.get('ordering')).toBe('-metacritic');
  });

  test('handles search parameter', () => {
    const options: FilterOptions = {
      search: 'elden ring',
    };
    const params = buildQueryParams(options);
    expect(params.get('search')).toBe('elden ring');
  });
});

