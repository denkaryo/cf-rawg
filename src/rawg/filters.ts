import type { FilterOptions } from './types';

export function buildQueryParams(options: FilterOptions): URLSearchParams {
  const params = new URLSearchParams();

  if (options.page !== undefined) {
    params.set('page', String(options.page));
  }

  if (options.page_size !== undefined) {
    params.set('page_size', String(options.page_size));
  }

  if (options.search) {
    params.set('search', options.search);
  }

  if (options.platforms) {
    params.set('platforms', options.platforms);
  }

  if (options.genres) {
    params.set('genres', options.genres);
  }

  if (options.dates) {
    params.set('dates', options.dates);
  }

  if (options.metacritic) {
    params.set('metacritic', options.metacritic);
  }

  if (options.ordering) {
    params.set('ordering', options.ordering);
  }

  return params;
}

