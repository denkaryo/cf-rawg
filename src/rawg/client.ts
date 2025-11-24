import { buildQueryParams } from './filters';
import type { FilterOptions, GameListResponse, Game, Genre, Platform } from './types';

const BASE_URL = 'https://api.rawg.io/api';

export class RAWGClient {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('RAWG API key is required');
    }
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `RAWG API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  async getGames(filters?: FilterOptions): Promise<GameListResponse> {
    const params = buildQueryParams(filters || {});
    params.set('key', this.apiKey);
    const queryString = params.toString();
    const endpoint = `/games${queryString ? `?${queryString}` : ''}`;

    return this.request<GameListResponse>(endpoint);
  }

  async getAllGames(filters?: FilterOptions): Promise<Game[]> {
    const allGames: Game[] = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getGames({
        ...filters,
        page: currentPage,
        page_size: 40,
      });

      allGames.push(...response.results);

      if (response.next && response.results.length > 0) {
        currentPage++;
      } else {
        hasMore = false;
      }
    }

    return allGames;
  }

  async getGenres(): Promise<Genre[]> {
    const response = await this.request<{ count: number; results: Genre[] }>(
      `/genres?key=${this.apiKey}`
    );
    return response.results;
  }

  async getPlatforms(): Promise<Platform[]> {
    const response = await this.request<{ count: number; results: Platform[] }>(
      `/platforms?key=${this.apiKey}`
    );
    return response.results;
  }
}

