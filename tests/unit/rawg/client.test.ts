import { describe, test, expect, vi, beforeEach } from 'vitest';
import { RAWGClient } from '../../../src/rawg/client';
import type { GameListResponse } from '../../../src/rawg/types';

describe('RAWGClient', () => {
  const apiKey = 'test-api-key';
  let client: RAWGClient;

  beforeEach(() => {
    client = new RAWGClient(apiKey);
  });

  test('fetches games with filters', async () => {
    const mockResponse: GameListResponse = {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 1,
          slug: 'test-game',
          name: 'Test Game',
          released: '2024-01-01',
          tba: false,
          rating: 4.5,
          rating_top: 5,
          ratings: {},
          ratings_count: 100,
          reviews_text_count: '50',
          added: 1000,
          added_by_status: {},
          metacritic: 85,
          playtime: 20,
          suggestions_count: 5,
          updated: '2024-01-01T00:00:00Z',
          platforms: [],
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await client.getGames({
      platforms: '4',
      dates: '2024-01-01,2024-03-31',
    });

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('platforms=4'),
      expect.any(Object)
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('dates=2024-01-01%2C2024-03-31'),
      expect.any(Object)
    );
  });

  test('handles pagination correctly', async () => {
    const page1Response: GameListResponse = {
      count: 100,
      next: 'https://api.rawg.io/api/games?page=2',
      previous: null,
      results: Array(40).fill(null).map((_, i) => ({
        id: i + 1,
        slug: `game-${i + 1}`,
        name: `Game ${i + 1}`,
        released: '2024-01-01',
        tba: false,
        rating: 4.0,
        rating_top: 5,
        ratings: {},
        ratings_count: 100,
        reviews_text_count: '50',
        added: 1000,
        added_by_status: {},
        metacritic: 80,
        playtime: 20,
        suggestions_count: 5,
        updated: '2024-01-01T00:00:00Z',
        platforms: [],
      })),
    };

    const page2Response: GameListResponse = {
      count: 100,
      next: null,
      previous: 'https://api.rawg.io/api/games?page=1',
      results: Array(20).fill(null).map((_, i) => ({
        id: i + 41,
        slug: `game-${i + 41}`,
        name: `Game ${i + 41}`,
        released: '2024-01-01',
        tba: false,
        rating: 4.0,
        rating_top: 5,
        ratings: {},
        ratings_count: 100,
        reviews_text_count: '50',
        added: 1000,
        added_by_status: {},
        metacritic: 80,
        playtime: 20,
        suggestions_count: 5,
        updated: '2024-01-01T00:00:00Z',
        platforms: [],
      })),
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => page1Response,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => page2Response,
      });

    const allGames = await client.getAllGames({
      platforms: '4',
    });

    expect(allGames).toHaveLength(60);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('throws on API errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    await expect(client.getGames({})).rejects.toThrow('RAWG API error: 401 Unauthorized');
  });

  test('includes API key in request URL', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        count: 0,
        results: [],
      }),
    });

    await client.getGames({});

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`key=${apiKey}`),
      expect.any(Object)
    );
  });
});

